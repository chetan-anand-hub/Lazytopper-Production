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

export const buildDesktopPracticePath = (input: DesktopPracticePathInput): string => {
  const params = new URLSearchParams();
  addScope(params, input);
  if (input.mode) params.set("mode", input.mode);
  if (input.mistake) params.set("mistake", input.mistake);
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
