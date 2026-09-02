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
 * ★ ONE PAGE, NOT A MATRIX. ENGINE-0's whole scope is a single topic; scaling is
 * ENGINE-1's job. The shape is a list so the next lane does not have to
 * re-architect, but adding a row here is a deliberate act, not a config knob.
 */
export const PAGES: ReadonlyArray<{ topicKey: string; noteSpec: string; urlPath: string }> = [
  {
    topicKey: "light-reflection-and-refraction",
    noteSpec: "notes/specs/light-reflection-and-refraction.json",
    // ★ TRAILING SLASH IS LOAD-BEARING. The file ships as
    // `public/questions/<…>/index.html`; a directory request is what resolves to
    // it, both on Vercel and in `crawlerReachability.guard.test.ts`'s model
    // (`resolvePath` appends `index.html` to a path ending in `/`). Advertising
    // the extensionless form WITHOUT the slash would model as "not a file".
    urlPath: "/questions/class-10/science/light-reflection-and-refraction/",
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
function resolveDate(outFile: string, rendered: string): string {
  if (!existsSync(outFile)) return today();
  const previous = readFileSync(outFile, "utf8");
  const dateRe = /\d{4}-\d{2}-\d{2}/;
  const previousDate = previous.match(/Last updated (\d{4}-\d{2}-\d{2})/)?.[1];
  if (!previousDate) return today();
  const masked = previous.split(previousDate).join(DATE_PLACEHOLDER);
  if (masked === rendered) return previousDate;
  void dateRe;
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

    const rendered = renderPage({
      note,
      questions: selected,
      aiGeneratedIds: AI_GENERATED_QUESTION_IDS,
      urlPath: page.urlPath,
      origin: ORIGIN,
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
