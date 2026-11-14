import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ACADEMIC_INDEX_URL, GOV_INDEX_URL, type Circular } from "../cbse-mirror/circulars";
import { dedupeIssues, type IssueRequest, type IssueTracker } from "../cbse-mirror/issues";
import { runMirror, type FetchLike } from "../cbse-mirror/mirror";
import { REVIEW_HEADLINES, reviewIssueTitle, reviewIssues } from "../cbse-mirror/reviewFlags";
import { HEADLINE_RULES } from "../cbse-mirror/circulars";
import type { MirrorStorage } from "../cbse-mirror/storage";
import { CBSE_2027_REVIEWED_CIRCULAR_HREFS } from "../../lazytopper/src/pages/cbse2027Sources";

/**
 * GUARD — CBSE-LIVE-1: the mirror tells the owner when an important circular is not yet
 * reflected on /cbse/class-10. Fixture-based; no network, no GitHub, no Storage.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, "..", "cbse-mirror", "fixtures");
const GOV_HTML = readFileSync(resolve(FIXTURES, "cbse-gov-examination-circular.html"), "utf8");
const ACADEMIC_HTML = readFileSync(resolve(FIXTURES, "cbseacademic-circulars.html"), "utf8");
const NOW = new Date("2026-09-26T00:30:00Z");

const DS_HREF = "https://www.cbse.gov.in/cbsenew/documents/Datesheet_X_2027_Main_25092026.pdf";

function row(over: Partial<Circular>): Circular {
  return {
    id: "a".repeat(16),
    date: "2026-09-25",
    title: "Date Sheet for Class X and Class XII Board Examinations, 2027",
    href: DS_HREF,
    source: "document",
    origin: "cbse-gov",
    important: true,
    headline: "The 2027 board exam date sheet is out",
    ...over,
  };
}

describe("reviewIssues — the pure rule", () => {
  it("every review headline is a rule-table string (C9: no composed headlines)", () => {
    const table = new Set(HEADLINE_RULES.map((r) => r.headline));
    for (const headline of REVIEW_HEADLINES) assert.ok(table.has(headline), headline);
  });

  it("an important, unreviewed date sheet opens one issue titled from the headline, with the link", () => {
    const out = reviewIssues([row({})], new Set());
    assert.equal(out.length, 1);
    assert.equal(out[0].title, "CBSE: The 2027 board exam date sheet is out — review /cbse/class-10");
    assert.equal(out[0].title, reviewIssueTitle("The 2027 board exam date sheet is out"));
    assert.ok(out[0].body.includes(DS_HREF));
    assert.match(out[0].body, /CBSE_2027_REVIEWED_CIRCULAR_HREFS/);
  });

  it("CONTROL — the same circular, once its href is reviewed, opens nothing", () => {
    assert.equal(reviewIssues([row({})], new Set([DS_HREF])).length, 0);
  });

  it("covers admit card, result and the second-exam date sheet; ignores sample papers and expired rows", () => {
    const rows = [
      row({ id: "b".repeat(16), href: "https://x.test/admit.pdf", title: "Admit Card Class X", headline: "Board exam admit cards are out" }),
      row({ id: "c".repeat(16), href: "https://x.test/result.pdf", title: "Result Class X", headline: "Board exam results are out" }),
      row({ id: "d".repeat(16), href: "https://x.test/second.pdf", title: "Second board exam date sheet", headline: "The second board exam date sheet is out" }),
      row({ id: "e".repeat(16), href: "https://x.test/sqp.pdf", title: "Sample papers", headline: "New CBSE sample papers are out" }),
      row({ id: "f".repeat(16), href: "https://x.test/old.pdf", important: false, headline: "" }),
    ];
    assert.deepEqual(
      reviewIssues(rows, new Set()).map((i) => i.title),
      [
        "CBSE: Board exam admit cards are out — review /cbse/class-10",
        "CBSE: Board exam results are out — review /cbse/class-10",
        "CBSE: The second board exam date sheet is out — review /cbse/class-10",
      ],
    );
  });

  it("two circulars with one headline make ONE issue naming both links", () => {
    const out = reviewIssues([row({}), row({ id: "z".repeat(16), href: "https://x.test/rev.pdf" })], new Set());
    assert.equal(out.length, 1);
    assert.ok(out[0].body.includes(DS_HREF) && out[0].body.includes("https://x.test/rev.pdf"));
  });

  it("de-dupes against an issue already open under the same title", () => {
    const requests = reviewIssues([row({})], new Set());
    assert.equal(dedupeIssues(requests, new Set([requests[0].title])).length, 0);
    assert.equal(dedupeIssues(requests, new Set()).length, 1);
  });
});

describe("runMirror — the review issue in a whole (fixture) run", () => {
  const dateSheetRow = `<tr>
    <td style="color: #800000;">25/09/2026</td>
    <td>Date Sheet for Class X and Class XII Board Examinations, 2027</td>
    <td><a href="documents/Datesheet_X_2027_Main_25092026.pdf" target="_blank"><i>ENGLISH</i></a></td>
    <td></td><td class="text-center"></td><td> 1.0 MB</td>
  </tr>
  `;
  const govWithDateSheet = GOV_HTML.replace(/(<tr>\s*<td[^>]*>23\/09\/2026<\/td>)/, `${dateSheetRow}$1`);

  const fetchImpl: FetchLike = async (url) => {
    const body = url === GOV_INDEX_URL ? govWithDateSheet : url === ACADEMIC_INDEX_URL ? ACADEMIC_HTML : "<html>404</html>";
    return new Response(body, { status: url === GOV_INDEX_URL || url === ACADEMIC_INDEX_URL ? 200 : 404 });
  };
  const storage: MirrorStorage = {
    readManifest: async () => null,
    save: async () => {},
    copy: async () => {},
    remove: async () => {},
  };

  it("PRECONDITION: the injected row really parses as an important date sheet", async () => {
    const result = await runMirror({ now: NOW, fetch: fetchImpl, storage, issues: null, dryRun: true, log: () => {}, papers: [] });
    const found = result.manifest.circulars.find((c) => c.href === DS_HREF);
    assert.ok(found, "the injected circular did not reach the feed");
    assert.equal(found.important, true);
    assert.equal(found.headline, "The 2027 board exam date sheet is out");
  });

  it("a real run opens exactly one review issue; a second run with it OPEN opens none", async () => {
    const created: IssueRequest[] = [];
    let open: string[] = [];
    const tracker: IssueTracker = {
      openTitles: async () => new Set(open),
      create: async (r) => void created.push(r),
    };
    const args = { now: NOW, fetch: fetchImpl, storage, issues: tracker, dryRun: false, log: () => {}, papers: [] };
    await runMirror(args);
    const wanted = reviewIssueTitle("The 2027 board exam date sheet is out");
    assert.deepEqual(created.map((c) => c.title), [wanted]);
    open = [wanted];
    await runMirror(args);
    assert.equal(created.length, 1, "a still-open issue was opened again");
  });

  it("★ DRY RUN keeps its semantics — the issue is planned, nothing is opened", async () => {
    const lines: string[] = [];
    const result = await runMirror({ now: NOW, fetch: fetchImpl, storage, issues: null, dryRun: true, log: (l) => lines.push(l), papers: [] });
    assert.deepEqual(result.opened, []);
    assert.ok(result.issues.some((i) => i.title === reviewIssueTitle("The 2027 board exam date sheet is out")));
    assert.ok(lines.some((l) => l.includes("issue (would open): CBSE: The 2027 board exam date sheet is out")));
  });

  it("CONTROL — once the href is on the reviewed list the run wants no review issue", async () => {
    const result = await runMirror({
      now: NOW, fetch: fetchImpl, storage, issues: null, dryRun: true, log: () => {}, papers: [],
      reviewedHrefs: new Set([DS_HREF]),
    });
    assert.equal(result.issues.some((i) => /review \/cbse\/class-10/.test(i.title)), false);
  });

  it("the committed reviewed list already holds the released 2027 date sheet", () => {
    assert.ok(
      CBSE_2027_REVIEWED_CIRCULAR_HREFS.includes(
        "https://www.cbse.gov.in/cbsenew/documents/Datesheet_ClassX%20_XII_2027_Main_06112026.pdf",
      ),
    );
  });
});
