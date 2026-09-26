import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ACADEMIC_INDEX_URL, GOV_INDEX_URL, HEADLINE_RULES } from "../cbse-mirror/circulars";
import { dedupeIssues, type IssueRequest, type IssueTracker } from "../cbse-mirror/issues";
import { validateManifest, type Manifest } from "../cbse-mirror/manifest";
import { runMirror, type FetchLike } from "../cbse-mirror/mirror";
import type { MirrorPaper } from "../cbse-mirror/papers";
import type { MirrorStorage, ObjectMeta } from "../cbse-mirror/storage";

/**
 * GUARD — one whole mirror run (CBSE-AUTO-1 C3, C5, C6, C7, C8, C10), with CBSE,
 * Storage and GitHub all replaced by in-memory fakes. No network.
 *
 * ★ EACH SCENARIO ASSERTS THE WRITES, IN ORDER. "The manifest is written last" and
 * "the live copy is archived before it is overwritten" are ORDER properties; a test
 * that only checks the final bucket contents passes with the order reversed.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, "..", "cbse-mirror", "fixtures");
const GOV_HTML = readFileSync(resolve(FIXTURES, "cbse-gov-examination-circular.html"), "utf8");
const ACADEMIC_HTML = readFileSync(resolve(FIXTURES, "cbseacademic-circulars.html"), "utf8");
const SQP_2627_HTML = readFileSync(resolve(FIXTURES, "cbseacademic-sqp-classx-2026-27.html"), "utf8");

const NOW = new Date("2026-09-26T00:30:00Z");
const SQP_INDEX = "https://cbseacademic.nic.in/SQP_CLASSX_2026-27.html";
const URL_2526 = "https://cbseacademic.nic.in/web_material/SQP/ClassX_2025_26/Science-SQP.pdf";
const URL_2627 = "https://cbseacademic.nic.in/web_material/SQP/ClassX_2026_27/Science-SQP.pdf";
const TOPPERS = "https://www.cbse.gov.in/cbsenew/model-answer/2025/X/Science.zip";

const PAPERS: MirrorPaper[] = [
  { id: "science-sqp", subject: "science", subjectLabel: "Science", title: "Sample paper", href: URL_2526, kind: "pdf" },
  { id: "science-toppers", subject: "science", subjectLabel: "Science", title: "Toppers' answer sheets, 2025", href: TOPPERS, kind: "zip" },
];

function pdf(size: number, tag: string): Uint8Array {
  const buf = Buffer.alloc(size, 0x20);
  buf.write(`%PDF-1.7\n%${tag}\n3 0 obj\n<< /Type /Page >>\nendobj\n`, 0, "latin1");
  return new Uint8Array(buf);
}
function zipBody(size: number, tag: string): Uint8Array {
  const buf = Buffer.alloc(size, 0x20);
  buf.write(`PK\x03\x04${tag}`, 0, "latin1");
  return new Uint8Array(buf);
}

type Reply = { status: number; body?: Uint8Array | string; headers?: Record<string, string> };
type Route = Reply | ((init: RequestInit | undefined) => Reply);

function fakeFetch(routes: Record<string, Route>, seen: { url: string; headers: Record<string, string> }[] = []): FetchLike {
  return async (url, init) => {
    seen.push({ url, headers: { ...((init?.headers as Record<string, string>) ?? {}) } });
    const route = routes[url];
    const reply: Reply = typeof route === "function" ? route(init) : route ?? { status: 404, body: "<html>404</html>" };
    const body = reply.status === 304 ? null : (reply.body ?? "");
    return new Response(body as BodyInit | null, { status: reply.status, headers: reply.headers });
  };
}

type Op = string;
function fakeStorage(previous: unknown | null) {
  const ops: Op[] = [];
  const objects = new Map<string, { body: Uint8Array; meta?: ObjectMeta }>();
  const storage: MirrorStorage = {
    readManifest: async () => previous,
    save: async (path, body, meta) => {
      ops.push(`save ${path}`);
      objects.set(path, { body, meta });
    },
    copy: async (from, to) => {
      ops.push(`copy ${from} -> ${to}`);
      const found = objects.get(from);
      if (found) objects.set(to, found);
    },
    remove: async (path) => {
      ops.push(`remove ${path}`);
      objects.delete(path);
    },
  };
  return { storage, ops, objects };
}

function fakeIssues(open: string[] = []) {
  const created: IssueRequest[] = [];
  const tracker: IssueTracker = {
    openTitles: async () => new Set(open),
    create: async (request) => void created.push(request),
  };
  return { tracker, created };
}

const CIRCULAR_ROUTES: Record<string, Route> = {
  [GOV_INDEX_URL]: { status: 200, body: GOV_HTML },
  [ACADEMIC_INDEX_URL]: { status: 200, body: ACADEMIC_HTML },
};

function writtenManifest(objects: Map<string, { body: Uint8Array }>): Manifest {
  const found = objects.get("cbse/manifest.json");
  assert.ok(found, "no manifest was written");
  return JSON.parse(Buffer.from(found.body).toString("utf8")) as Manifest;
}

/** A previous manifest in which both papers were mirrored from 2025-26 sources. */
function seededManifest(): Manifest {
  return {
    v: 1,
    generatedAt: "2026-09-25T00:30:00.000Z",
    papers: [
      {
        id: "science-sqp",
        sourceUrl: URL_2526,
        storagePath: "cbse/files/science-sqp.pdf",
        sessionYear: "2025-26",
        bytes: 200_000,
        sha256: "a".repeat(64),
        etag: '"old-etag"',
        lastModified: "Thu, 26 Jun 2025 06:07:50 GMT",
        checkedAt: "2026-09-25T00:30:00.000Z",
        status: "ok",
      },
      {
        id: "science-toppers",
        sourceUrl: TOPPERS,
        storagePath: "cbse/files/science-toppers.zip",
        sessionYear: "2025",
        bytes: 300_000,
        sha256: "b".repeat(64),
        etag: '"zip-etag"',
        lastModified: "Mon, 02 Jun 2025 00:00:00 GMT",
        checkedAt: "2026-09-25T00:30:00.000Z",
        status: "ok",
      },
    ],
    circulars: Array.from({ length: 30 }, (_, i) => ({
      id: `prev${String(i).padStart(12, "0")}`,
      date: "2026-09-20",
      title: i === 0 ? "Date sheet for Class X 2027" : `Previous circular ${i}`,
      href: `https://www.cbse.gov.in/cbsenew/documents/prev${i}.pdf`,
      source: "document" as const,
      important: i === 0,
      headline: i === 0 ? "The 2027 board exam date sheet is out" : "",
    })),
    circularsCheckedAt: "2026-09-25T00:30:00.000Z",
  };
}

const quiet = () => {};

describe("first seed — no previous manifest", () => {
  it("seeds each file, then writes the manifest LAST and atomically, and opens no issue", async () => {
    const { storage, ops, objects } = fakeStorage(null);
    const { tracker, created } = fakeIssues();
    const result = await runMirror({
      now: NOW,
      papers: PAPERS,
      storage,
      issues: tracker,
      dryRun: false,
      log: quiet,
      fetch: fakeFetch({
        [URL_2526]: { status: 200, body: pdf(200_000, "v1"), headers: { etag: '"e1"', "last-modified": "Thu, 26 Jun 2025 06:07:50 GMT" } },
        [TOPPERS]: { status: 200, body: zipBody(300_000, "z1") },
        ...CIRCULAR_ROUTES,
      }),
    });
    assert.deepEqual(ops, [
      "save cbse/files/science-sqp.pdf",
      "save cbse/files/science-toppers.zip",
      "save cbse/manifest.tmp.json",
      "copy cbse/manifest.tmp.json -> cbse/manifest.json",
      "remove cbse/manifest.tmp.json",
    ]);
    assert.deepEqual(created, []);
    const file = objects.get("cbse/files/science-sqp.pdf");
    assert.equal(file?.meta?.cacheControl, "public, max-age=300");
    assert.equal(file?.meta?.contentDisposition, 'attachment; filename="CBSE Class 10 Science - Sample paper 2025-26.pdf"');
    assert.equal(file?.meta?.contentType, "application/pdf");
    const manifest = writtenManifest(objects);
    assert.deepEqual(validateManifest(manifest), []);
    assert.deepEqual(
      manifest.papers.map((p) => [p.id, p.status, p.storagePath, p.sessionYear, p.etag]),
      [
        ["science-sqp", "ok", "cbse/files/science-sqp.pdf", "2025-26", '"e1"'],
        ["science-toppers", "ok", "cbse/files/science-toppers.zip", "2025", null],
      ],
    );
    assert.equal(manifest.circulars.length, 30);
    assert.equal(manifest.circularsCheckedAt, NOW.toISOString());
    assert.equal(result.manifest.generatedAt, NOW.toISOString());
  });

  it("a paper whose first download fails a guard is NOT mirrored and is 'stale'", async () => {
    const { storage, ops, objects } = fakeStorage(null);
    const { tracker, created } = fakeIssues();
    await runMirror({
      now: NOW, papers: PAPERS, storage, issues: tracker, dryRun: false, log: quiet,
      fetch: fakeFetch({
        [URL_2526]: { status: 200, body: "<html>maintenance</html>" },
        [TOPPERS]: { status: 200, body: zipBody(300_000, "z1") },
        ...CIRCULAR_ROUTES,
      }),
    });
    assert.equal(ops.includes("save cbse/files/science-sqp.pdf"), false);
    const entry = writtenManifest(objects).papers.find((p) => p.id === "science-sqp");
    assert.deepEqual([entry?.status, entry?.storagePath], ["stale", null]);
    assert.deepEqual(created.map((c) => c.title), ["CBSE mirror: rejected update for Science: Sample paper"]);
    assert.match(created[0].body, /`magic-bytes`/);
  });
});

describe("C3 — freshness by conditional GET", () => {
  it("sends If-None-Match / If-Modified-Since and treats 304 as unchanged: no file write", async () => {
    const seen: { url: string; headers: Record<string, string> }[] = [];
    const { storage, ops, objects } = fakeStorage(seededManifest());
    await runMirror({
      now: NOW, papers: PAPERS, storage, issues: fakeIssues().tracker, dryRun: false, log: quiet,
      fetch: fakeFetch({ [URL_2526]: { status: 304 }, [TOPPERS]: { status: 304 }, ...CIRCULAR_ROUTES }, seen),
    });
    const request = seen.find((s) => s.url === URL_2526);
    assert.equal(request?.headers["If-None-Match"], '"old-etag"');
    assert.equal(request?.headers["If-Modified-Since"], "Thu, 26 Jun 2025 06:07:50 GMT");
    assert.equal(ops.some((op) => op.startsWith("save cbse/files/")), false);
    const entry = writtenManifest(objects).papers[0];
    assert.deepEqual([entry.status, entry.checkedAt, entry.sha256], ["ok", NOW.toISOString(), "a".repeat(64)]);
  });
});

describe("C5 — replace: archive first, then overwrite, then an issue", () => {
  it("a changed source that passes the guards is archived, replaced and reported", async () => {
    const { storage, ops, objects } = fakeStorage(seededManifest());
    const { tracker, created } = fakeIssues();
    await runMirror({
      now: NOW, papers: PAPERS, storage, issues: tracker, dryRun: false, log: quiet,
      fetch: fakeFetch({
        [URL_2526]: { status: 200, body: pdf(210_000, "v2"), headers: { etag: '"e2"', "last-modified": "Wed, 23 Sep 2026 06:25:36 GMT" } },
        [TOPPERS]: { status: 304 },
        ...CIRCULAR_ROUTES,
      }),
    });
    assert.deepEqual(ops.slice(0, 2), [
      "copy cbse/files/science-sqp.pdf -> cbse/archive/science-sqp/2026-09-26.pdf",
      "save cbse/files/science-sqp.pdf",
    ]);
    assert.equal(ops.at(-2), "copy cbse/manifest.tmp.json -> cbse/manifest.json");
    assert.deepEqual(created.map((c) => c.title), ["CBSE mirror: replaced Science: Sample paper"]);
    assert.match(created[0].body, /Old source: https:\/\/cbseacademic/);
    assert.match(created[0].body, /New source: https:\/\/cbseacademic/);
    const entry = writtenManifest(objects).papers[0];
    assert.deepEqual([entry.status, entry.bytes, entry.etag], ["ok", 210_000, '"e2"']);
  });

  it("a candidate that fails a guard leaves the live copy untouched and names the guard", async () => {
    const { storage, ops, objects } = fakeStorage(seededManifest());
    const { tracker, created } = fakeIssues();
    await runMirror({
      now: NOW, papers: PAPERS, storage, issues: tracker, dryRun: false, log: quiet,
      fetch: fakeFetch({
        // 60,000 bytes vs 200,000 live = 0.3x: size-ratio
        [URL_2526]: { status: 200, body: pdf(60_000, "tiny"), headers: { "last-modified": "Wed, 23 Sep 2026 06:25:36 GMT" } },
        [TOPPERS]: { status: 304 },
        ...CIRCULAR_ROUTES,
      }),
    });
    assert.equal(ops.some((op) => op.includes("cbse/files/science-sqp.pdf")), false, ops.join("\n"));
    assert.deepEqual(created.map((c) => c.title), ["CBSE mirror: rejected update for Science: Sample paper"]);
    assert.match(created[0].body, /`size-ratio`/);
    const entry = writtenManifest(objects).papers[0];
    assert.deepEqual([entry.status, entry.sha256, entry.etag], ["stale", "a".repeat(64), '"old-etag"']);
  });

  it("★ an issue whose title is already OPEN is not opened again", async () => {
    const { storage } = fakeStorage(seededManifest());
    const { tracker, created } = fakeIssues(["CBSE mirror: rejected update for Science: Sample paper"]);
    const result = await runMirror({
      now: NOW, papers: PAPERS, storage, issues: tracker, dryRun: false, log: quiet,
      fetch: fakeFetch({ [URL_2526]: { status: 200, body: "<html/>" }, [TOPPERS]: { status: 304 }, ...CIRCULAR_ROUTES }),
    });
    // PRECONDITION: the run DID want that issue — the dedupe is what dropped it.
    assert.equal(result.issues.length, 1);
    assert.deepEqual(created, []);
  });
});

describe("C6 — source gone", () => {
  it("404 keeps the mirrored copy, marks the paper source-missing, opens one issue", async () => {
    const { storage, ops, objects } = fakeStorage(seededManifest());
    const { tracker, created } = fakeIssues();
    await runMirror({
      now: NOW, papers: PAPERS, storage, issues: tracker, dryRun: false, log: quiet,
      fetch: fakeFetch({ [URL_2526]: { status: 404 }, [TOPPERS]: { status: 410 }, ...CIRCULAR_ROUTES }),
    });
    assert.equal(ops.some((op) => op.startsWith("remove cbse/files") || op.startsWith("save cbse/files")), false);
    const papers = writtenManifest(objects).papers;
    assert.deepEqual(papers.map((p) => [p.status, p.storagePath]), [
      ["source-missing", "cbse/files/science-sqp.pdf"],
      ["source-missing", "cbse/files/science-toppers.zip"],
    ]);
    assert.deepEqual(created.map((c) => c.title).sort(), [
      "CBSE mirror: source missing for Science: Sample paper",
      "CBSE mirror: source missing for Science: Toppers' answer sheets, 2025",
    ]);
  });

  it("a network error keeps the previous status and opens nothing", async () => {
    const { storage, objects } = fakeStorage(seededManifest());
    const { tracker, created } = fakeIssues();
    const failing: FetchLike = async (url, init) => {
      if (url === URL_2526) throw new Error("ECONNRESET");
      return fakeFetch({ [TOPPERS]: { status: 304 }, ...CIRCULAR_ROUTES })(url, init);
    };
    await runMirror({ now: NOW, papers: PAPERS, storage, issues: tracker, dryRun: false, log: quiet, fetch: failing });
    assert.equal(writtenManifest(objects).papers[0].status, "ok");
    assert.deepEqual(created, []);
  });
});

describe("C7 — the new session", () => {
  it("ingests the 2026-27 paper through the guards, archiving the 2025-26 copy", async () => {
    const { storage, ops, objects } = fakeStorage(seededManifest());
    const { tracker, created } = fakeIssues();
    await runMirror({
      now: NOW, papers: PAPERS, storage, issues: tracker, dryRun: false, log: quiet,
      fetch: fakeFetch({
        [URL_2526]: { status: 304 },
        [TOPPERS]: { status: 304 },
        [SQP_INDEX]: { status: 200, body: SQP_2627_HTML },
        [URL_2627]: { status: 200, body: pdf(190_000, "2627"), headers: { etag: '"n1"', "last-modified": "Wed, 23 Sep 2026 06:25:36 GMT" } },
        ...CIRCULAR_ROUTES,
      }),
    });
    assert.deepEqual(ops.slice(0, 2), [
      "copy cbse/files/science-sqp.pdf -> cbse/archive/science-sqp/2026-09-26.pdf",
      "save cbse/files/science-sqp.pdf",
    ]);
    const entry = writtenManifest(objects).papers[0];
    assert.deepEqual([entry.sourceUrl, entry.sessionYear, entry.status], [URL_2627, "2026-27", "ok"]);
    const titles = created.map((c) => c.title);
    assert.ok(titles.includes("CBSE mirror: replaced Science: Sample paper"));
    // unmapped Science/Maths links on that index are REPORTED, never ingested
    assert.ok(titles.includes("CBSE mirror: unmapped links in the 2026-27 sample-paper index"));
    const unmapped = created.find((c) => c.title.includes("unmapped"))!;
    assert.match(unmapped.body, /MathsStandardVIC-SQP\.pdf/);
    assert.equal(ops.some((op) => /VIC|_hi/.test(op)), false);
  });

  it("does not re-ingest a session it already holds (no daily churn)", async () => {
    const seeded = seededManifest();
    const held = { ...seeded, papers: [{ ...seeded.papers[0], sourceUrl: URL_2627, sessionYear: "2026-27" }, seeded.papers[1]] };
    const { storage, ops } = fakeStorage(held);
    const { tracker, created } = fakeIssues();
    await runMirror({
      now: NOW, papers: PAPERS, storage, issues: tracker, dryRun: false, log: quiet,
      fetch: fakeFetch({
        [URL_2627]: { status: 304 },
        [TOPPERS]: { status: 304 },
        [SQP_INDEX]: { status: 200, body: SQP_2627_HTML },
        ...CIRCULAR_ROUTES,
      }),
    });
    assert.equal(ops.some((op) => op.startsWith("save cbse/files") || op.startsWith("copy cbse/files")), false);
    assert.deepEqual(created, []);
  });

  it("a new-session candidate that fails a guard is rejected, not installed", async () => {
    const { storage, ops } = fakeStorage(seededManifest());
    const { tracker, created } = fakeIssues();
    await runMirror({
      now: NOW, papers: PAPERS, storage, issues: tracker, dryRun: false, log: quiet,
      fetch: fakeFetch({
        [URL_2526]: { status: 304 },
        [TOPPERS]: { status: 304 },
        [SQP_INDEX]: { status: 200, body: SQP_2627_HTML },
        [URL_2627]: { status: 200, body: "<html>not a pdf</html>" },
        ...CIRCULAR_ROUTES,
      }),
    });
    assert.equal(ops.some((op) => op.includes("cbse/files/science-sqp.pdf")), false);
    assert.ok(created.some((c) => c.title === "CBSE mirror: rejected update for Science: Sample paper" && /C7/.test(c.body)));
  });
});

describe("C8 — circulars guard in a run", () => {
  it("a broken page keeps the previous feed and its date, and opens an issue", async () => {
    const { storage, objects } = fakeStorage(seededManifest());
    const { tracker, created } = fakeIssues();
    await runMirror({
      now: NOW, papers: PAPERS, storage, issues: tracker, dryRun: false, log: quiet,
      fetch: fakeFetch({
        [URL_2526]: { status: 304 },
        [TOPPERS]: { status: 304 },
        [GOV_INDEX_URL]: { status: 200, body: "<html>redesigned</html>" },
        [ACADEMIC_INDEX_URL]: { status: 503 },
      }),
    });
    const manifest = writtenManifest(objects);
    assert.equal(manifest.circulars.length, 30);
    assert.equal(manifest.circularsCheckedAt, "2026-09-25T00:30:00.000Z");
    assert.equal(manifest.circulars[0].title, "Date sheet for Class X 2027");
    assert.deepEqual(created.map((c) => c.title), ["CBSE mirror: circulars feed rejected"]);
    assert.match(created[0].body, /HTTP 503/);
  });
});

describe("★ C10 — dry run writes NOTHING and opens nothing", () => {
  it("fetches, plans, and makes zero storage writes and zero issues", async () => {
    const { storage, ops } = fakeStorage(seededManifest());
    const { tracker, created } = fakeIssues();
    const logged: string[] = [];
    const result = await runMirror({
      now: NOW, papers: PAPERS, storage, issues: tracker, dryRun: true, log: (l) => logged.push(l),
      fetch: fakeFetch({
        [URL_2526]: { status: 200, body: pdf(210_000, "v2"), headers: { "last-modified": "Wed, 23 Sep 2026 06:25:36 GMT" } },
        [TOPPERS]: { status: 404 },
        [SQP_INDEX]: { status: 200, body: SQP_2627_HTML },
        [URL_2627]: { status: 200, body: pdf(190_000, "2627"), headers: { "last-modified": "Wed, 23 Sep 2026 07:00:00 GMT" } },
        ...CIRCULAR_ROUTES,
      }),
    });
    // PRECONDITION: this run found real work to plan — replacement, a missing source.
    assert.ok(result.plan.some((l) => l.includes("REPLACE")), result.plan.join("\n"));
    assert.ok(result.issues.length >= 2);
    assert.deepEqual(ops, []);
    assert.deepEqual(created, []);
    assert.deepEqual(result.opened, []);
    assert.ok(logged.every((l) => l.startsWith("[dry-run] ")));
    assert.ok(logged.some((l) => l.includes("issue (would open)")));
  });
});

describe("C10 — manifest shape", () => {
  it("the validator accepts the seeded shape and rejects each broken field", () => {
    const good = seededManifest();
    assert.deepEqual(validateManifest(good), []);
    const bad = (mutate: (m: Record<string, unknown>) => void) => {
      const m = JSON.parse(JSON.stringify(good)) as Record<string, unknown>;
      mutate(m);
      return validateManifest(m);
    };
    assert.notDeepEqual(bad((m) => (m.v = 2)), []);
    assert.notDeepEqual(bad((m) => ((m.papers as Record<string, unknown>[])[0].status = "fine")), []);
    assert.notDeepEqual(bad((m) => ((m.papers as Record<string, unknown>[])[0].storagePath = "ncert/x.pdf")), []);
    assert.notDeepEqual(bad((m) => ((m.papers as Record<string, unknown>[])[1].id = "science-sqp")), []);
    assert.notDeepEqual(bad((m) => delete (m.papers as Record<string, unknown>[])[0].etag), []);
    assert.notDeepEqual(bad((m) => ((m.circulars as Record<string, unknown>[])[0].href = "javascript:alert(1)")), []);
    assert.notDeepEqual(bad((m) => ((m.circulars as Record<string, unknown>[])[1].headline = "Something")), []);
  });

  it("★ C9 — an important row with a headline outside the rule table is refused", () => {
    const m = seededManifest();
    const invented = { ...m, circulars: [{ ...m.circulars[0], headline: "Big CBSE news today!" }] };
    assert.ok(validateManifest(invented).some((e) => e.includes("C9")));
    // CONTROL — every real table headline is accepted
    for (const rule of HEADLINE_RULES) {
      assert.deepEqual(validateManifest({ ...m, circulars: [{ ...m.circulars[0], headline: rule.headline }] }), []);
    }
  });

  it("dedupe collapses repeats within a run and against the open set", () => {
    const a = { title: "A", body: "1" };
    const b = { title: "B", body: "2" };
    assert.deepEqual(dedupeIssues([a, a, b], new Set()), [a, b]);
    assert.deepEqual(dedupeIssues([a, b], new Set(["A"])), [b]);
  });
});
