/**
 * freeResources.test.ts - FREE-RES-1. The publish rules: manifest validation, asset verification, the STORE-only zips, the path guard and
 * the write order. No network and no key. Run: tsx --test scripts/freeResources/freeResources.test.ts   (wired as test:free-resources)
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  assertFreePath, buildZip, downloadName, membersOf, parseReleaseManifest, planFreeRelease, sha256Hex, verifyAssets,
  type ReleaseManifest, type ReleaseResource,
} from "./freeManifest";
import { publishFree, type FreeStore } from "./uploadFreeResources";

const pdf = (label: string): Uint8Array => new Uint8Array(Buffer.from(`%PDF-1.7\n${label}\n%%EOF`));

function release(): { manifest: ReleaseManifest; assets: Map<string, Uint8Array> } {
  const defs: Array<[string, "Maths" | "Science", string]> = [
    ["mcq-maths-real-numbers", "Maths", "Real Numbers"],
    ["mcq-maths-polynomials", "Maths", "Polynomials"],
    ["mcq-science-light", "Science", "Light - Reflection and Refraction"],
  ];
  const assets = new Map<string, Uint8Array>();
  const resources: ReleaseResource[] = defs.map(([id, subject, chapter]) => {
    const file = `${id}.pdf`;
    const data = pdf(id);
    assets.set(file, data);
    return { id, kind: "mcq_bank", subject, chapter, title: `${chapter} · MCQ Practice Bank`, file, bytes: data.length, sha256: sha256Hex(data), pages: 10, questions: 40 };
  });
  return { manifest: { version: 1, resources }, assets };
}
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

test("a good manifest parses", () => {
  const { manifest } = release();
  assert.equal(parseReleaseManifest(clone(manifest)).resources.length, 3);
});

test("manifest: unknown kind, unknown subject, duplicate id, duplicate file, bad hash, bad size are all refused", () => {
  const { manifest } = release();
  const bad = (mut: (m: ReleaseManifest) => void, re: RegExp): void => {
    const m = clone(manifest);
    mut(m);
    assert.throws(() => parseReleaseManifest(m), re);
  };
  bad((m) => (m.resources[0].kind = "answer_key" as never), /unknown kind/);
  bad((m) => (m.resources[0].subject = "English" as never), /unknown subject/);
  bad((m) => (m.resources[1].id = m.resources[0].id), /duplicate id/);
  bad((m) => (m.resources[1].file = m.resources[0].file), /duplicate file/);
  bad((m) => (m.resources[0].sha256 = "xyz"), /bad sha256/);
  bad((m) => (m.resources[0].bytes = 0), /bad bytes/);
  bad((m) => (m.resources[0].file = "../evil.pdf"), /bad file name/);
  bad((m) => (m.resources[0].file = "a/b.pdf"), /bad file name/);
  assert.throws(() => parseReleaseManifest({ version: 2, resources: [] }), /expected/);
  assert.throws(() => parseReleaseManifest({ version: 1, resources: [] }), /no resources/);
});

test("assets: a missing file, a wrong size, a wrong hash, a non-PDF and an unlisted PDF are all refused", () => {
  const { manifest, assets } = release();
  verifyAssets(manifest, assets); // precondition: the good set passes
  const without = new Map(assets);
  without.delete("mcq-maths-polynomials.pdf");
  assert.throws(() => verifyAssets(manifest, without), /missing/);
  const tampered = new Map(assets);
  tampered.set("mcq-maths-polynomials.pdf", pdf("something else entirely"));
  assert.throws(() => verifyAssets(manifest, tampered), /bytes, manifest says|sha256 does not match/);
  const sameSizeDifferentBytes = new Map(assets);
  const orig = assets.get("mcq-maths-polynomials.pdf")!;
  const copy = new Uint8Array(orig);
  copy[copy.length - 1] ^= 1; // same length, one bit different
  sameSizeDifferentBytes.set("mcq-maths-polynomials.pdf", copy);
  assert.throws(() => verifyAssets(manifest, sameSizeDifferentBytes), /sha256 does not match/);
  const notPdf = clone(manifest);
  const junk = new Uint8Array(Buffer.from("hello world, not a pdf"));
  const junkAssets = new Map(assets);
  junkAssets.set("mcq-maths-polynomials.pdf", junk);
  notPdf.resources[1].bytes = junk.length;
  notPdf.resources[1].sha256 = sha256Hex(junk);
  assert.throws(() => verifyAssets(notPdf, junkAssets), /not a PDF/);
  const extra = new Map(assets);
  extra.set("stray.pdf", pdf("stray"));
  assert.throws(() => verifyAssets(manifest, extra), /unlisted asset/);
});

test("the download name is the asset's own ASCII file name, whatever the chapter title carries", () => {
  assert.equal(downloadName({ file: "LazyTopper-Free-MCQ-Bank-Maths-Real-Numbers.pdf" }), "LazyTopper-Free-MCQ-Bank-Maths-Real-Numbers.pdf");
  const r = release();
  r.manifest.resources[2].chapter = "Light: Reflection and Refraction";
  r.manifest.resources[2].title = "Light: Reflection and Refraction \u00b7 MCQ Practice Bank";
  assert.equal(parseReleaseManifest(clone(r.manifest)).resources.length, 3);
  assert.ok(r.manifest.resources.every((x) => /^[A-Za-z0-9._-]+$/.test(downloadName(x))));
});

test("the plan: paths are content-addressed, the zips are per subject plus everything, and current.json has no `file`", async () => {
  const { manifest, assets } = release();
  const { current, zips } = await planFreeRelease(manifest, assets);
  assert.deepEqual(zips.map((z) => [z.group, z.count]), [["maths", 2], ["science", 1], ["all", 3]]);
  for (const r of current.resources) {
    assert.equal(r.path, `free/files/${r.sha256}.pdf`);
    assert.ok(!("file" in r));
    assertFreePath(r.path);
  }
  for (const z of current.zips) assert.match(z.path, /^free\/zips\/[0-9a-f]{64}\/(maths|science|all)\.zip$/);
  assert.deepEqual(current.zips.map((z) => z.id), ["zip-maths", "zip-science", "zip-all"]);
});

test("a subject with nothing published gets no zip entry (never an empty zip)", async () => {
  const { manifest, assets } = release();
  manifest.resources = manifest.resources.filter((r) => r.subject === "Maths");
  assets.delete("mcq-science-light.pdf");
  const { current } = await planFreeRelease(manifest, assets);
  assert.deepEqual(current.zips.map((z) => z.group), ["maths", "all"]);
});

/** Reads a zip's end-of-central-directory and central headers: entry count and each entry's compression method + name. */
function inspectZip(buf: Buffer): Array<{ name: string; method: number; size: number }> {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(eocd >= 0, "no end-of-central-directory record");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out: Array<{ name: string; method: number; size: number }> = [];
  for (let i = 0; i < count; i += 1) {
    assert.equal(buf.readUInt32LE(p), 0x02014b50);
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 24);
    const n = buf.readUInt16LE(p + 28);
    const m = buf.readUInt16LE(p + 30);
    const k = buf.readUInt16LE(p + 32);
    out.push({ name: buf.subarray(p + 46, p + 46 + n).toString("utf8"), method, size });
    p += 46 + n + m + k;
  }
  return out;
}

test("zips: STORE-only (method 0), one entry per resource, deterministic bytes", async () => {
  const { manifest, assets } = release();
  const members = membersOf("maths", manifest);
  const a = await buildZip(members, assets);
  const b = await buildZip(members, assets);
  assert.ok(a.equals(b), "the same members must give the same bytes");
  const entries = inspectZip(a);
  assert.equal(entries.length, 2);
  assert.ok(entries.every((e) => e.method === 0), "every entry is stored, not deflated");
  assert.deepEqual(entries.map((e) => e.name), ["mcq-maths-polynomials.pdf", "mcq-maths-real-numbers.pdf"]);
  assert.equal(entries[0].size, assets.get("mcq-maths-polynomials.pdf")!.length);
  assert.equal(inspectZip(await buildZip(membersOf("all", manifest), assets)).length, 3);
});

test("the zip path changes when a member's bytes change (content-addressed) and not otherwise", async () => {
  const first = release();
  const again = release();
  const p1 = (await planFreeRelease(first.manifest, first.assets)).current.zips[0].path;
  const p2 = (await planFreeRelease(again.manifest, again.assets)).current.zips[0].path;
  assert.equal(p1, p2);
  const changed = release();
  const data = pdf("a revised polynomials bank");
  changed.assets.set("mcq-maths-polynomials.pdf", data);
  changed.manifest.resources[1].bytes = data.length;
  changed.manifest.resources[1].sha256 = sha256Hex(data);
  assert.notEqual((await planFreeRelease(changed.manifest, changed.assets)).current.zips[0].path, p1);
});

test("assertFreePath accepts only the three shapes under free/", () => {
  const h = "a".repeat(64);
  for (const ok of [`free/files/${h}.pdf`, `free/zips/${h}/maths.zip`, `free/zips/${h}/science.zip`, `free/zips/${h}/all.zip`, "free/current.json"]) assert.equal(assertFreePath(ok), ok);
  for (const bad of ["packs/current.json", "cbse/manifest.json", "free/", "free/other.json", `free/files/${h}.zip`, `free/files/${h.slice(1)}.pdf`, `free/../packs/x.pdf`, `/free/current.json`, `free/zips/${h}/x.zip`, `free/files/${h}.pdf/../../x`, "", "stamped/u/x.pdf"]) {
    assert.throws(() => assertFreePath(bad), /outside free\//, bad);
  }
});

function memoryStore(preexisting: string[] = []): FreeStore & { log: Array<{ p: string; overwrite: boolean }>; objects: Map<string, Uint8Array | string> } {
  const objects = new Map<string, Uint8Array | string>(preexisting.map((p) => [p, "x"] as const));
  const log: Array<{ p: string; overwrite: boolean }> = [];
  return {
    log,
    objects,
    async write(p, data, opts) {
      log.push({ p, overwrite: opts.overwrite });
      if (!opts.overwrite && objects.has(p)) return "exists";
      objects.set(p, data);
      return "written";
    },
  };
}

test("publish: everything lands under free/, files and zips never overwrite, current.json is written LAST", async () => {
  const r = release();
  const store = memoryStore();
  const { wrote, kept } = await publishFree(store, r);
  assert.equal(wrote.length, 3 + 3 + 1);
  assert.equal(kept.length, 0);
  assert.ok(store.log.every((w) => w.p.startsWith("free/")));
  assert.equal(store.log[store.log.length - 1].p, "free/current.json");
  assert.equal(store.log.filter((w) => w.p === "free/current.json").length, 1);
  assert.ok(store.log.filter((w) => w.p !== "free/current.json").every((w) => w.overwrite === false), "content-addressed objects are never overwritten");
  const written = JSON.parse(String(store.objects.get("free/current.json")));
  assert.equal(written.resources.length, 3);
  assert.ok(written.resources.every((x: { path: string }) => store.objects.has(x.path)), "every path current.json names exists before it does");
});

test("publish: a re-run writes nothing new except the manifest", async () => {
  const r = release();
  const store = memoryStore();
  await publishFree(store, r);
  const second = await publishFree(store, r);
  assert.equal(second.kept.length, 6);
  assert.deepEqual(second.wrote, ["free/current.json"]);
});

test("publish: a tampered asset aborts BEFORE anything is written (current.json is not moved)", async () => {
  const r = release();
  const bad = new Uint8Array(r.assets.get("mcq-maths-real-numbers.pdf")!);
  bad[bad.length - 1] ^= 1;
  r.assets.set("mcq-maths-real-numbers.pdf", bad);
  const store = memoryStore();
  await assert.rejects(() => publishFree(store, r), /sha256 does not match/);
  assert.equal(store.log.length, 0);
});

test("publish: a store that fails midway leaves current.json unwritten", async () => {
  const r = release();
  let n = 0;
  const log: string[] = [];
  const store: FreeStore = {
    async write(p) {
      n += 1;
      if (n === 4) throw new Error("network");
      log.push(p);
      return "written";
    },
  };
  await assert.rejects(() => publishFree(store, r), /network/);
  assert.ok(!log.includes("free/current.json"));
});

test("kit: accepted by the validator (subject may be omitted or All), kept out of every zip, and carried into current.json", async () => {
  const { manifest, assets } = release();
  const data = pdf("boards 2027 excellence kit");
  assets.set("LazyTopper-Boards-2027-Excellence-Kit.pdf", data);
  manifest.resources.push({ id: "kit-boards-2027", kind: "kit", subject: "All", chapter: "", title: "Boards 2027 Excellence Kit", file: "LazyTopper-Boards-2027-Excellence-Kit.pdf", bytes: data.length, sha256: sha256Hex(data), pages: 30, questions: null });
  const raw = clone(manifest);
  delete (raw.resources[3] as Partial<ReleaseResource>).subject; // subject omitted is fine for a kit
  const parsed = parseReleaseManifest(raw);
  assert.equal(parsed.resources[3].kind, "kit");
  assert.equal(parsed.resources[3].subject, "All");
  assert.equal(parsed.resources[3].chapter, "Boards 2027 Excellence Kit");
  const { current, zips } = await planFreeRelease(parsed, assets);
  assert.deepEqual(zips.map((z) => [z.group, z.count]), [["maths", 2], ["science", 1], ["all", 3]], "the kit is in no zip");
  assert.equal(current.resources.length, 4);
  assert.equal(current.resources[3].path, `free/files/${sha256Hex(data)}.pdf`);
  // a non-kit still may not use subject All, and an unknown kind is still refused
  const bad = clone(manifest);
  bad.resources[0].subject = "All";
  assert.throws(() => parseReleaseManifest(bad), /unknown subject/);
  const bad2 = clone(manifest);
  bad2.resources[3].kind = "answer_key" as never;
  assert.throws(() => parseReleaseManifest(bad2), /unknown kind/);
});
