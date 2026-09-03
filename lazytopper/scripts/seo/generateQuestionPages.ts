// lazytopper/scripts/seo/generateQuestionPages.ts
//
// ENGINE-0 — the SIDE-EFFECTING half. It reads, it calls the pure model, it
// writes. Every decision lives in `questionPageModel.ts` so the guard test can
// exercise it directly.
//
// Run:  pnpm --filter lazytopper run seo:questions
//
// ★ WHERE THE OUTPUT GOES, AND WHY IT IS NOT `dist/`.
// The page is written to `lazytopper/public/questions/**` and reached at the
// site root through ONE `vercel.json` rewrite:
//
//     { "source": "/questions/:path*", "destination": "/app/questions/:path*" }
//
// That is the SAME mechanism already serving `/robots.txt`, `/sitemap.xml` and
// the 105 live pages under `/app/visuals/…`, so it is proven by the running
// deployment rather than by argument. Writing into `dist/public` instead would
// make correctness depend on Vercel's *Output Directory*, which is a dashboard
// setting that is absent from git — no gate in this repo could check it, and it
// would break silently.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalQuestionBank,
  AI_GENERATED_QUESTION_IDS,
} from "../../src/data/canonicalQuestionBank";
import type { CanonicalQuestion } from "../../src/data/predictionTypes";
import { SURFACE_BANNED_PHRASES, scanContentForPhrases } from "../../../scripts/src/syllabusGuard";
import { isPublishable } from "./publishability";
import {
  DATE_PLACEHOLDER,
  MIN_QUESTIONS,
  renderPage,
  selectQuestions,
  type NoteSpec,
} from "./questionPageModel";

const HERE = dirname(fileURLToPath(import.meta.url));
const LAZYTOPPER_ROOT = resolve(HERE, "..", "..");
const REPO_ROOT = resolve(LAZYTOPPER_ROOT, "..");
const PUBLIC_ROOT = resolve(LAZYTOPPER_ROOT, "public");
const SITEMAP = resolve(PUBLIC_ROOT, "sitemap.xml");

export const ORIGIN = "https://www.lazytopper.com";

/**
 * Escape a literal string for safe interpolation into a `RegExp`.
 *
 * ★ WHY THIS EXISTS. `ORIGIN` reads as a plain host, but every `.` in it is a
 * regex wildcard once interpolated into a pattern, so a check for
 * `<loc>https://www.lazytopper.com/</loc>` would also match
 * `<loc>https://wwwXlazytopperYcom/</loc>`. Not exploitable here — the input is
 * our own sitemap — but CodeQL `js/incomplete-hostname-regexp` is right, and a
 * dismissed High alert on a brand-new file sets a precedent that outlives it.
 */
export const RX = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * ★★★ THE TEN, RANKED BY PUBLISHABLE COUNT AT THE SHA THEY WERE MEASURED AT.
 *
 * ⚠ THIS LIST IS A MEASUREMENT, NOT A PREFERENCE, AND IT HAS A DATE.
 * Re-derived at trunk `abfb1e81` (after STEPMARK-1 batches 1 and 2 merged in #722):
 *
 *   1 light-reflection-and-refraction  377      6 arithmetic-progression   159
 *   2 chemical-reactions-and-equations 337      7 metals-and-non-metals    149
 *   3 life-processes                   316      8 triangles                133
 *   4 acids-bases-and-salts            200      9 quadratic-equations      127
 *   5 pair-of-linear-equations         184     10 coordinate-geometry      101
 *
 * MEMBERSHIP is unchanged from the `2339ebf7` table; the ORDER moved because
 * annotation only ever ADDS publishable rows and only to the topics annotated —
 * `chemical-reactions-and-equations` +157 (4th -> 2nd) and `life-processes` +205
 * (9th -> 3rd). Every other topic moved by exactly zero. The 11th,
 * `how-do-organisms-reproduce` at 76, is 25 rows below the 10th, so nothing
 * outside the ten could have risen into it.
 *
 * TWO OWNER EXCLUSIONS that a rank-order pick gets wrong, recorded so no later
 * lane re-promotes them on the count alone:
 *   - `circles` — 3 publishable of 229 rows. Below the floor of 8; cannot fill a page.
 *   - `trigonometry` — 24 publishable LOOKS fine and is not: 216 glyph-damage
 *     occurrences in `trigonometry.pyq.ts`, the largest concentration in the bank.
 *     ⚠ This is a property spec §2's thresholds CANNOT SEE, which is why the
 *     owner overrode the table. [FU-CORPUS-THRESHOLDS-OMIT-GLYPH-INTEGRITY]
 *
 * ★ TRAILING SLASH IS LOAD-BEARING. Each page ships as `<…>/index.html`; a
 * directory request is what resolves to it, on Vercel and in
 * `crawlerReachability.guard.test.ts`'s model alike. Advertising the
 * extensionless form WITHOUT the slash would model as "not a file".
 *
 * `blurb` is what the hub and the sibling lists show. It is written here rather
 * than derived from `big_idea` because ONE spec's `big_idea` is null
 * (`light-reflection-and-refraction`) and a hub row reading "" would be the thin
 * page problem in miniature. These are descriptions of the CHAPTER, not claims
 * about a student.
 */
export const PAGES: ReadonlyArray<{
  topicKey: string;
  noteSpec: string;
  urlPath: string;
  blurb: string;
}> = [
  {
    topicKey: "light-reflection-and-refraction",
    noteSpec: "notes/specs/light-reflection-and-refraction.json",
    urlPath: "/questions/class-10/science/light-reflection-and-refraction/",
    blurb: "Mirror and lens formulae, sign convention, refractive index and power of a lens.",
  },
  {
    topicKey: "chemical-reactions-and-equations",
    noteSpec: "notes/specs/chemical-reactions-and-equations.json",
    urlPath: "/questions/class-10/science/chemical-reactions-and-equations/",
    blurb: "Balancing equations, the five reaction types, and oxidation with state symbols.",
  },
  {
    topicKey: "life-processes",
    noteSpec: "notes/specs/life-processes.json",
    urlPath: "/questions/class-10/science/life-processes/",
    blurb: "Nutrition, respiration, transport and excretion, with the diagrams the board asks for.",
  },
  {
    topicKey: "acids-bases-and-salts",
    noteSpec: "notes/specs/acids-bases-and-salts.json",
    urlPath: "/questions/class-10/science/acids-bases-and-salts/",
    blurb: "pH, indicators, neutralisation and the named salts CBSE returns to every year.",
  },
  {
    topicKey: "metals-and-non-metals",
    noteSpec: "notes/specs/metals-and-non-metals.json",
    urlPath: "/questions/class-10/science/metals-and-non-metals/",
    blurb: "The reactivity series, extraction, corrosion and ionic bonding.",
  },
  {
    topicKey: "pair-of-linear-equations",
    noteSpec: "notes/specs/pair-of-linear-equations.json",
    urlPath: "/questions/class-10/maths/pair-of-linear-equations/",
    blurb: "Substitution and elimination, consistency conditions, and word problems.",
  },
  {
    topicKey: "arithmetic-progression",
    noteSpec: "notes/specs/arithmetic-progression.json",
    urlPath: "/questions/class-10/maths/arithmetic-progression/",
    blurb: "The nth term, the sum of n terms, and the word problems built on them.",
  },
  {
    topicKey: "triangles",
    noteSpec: "notes/specs/triangles.json",
    urlPath: "/questions/class-10/maths/triangles/",
    blurb: "Similarity criteria, the basic proportionality theorem, and area ratios.",
  },
  {
    topicKey: "quadratic-equations",
    noteSpec: "notes/specs/quadratic-equations.json",
    urlPath: "/questions/class-10/maths/quadratic-equations/",
    blurb: "Factorisation, the quadratic formula, the discriminant and nature of roots.",
  },
  {
    topicKey: "coordinate-geometry",
    noteSpec: "notes/specs/coordinate-geometry.json",
    urlPath: "/questions/class-10/maths/coordinate-geometry/",
    blurb: "Distance and section formulae, midpoints, and collinearity.",
  },
];

/**
 * ★★★ THE SINGLE DEFINITION OF "PUBLISHABLE", APPLIED WHERE PAGES ARE MADE.
 *
 * The contract in `publishability.ts` says: "The generator emits a question ONLY
 * if isPublishable() returns ok." IT DID NOT. The generator selected through
 * `questionPageModel.selectQuestions`, whose figure filter is a SECOND
 * implementation — `dependsOnSuppliedFigure`, which also scans `solutionSteps`
 * and matches a bare "as shown". Measured at 2339ebf7 over the 5,721 non-AI rows,
 * the two predicates disagree on 421 rows, and the disagreement was not academic:
 * the LIVE page shipped `CBE-S-LGHT-B-003`, which `isPublishable` rejects, and
 * four other topics would have shipped six more.
 *
 * ⚠ THE FIX IS TO NARROW THE INPUT, NOT TO ADD A THIRD RULE. Everything the
 * generator can see is filtered through the contract first, so the emitted set is
 * a SUBSET of the publishable set BY CONSTRUCTION rather than by agreement. The
 * band-spread and provenance ordering in `selectQuestions` are untouched.
 *
 * ★ WHY THE SOLUTION-STEP SCAN MATTERS RIGHT NOW. `publishability.ts` scans the
 * QUESTION only, deliberately: "a solution a content lane AUTHORS can silently
 * un-publish an otherwise-fine question. Step-marking a row — the single largest
 * job on the content track — would then remove it from the site." A lane is
 * step-marking the bank as this ships. The stricter predicate is the one that
 * would have deleted its work from the site.
 *
 * Exported so `seoGenerator.guard.test.ts` asserts against THIS function and not
 * a copy of it. A second copy is the defect this function exists to end.
 */
export function publishableQuestions(
  bank: readonly CanonicalQuestion[] = canonicalQuestionBank,
): CanonicalQuestion[] {
  return bank.filter((q) => isPublishable(q, AI_GENERATED_QUESTION_IDS).ok);
}

function log(line: string): void {
  process.stdout.write(`${line}\n`);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The date to stamp on a page.
 *
 * ★ IDEMPOTENCE, NOT COSMETICS. Re-running the generator on an unchanged bank
 * must produce a byte-identical file, or the committed output churns on every
 * run and its diff stops meaning anything. So: render with a placeholder, and if
 * the page already on disk is identical once ITS date is masked out, keep the
 * old date. "dateModified" then means what it says — the day the CONTENT last
 * changed — instead of the day someone last ran a script.
 */
export function resolveDate(outFile: string, rendered: string): string {
  if (!existsSync(outFile)) return today();
  // ★★ READ THE PAGE AS THE REPOSITORY STORES IT, NOT AS THIS PLATFORM CHECKED IT
  //    OUT — AND THIS IS A CORRECTNESS BUG, NOT TIDINESS.
  //
  //    `core.autocrlf=true` with no `.gitattributes` means a fresh Windows checkout
  //    of this committed page carries CRLF while `rendered` is always LF. The
  //    equality below then FAILS ON IDENTICAL CONTENT, and the function falls
  //    through to `today()`.
  //
  //    Proven, same bytes, only the endings differing:
  //      previous file LF   -> date kept at 2026-08-20   (idempotent, correct)
  //      previous file CRLF -> date bumped to 2026-09-02 (content unchanged)
  //
  //    ⚠ THE CONSEQUENCE IS A FABRICATED FRESHNESS SIGNAL. `dateModified` in the
  //    JSON-LD and `<lastmod>` in the sitemap would tell Google the content changed
  //    on a day it did not — on the one surface a stranger can check, in the lane
  //    whose whole purpose is to be credible to a crawler. It also churns the
  //    committed artefact on every Windows regeneration, so its diff stops meaning
  //    anything. That is the exact promise the comment above this function makes
  //    and the exact promise the platform was breaking.
  const previous = readFileSync(outFile, "utf8").replace(/\r\n/g, "\n");
  const previousDate = previous.match(/Last updated (\d{4}-\d{2}-\d{2})/)?.[1];
  if (!previousDate) return today();
  const masked = previous.split(previousDate).join(DATE_PLACEHOLDER);
  if (masked === rendered) return previousDate;
  return today();
}

interface Emitted {
  topicKey: string;
  urlPath: string;
  outFile: string;
  date: string;
  questionIds: string[];
}

function upsertSitemap(emitted: readonly Emitted[]): { added: number; updated: number } {
  let xml = readFileSync(SITEMAP, "utf8");
  let added = 0;
  let updated = 0;

  for (const e of emitted) {
    const loc = `${ORIGIN}${e.urlPath}`;
    const entry = `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${e.date}</lastmod>\n  </url>\n`;
    // Match this URL's existing <url> block, whatever its lastmod.
    const existing = new RegExp(
      `[ \\t]*<url>\\s*<loc>${RX(loc)}</loc>[\\s\\S]*?</url>\\s*`,
      "",
    );
    if (existing.test(xml)) {
      xml = xml.replace(existing, entry);
      updated += 1;
    } else {
      xml = xml.replace(/(\s*)<\/urlset>/, `\n${entry}</urlset>`);
      added += 1;
    }
  }

  // ★ §2.6 holds `/` OUT of the sitemap on purpose —
  // [FU-CRAWL1-SITEMAP-ROOT-URL-HELD]. Assert it rather than trusting the edit
  // above not to have introduced one.
  if (new RegExp(`<loc>\\s*${RX(ORIGIN)}/\\s*</loc>`).test(xml)) {
    throw new Error("sitemap now advertises the site root, which CRAWL-1 held back");
  }

  writeFileSync(SITEMAP, xml, "utf8");
  return { added, updated };
}

/**
 * The subject hub a topic page sits under, derived from its own URL rather than
 * from a second table that could disagree with it.
 */
export const HUB_SCIENCE = "/questions/class-10/science/";
export const HUB_MATHS = "/questions/class-10/maths/";
export const HUB_ROOT = "/questions/class-10/";

function hubPathFor(urlPath: string): string {
  return urlPath.startsWith(HUB_MATHS) ? HUB_MATHS : HUB_SCIENCE;
}
function hubTitleFor(urlPath: string): string {
  return urlPath.startsWith(HUB_MATHS) ? "Class 10 Mathematics" : "Class 10 Science";
}

/**
 * ★★★ THE HUB — §4, AND THE REASON THIS LANE EXISTS AT ALL.
 *
 * ENGINE-0 shipped ONE page. Google crawled it and returned "Crawled — currently
 * not indexed", and a site-search for its exact `<h1>` returns nothing. That is a
 * judgement about context, not a routing failure: the plumbing worked and the
 * crawler arrived. An orphan page in an empty namespace simply gave it nothing to
 * evaluate.
 *
 * A hub listing its children, with every child linking back and across, reads as a
 * SECTION OF A SITE. The spec's own words: "This may matter more than the content
 * change."
 *
 * ⚠ THE HUB IS DELIBERATELY THIN ON PROSE AND RICH IN LINKS. It is a directory,
 * not an article. It invents nothing about a student and claims nothing it cannot
 * show — each row is a chapter title, a one-line description of the CHAPTER, and
 * the count of step-marked questions actually on that page, which is derived from
 * the emitted set rather than typed in.
 */
function renderHub(input: {
  title: string;
  intro: string;
  urlPath: string;
  children: ReadonlyArray<{ urlPath: string; title: string; blurb: string; questions: number }>;
  crossLinks: ReadonlyArray<{ urlPath: string; title: string }>;
}): string {
  const canonical = `${ORIGIN}${input.urlPath}`;
  const esc = (s: string) => s
    .replace(/&(?!(?:#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);)/g, "&amp;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const rows = input.children
    .map(
      (c) =>
        `<li><a href="${esc(c.urlPath)}">${esc(c.title)}</a> — ${esc(c.blurb)} ` +
        `<span class="count">${c.questions} step-marked questions</span></li>`,
    )
    .join("");

  const cross = input.crossLinks.length
    ? `<p class="hublink">${input.crossLinks
        .map((c) => `<a href="${esc(c.urlPath)}">${esc(c.title)}</a>`)
        .join(" &middot; ")}</p>`
    : "";

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.title,
    url: canonical,
    numberOfItems: input.children.length,
    itemListElement: input.children.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.title,
      url: `${ORIGIN}${c.urlPath}`,
    })),
  };
  const jsonLd = JSON.stringify(itemList, null, 2).replace(/<\//g, "<\/");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(input.title)} | LazyTopper</title>
<meta name="description" content="${esc(input.intro)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(input.title)}">
<meta property="og:url" content="${canonical}">
<meta property="og:description" content="${esc(input.intro)}">
<style>
:root{--navy:#0b1f3a;--ink:#12263f;--soft:#f7f9fc;--line:#dfe6ef;--accent:#1f9d63;}
*{box-sizing:border-box}
body{margin:0;background:var(--soft);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:820px;margin:0 auto;padding:24px 20px 64px}
header.site{background:var(--navy);color:#fff}
header.site .wrap{padding:14px 20px;display:flex;justify-content:space-between;align-items:center}
header.site a{color:#fff;text-decoration:none;font-weight:600}
h1{font-size:1.75rem;line-height:1.25;margin:24px 0 8px;color:var(--navy)}
h2{font-size:1.15rem;margin:32px 0 8px;color:var(--navy)}
.lede{font-size:1.05rem}
.chapters{padding-left:22px}
.chapters li{margin:10px 0}
.chapters a{color:var(--navy);font-weight:600}
.count{display:block;color:#5b6b80;font-size:.85rem}
.hublink{margin:18px 0 0}
.hublink a{color:var(--navy);font-weight:600}
.cta{margin:36px 0 0;background:var(--navy);color:#fff;border-radius:12px;padding:20px}
.cta a{display:inline-block;margin-top:10px;background:var(--accent);color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600}
footer.site{border-top:1px solid var(--line);margin-top:40px;padding-top:14px;color:#5b6b80;font-size:.85rem}
</style>
<script type="application/ld+json">
${jsonLd}
</script>
</head>
<body>
<header class="site"><div class="wrap"><a href="/app/">LazyTopper</a><a href="/app/">Open the study cockpit</a></div></header>
<div class="wrap">
<main>
<h1>${esc(input.title)}</h1>
<p class="lede">${esc(input.intro)}</p>
<ul class="chapters">${rows}</ul>
${cross}
<aside class="cta">
<b>Practise any of these with the mark scheme in front of you.</b>
<p>LazyTopper grades your working step by step, the way a CBSE examiner does.</p>
<a href="/app/">Open LazyTopper</a>
</aside>
</main>
<footer class="site">Last updated ${DATE_PLACEHOLDER} &middot; CBSE 2026-27 syllabus</footer>
</div>
</body>
</html>
`;
}

export function generate(): Emitted[] {
  const emitted: Emitted[] = [];

  for (const page of PAGES) {
    const note = JSON.parse(
      readFileSync(resolve(REPO_ROOT, page.noteSpec), "utf8"),
    ) as NoteSpec;

    // ★ THE CONTRACT IS APPLIED TO THE INPUT. `selectQuestions` keeps its own
    //   rules; it simply never sees a row the contract rejects.
    const { selected, counts } = selectQuestions(
      publishableQuestions(),
      page.topicKey,
      AI_GENERATED_QUESTION_IDS,
    );

    // ⚠ THE DELTA IS LOGGED, NOT INFERRED. Running the SAME selector over the
    //    UNFILTERED bank says exactly which rows the contract removed from this
    //    page — the evidence that the filter fires, printed on every run rather
    //    than reconstructed by whoever is reading the diff.
    const unfiltered = selectQuestions(
      canonicalQuestionBank,
      page.topicKey,
      AI_GENERATED_QUESTION_IDS,
    );
    const rejected = unfiltered.selected.filter(
      (q) => !isPublishable(q, AI_GENERATED_QUESTION_IDS).ok,
    );
    log(
      `ENGINE1_PUBLISHABILITY topic=${page.topicKey} ` +
        `selected_unfiltered=${unfiltered.selected.length} selected_filtered=${selected.length} ` +
        `removed_by_contract=${rejected.length}` +
        (rejected.length
          ? ` ids=${rejected
              .map((q) => `${q.id}:${(isPublishable(q, AI_GENERATED_QUESTION_IDS) as { reason: string }).reason}`)
              .join(",")}`
          : ""),
    );

    log(
      `ENGINE0_SELECTION topic=${page.topicKey} topic_total=${counts.topicTotal} ` +
        `skipped_ai_pack=${counts.skippedAiPack} skipped_supplied_figure=${counts.skippedFigure} ` +
        `skipped_step_marking=${counts.skippedStepMarking} skipped_sum_mismatch=${counts.skippedSum} ` +
        `eligible=${counts.eligible} selected=${counts.selected} floor=${MIN_QUESTIONS}`,
    );

    // ★ THE FLOOR IS A SKIP, NOT A FAILURE. A thin page is worse than no page.
    if (selected.length < MIN_QUESTIONS) {
      log(
        `ENGINE0_SKIP topic=${page.topicKey} reason=below_floor survivors=${selected.length} ` +
          `floor=${MIN_QUESTIONS} — no page emitted (an honest empty state, not a thin one)`,
      );
      continue;
    }

    // ★★ EVERY PAGE LINKS TO EVERY OTHER, AND UP TO ITS HUB (§4).
    //    The sibling list is derived from `PAGES`, so it cannot drift out of step
    //    with what is actually emitted — and a topic never links to itself.
    const rendered = renderPage({
      note,
      questions: selected,
      aiGeneratedIds: AI_GENERATED_QUESTION_IDS,
      urlPath: page.urlPath,
      origin: ORIGIN,
      related: PAGES.filter((p) => p.topicKey !== page.topicKey).map((p) => ({
        urlPath: p.urlPath,
        title: JSON.parse(readFileSync(resolve(REPO_ROOT, p.noteSpec), "utf8")).meta.title as string,
        blurb: p.blurb,
      })),
      hubPath: hubPathFor(page.urlPath),
      hubTitle: hubTitleFor(page.urlPath),
    });

    // §2.8 — syllabus scan over the RENDERED HTML, using the live phrase list.
    // Read from `scripts/src/syllabusGuard.ts`, never from memory (CLAUDE.md §5).
    const violations = scanContentForPhrases(rendered, SURFACE_BANNED_PHRASES);
    log(
      `ENGINE0_SYLLABUS topic=${page.topicKey} phrases_checked=${SURFACE_BANNED_PHRASES.length} ` +
        `violations=${violations.size}`,
    );
    if (violations.size > 0) {
      throw new Error(
        `out-of-syllabus phrase(s) in the rendered page for ${page.topicKey}: ` +
          `${[...violations.keys()].join(", ")}`,
      );
    }

    const outFile = resolve(PUBLIC_ROOT, `.${page.urlPath}index.html`);
    const date = resolveDate(outFile, rendered);
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, rendered.split(DATE_PLACEHOLDER).join(date), "utf8");

    log(
      `ENGINE0_EMIT topic=${page.topicKey} file=${outFile.replace(REPO_ROOT, "").replace(/\\/g, "/")} ` +
        `questions=${selected.length} marks=${selected.reduce((a, q) => a + q.marks, 0)} ` +
        `pyq_attributed=${selected.filter((q) => q.pyqYear && !AI_GENERATED_QUESTION_IDS.has(q.id)).length} ` +
        `date=${date}`,
    );

    emitted.push({
      topicKey: page.topicKey,
      urlPath: page.urlPath,
      outFile,
      date,
      questionIds: selected.map((q) => q.id),
    });
  }

  // ---- hubs (§4) ---------------------------------------------------------
  // ★ THE HUBS ARE BUILT FROM WHAT WAS ACTUALLY EMITTED, never from `PAGES`.
  //   A topic that fell below the floor is skipped above and must not appear on a
  //   hub as a link to a page that does not exist — that would be a 404 advertised
  //   by our own navigation, which is the "MOUNT IS NOT LIVE" failure inverted.
  const byHub = (hub: string) =>
    emitted
      .filter((e) => hubPathFor(e.urlPath) === hub)
      .map((e) => {
        const page = PAGES.find((p) => p.topicKey === e.topicKey)!;
        const note = JSON.parse(readFileSync(resolve(REPO_ROOT, page.noteSpec), "utf8"));
        return {
          urlPath: e.urlPath,
          title: note.meta.title as string,
          blurb: page.blurb,
          questions: e.questionIds.length,
        };
      });

  const scienceKids = byHub(HUB_SCIENCE);
  const mathsKids = byHub(HUB_MATHS);

  const hubs: Array<{ urlPath: string; html: string }> = [];
  if (scienceKids.length) {
    hubs.push({
      urlPath: HUB_SCIENCE,
      html: renderHub({
        title: "Class 10 Science — board questions with step-marked solutions",
        intro:
          "Every chapter below carries CBSE board-style questions with the mark scheme " +
          "broken out step by step, plus the formula sheet and NCERT-cited definitions for " +
          "that chapter.",
        urlPath: HUB_SCIENCE,
        children: scienceKids,
        crossLinks: mathsKids.length
          ? [{ urlPath: HUB_MATHS, title: "Class 10 Mathematics chapters" }]
          : [],
      }),
    });
  }
  if (mathsKids.length) {
    hubs.push({
      urlPath: HUB_MATHS,
      html: renderHub({
        title: "Class 10 Mathematics — board questions with step-marked solutions",
        intro:
          "Every chapter below carries CBSE board-style questions with the mark scheme " +
          "broken out step by step, plus the formula sheet and NCERT-cited definitions for " +
          "that chapter.",
        urlPath: HUB_MATHS,
        children: mathsKids,
        crossLinks: scienceKids.length
          ? [{ urlPath: HUB_SCIENCE, title: "Class 10 Science chapters" }]
          : [],
      }),
    });
  }
  if (hubs.length) {
    // §4 — `/questions/class-10/` links to both subject hubs.
    hubs.push({
      urlPath: HUB_ROOT,
      html: renderHub({
        title: "CBSE Class 10 — board questions with step-marked solutions",
        intro:
          "Chapter pages for Class 10 Science and Mathematics, each with the CBSE mark " +
          "scheme shown step by step.",
        urlPath: HUB_ROOT,
        // ★ THE ROOT HUB LISTS EVERY CHAPTER, NOT JUST THE TWO SUBJECT HUBS.
        //   §4 only requires it to link both hubs, and that is what it did — at
        //   3,285 bytes, which is INDISTINGUISHABLE IN SIZE FROM THE SPA SHELL
        //   (~3KB). Spec §6 core control is "the shell is ~3KB, a page is ~29KB;
        //   distinguish by BODY SIZE, never status, because both return 200" — so
        //   a hub that thin defeats the only control that can tell a real page
        //   from a soft 404, and reads as the thin page this lane exists not to
        //   ship. Listing all ten makes it a genuine index of the namespace.
        children: [...scienceKids, ...mathsKids],
        crossLinks: [
          ...(scienceKids.length ? [{ urlPath: HUB_SCIENCE, title: "Class 10 Science chapters" }] : []),
          ...(mathsKids.length ? [{ urlPath: HUB_MATHS, title: "Class 10 Mathematics chapters" }] : []),
        ],
      }),
    });
  }

  for (const hub of hubs) {
    const outFile = resolve(PUBLIC_ROOT, `.${hub.urlPath}index.html`);
    const date = resolveDate(outFile, hub.html);
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, hub.html.split(DATE_PLACEHOLDER).join(date), "utf8");
    emitted.push({
      topicKey: `hub:${hub.urlPath}`,
      urlPath: hub.urlPath,
      outFile,
      date,
      questionIds: [],
    });
    log(`ENGINE1_HUB path=${hub.urlPath} children=${(hub.html.match(/<li><a href="\/questions\//g) || []).length} date=${date}`);
  }

  if (emitted.length > 0) {
    const { added, updated } = upsertSitemap(emitted);
    log(`ENGINE0_SITEMAP added=${added} updated=${updated}`);
  } else {
    log("ENGINE0_SITEMAP added=0 updated=0 — nothing emitted, sitemap untouched");
  }

  return emitted;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  generate();
}
