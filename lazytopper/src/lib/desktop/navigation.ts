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
 * The marks-filter buckets PracticePage consumes from the `?marks=` query param
 * (see PracticePage `initialPracticeDefaults` — accepts "all" | "1" | "23" | "5"
 * | "4"). A concept's mark BAND is a RANGE (e.g. "1-2") that can span more than
 * one bucket, so the band maps to a SET of buckets (range -> set), serialised as
 * a comma-joined `marks` value (e.g. "1,23") on the SAME `?marks=` mechanism the
 * page already reads. PracticePage narrows on this set client-side.
 */
export type DesktopMarksBucket = "1" | "23" | "5" | "4";

/**
 * Translate a concept mark-band string into the SET of PracticePage `marks`
 * buckets it spans (range -> set), per the PR-E1 mapping:
 *   1-2 -> {1, 23}   ·   2-3 -> {23}   ·   3-5 -> {23, 5}   ·   1-3 -> {1, 23}
 *
 * The band low/high are parsed from the digits in the string (robust to en-dash,
 * hyphen, em-dash or "to" — we never match a literal dash byte, so there is no
 * mojibake surface). A single number (e.g. "3") is treated as low==high. Bucket
 * membership by CBSE section marks:
 *   1mk -> "1" · 2mk/3mk -> "23" · 4mk -> "4" · 5mk -> "5".
 * Returns [] for an unparseable band so callers emit no `marks` filter at all
 * (the page then stays at its default "all" — honest, never a wrong forced band).
 */
export const markBandToBuckets = (band: string | undefined): DesktopMarksBucket[] => {
  if (!band) return [];
  const nums = (band.match(/\d+/g) ?? []).map((n) => Number(n)).filter((n) => n >= 1 && n <= 5);
  if (nums.length === 0) return [];
  const low = Math.min(...nums);
  const high = Math.max(...nums);
  const buckets: DesktopMarksBucket[] = [];
  const add = (b: DesktopMarksBucket) => {
    if (!buckets.includes(b)) buckets.push(b);
  };
  for (let m = low; m <= high; m += 1) {
    if (m === 1) add("1");
    else if (m === 2 || m === 3) add("23");
    else if (m === 4) add("4");
    else if (m === 5) add("5");
  }
  return buckets;
};

/** Serialise a bucket set into the comma-joined `?marks=` value PracticePage reads. */
export const marksBucketsToParam = (buckets: DesktopMarksBucket[]): string | null =>
  buckets.length ? buckets.join(",") : null;

export interface DesktopConceptPracticePathInput extends DesktopRouteContext {
  subject: DesktopSubject;
  grade?: string;          // defaults to "10"
  topic: string;           // topic slug
  focus?: string;          // concept identity
  subtopicHint?: string;   // concept one-line use / hint
  markBand?: string;       // concept mark band (e.g. "1-2") -> mapped to `marks` set
}

/**
 * Concept-row "Practise" target (PR-E1 item 1+2). Lands DIRECTLY in Quick
 * Practice (`/practice/:grade/:subject`, the route PracticePage serves) with the
 * concept focus + the concept's mark band PRE-APPLIED as the initial `marks`
 * filter — NOT on the generic `/practice-hub` (which would need a second click
 * and would not carry the band). PracticePage auto-builds a scoped set on a
 * targeted topic arrival, so the student lands inside a ready, concept-scoped set.
 *
 * PATH-CONDITIONAL: the band is applied ONLY here (the concept-row entry). The
 * hub entry (buildLegacyPracticePath in DesktopPracticePage) emits NO `marks`, so
 * the student-controlled filter stays at "all" there. A starting filter, not a
 * lock — the student can still change marks on the page.
 */
export const buildDesktopConceptPracticePath = (
  input: DesktopConceptPracticePathInput,
): string => {
  const grade = input.grade || "10";
  const params = new URLSearchParams();
  params.set("topic", input.topic);
  if (input.focus) params.set("focus", input.focus);
  if (input.subtopicHint) params.set("subtopicHint", input.subtopicHint);
  const marks = marksBucketsToParam(markBandToBuckets(input.markBand));
  if (marks) params.set("marks", marks);
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
