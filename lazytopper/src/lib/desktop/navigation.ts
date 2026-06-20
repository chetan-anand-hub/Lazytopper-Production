export type DesktopActionSource = "home" | "practice" | "trends" | "topicHub" | "worksheet" | "check" | "me";
export type DesktopSubject = "Maths" | "Science";
export type DesktopStream = "All" | "Physics" | "Chemistry" | "Biology";
export type DesktopPracticeMode = "practice-set" | "worksheet" | "predicted" | "full-mock" | "timed" | "chapter-test" | "practice-paper";
export type DesktopPaperScope = "topic" | "multi-topic" | "full-subject";

export interface DesktopRouteContext {
  source?: DesktopActionSource;
  returnTo?: string;
}

export interface DesktopPracticePathInput extends DesktopRouteContext {
  scope: DesktopPaperScope;
  subject: DesktopSubject;
  stream?: DesktopStream;
  topic?: string;
  topics?: string[];
  mode?: DesktopPracticeMode;
  mistake?: string;
  focus?: string;
  subtopicHint?: string;
  markBand?: string;       // concept mark band (e.g. "1–2") — concept-filtered practice
  section?: string;        // "A" | "B" | "C" | "D" | "E"
  difficulty?: string;     // "Easy" | "Medium" | "Hard"
  count?: number;          // 5 | 10 | 15 | 20
  questionType?: string;   // "All" | "MCQ" | "Proof" | "Competency" | "AR" | "Case"
  pyqOnly?: boolean;
}

export interface DesktopWorksheetPathInput extends DesktopRouteContext {
  scope: DesktopPaperScope;
  subject: DesktopSubject;
  stream?: DesktopStream;
  topic?: string;
  topics?: string[];
  mistakeAware?: boolean;
}

const addContext = (params: URLSearchParams, context: DesktopRouteContext) => {
  if (context.source) params.set("source", context.source);
  if (context.returnTo) params.set("returnTo", context.returnTo);
};

const addScope = (params: URLSearchParams, input: DesktopPracticePathInput | DesktopWorksheetPathInput) => {
  params.set("scope", input.scope);
  params.set("subject", input.subject);
  if (input.stream && input.stream !== "All") params.set("stream", input.stream);
  if (input.topic) params.set("topic", input.topic);
  if (input.topics?.length) params.set("topics", input.topics.join(","));
};

export const withQuery = (path: string, params: URLSearchParams): string => {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

/**
 * A concept's mark BAND is a RANGE (e.g. "1-2", "3-5"). PR-E1 mapped this to a
 * SET of coarse PracticePage buckets ("1" | "23" | "5" | "4"). That model FUSES
 * 2- and 3-mark questions into one bucket "23", so a "3-5" request could not be
 * isolated from 2-mark questions (structural contamination — owner-reported).
 *
 * PR-E1 amendment (Option A): the concept-row path now carries the EXACT mark
 * RANGE as `marksMin`/`marksMax`, and PracticePage filters by the actual numeric
 * `marks` field per question. CBSE Section B = 2-mark, Section C = 3-mark; the
 * exact range keeps that distinction the coarse buckets destroyed.
 */
export interface DesktopMarkRange {
  min: number;
  max: number;
}

/**
 * Parse a concept mark-band string into an EXACT numeric {min,max} range.
 * The low/high are parsed from the digits in the string (robust to en-dash,
 * hyphen, em-dash or "to" — we never match a literal dash byte, so there is no
 * mojibake surface). A single number (e.g. "3") is treated as min==max. Returns
 * null for an unparseable band so callers emit no range filter at all (the page
 * then stays at its default "all" — honest, never a wrong forced band).
 */
export const parseMarkBandRange = (band: string | undefined): DesktopMarkRange | null => {
  if (!band) return null;
  const nums = (band.match(/\d+/g) ?? []).map((n) => Number(n)).filter((n) => n >= 1 && n <= 5);
  if (nums.length === 0) return null;
  return { min: Math.min(...nums), max: Math.max(...nums) };
};

export interface DesktopConceptPracticePathInput extends DesktopRouteContext {
  subject: DesktopSubject;
  grade?: string;          // defaults to "10"
  topic: string;           // topic slug
  focus?: string;          // concept identity
  subtopicHint?: string;   // concept one-line use / hint
  markBand?: string;       // concept mark band (e.g. "1-2") -> exact marksMin/marksMax
  backLabel?: string;      // e.g. "Back to Trigonometry" — specific Topic Hub topic
}

/**
 * Concept-row "Practise" target (PR-E1 item 1+2). Lands DIRECTLY in Quick
 * Practice (`/practice/:grade/:subject`, the route PracticePage serves) with the
 * concept focus + the concept's mark band PRE-APPLIED as the initial `marks`
 * filter — NOT on the generic `/practice-hub` (which would need a second click
 * and would not carry the band). PracticePage auto-builds a scoped set on a
 * targeted topic arrival, so the student lands inside a ready, concept-scoped set.
 *
 * PATH-CONDITIONAL: the EXACT range (`marksMin`/`marksMax`) is applied ONLY here
 * (the concept-row entry). The hub entry (buildDesktopPracticePath) emits NO
 * range, so the student-controlled bucket filter stays at "all" there. A starting
 * filter, not a lock — the student can still widen/clear it via the advanced
 * filter on the page.
 *
 * EXACT range vs. coarse buckets: "3-5" -> marksMin=3&marksMax=5 yields ONLY 3,4,5
 * (no 2-mark contamination, since PracticePage filters on the real numeric `marks`
 * field). Back-nav: a `backLabel` (e.g. "Back to Trigonometry") + the topic-hub
 * `returnTo` send the student back to the SPECIFIC topic page (item 4).
 */
export const buildDesktopConceptPracticePath = (
  input: DesktopConceptPracticePathInput,
): string => {
  const grade = input.grade || "10";
  const params = new URLSearchParams();
  params.set("topic", input.topic);
  if (input.focus) params.set("focus", input.focus);
  if (input.subtopicHint) params.set("subtopicHint", input.subtopicHint);
  const range = parseMarkBandRange(input.markBand);
  if (range) {
    params.set("marksMin", String(range.min));
    params.set("marksMax", String(range.max));
  }
  if (input.backLabel) params.set("backLabel", input.backLabel);
  addContext(params, input);
  return withQuery(`/practice/${grade}/${input.subject}`, params);
};

export const buildDesktopPracticePath = (input: DesktopPracticePathInput): string => {
  const params = new URLSearchParams();
  addScope(params, input);
  if (input.mode) params.set("mode", input.mode);
  if (input.mistake) params.set("mistake", input.mistake);
  if (input.focus) params.set("focus", input.focus);
  if (input.subtopicHint) params.set("subtopicHint", input.subtopicHint);
  if (input.markBand) params.set("markBand", input.markBand);
  if (input.section) params.set("section", input.section);
  if (input.difficulty) params.set("difficulty", input.difficulty);
  if (input.count) params.set("count", String(input.count));
  if (input.questionType && input.questionType !== "All") {
    params.set("questionType", input.questionType);
  }
  if (input.pyqOnly) {
    params.set("pyq", "1");
  }
  addContext(params, input);
  return withQuery("/practice-hub", params);
};

export const buildDesktopWorksheetPath = (input: DesktopWorksheetPathInput): string => {
  const params = new URLSearchParams();
  addScope(params, input);
  if (input.mistakeAware) params.set("mistakeAware", "1");
  addContext(params, input);
  return withQuery("/practice/worksheets", params);
};

/**
 * Chapter Test route for a topic (PR-E1 item 3). Targets the existing
 * ChapterTestPage (`/chapter-test/:grade/:subject/:topicKey`) — real gen -> score
 * -> persist, timed/untimed. Used to wire the Topic Hub action-band "Chapter test"
 * button (PR-D left it inert "Soon"). Carries source/returnTo for back-nav.
 */
export const buildDesktopChapterTestPath = (
  input: { subject: DesktopSubject; topicKey: string; grade?: string } & DesktopRouteContext,
): string => {
  const grade = input.grade || "10";
  const params = new URLSearchParams();
  addContext(params, input);
  return withQuery(
    `/chapter-test/${grade}/${input.subject}/${encodeURIComponent(input.topicKey)}`,
    params,
  );
};

export const buildDesktopTopicHubPath = (topicSlug: string, context: DesktopRouteContext = {}): string => {
  const params = new URLSearchParams();
  addContext(params, context);
  return withQuery(`/topic-hub/${encodeURIComponent(topicSlug)}`, params);
};

export const buildDesktopCheckPath = (topicSlug?: string, context: DesktopRouteContext = {}): string => {
  const params = new URLSearchParams();
  if (topicSlug) params.set("topic", topicSlug);
  addContext(params, context);
  return withQuery("/check-improve", params);
};

export const buildDesktopMePath = (context: DesktopRouteContext = {}): string => {
  const params = new URLSearchParams();
  addContext(params, context);
  return withQuery("/me", params);
};
