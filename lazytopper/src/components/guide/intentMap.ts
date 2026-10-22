/**
 * GUIDE-1 §3C — the intent map: where did this student come from, and so what does Byte
 * offer first? PURE: no DOM, no storage, no network. The caller reads the inputs
 * (guideIntentInputs in ./guideInputs.ts) and passes the two lookups in, so every rule is
 * pinned by plain unit tests (intentMap.test.ts).
 *
 * Rules, FIRST MATCH WINS:
 *   1. CBQ     — utm_content contains "cbq", or the landing carried ?cbq=1 → CBQ practice first.
 *   2. Chapter — landing /notes/<chapter> or /topic-hub/…/<chapter> → that chapter's 5 quick
 *                questions first, then important questions and that chapter's notes.
 *   3. Important — landing path is /highly-probable/… (the important-questions page) →
 *                important questions first. The landing wins over a sample / mock / preboard
 *                utm_content (GUIDE-IQ-1).
 *   4. Papers  — landing contains sample-paper / mock, or utm_content contains sample / mock /
 *                preboard → full mock, then important questions.
 *   5. Check & Improve surface → "Check one answer" first.
 *   6. Default → "5 quick questions" first.
 * Subject (important questions, tutor, full mock): the chapter's subject, else the subject the
 * landing path names (a segment equal to maths / science, any case), else Start-here's
 * subject hint, else Maths.
 * GUIDE-OPTS-1 (owner, 22 Oct 2026) — each intent leads with up to five options, in this order:
 *   default / Check & Improve: quick, check_one, worksheet, chapter_test, important
 *                              (Check & Improve puts check_one first)
 *   chapter:   quick (that chapter), chapter_test (that chapter), important, notes, worksheet
 *   important: important, chapter_test, quick, check_one, worksheet
 *   papers:    full_mock, chapter_test, important, worksheet, check_one
 *   cbq:       cbq, quick, check_one, chapter_test, worksheet
 * Any slot left (an option dropped because its route is missing, or it does not apply) fills
 * from: 5 quick questions, Check one answer, Today's worksheet, Chapter Test, CBQ practice,
 * Important questions, Notes, Exam trends, Tutor — only options whose route EXISTS
 * (`routeExists`), at most 5, no repeats.
 * Chapter Test opens THAT chapter's test when the chapter is known, else the Practice Hub's
 * Chapter Test chooser (/practice-hub?ct=1).
 *
 * ★ HONEST COPY: no counts, no promised score, nothing about the student that is not known.
 */

export type GuideSubject = "Maths" | "Science";
export type GuideSurface = "home" | "practice_hub" | "check_improve";
export type GuideIntent = "cbq" | "chapter" | "important" | "papers" | "check_improve" | "default";

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
  | "worksheet";

export interface IntentInput {
  /** The landing PATH of this visit (no query), when this tab still knows it. */
  landing: string | null;
  utmContent: string | null;
  utmCampaign: string | null;
  /** The landing carried ?cbq=1 (Start-here's subject hint is derived from exactly that). */
  cbqLanding: boolean;
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
  cbq: "Came from the CBQ Short? Start here:",
  chapter: (name: string) => `Doing ${name}? These will help:`,
  important: "Important questions? Start here:",
  papers: "Sample paper prep? Try these:",
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
  { pattern: /^\/practice\/worksheets$/, route: "/practice/worksheets (App.tsx:1269; the one responsive WorksheetGenerator)" },
];

export function knownGuideRoute(path: string): boolean {
  return GUIDE_ROUTES.some((r) => r.pattern.test(path));
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
  if (content.includes("cbq") || input.cbqLanding) return { intent: "cbq", chapter: null };
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
  if (input.surface === "check_improve") return { intent: "check_improve", chapter: null };
  return { intent: "default", chapter: null };
}

/** Byte's options for this student, in order, plus his opening line. */
export function buildGuidePlan(input: IntentInput, deps: IntentDeps): GuidePlan {
  const { intent, chapter } = classify(input, deps);
  const subject: GuideSubject = chapter?.subject ?? subjectFromLanding(input.landing) ?? input.subjectHint ?? "Maths";

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
          sub: "Type or photograph it · see where marks slip",
          point: "Show me one answer. I'll show you where marks slip.",
          action: { kind: "check_one", path: "/check-improve" },
        };
      case "cbq":
        return {
          id,
          title: "CBQ practice",
          sub: "Competency-based questions, chapter-wise",
          point: "Half the board paper is competency-based. Practise here.",
          action: { kind: "route", path: "/practice-hub?cbq=1" },
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
          sub: "Stuck? English or Hinglish is fine",
          point: "Ask me anything. Hinglish chalega!",
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
          title: "Today's worksheet",
          sub: "Write on paper, upload a photo, get every step marked",
          point: "Write it on paper like the real exam. I'll mark every step.",
          action: { kind: "route", path: "/practice/worksheets" },
        };
      default:
        return null;
    }
  };

  const lead: GuideOptionId[] =
    intent === "cbq"
      ? ["cbq", "quick", "check_one", "chapter_test", "worksheet"]
      : intent === "chapter"
        ? ["quick", "chapter_test", "important", "notes", "worksheet"]
        : intent === "important"
          ? ["important", "chapter_test", "quick", "check_one", "worksheet"]
          : intent === "papers"
            ? ["full_mock", "chapter_test", "important", "worksheet", "check_one"]
            : intent === "check_improve"
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
            : GUIDE_LINES.default;
  return { intent, line, options };
}
