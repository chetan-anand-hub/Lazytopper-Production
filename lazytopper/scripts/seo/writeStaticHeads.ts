/**
 * WRITE STATIC HEADS — give every advertised URL a served file that names ITSELF.
 *
 *   pnpm --filter lazytopper run build     (chained after `vite build`)
 *   tsx scripts/seo/writeStaticHeads.ts    (standalone, after a build)
 *
 * ★ THE DEFECT THIS CLOSES, AND WHY `RouteCanonical` DID NOT CLOSE IT. This is a
 * SPA: every URL serves one `index.html`, and that file hardcodes
 * `<link rel="canonical" href="https://www.lazytopper.com/app/">`.
 * `src/components/seo/RouteCanonical.tsx` overwrites it per route — inside a
 * `useEffect`, i.e. ONLY IN A BROWSER THAT RUNS THE BUNDLE. A crawler that does
 * not execute JavaScript sees all 33 sitemap URLs claim to be the home page and
 * discards 32 of them as duplicates. Bing says so in as many words on
 * `/app/practice-hub`: "Not indexed as this page is an alternate version of a
 * canonical page", after a SUCCESSFUL crawl with indexing allowed.
 *
 * ★ THE SHAPE: a post-build file copy, and deliberately nothing cleverer. For
 * each advertised path this writes a copy of the built `index.html` with four
 * head tags substituted. Nothing executes at request time, no React renders at
 * build time, there is no hydration boundary, and THE BUNDLE IS NOT TOUCHED —
 * so product behaviour cannot change. Vercel checks the filesystem BEFORE
 * applying `rewrites`, so these files win over the `/app/:path(.*)` fallback in
 * `vercel.json` and that rewrite keeps serving everything else.
 *
 * ⚠ BOTH FILE SHAPES ARE WRITTEN, ON PURPOSE. A request for `/app/pricing` is
 * resolved by a static host as either `app/pricing.html` or
 * `app/pricing/index.html` depending on whether clean-URL rewriting is on, and
 * that setting lives in Vercel project config rather than in this repo. Writing
 * one shape and guessing wrong fails SILENTLY — the rewrite serves the unmodified
 * shell and the canonical is wrong again, with a green build. Both shapes are
 * byte-identical, so whichever the host picks is the same answer.
 *
 * ★ ONE STRING FEEDS THE CANONICAL AND `og:url`. `src/config/head.guard.test.ts`
 * asserts the two are BYTE-identical. `applyHead` takes ONE `url` and writes it
 * into both tags, so that holds BY CONSTRUCTION rather than because two code
 * paths agree today.
 *
 * ⚠ EVERY SUBSTITUTION IS PROVEN TO HAVE APPLIED, EXACTLY ONCE, OR THIS THROWS.
 * The failure this guards against is the quiet one: Vite reformats the head, a
 * regex stops matching, and the script cheerfully writes 32 files that still name
 * the home page. A silent no-op here is indistinguishable from success at build
 * time and only shows up as lost indexing weeks later, so a miss is fatal.
 *
 * ⚠ THE BASENAME COMES FROM `vite.config.ts`, NEVER A `/app/` LITERAL — the same
 * rule `scripts/generateSitemap.ts` records. `canonicalFor` defaults it to
 * `appBasename()` (`import.meta.env.BASE_URL`), which is correct in the browser
 * and is `"/"` outside Vite's transform. It is imported DYNAMICALLY, inside
 * `main()`, so that importing this module for its pure functions (the guard does)
 * does not drag Vite into a jsdom test environment.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { canonicalFor } from "../../src/config/canonicalUrl";
import { sitemapPaths } from "../../src/config/sitemapUrls";
import { allDesktopTopics } from "../../src/lib/desktop/topics";

const here = dirname(fileURLToPath(import.meta.url));
const LAZYTOPPER_ROOT = resolve(here, "..", "..");

/** The two head strings that are page-specific, beyond the URL itself. */
export interface PageHead {
  title: string;
  description: string;
}

/**
 * THE SEVEN NON-CHAPTER PAGES.
 *
 * ⚠ EVERY STRING BELOW IS SOURCED FROM COPY THAT ALREADY SHIPS, and that
 * constraint is the point rather than a style note. A meta description is a
 * CLAIM the product makes to a search engine about itself; inventing one here —
 * a weightage percentage, a ranking, a success rate — would put a number in
 * front of students that no page can back up. Where a page has no honest
 * sentence available, the site default is used and the path is REPORTED, never
 * papered over. Sources, per entry:
 *
 *   /pricing        `src/pages/PricingPage.tsx` free/premium feature lists;
 *                   "cancel at any time" is the Terms' own wording.
 *   /exam-trends    `src/pages/ExamTrendsRanked.tsx` tier captions, verbatim in
 *                   substance ("non-negotiables" / "if time permits").
 *   /practice-hub   the scope-builder hub `DesktopPracticePage` (App.tsx:1070)
 *                   plus the practice modes named on the pricing page.
 *   /legal/*        `src/pages/LegalPage.tsx` — the section headings and body of
 *                   each policy, compressed, with no term added.
 *
 * ⚠ `/` IS ABSENT DELIBERATELY. The root is served by the built `index.html`
 * itself, whose title, description and canonical are ALREADY correct for it —
 * that file is the template every entry here is stamped from, and re-stamping it
 * over itself is how a root page quietly acquires a chapter's description.
 */
export const STATIC_PAGE_HEADS: Readonly<Record<string, PageHead>> = {
  "/pricing": {
    title: "Pricing — Free and Premium | LazyTopper",
    description:
      "What the free tier includes, what Premium adds, and how to cancel. " +
      "CBSE Class 10 Maths and Science prep.",
  },
  "/exam-trends": {
    title: "CBSE Class 10 Exam Trends — Chapter Weightage | LazyTopper",
    description:
      "Every CBSE Class 10 chapter ranked by exam weightage — the non-negotiables, " +
      "the best marks-per-hour, and the ones to do if time permits.",
  },
  "/practice-hub": {
    title: "Practice CBSE Class 10 Maths & Science | LazyTopper",
    description:
      "Pick a subject, scope and topic, then choose how to practise — questions, " +
      "worksheets, or predicted-question mocks.",
  },
  "/legal/privacy": {
    title: "Privacy Policy | LazyTopper",
    description:
      "What LazyTopper collects, how your learning progress is stored and used, " +
      "and how to request deletion of your account and its data.",
  },
  "/legal/terms": {
    title: "Terms of Service | LazyTopper",
    description:
      "The terms for using LazyTopper, an educational tool for CBSE Class 10 exam " +
      "preparation — accounts, subscriptions, and what the predictions are not.",
  },
  "/legal/refund": {
    title: "Refund Policy | LazyTopper",
    description:
      "The LazyTopper refund policy — the 7-day free trial, the 7-day refund " +
      "window, how to request one, and what is non-refundable.",
  },
};

/** Escape a string for use as the text content of an element. */
export function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Escape a string for use inside a double-quoted attribute.
 *
 * ⚠ `&` FIRST, ALWAYS. Escaping the quote before the ampersand would re-escape
 * the `&` it introduces, turning `"` into `&amp;quot;`. Seven of the 26 chapter
 * titles contain a literal ampersand ("Acids Bases & Salts", "Metals &
 * Non-metals" and five more), so this is the common path, not the edge case.
 */
export function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}

/**
 * The head strings for one advertised path, or `null` when nothing honest is
 * available for it — in which case the caller keeps the template's own title and
 * description and REPORTS the path rather than inventing copy.
 */
export function headForPath(path: string): PageHead | null {
  const staticHead = STATIC_PAGE_HEADS[path];
  if (staticHead) return staticHead;

  const topicPrefix = "/topic-hub/";
  if (path.startsWith(topicPrefix)) {
    const slug = path.slice(topicPrefix.length);
    const topic = allDesktopTopics().find((candidate) => candidate.slug === slug);
    // ⚠ A topic with an EMPTY blurb is treated exactly like a missing one. A
    // zero-length description is not an honest description; it is a tag that
    // tells Google nothing while looking deliberate.
    if (!topic || topic.blurb.trim().length === 0) return null;
    return {
      // ⚠ NOT "<Topic> Class 10 Notes". `/topic-hub/:topicName` renders a
      // ConceptSpine — the chapter's board concepts with practice and tutor
      // entries — and no notes surface. Titling it "Notes" would promise a page
      // that is not there, which is the search-result equivalent of fake data.
      title: `${topic.name} — CBSE Class 10 ${topic.subject} | LazyTopper`,
      description: topic.blurb,
    };
  }

  return null;
}

/* ------------------------------------------------------------------------- *
 * THE SUBSTITUTION.
 *
 * ★ THE PATTERNS ARE EXPORTED THROUGH PURE FUNCTIONS so the guard can feed them
 * synthetic input and PROVE they fire. A detector that can only be pointed at
 * the real built file cannot be distinguished from one that never ran.
 *
 * ⚠ `\s+` MATCHES NEWLINES, and that is load-bearing. `index.html` writes the
 * description and all four social tags as FOUR-LINE tags (open, attribute,
 * content, close) and Vite may re-emit any of these on one line or several. A
 * pattern anchored to spaces would match the source and miss the build output,
 * or the reverse.
 * ------------------------------------------------------------------------- */

const CANONICAL_TAG = /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/gi;
const OG_URL_TAG = /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/gi;
const TITLE_TAG = /<title>[\s\S]*?<\/title>/gi;
const DESCRIPTION_TAG = /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/gi;

/* ⚠ `og:*` USES `property=`, `twitter:*` USES `name=`. They are not
 * interchangeable, and each is spelled out rather than loosened to `[^>]*`:
 * a permissive pattern would swallow the neighbouring tag and match twice,
 * and an attribute guess matches zero. Both throw by `replaceExactlyOnce`,
 * which is the designed outcome, but the tight pattern is the correct one. */
const OG_TITLE_TAG = /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/gi;
const OG_DESCRIPTION_TAG = /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/gi;
const TWITTER_TITLE_TAG = /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/gi;
const TWITTER_DESCRIPTION_TAG = /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/gi;

/** Replace exactly one match of `pattern`, or throw naming what was not found. */
function replaceExactlyOnce(
  html: string,
  pattern: RegExp,
  replacement: string,
  what: string,
  page: string,
): string {
  const matches = html.match(pattern);
  const found = matches ? matches.length : 0;
  if (found !== 1) {
    throw new Error(
      `writeStaticHeads: expected exactly ONE ${what} in the built index.html ` +
        `while writing ${page}, found ${found}. The head shape changed, so this ` +
        `script would have written a page still naming the home page as its ` +
        `canonical — a silent regression with a green build. Fix the pattern in ` +
        `scripts/seo/writeStaticHeads.ts rather than skipping the page.`,
    );
  }
  // A literal replacement: `$&` and friends in a topic blurb must never be
  // interpreted as replacement patterns.
  return html.replace(pattern, () => replacement);
}

/**
 * Stamp one page's eight head tags into a copy of the built shell.
 *
 * ★ ONE `url`, TWO WRITES. The canonical and `og:url` are the same variable, so
 * `head.guard.test.ts`'s byte-identity assertion cannot be broken by editing one
 * of them alone — there is nothing to edit alone.
 *
 * ★ THE SAME INVARIANT CARRIES THE SOCIAL TAGS. `page.title` feeds `<title>`,
 * `og:title` and `twitter:title`; `page.description` feeds the description,
 * `og:description` and `twitter:description`. Six writes, two variables, so a
 * page cannot advertise one thing to a search engine and another to a link
 * preview. Before this, every emitted page kept the shell's own social copy and
 * a shared chapter link previewed as the home page.
 */
export function applyHead(
  html: string,
  page: { path: string; url: string; title: string; description: string },
): string {
  let out = html;
  out = replaceExactlyOnce(
    out,
    CANONICAL_TAG,
    `<link rel="canonical" href="${escapeAttr(page.url)}" />`,
    "<link rel=canonical>",
    page.path,
  );
  out = replaceExactlyOnce(
    out,
    OG_URL_TAG,
    `<meta property="og:url" content="${escapeAttr(page.url)}" />`,
    "<meta property=og:url>",
    page.path,
  );
  out = replaceExactlyOnce(
    out,
    TITLE_TAG,
    `<title>${escapeText(page.title)}</title>`,
    "<title>",
    page.path,
  );
  out = replaceExactlyOnce(
    out,
    DESCRIPTION_TAG,
    `<meta name="description" content="${escapeAttr(page.description)}" />`,
    "<meta name=description>",
    page.path,
  );
  out = replaceExactlyOnce(
    out,
    OG_TITLE_TAG,
    `<meta property="og:title" content="${escapeAttr(page.title)}" />`,
    "<meta property=og:title>",
    page.path,
  );
  out = replaceExactlyOnce(
    out,
    OG_DESCRIPTION_TAG,
    `<meta property="og:description" content="${escapeAttr(page.description)}" />`,
    "<meta property=og:description>",
    page.path,
  );
  out = replaceExactlyOnce(
    out,
    TWITTER_TITLE_TAG,
    `<meta name="twitter:title" content="${escapeAttr(page.title)}" />`,
    "<meta name=twitter:title>",
    page.path,
  );
  out = replaceExactlyOnce(
    out,
    TWITTER_DESCRIPTION_TAG,
    `<meta name="twitter:description" content="${escapeAttr(page.description)}" />`,
    "<meta name=twitter:description>",
    page.path,
  );
  return out;
}

/** The template's own `<title>` text, used when a page has no honest title. */
export function templateTitle(html: string): string {
  return (html.match(TITLE_TAG)?.[0] ?? "").replace(/<\/?title>/gi, "");
}

/** The template's own description, used when a page has no honest description. */
export function templateDescription(html: string): string {
  return (html.match(DESCRIPTION_TAG)?.[0] ?? "").match(/content="([^"]*)"/)?.[1] ?? "";
}

/**
 * Where `vite build` put the app, resolved the way `vite.config.ts` computes it
 * rather than restated. `outDir` is absolute under `NODE_ENV=production` and the
 * relative `"dist"` otherwise, so both are normalised against the app root.
 */
async function resolveOutDir(): Promise<string> {
  const override = process.argv.find((arg) => arg.startsWith("--out="));
  if (override) return resolve(override.slice("--out=".length));

  // ⚠ `vite build` SETS `NODE_ENV=production` INSIDE ITS OWN PROCESS, and
  // `vite.config.ts` branches `build.outDir` on exactly that value: production
  // writes to `artifacts/lazytopper-app/dist/public/app`, anything else to
  // `dist`. THIS SCRIPT IS A SEPARATE PROCESS in the build chain, where NODE_ENV
  // is whatever the shell happened to have — unset, in CI and on a dev box. So
  // importing the config without this line resolves `dist` while the build wrote
  // to `artifacts/...`, and the script reads a file that does not exist. That is
  // not a hypothetical: it is what the first run of this script did. Mirroring
  // what `vite build` does is the only way the two agree by construction rather
  // than by both happening to see the same environment.
  process.env.NODE_ENV = process.env.NODE_ENV || "production";

  const viteConfig = (await import("../../vite.config")).default;
  const outDir = (viteConfig as { build?: { outDir?: string } }).build?.outDir;
  if (typeof outDir !== "string" || outDir.length === 0) {
    throw new Error("writeStaticHeads: vite.config.ts declares no build.outDir");
  }
  return resolve(LAZYTOPPER_ROOT, outDir);
}

/** `/app/` -> `/app`, matching how `main.tsx` feeds `<BrowserRouter basename>`. */
async function resolveBasename(): Promise<string> {
  const viteConfig = (await import("../../vite.config")).default;
  const base = (viteConfig as { base?: string }).base;
  if (typeof base !== "string" || base.length === 0) {
    throw new Error("writeStaticHeads: vite.config.ts declares no base");
  }
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

async function main(): Promise<void> {
  const outDir = await resolveOutDir();
  const basename = await resolveBasename();

  const templatePath = join(outDir, "index.html");
  if (!existsSync(templatePath)) {
    throw new Error(
      `writeStaticHeads: no built shell at ${templatePath}. This script runs AFTER ` +
        `vite build and stamps copies of its output; it cannot run on its own. If ` +
        `the build wrote somewhere else, pass --out=<dir> rather than guessing.`,
    );
  }
  const template = readFileSync(templatePath, "utf8");

  const written: string[] = [];
  const noHonestDescription: string[] = [];
  const advertised = sitemapPaths();

  for (const path of advertised) {
    // The root IS the template. See STATIC_PAGE_HEADS' note.
    if (path === "/") continue;

    const url = canonicalFor(path, basename);
    const head = headForPath(path);
    if (!head) noHonestDescription.push(path);

    const html = applyHead(template, {
      path,
      url,
      // No honest copy for this page: keep what the shell already says rather
      // than write a sentence nothing can back up.
      title: head ? head.title : templateTitle(template),
      description: head ? head.description : templateDescription(template),
    });

    const relative = path.replace(/^\//, "");
    for (const target of [`${relative}.html`, join(relative, "index.html")]) {
      const file = join(outDir, target);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, html, "utf8");
      written.push(target.replace(/\\/g, "/"));
    }
  }

  // ★ NAMES ITS SUBJECT ON EVERY RUN, GREEN INCLUDED. A run that silently wrote
  // nothing — an empty path list, a template that stopped matching — must be
  // visible in the build log rather than reading as success.
  // eslint-disable-next-line no-console
  console.log(
    `STATIC_HEADS: outDir=${outDir} basename=${basename} ` +
      `advertised=${advertised.length} pages=${written.length / 2} ` +
      `files=${written.length} no_honest_description=${noHonestDescription.length}` +
      (noHonestDescription.length > 0 ? ` -> ${noHonestDescription.join(", ")}` : ""),
  );

  if (written.length === 0) {
    throw new Error(
      "writeStaticHeads: wrote ZERO files. The advertised URL set is empty, which " +
        "means every page is still served the home page's canonical.",
    );
  }
}

// Run only when invoked directly, so the guard can import the pure functions
// above without writing to the filesystem.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  });
}
