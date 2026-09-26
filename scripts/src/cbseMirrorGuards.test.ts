import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

import {
  MIN_BYTES,
  evaluateCandidate,
  hasMagic,
  parseSessionYear,
  pdfHasPage,
  sessionKey,
  subjectOfUrl,
  type LiveCopy,
} from "../cbse-mirror/guards";
import {
  MIRROR_PAPERS,
  archivePathFor,
  contentDispositionFor,
  storagePathFor,
} from "../cbse-mirror/papers";
import { USER_AGENT, resolveDryRun } from "../cbse-mirror/mirror";
import { assertCbsePath, guardedStorage, type MirrorStorage } from "../cbse-mirror/storage";

/**
 * GUARD — CBSE-AUTO-1 C4 (the replacement guards), C2 (stable ids), C1 (the
 * workflow's triggers, permissions, dry-run default and write prefix).
 *
 * ★ EVERY GUARD IS PROVED TWICE: once FIRING on a candidate built to fail exactly
 * that guard, and once SILENT on the good control that differs from it only there.
 * A guard test that only ever sees good files passes just as well with the guard
 * deleted — the control pair is what makes a deletion go red.
 *
 * No network: every candidate is built in memory.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");

const SCIENCE_SQP = MIRROR_PAPERS.find((p) => p.id === "science-sqp")!;
const SCIENCE_TOPPERS = MIRROR_PAPERS.find((p) => p.id === "science-toppers")!;
const URL_2526 = "https://cbseacademic.nic.in/web_material/SQP/ClassX_2025_26/Science-SQP.pdf";
const URL_2627 = "https://cbseacademic.nic.in/web_material/SQP/ClassX_2026_27/Science-SQP.pdf";

function padded(head: string, size: number): Uint8Array {
  const buf = Buffer.alloc(size, 0x20);
  buf.write(head, 0, "latin1");
  return new Uint8Array(buf);
}

/** A PDF whose page dictionary is in plain view. */
function plainPdf(size = 200_000, tag = "a"): Uint8Array {
  return padded(`%PDF-1.7\n%${tag}\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n`, size);
}

/** A PDF whose ONLY page dictionary is inside a Flate-compressed object stream —
 *  the shape of the live CFPQ_Science10.pdf, measured 2026-09-26. */
function objStmPdf(size = 200_000): Uint8Array {
  const inner = deflateSync(Buffer.from("3 0 << /Type /Page /Parent 2 0 R >>", "latin1"));
  const head = Buffer.from(
    `%PDF-1.7\n5 0 obj\n<< /Type /ObjStm /N 1 /First 4 /Filter /FlateDecode /Length ${inner.length} >>\nstream\n`,
    "latin1",
  );
  const tail = Buffer.from("\nendstream\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n", "latin1");
  const body = Buffer.concat([head, inner, tail]);
  const buf = Buffer.alloc(Math.max(size, body.length), 0x20);
  body.copy(buf);
  return new Uint8Array(buf);
}

function zip(size = 200_000): Uint8Array {
  return padded("PK\x03\x04rest-of-zip", size);
}

const LIVE: LiveCopy = {
  bytes: 200_000,
  sessionYear: "2025-26",
  lastModified: "Thu, 26 Jun 2025 06:07:50 GMT",
};
const LATER = "Wed, 23 Sep 2026 06:25:36 GMT";

describe("C4 — the good control passes every guard", () => {
  it("a same-URL refresh with a later Last-Modified passes", () => {
    const result = evaluateCandidate(SCIENCE_SQP, { url: URL_2526, body: plainPdf(), lastModified: LATER }, LIVE);
    assert.deepEqual(result, { pass: true, failed: [] });
  });

  it("a first seed (no live copy) skips the comparative guards and passes", () => {
    const result = evaluateCandidate(SCIENCE_SQP, { url: URL_2526, body: plainPdf(60_000), lastModified: null }, null);
    assert.deepEqual(result, { pass: true, failed: [] });
  });

  it("a ZIP paper passes with ZIP magic and needs no page marker", () => {
    const url = "https://www.cbse.gov.in/cbsenew/model-answer/2025/X/Science.zip";
    const result = evaluateCandidate(SCIENCE_TOPPERS, { url, body: zip(), lastModified: null }, null);
    assert.deepEqual(result, { pass: true, failed: [] });
  });
});

describe("C4 — each guard FIRES on the candidate built to fail it", () => {
  const good = { url: URL_2526, lastModified: LATER };

  it("magic-bytes: an HTML error page served with 200", () => {
    const html = padded("<!DOCTYPE html><html>404 /Type /Page</html>", 200_000);
    const r = evaluateCandidate(SCIENCE_SQP, { ...good, body: html }, LIVE);
    assert.ok(r.failed.includes("magic-bytes"), JSON.stringify(r));
    assert.equal(r.pass, false);
    // and a PDF offered for a ZIP paper
    const z = evaluateCandidate(SCIENCE_TOPPERS, { url: "https://www.cbse.gov.in/x/Science.zip", body: plainPdf(), lastModified: null }, null);
    assert.ok(z.failed.includes("magic-bytes"));
  });

  it("min-size: 49,999 bytes fails, 50,000 passes", () => {
    const small = evaluateCandidate(SCIENCE_SQP, { ...good, body: plainPdf(MIN_BYTES - 1) }, null);
    assert.ok(small.failed.includes("min-size"), JSON.stringify(small));
    const edge = evaluateCandidate(SCIENCE_SQP, { ...good, body: plainPdf(MIN_BYTES) }, null);
    assert.equal(edge.failed.includes("min-size"), false);
  });

  it("size-ratio: under 0.33x or over 3x the live copy fails; inside passes", () => {
    const shrunk = evaluateCandidate(SCIENCE_SQP, { ...good, body: plainPdf(65_000) }, LIVE);
    assert.ok(shrunk.failed.includes("size-ratio"), JSON.stringify(shrunk));
    const grown = evaluateCandidate(SCIENCE_SQP, { ...good, body: plainPdf(601_000) }, LIVE);
    assert.ok(grown.failed.includes("size-ratio"), JSON.stringify(grown));
    const fine = evaluateCandidate(SCIENCE_SQP, { ...good, body: plainPdf(599_000) }, LIVE);
    assert.equal(fine.failed.includes("size-ratio"), false);
  });

  it("subject-token: a Maths file, a Social Science file and a Home Science file for a Science paper", () => {
    for (const url of [
      "https://cbseacademic.nic.in/web_material/SQP/ClassX_2026_27/MathsStandard-SQP.pdf",
      "https://cbseacademic.nic.in/web_material/SQP/ClassX_2026_27/SocialScience-SQP.pdf",
      "https://cbseacademic.nic.in/web_material/SQP/ClassX_2026_27/HomeScience-SQP.pdf",
    ]) {
      const r = evaluateCandidate(SCIENCE_SQP, { url, body: plainPdf(), lastModified: LATER }, LIVE);
      assert.ok(r.failed.includes("subject-token"), url);
    }
  });

  it("★ CA-1: a NEW-SESSION candidate at 5.9x is accepted; a SAME-SESSION one at 5.9x is rejected", () => {
    // The measured case: 2026-27 MathsStandard-SQP.pdf 3,014,269 B vs 511,677 B live.
    const live: LiveCopy = { bytes: 511_677, sessionYear: "2025-26", lastModified: LIVE.lastModified };
    const big = plainPdf(3_014_269);
    const fresh = evaluateCandidate(SCIENCE_SQP, { url: URL_2627, body: big, lastModified: LATER }, live, {
      requireLaterSession: true,
    });
    assert.deepEqual(fresh, { pass: true, failed: [] });
    const same = evaluateCandidate(SCIENCE_SQP, { url: URL_2526, body: big, lastModified: LATER }, live);
    assert.deepEqual(same.failed, ["size-ratio"]);
  });

  it("CA-1 keeps the 0.33x FLOOR for a new-session candidate", () => {
    const shrunk = evaluateCandidate(
      SCIENCE_SQP,
      { url: URL_2627, body: plainPdf(65_000), lastModified: LATER },
      LIVE,
      { requireLaterSession: true },
    );
    assert.deepEqual(shrunk.failed, ["size-ratio"]);
  });

  it("session-year: an earlier session fails; the same session passes (>=); C7 demands strictly later", () => {
    const older = "https://cbseacademic.nic.in/web_material/SQP/ClassX_2024_25/Science-SQP.pdf";
    assert.ok(evaluateCandidate(SCIENCE_SQP, { url: older, body: plainPdf(), lastModified: LATER }, LIVE).failed.includes("session-year"));
    assert.equal(evaluateCandidate(SCIENCE_SQP, { url: URL_2526, body: plainPdf(), lastModified: LATER }, LIVE).failed.includes("session-year"), false);
    const sameStrict = evaluateCandidate(SCIENCE_SQP, { url: URL_2526, body: plainPdf(), lastModified: LATER }, LIVE, { requireLaterSession: true });
    assert.ok(sameStrict.failed.includes("session-year"));
    const later = evaluateCandidate(SCIENCE_SQP, { url: URL_2627, body: plainPdf(), lastModified: LATER }, LIVE, { requireLaterSession: true });
    assert.deepEqual(later, { pass: true, failed: [] });
    // a live copy with a year and a candidate URL with none is not "not earlier"
    const yearless = "https://cbseacademic.nic.in/web_material/SQP/Science-SQP.pdf";
    assert.ok(evaluateCandidate(SCIENCE_SQP, { url: yearless, body: plainPdf(), lastModified: LATER }, LIVE).failed.includes("session-year"));
  });

  it("last-modified: equal or earlier than the live copy's fails; skipped when either is missing", () => {
    const same = evaluateCandidate(SCIENCE_SQP, { url: URL_2526, body: plainPdf(), lastModified: LIVE.lastModified }, LIVE);
    assert.ok(same.failed.includes("last-modified"), JSON.stringify(same));
    const earlier = evaluateCandidate(SCIENCE_SQP, { url: URL_2526, body: plainPdf(), lastModified: "Mon, 01 Jan 2024 00:00:00 GMT" }, LIVE);
    assert.ok(earlier.failed.includes("last-modified"));
    const unknown = evaluateCandidate(SCIENCE_SQP, { url: URL_2526, body: plainPdf(), lastModified: null }, LIVE);
    assert.equal(unknown.failed.includes("last-modified"), false);
  });

  it("pdf-page: a PDF with only /Type /Pages (no page) fails", () => {
    const noPage = padded("%PDF-1.7\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n", 200_000);
    const r = evaluateCandidate(SCIENCE_SQP, { url: URL_2526, body: noPage, lastModified: LATER }, LIVE);
    assert.deepEqual(r.failed, ["pdf-page"]);
  });

  it("reports EVERY failed guard, not just the first", () => {
    const html = padded("<html>", 1_000);
    const r = evaluateCandidate(SCIENCE_SQP, { url: "https://x.example/MathsX.pdf", body: html, lastModified: null }, LIVE);
    for (const name of ["magic-bytes", "min-size", "size-ratio", "subject-token", "pdf-page"]) {
      assert.ok(r.failed.includes(name as never), `${name} missing from ${JSON.stringify(r.failed)}`);
    }
  });
});

describe("C4 pdf-page — object streams (the CFPQ_Science10.pdf shape)", () => {
  it("finds a page dictionary that exists ONLY inside a Flate /ObjStm", () => {
    const pdf = objStmPdf();
    // PRECONDITION: the raw bytes really carry no plain page marker — otherwise this
    // test would pass on the raw scan alone and prove nothing about inflation.
    assert.equal(/\/Type\s*\/Page(?![A-Za-z])/.test(Buffer.from(pdf).toString("latin1")), false);
    assert.equal(pdfHasPage(pdf), true);
  });

  it("CONTROL — the same object stream holding only /Type /Pages is still rejected", () => {
    const inner = deflateSync(Buffer.from("2 0 << /Type /Pages /Count 0 >>", "latin1"));
    const body = Buffer.concat([
      Buffer.from("%PDF-1.7\n5 0 obj\n<< /Type /ObjStm /N 1 /First 4 /Filter /FlateDecode >>\nstream\n", "latin1"),
      inner,
      Buffer.from("\nendstream\nendobj\n", "latin1"),
    ]);
    assert.equal(pdfHasPage(new Uint8Array(body)), false);
  });
});

describe("parsers behind the guards", () => {
  it("session years are read from CBSE's real path shapes", () => {
    assert.equal(parseSessionYear(URL_2526), "2025-26");
    assert.equal(parseSessionYear("https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Science_SecP1_2026-27.pdf"), "2026-27");
    assert.equal(parseSessionYear("https://www.cbse.gov.in/cbsenew/model-answer/2025/X/Science.zip"), "2025");
    assert.equal(parseSessionYear("https://cbseacademic.nic.in/web_material/Manuals/CFPQ_Science10.pdf"), null);
    // a date-like pair is not a session
    assert.equal(parseSessionYear("https://x.example/docs/2026_01/file.pdf"), "2026");
    assert.equal(sessionKey("2026-27"), 2026);
    assert.equal(sessionKey("2025"), 2024);
    assert.equal(sessionKey(null), null);
  });

  it("subjects are read from the filename, with Home/Social Science excluded", () => {
    assert.equal(subjectOfUrl(URL_2627), "science");
    assert.equal(subjectOfUrl("https://cbseacademic.nic.in/cbe/documents/Item-Bank--Maths---Class-10.pdf"), "maths");
    assert.equal(subjectOfUrl("https://www.cbse.gov.in/cbsenew/model-answer/2025/X/Math_Stand.zip"), "maths");
    assert.equal(subjectOfUrl("https://x.example/SocialScience-SQP.pdf"), "other");
    assert.equal(subjectOfUrl("https://x.example/English-SQP.pdf"), null);
  });

  it("magic bytes are exact", () => {
    assert.equal(hasMagic(plainPdf(), "pdf"), true);
    assert.equal(hasMagic(zip(), "zip"), true);
    assert.equal(hasMagic(zip(), "pdf"), false);
    assert.equal(hasMagic(new Uint8Array([0x25, 0x50]), "pdf"), false);
  });

  it("EVERY committed paper passes its own subject-token guard (the live URLs are not self-rejecting)", () => {
    assert.ok(MIRROR_PAPERS.length >= 15);
    for (const paper of MIRROR_PAPERS) {
      assert.equal(subjectOfUrl(paper.href), paper.subject, `${paper.id} ${paper.href}`);
    }
  });
});

describe("C2 — stable ids and the storage layout", () => {
  it("every paper has a unique kebab-case id", () => {
    const ids = MIRROR_PAPERS.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, "duplicate id");
    for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(ids.includes("science-sqp"));
  });

  it("files, archives and download names follow C3/C5", () => {
    assert.equal(storagePathFor(SCIENCE_SQP), "cbse/files/science-sqp.pdf");
    assert.equal(storagePathFor(SCIENCE_TOPPERS), "cbse/files/science-toppers.zip");
    assert.equal(archivePathFor(SCIENCE_SQP, new Date("2026-09-26T00:30:00Z")), "cbse/archive/science-sqp/2026-09-26.pdf");
    const cd = contentDispositionFor(SCIENCE_SQP, "2026-27");
    assert.equal(cd, 'attachment; filename="CBSE Class 10 Science - Sample paper 2026-27.pdf"');
    // ASCII only, even for a title with an em dash and an apostrophe
    for (const paper of MIRROR_PAPERS) {
      assert.match(contentDispositionFor(paper, null), /^attachment; filename="[\x20-\x7e]+"$/, paper.id);
    }
  });
});

describe("C1 — writes only under cbse/", () => {
  it("the path rule refuses anything outside cbse/, and traversal", () => {
    assert.doesNotThrow(() => assertCbsePath("cbse/files/science-sqp.pdf"));
    for (const bad of ["ncert/science/ch1.pdf", "cbse/../ncert/x", "manifest.json", "/cbse/files/x", "cbse//x"]) {
      assert.throws(() => assertCbsePath(bad), /only under cbse\//, bad);
    }
  });

  it("the guarded storage never forwards a write outside cbse/", async () => {
    const calls: string[] = [];
    const inner: MirrorStorage = {
      readManifest: async () => null,
      save: async (path) => void calls.push(`save ${path}`),
      copy: async (from, to) => void calls.push(`copy ${from} ${to}`),
      remove: async (path) => void calls.push(`remove ${path}`),
    };
    const guarded = guardedStorage(inner);
    await guarded.save("cbse/files/a.pdf", new Uint8Array(1), { contentType: "x", cacheControl: "y" });
    await assert.rejects(guarded.save("other/a.pdf", new Uint8Array(1), { contentType: "x", cacheControl: "y" }));
    await assert.rejects(guarded.copy("cbse/files/a.pdf", "public/a.pdf"));
    await assert.rejects(guarded.remove("x"));
    assert.deepEqual(calls, ["save cbse/files/a.pdf"]);
  });
});

describe("C1 — dry run is the default for a manual run", () => {
  it("a scheduled run writes; a manual run is dry unless dry_run is false; anything else is dry", () => {
    assert.equal(resolveDryRun("schedule", ""), false);
    assert.equal(resolveDryRun("schedule", undefined), false);
    assert.equal(resolveDryRun("workflow_dispatch", "true"), true);
    // ★ THE DEFAULT PATH: a manual run that passes nothing is a dry run.
    assert.equal(resolveDryRun("workflow_dispatch", ""), true);
    assert.equal(resolveDryRun("workflow_dispatch", undefined), true);
    assert.equal(resolveDryRun("workflow_dispatch", "false"), false);
    assert.equal(resolveDryRun("pull_request", "false"), true);
    assert.equal(resolveDryRun(undefined, undefined), true);
  });
});

describe("the User-Agent the job sends", () => {
  it("carries no URL — www.cbse.gov.in answered 403 to one that did (measured 2026-09-26)", () => {
    assert.match(USER_AGENT, /^Mozilla\/5\.0 /);
    assert.doesNotMatch(USER_AGENT, /https?:|\+|\.com|\.in\b|github/i);
    // CONTROL — the same pattern does catch the string that got the 403.
    assert.match(
      "Mozilla/5.0 (compatible; LazyTopper-cbse-mirror/1; +https://github.com/chetan-anand-hub/Lazytopper-Production)",
      /https?:|\+|\.com|\.in\b|github/i,
    );
  });
});

describe("C1 — the workflow file", () => {
  const yml = readFileSync(resolve(REPO, ".github/workflows/cbse-mirror.yml"), "utf8");
  const code = yml
    .split(/\r?\n/)
    .filter((line) => !/^\s*#/.test(line))
    .join("\n");

  it("runs daily at 00:30 UTC (06:00 IST) and on manual dispatch — never on a PR or a push", () => {
    assert.match(code, /schedule:\s*\n\s*-\s*cron:\s*"30 0 \* \* \*"/);
    assert.match(code, /workflow_dispatch:/);
    assert.doesNotMatch(code, /pull_request/);
    assert.doesNotMatch(code, /^\s*push:/m);
  });

  it("★ the manual dry_run input defaults to TRUE", () => {
    assert.match(code, /dry_run:\s*\n(?:\s+\w+:.*\n)*?\s+type:\s*boolean\s*\n\s+default:\s*true/);
  });

  it("declares contents: read and issues: write, nothing broader", () => {
    assert.match(code, /permissions:\s*\n\s+contents:\s*read\s*\n\s+issues:\s*write/);
    assert.doesNotMatch(code, /contents:\s*write/);
  });

  it("hands the key over only via one step's env, only for a writing run, and never echoes it", () => {
    const uses = code.match(/secrets\.FIREBASE_SERVICE_ACCOUNT/g) ?? [];
    assert.equal(uses.length, 1);
    assert.match(code, /FIREBASE_SERVICE_ACCOUNT: \$\{\{ \(github\.event_name == 'schedule' \|\| inputs\.dry_run == false\) && secrets\.FIREBASE_SERVICE_ACCOUNT \|\| '' \}\}/);
    assert.doesNotMatch(code, /echo[^\n]*FIREBASE_SERVICE_ACCOUNT/);
    assert.doesNotMatch(code, />\s*[^\n]*\.json/);
  });

  it("uses the same checkout/setup-node versions as trunk's quality gate", () => {
    const gate = readFileSync(resolve(REPO, ".github/workflows/quality-gate.yml"), "utf8");
    for (const action of ["actions/checkout", "actions/setup-node"]) {
      const want = gate.match(new RegExp(`${action}@(v\\d+)`))?.[1];
      assert.ok(want, `${action} not found in quality-gate.yml`);
      assert.match(code, new RegExp(`${action}@${want}\\b`));
    }
  });
});
