/**
 * GUIDE-1 §3C — the intent map: where did this student come from, and so what does Byte
 * offer first? PURE: no DOM, no storage, no network. The caller reads the inputs
 * (guideIntentInputs in ./guideInputs.ts) and passes the two lookups in, so every rule is
 * pinned by plain unit tests (intentMap.test.ts).
 *
 * Rules, FIRST MATCH WINS:
 *   1. CBQ     — utm_content or utm_campaign contains "cbq", the landing carried ?cbq=1, or the first
 *                landing was /cbq-class-10 or one of its chapter pages (BYTE-CBQ-1) → CBQ practice first,
 *                then "Get the <Subject> CBQ pack · ₹199" (one-tap checkout).
 *   2. Chapter — landing /notes/<chapter> or /topic-hub/…/<chapter> → that chapter's 5 quick
 *                questions first, then important questions and that chapter's notes.
 *   3. Important — landing path is /highly-probable/… (the important-questions page) →
 *                important questions first. The landing wins over a sample / mock / preboard
 *                utm_content (GUIDE-IQ-1).
 *   4. Papers  — landing contains sample-paper / mock, or utm_content contains sample / mock /
 *                preboard → full mock, then important questions.
 *   5. Packs   — utm_campaign or utm_content contains "pack", or the landing path starts with
 *                /packs or /pricing (GUIDE-QP-1) → the printable PDF packs first.
 *   6. Quick   — utm_content contains "quick" / "mcq" / "tap", or the landing carried ?quick=1
 *                (GUIDE-QP-1; ladder: zero-effort tap practice first, then Check & Improve) →
 *                "5 quick questions" first.
 *   7. Check & Improve — the page is the Check & Improve surface, OR the visit's first landing
 *                was /check-improve (the free-check ad; LOGIN-HOME-1, any surface) →
 *                "Check one answer" first.
 *   8. Default → "5 quick questions" first on the Practice hub; on HOME (surface "home")
 *                "Check one answer" first, then "5 quick questions" (LOGIN-HOME-1, owner 24 Oct
 *                2026: Byte exists to make new students try Check & Improve, see its value, buy).
 * Subject (important questions, tutor, full mock): the chapter's subject, else the subject the
 * landing path names (a segment equal to maths / science, any case), else Start-here's
 * subject hint, else Maths.
 * GUIDE-OPTS-1 (owner, 22 Oct 2026) — each intent leads with up to five options, in this order:
 *   default / Check & Improve: quick, check_one, worksheet, chapter_test, important
 *                              (Check & Improve and Home put check_one first: check_one, quick, …)
 *   chapter:   quick (that chapter), chapter_test (that chapter), important, notes, worksheet
 *   important: important, chapter_test, quick, check_one, worksheet
 *   papers:    full_mock, chapter_test, important, worksheet, check_one
 *   cbq:       cbq, cbq_pack, quick, check_one, chapter_test
 *   packs:     packs, cbq, quick, chapter_test, check_one
 *   quick:     quick, cbq, check_one, chapter_test, worksheet
 * Any slot left (an option dropped because its route is missing, or it does not apply) fills
 * from: 5 quick questions, Check one answer, Worksheet, Chapter Test, CBQ practice,
 * Important questions, Notes, Exam trends, Tutor — only options whose route EXISTS
 * (`routeExists`), at most 5, no repeats.
 * Chapter Test opens THAT chapter's test when the chapter is known, else the Practice Hub's
 * Chapter Test chooser (/practice-hub?ct=1).
 *
 * ★ HONEST COPY: no counts, no promised score, nothing about the student that is not known.
 */

import { buyHrefFor } from "../packs/offersModel";
import { packPriceLabel } from "../../services/packs";
import { CBQ_BOTH_SUBJECTS_HREF } from "../../lib/packs/packLinks";

export type GuideSubject = "Maths" | "Science";
export type GuideSurface = "home" | "practice_hub" | "check_improve";
export type GuideIntent = "cbq" | "chapter" | "important" | "papers" | "packs" | "quick" | "check_improve" | "default";

export type GuideOptionId =
  | "quick"
  | "check_one"
  | "cbq"
  | "important"
  | "notes"
  | "trends"
  | "tutor"
  | "full_mock"
  | "chapter_test"
  | "worksheet"
  | "packs"
  | "cbq_pack";

export interface IntentInput {
  /** The landing PATH of this visit (no query), when this tab still knows it. */
  landing: string | null;
  utmContent: string | null;
  utmCampaign: string | null;
  /** The landing carried ?cbq=1 (Start-here's subject hint is derived from exactly that). */
  cbqLanding: boolean;
  /** GUIDE-QP-1 — the landing carried ?quick=1 (read from the current URL; optional). */
  quickLanding?: boolean;
  /** Start-here's subject hint (Maths / Science), or null. */
  subjectHint: GuideSubject | null;
  surface: GuideSurface;
}

export interface ChapterRef {
  slug: string;
  name: string;
  subject: GuideSubject;
}

export interface IntentDeps {
  /** The chapter registry lookup (lib/desktop/topics.ts desktopTopicBySlug). */
  chapterBySlug: (slug: string) => ChapterRef | null;
  /** Whether a path's route exists in App.tsx (see GUIDE_ROUTES). */
  routeExists: (path: string) => boolean;
  /** GUIDE-1 v1.1 — the Tutor route will open for this student (Premium or an active trial). */
  tutorOpens?: boolean;
}

export interface GuideOption {
  id: GuideOptionId;
  title: string;
  sub: string;
  /** What Byte says when the option is hovered / focused. */
  point: string;
  /** "quick" opens Start-here's ready state; "check_one" the page's question box; else a route. */
  action: { kind: "quick"; chapter: ChapterRef | null } | { kind: "check_one"; path: string } | { kind: "route"; path: string };
}

export interface GuidePlan {
  intent: GuideIntent;
  line: string;
  options: GuideOption[];
}

export const GUIDE_MAX_OPTIONS = 5;

export const GUIDE_LINES = {
  default: "Hey! I'm Byte. What do you want to do today?",
  cbq: "Here for CBQs? Start here:",
  chapter: (name: string) => `Doing ${name}? These will help:`,
  important: "Important questions? Start here:",
  papers: "Sample paper prep? Try these:",
  packs: "Looking for printable packs? Start here:",
  quick: "Want a quick win? Tap through a few:",
} as const;

/**
 * The route patterns the guide can link to, each verified against App.tsx routing
 * (line numbers at f02c200). An option whose path matches none of these is dropped.
 */
export const GUIDE_ROUTES: ReadonlyArray<{ pattern: RegExp; route: string }> = [
  { pattern: /^\/check-improve$/, route: "/check-improve (App.tsx:1297)" },
  { pattern: /^\/practice-hub(\?cbq=1)?$/, route: "/practice-hub (App.tsx:1255; ?cbq=1 opens CbqChapterPicker)" },
  { pattern: /^\/highly-probable\/10\/(Maths|Science)$/, route: "/highly-probable/:grade/:subject (App.tsx:1161)" },
  { pattern: /^\/notes\/[a-z0-9-]+$/, route: "/notes/:topicSlug (App.tsx:1337)" },
  { pattern: /^\/exam-trends$/, route: "/exam-trends (App.tsx:1312)" },
  { pattern: /^\/tutor\/10\/(Maths|Science)$/, route: "/tutor/:grade/:subject (App.tsx:1135)" },
  { pattern: /^\/full-mock\/10\/(Maths|Science)$/, route: "/full-mock/:grade/:subject (App.tsx:1125)" },
  // GUIDE-OPTS-1 (lines at 361d4320). The chapter segment is the desktop topic slug, the same
  // topicKey Topic Hub's Chapter Test button builds (DesktopTopicHubPage.tsx:247
  // buildDesktopChapterTestPath({ topicKey: topic.slug })).
  { pattern: /^\/chapter-test\/10\/(Maths|Science)\/[a-z0-9-]+$/, route: "/chapter-test/:grade/:subject/:topicKey (App.tsx:1124)" },
  {
    pattern: /^\/practice-hub\?ct=1$/,
    route: "/practice-hub (App.tsx:1255; ?ct=1 opens ChapterTestPicker, DesktopPracticePage.tsx:1711)",
  },
  { pattern: /^\/packs$/, route: "/packs (App.tsx:1007; GUIDE-QP-1)" },
  // BYTE-CBQ-1: the one-tap CBQ Pack checkout, the OFFERS-V2 link PacksShop readBuyResume accepts (sku pack_cbq, t = maths | science).
  { pattern: /^\/packs\?buy=pack_cbq&t=(maths|science)$/, route: "/packs?buy=pack_cbq&t=<subject> (PacksShop readBuyResume; BYTE-CBQ-1)" },
  // PRICING-ONE-1: the packs now live on the pricing page; /pricing#packs is the strip (an in-page anchor of the existing /pricing route).
  // LINKS-1: the CBQ band (both subjects) - Byte's cbq_pack with an unknown subject.
  { pattern: /^\/pricing#cbq$/, route: "/pricing#cbq (App.tsx /pricing; CbqBand id=\"cbq\")" },
  { pattern: /^\/pricing#packs$/, route: "/pricing#packs (App.tsx /pricing; PacksStrip id=\"packs\")" },
  { pattern: /^\/practice\/worksheets$/, route: "/practice/worksheets (App.tsx:1269; the one responsive WorksheetGenerator)" },
];

export function knownGuideRoute(path: string): boolean {
  return GUIDE_ROUTES.some((r) => r.pattern.test(path));
}

/**
 * BYTE-CBQ-1 — the CBQ pages. A first landing on /cbq-class-10 or /cbq-class-10/<chapter> (the CBQ pack ad's
 * landing and its chapter pages) is a CBQ intent, like utm_content "cbq" or ?cbq=1.
 */
export function isCbqLanding(landing: string | null): boolean {
  return /^\/cbq-class-10(\/|$)/i.test(String(landing || ""));
}

/** The chapter slug of a /cbq-class-10/<slug> landing (its subject tells which CBQ pack), if any. */
export function cbqChapterSlugFromLanding(landing: string | null): string | null {
  const m = /^\/cbq-class-10\/([a-z0-9-]+)\/?$/i.exec(String(landing || ""));
  return m ? m[1].toLowerCase() : null;
}

const lower = (s: string | null): string => String(s || "").toLowerCase();

/** The chapter slug a landing path names, if any (/notes/<slug>, /topic-hub/…/<slug>). */
export function chapterSlugFromLanding(landing: string | null): string | null {
  const p = String(landing || "");
  let m = /^\/notes\/([a-z0-9-]+)\/?$/i.exec(p);
  if (m) return m[1].toLowerCase();
  m = /^\/topic-hub\/(?:10\/(?:maths|science)\/)?([a-z0-9-]+)\/?$/i.exec(p);
  if (m && !/^\d+$/.test(m[1])) return m[1].toLowerCase();
  return null;
}

/** The subject a landing path names (a segment equal to maths / science, any case), if any. */
export function subjectFromLanding(landing: string | null): GuideSubject | null {
  for (const seg of String(landing || "").split("/")) {
    const s = seg.toLowerCase();
    if (s === "maths") return "Maths";
    if (s === "science") return "Science";
  }
  return null;
}

function classify(input: IntentInput, deps: IntentDeps): { intent: GuideIntent; chapter: ChapterRef | null } {
  const content = lower(input.utmContent);
  const landing = lower(input.landing);
  const campaign = lower(input.utmCampaign);
  if (content.includes("cbq") || campaign.includes("cbq") || input.cbqLanding || isCbqLanding(input.landing)) return { intent: "cbq", chapter: null };
  const slug = chapterSlugFromLanding(input.landing);
  const chapter = slug ? deps.chapterBySlug(slug) : null;
  if (chapter) return { intent: "chapter", chapter };
  // The landing wins over the ad's utm_content: an important-questions landing is "important"
  // even when utm_content says sample / mock / preboard.
  if (/^\/highly-probable(\/|$)/.test(landing)) return { intent: "important", chapter: null };
  if (
    ["sample-paper", "mock"].some((k) => landing.includes(k)) ||
    ["sample", "mock", "preboard"].some((k) => content.includes(k))
  ) {
    return { intent: "papers", chapter: null };
  }
  if (
    campaign.includes("pack") ||
    content.includes("pack") ||
    /^\/(packs|pricing)(\/|$)/.test(landing)
  ) {
    return { intent: "packs", chapter: null };
  }
  if (["quick", "mcq", "tap"].some((k) => content.includes(k)) || input.quickLanding === true) {
    return { intent: "quick", chapter: null };
  }
  if (input.surface === "check_improve" || /^\/check-improve\/?$/.test(landing)) return { intent: "check_improve", chapter: null };
  return { intent: "default", chapter: null };
}

/** Byte's options for this student, in order, plus his opening line. */
export function buildGuidePlan(input: IntentInput, deps: IntentDeps): GuidePlan {
  const { intent, chapter } = classify(input, deps);
  // BYTE-CBQ-1: a /cbq-class-10/<chapter> landing names its subject through the chapter registry.
  const cbqSlug = cbqChapterSlugFromLanding(input.landing);
  const cbqSubject = cbqSlug ? deps.chapterBySlug(cbqSlug)?.subject ?? null : null;
  const knownSubject: GuideSubject | null = chapter?.subject ?? subjectFromLanding(input.landing) ?? cbqSubject ?? input.subjectHint;
  const subject: GuideSubject = knownSubject ?? "Maths";

  const make = (id: GuideOptionId): GuideOption | null => {
    switch (id) {
      case "quick":
        return {
          id,
          title: chapter && intent === "chapter" ? `5 quick ${chapter.name} questions` : "5 quick questions",
          sub: "Tap to answer · about 2 min",
          point: "Five taps, about two minutes. No typing!",
          action: { kind: "quick", chapter: intent === "chapter" ? chapter : null },
        };
      case "check_one":
        return {
          id,
          title: "Check one answer",
          // BYTE-TRYONE-1: on Home the tap launches one real written board question (typed).
          sub: input.surface === "home" && input.subjectHint !== "Maths" ? "Answer one real board question · about 2 min" : "Type or photograph it · see where marks slip",
          point: "Show me one answer. I'll show you where marks slip.",
          action: { kind: "check_one", path: "/check-improve" },
        };
      case "cbq":
        return {
          id,
          title: "CBQ practice",
          sub: "Competency-based questions, chapter-wise",
          point: "Competency-based questions are a big part of the board paper. Practise here.",
          action: { kind: "route", path: "/practice-hub?cbq=1" },
        };
      case "cbq_pack": {
        // BYTE-CBQ-1: straight to one-tap checkout for the subject we KNOW; unknown subject -> /pricing#cbq (LINKS-1), which shows both CBQ packs.
        const price = packPriceLabel("pack_cbq");
        return {
          id,
          title: knownSubject ? `Get the ${knownSubject} CBQ pack · ${price}` : `Get the CBQ pack · ${price}`,
          sub: "Printable PDF · every chapter · step-by-step explanations",
          point: "Print every CBQ, write on paper like the real exam.",
          action: { kind: "route", path: knownSubject ? buyHrefFor("pack_cbq", knownSubject.toLowerCase()) : CBQ_BOTH_SUBJECTS_HREF },
        };
      }
      case "packs":
        return {
          id,
          title: "Printable PDF packs",
          sub: "Chapter, mock and subject packs to print and write on",
          point: "Print it, write on paper like the real exam.",
          action: { kind: "route", path: "/pricing#packs" },
        };
      case "important":
        return {
          id,
          title: "Important questions",
          sub: `${subject} · the ones boards keep asking`,
          point: "The questions boards keep coming back to.",
          action: { kind: "route", path: `/highly-probable/10/${subject}` },
        };
      case "notes":
        if (!chapter) return null; // notes live per chapter; no chapter known -> no notes option
        return {
          id,
          title: `${chapter.name} notes`,
          sub: "Short, exam-ready revision",
          point: "Quick revision, formulae and tricks.",
          action: { kind: "route", path: `/notes/${chapter.slug}` },
        };
      case "trends":
        return {
          id,
          title: "Exam trends",
          sub: "What CBSE has asked, chapter by chapter",
          point: "See what CBSE has asked, year by year.",
          action: { kind: "route", path: "/exam-trends" },
        };
      case "tutor":
        if (!deps.tutorOpens) return null; // behind RequirePremium: offered only when it will open
        return {
          id,
          title: "Tutor",
          sub: "English or Hinglish is fine",
          point: "Stuck? Ask the AI Tutor to explain it step by step.",
          action: { kind: "route", path: `/tutor/10/${subject}` },
        };
      case "full_mock":
        return {
          id,
          title: "Full mock paper",
          sub: `${subject} · a full board paper, marked step by step`,
          point: "A full paper, marked the way CBSE marks it.",
          action: { kind: "route", path: `/full-mock/10/${subject}` },
        };
      case "chapter_test":
        // Sections B-D are graded from the uploaded answer sheet with step marks; Section A is
        // objective, 0-or-full (ChapterTestPage.tsx header) — hence "written answers".
        return {
          id,
          title: "Chapter Test",
          sub: "Board-pattern test on one chapter · written answers marked step by step",
          point: "One chapter, board-style. See exactly where marks slip.",
          action: {
            kind: "route",
            // A known chapter opens ITS test; otherwise the Practice Hub's chapter chooser.
            path: chapter && intent === "chapter" ? `/chapter-test/10/${chapter.subject}/${encodeURIComponent(chapter.slug)}` : "/practice-hub?ct=1",
          },
        };
      case "worksheet":
        // /practice/worksheets builds the worksheet in place; the answer sheet goes up as one PDF
        // or a photo per page (WorksheetGradePanel) to the shared step-marking grader.
        return {
          id,
          title: "Worksheet",
          sub: "Write on paper, upload a photo, get written answers marked step by step",
          point: "Write it on paper like the real exam. I'll mark every written step.",
          action: { kind: "route", path: "/practice/worksheets" },
        };
      default:
        return null;
    }
  };

  const lead: GuideOptionId[] =
    intent === "cbq"
      ? ["cbq", "cbq_pack", "quick", "check_one", "chapter_test"]
      : intent === "packs"
        ? ["packs", "cbq", "quick", "chapter_test", "check_one"]
        : intent === "quick"
          ? ["quick", "cbq", "check_one", "chapter_test", "worksheet"]
          : intent === "chapter"
        ? ["quick", "chapter_test", "important", "notes", "worksheet"]
        : intent === "important"
          ? ["important", "chapter_test", "quick", "check_one", "worksheet"]
          : intent === "papers"
            ? ["full_mock", "chapter_test", "important", "worksheet", "check_one"]
            : intent === "check_improve"
              ? ["check_one", "quick", "worksheet", "chapter_test", "important"]
              : input.surface === "home"
                ? ["check_one", "quick", "worksheet", "chapter_test", "important"]
                : ["quick", "check_one", "worksheet", "chapter_test", "important"];
  const fill: GuideOptionId[] = ["quick", "check_one", "worksheet", "chapter_test", "cbq", "important", "notes", "trends", "tutor"];

  const options: GuideOption[] = [];
  const seen = new Set<GuideOptionId>();
  for (const id of [...lead, ...fill]) {
    if (options.length >= GUIDE_MAX_OPTIONS) break;
    if (seen.has(id)) continue;
    seen.add(id);
    const o = make(id);
    if (!o) continue;
    if (o.action.kind !== "quick" && !deps.routeExists(o.action.path)) continue; // never a missing page
    options.push(o);
  }

  const line =
    intent === "cbq"
      ? GUIDE_LINES.cbq
      : intent === "chapter" && chapter
        ? GUIDE_LINES.chapter(chapter.name)
        : intent === "important"
          ? GUIDE_LINES.important
          : intent === "papers"
            ? GUIDE_LINES.papers
            : intent === "packs"
              ? GUIDE_LINES.packs
              : intent === "quick"
                ? GUIDE_LINES.quick
                : GUIDE_LINES.default;
  return { intent, line, options };
}
