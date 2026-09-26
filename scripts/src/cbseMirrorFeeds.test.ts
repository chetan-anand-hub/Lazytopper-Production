import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ACADEMIC_INDEX_URL,
  FEED_SIZE,
  GOV_INDEX_URL,
  HEADLINE_RULES,
  buildCircularFeed,
  classifyCircular,
  feedGuard,
  isClassXIIOnly,
  isWithinDays,
  parseAcademicCirculars,
  parseGovCirculars,
  reclassify,
  ruleHeadline,
  type ParsedCircular,
} from "../cbse-mirror/circulars";
import { MIRROR_PAPERS } from "../cbse-mirror/papers";
import {
  currentSessionStartYear,
  mapSqpLinks,
  nextSessionIndexUrl,
  parseSqpIndexLinks,
} from "../cbse-mirror/sqpIndex";

/**
 * GUARD — CBSE-AUTO-1 C8 (both circular parsers, against the REAL pages), C9 (the
 * fixed headline table) and C7 (the new-session index).
 *
 * ★ THE FIXTURES ARE CBSE'S OWN PAGES, fetched ONCE on 2026-09-26 and committed under
 * `scripts/cbse-mirror/fixtures/`. No test here touches the network; a parser that
 * passes these is a parser that read what CBSE actually serves, not what someone
 * remembered it serving.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, "..", "cbse-mirror", "fixtures");
const read = (name: string) => readFileSync(resolve(FIXTURES, name), "utf8");

const GOV_HTML = read("cbse-gov-examination-circular.html");
const ACADEMIC_HTML = read("cbseacademic-circulars.html");
const SQP_2627_HTML = read("cbseacademic-sqp-classx-2026-27.html");

/** The moment the fixtures were fetched, as a run's `now`. */
const NOW = new Date("2026-09-26T00:30:00Z");

describe("C8 — cbse.gov.in examination circulars (fixture)", () => {
  const rows = parseGovCirculars(GOV_HTML);

  it("parses every dated row — 330 — and nothing else", () => {
    assert.equal(rows.length, 330);
  });

  it("maps date / title / absolute href from the first row exactly", () => {
    assert.deepEqual(rows[0], {
      date: "2026-09-23",
      title: "Streamlining the process of corrections in the demographic details-reg.",
      href: "https://www.cbse.gov.in/cbsenew/documents/Streamling_Process_Corrections_23092026.pdf",
      source: "document",
    });
  });

  it("cuts the title at the extra inline links (' | User Manual …')", () => {
    const row = rows.find((r) => r.href.endsWith("Submission_LOC_XII_2026_West_Asia_15092026.pdf"));
    assert.ok(row);
    assert.equal(
      row.title,
      "Submission of List of Candidates (LOC) for Class XII-2026 Special Examinations for students in West Asia only-reg.",
    );
  });

  it("every href is absolute https and every date is a real ISO date", () => {
    for (const row of rows) {
      assert.match(row.href, /^https:\/\/www\.cbse\.gov\.in\//, row.href);
      assert.match(row.date, /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
    }
  });
});

describe("C8 — cbseacademic.nic.in circulars + notifications (fixture)", () => {
  const rows = parseAcademicCirculars(ACADEMIC_HTML);

  it("parses both tables, month precision only — never an invented day", () => {
    assert.ok(rows.length > 150, `only ${rows.length} rows`);
    for (const row of rows) assert.match(row.date, /^2026-(0[1-9]|1[0-2])$/, row.title);
  });

  it("maps the first circular exactly, href absolute", () => {
    assert.deepEqual(rows[0], {
      date: "2026-09",
      title: "Observance of Swachhata Hi Seva (SHS) 2026",
      href: "https://cbseacademic.nic.in/web_material/Circulars/2026/63_Circular_2026.pdf",
      source: "document",
    });
  });

  it("takes the year of the notifications table from its heading, and the ENGLISH link", () => {
    const sqp = rows.find((r) => r.href.endsWith("/Notifications/2026/132_Notification_2026.pdf"));
    assert.ok(sqp, "the SQP notification row is missing");
    assert.equal(sqp.date, "2026-09");
    assert.match(sqp.title, /^Sample Question Papers for Classes X & XII/);
    const january = rows.find((r) => r.href.endsWith("/Circulars/2026/01_Circular_2026.pdf"));
    assert.ok(january, "the english link of a bilingual row was not taken");
    assert.equal(january.date, "2026-01");
    assert.equal(rows.some((r) => r.href.endsWith("_hi.pdf")), false);
  });
});

describe("C8 — filtering and ordering", () => {
  it("drops Class-XII-only titles and keeps anything naming Class X", () => {
    assert.equal(isClassXIIOnly("Notice for Post Result Declaration Facilities to the Students, Class XII Supplementary Examination 2026"), true);
    assert.equal(isClassXIIOnly("Submission of List of Candidates (LOC) for Class XII-2026 Special Examinations"), true);
    assert.equal(isClassXIIOnly("Date sheet for Class 12 board exams"), true);
    assert.equal(isClassXIIOnly("Prior Intimation of Submission of List of Candidates (LOC) for Class X/XII Examination-2026-27"), false);
    assert.equal(isClassXIIOnly("Sample Question Papers for Classes X & XII for the current Academic Session"), false);
    assert.equal(isClassXIIOnly("Curriculum released for 2026-27, Classes IX-XII"), false);
    assert.equal(isClassXIIOnly("Observance of Swachhata Hi Seva (SHS) 2026"), false);
    // a date is not a class
    assert.equal(isClassXIIOnly("Circular dated 12.09.2026"), false);
  });

  it("builds a 30-row newest-first feed with no XII-only row from the two real pages", () => {
    const feed = buildCircularFeed([...parseGovCirculars(GOV_HTML), ...parseAcademicCirculars(ACADEMIC_HTML)], NOW);
    assert.equal(feed.length, FEED_SIZE);
    const keys = feed.map((r) => (r.date.length === 7 ? `${r.date}-00` : r.date));
    assert.deepEqual([...keys].sort().reverse(), keys, "not newest first");
    assert.equal(feed.some((r) => isClassXIIOnly(r.title)), false);
    assert.equal(new Set(feed.map((r) => r.id)).size, feed.length, "ids not unique");
    assert.equal(new Set(feed.map((r) => r.href)).size, feed.length, "hrefs not de-duplicated");
    // PRECONDITION for the line above: the gov page's West-Asia XII row WAS parsed
    assert.ok(parseGovCirculars(GOV_HTML).some((r) => isClassXIIOnly(r.title)));
    // the one important row on 26 Sep 2026 is the SQP notification
    const important = feed.filter((r) => r.important);
    assert.deepEqual(
      important.map((r) => r.headline),
      ["New CBSE sample papers are out"],
    );
  });

  it("de-duplicates the same href arriving from both pages", () => {
    const row: ParsedCircular = { date: "2026-09-01", title: "A", href: "https://www.cbse.gov.in/a.pdf", source: "document" };
    assert.equal(buildCircularFeed([row, { ...row, title: "A again" }], NOW).length, 1);
  });
});

describe("C9 — the fixed rule table, and no generated headline", () => {
  it("is exactly the four owner rules, in order", () => {
    assert.deepEqual(
      HEADLINE_RULES.map((r) => r.headline),
      [
        "The 2027 board exam date sheet is out",
        "New CBSE sample papers are out",
        "CBSE has updated the two-exam rules",
        "CBSE has updated the syllabus",
      ],
    );
    assert.ok(Object.isFrozen(HEADLINE_RULES));
  });

  it("matches case-insensitively, first rule wins", () => {
    assert.equal(ruleHeadline("DATE SHEET for Class X 2027"), "The 2027 board exam date sheet is out");
    assert.equal(ruleHeadline("Datesheet released"), "The 2027 board exam date sheet is out");
    assert.equal(ruleHeadline("Sample Question Papers 2026-27"), "New CBSE sample papers are out");
    assert.equal(ruleHeadline("SQP and marking scheme"), "New CBSE sample papers are out");
    assert.equal(ruleHeadline("Conduct of second board exam"), "CBSE has updated the two-exam rules");
    assert.equal(ruleHeadline("Board exams twice a year"), "CBSE has updated the two-exam rules");
    assert.equal(ruleHeadline("Curriculum for 2026-27"), "CBSE has updated the syllabus");
    // first match wins: a date sheet that mentions the syllabus is a date sheet
    assert.equal(ruleHeadline("Date sheet and syllabus"), "The 2027 board exam date sheet is out");
    assert.equal(ruleHeadline("Observance of Swachhata Hi Seva"), null);
  });

  it("important ONLY within 30 days; otherwise important:false AND headline:''", () => {
    assert.deepEqual(classifyCircular({ title: "Date sheet 2027", date: "2026-09-20" }, NOW), {
      important: true,
      headline: "The 2027 board exam date sheet is out",
    });
    assert.deepEqual(classifyCircular({ title: "Date sheet 2027", date: "2026-08-20" }, NOW), {
      important: false,
      headline: "",
    });
    // month-only rows are dated the 1st: September counts on 26 Sep, August does not
    assert.equal(classifyCircular({ title: "Sample papers", date: "2026-09" }, NOW).important, true);
    assert.equal(classifyCircular({ title: "Sample papers", date: "2026-08" }, NOW).important, false);
    // a future-dated row is wrong, not recent
    assert.equal(isWithinDays("2026-12-01", NOW, 30), false);
  });

  it("★ a RECENT row that matches NO rule gets no headline — nothing is composed from its title", () => {
    const rows: ParsedCircular[] = [
      { date: "2026-09-25", title: "Observance of Swachhata Hi Seva (SHS) 2026", href: "https://www.cbse.gov.in/x.pdf", source: "document" },
      { date: "2026-09-24", title: "Results of Skill Expo 2026–27", href: "https://www.cbse.gov.in/y.pdf", source: "document" },
    ];
    for (const row of buildCircularFeed(rows, NOW)) {
      assert.equal(row.important, false, row.title);
      assert.equal(row.headline, "", row.title);
    }
  });

  it("★ every headline the REAL feed carries is one of the table's strings", () => {
    const allowed = new Set(HEADLINE_RULES.map((r) => r.headline));
    const feed = buildCircularFeed([...parseGovCirculars(GOV_HTML), ...parseAcademicCirculars(ACADEMIC_HTML)], NOW);
    // PRECONDITION: at least one headline exists, so this is not vacuous.
    assert.ok(feed.some((r) => r.headline !== ""));
    for (const row of feed) {
      if (row.headline !== "") assert.ok(allowed.has(row.headline), `generated headline: ${row.headline}`);
      else assert.equal(row.important, false);
    }
  });

  it("re-classifying a kept feed lets importance EXPIRE", () => {
    const [row] = buildCircularFeed(
      [{ date: "2026-09-20", title: "Date sheet 2027", href: "https://www.cbse.gov.in/d.pdf", source: "document" }],
      NOW,
    );
    assert.equal(row.important, true);
    const later = reclassify([row], new Date("2026-11-01T00:30:00Z"));
    assert.deepEqual([later[0].important, later[0].headline], [false, ""]);
  });
});

describe("C8 — the feed guard", () => {
  it("rejects 0 rows, and fewer than half the previous count; accepts otherwise", () => {
    assert.equal(feedGuard(0, 0).ok, false);
    assert.equal(feedGuard(0, 30).ok, false);
    assert.equal(feedGuard(14, 30).ok, false);
    assert.equal(feedGuard(15, 30).ok, true);
    assert.equal(feedGuard(3, 0).ok, true);
  });

  it("an error page served with 200 parses to 0 rows (so the guard is what catches it)", () => {
    const errorPage = "<html><body><h1>Service Unavailable</h1><table><tr><td>Oops</td></tr></table></body></html>";
    assert.equal(parseGovCirculars(errorPage, GOV_INDEX_URL).length, 0);
    assert.equal(parseAcademicCirculars(errorPage, ACADEMIC_INDEX_URL).length, 0);
  });
});

describe("C7 — the next-session sample-paper index", () => {
  it("derives the index from the clock: sessions start in April", () => {
    assert.deepEqual(nextSessionIndexUrl(NOW), {
      url: "https://cbseacademic.nic.in/SQP_CLASSX_2026-27.html",
      session: "2026-27",
    });
    assert.equal(currentSessionStartYear(new Date("2027-03-31T12:00:00Z")), 2026);
    assert.equal(currentSessionStartYear(new Date("2027-04-01T00:00:00Z")), 2027);
    assert.equal(nextSessionIndexUrl(new Date("2027-04-02T00:00:00Z")).url, "https://cbseacademic.nic.in/SQP_CLASSX_2027-28.html");
  });

  it("maps the real 2026-27 index to exactly the five sample-paper ids", () => {
    const { url } = nextSessionIndexUrl(NOW);
    const links = parseSqpIndexLinks(SQP_2627_HTML, url);
    const { mapped, unmapped } = mapSqpLinks(links, MIRROR_PAPERS);
    assert.deepEqual(
      mapped.map((m) => `${m.paperId} ${m.url}`).sort(),
      [
        "maths-basic-sqp https://cbseacademic.nic.in/web_material/SQP/ClassX_2026_27/MathsBasic-SQP.pdf",
        "maths-standard-ms https://cbseacademic.nic.in/web_material/SQP/ClassX_2026_27/MathsStandard-MS.pdf",
        "maths-standard-sqp https://cbseacademic.nic.in/web_material/SQP/ClassX_2026_27/MathsStandard-SQP.pdf",
        "science-ms https://cbseacademic.nic.in/web_material/SQP/ClassX_2026_27/Science-MS.pdf",
        "science-sqp https://cbseacademic.nic.in/web_material/SQP/ClassX_2026_27/Science-SQP.pdf",
      ],
    );
    // ★ never ingested: the VIC variants, the Hindi papers, the MS with no paper
    for (const name of ["MathsStandardVIC-SQP.pdf", "MathsBasicVIC-MS.pdf", "Science-SQP_hi.pdf", "MathsBasic-MS.pdf"]) {
      assert.ok(unmapped.some((u) => u.endsWith(`/${name}`)), `${name} should be reported as unmapped`);
      assert.equal(mapped.some((m) => m.url.endsWith(`/${name}`)), false, `${name} was mapped`);
    }
    // other subjects are out of scope: neither mapped nor reported
    for (const name of ["SocialScience-SQP.pdf", "HomeScience-SQP.pdf"]) {
      assert.equal([...unmapped, ...mapped.map((m) => m.url)].some((u) => u.endsWith(`/${name}`)), false, name);
    }
  });
});
