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
 *   3. Papers  — landing contains sample-paper / mock / highly-probable, or utm_content
 *                contains sample / mock / preboard → full mock, then important questions.
 *   4. Check & Improve surface → "Check one answer" first.
 *   5. Default → "5 quick questions" first.
 * The remaining slots fill from: 5 quick questions, Check one answer, CBQ practice, Important
 * questions, Notes, Exam trends, Tutor — only options whose route EXISTS (`routeExists`),
 * at most 5, no repeats.
 *
 * ★ HONEST COPY: no counts, no promised score, nothing about the student that is not known.
 */

export type GuideSubject = "Maths" | "Science";
export type GuideSurface = "home" | "practice_hub" | "check_improve";
export type GuideIntent = "cbq" | "chapter" | "papers" | "check_improve" | "default";

export type GuideOptionId = "quick" | "check_one" | "cbq" | "important" | "notes" | "trends" | "tutor" | "full_mock";

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

function classify(input: IntentInput, deps: IntentDeps): { intent: GuideIntent; chapter: ChapterRef | null } {
  const content = lower(input.utmContent);
  const landing = lower(input.landing);
  if (content.includes("cbq") || input.cbqLanding) return { intent: "cbq", chapter: null };
  const slug = chapterSlugFromLanding(input.landing);
  const chapter = slug ? deps.chapterBySlug(slug) : null;
  if (chapter) return { intent: "chapter", chapter };
  if (
    ["sample-paper", "mock", "highly-probable"].some((k) => landing.includes(k)) ||
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
  const subject: GuideSubject = chapter?.subject ?? input.subjectHint ?? "Maths";

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
      default:
        return null;
    }
  };

  const lead: GuideOptionId[] =
    intent === "cbq"
      ? ["cbq"]
      : intent === "chapter"
        ? ["quick", "important", "notes"]
        : intent === "papers"
          ? ["full_mock", "important"]
          : intent === "check_improve"
            ? ["check_one"]
            : ["quick"];
  const fill: GuideOptionId[] = ["quick", "check_one", "cbq", "important", "notes", "trends", "tutor"];

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
        : intent === "papers"
          ? GUIDE_LINES.papers
          : GUIDE_LINES.default;
  return { intent, line, options };
}
