import type {
  DesktopActionSource,
  DesktopPaperScope,
  DesktopPracticeMode,
  DesktopStream,
  DesktopSubject,
} from "./navigation";

/**
 * Desktop Level 2 — study/context helper.
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/context/LazyTopperContext.tsx
 *   chetan-anand-hub/topic-focus-lite — src/lib/navigation.ts
 *
 * Pure URL-param ↔ study-context serialization. NOT a React context provider.
 * Mirrors the desktop nav builders so any Level 2 page can:
 *   1. Receive a URL search string
 *   2. Recover the full study scope (subject / stream / topic[s] / mode / source)
 *   3. Re-serialize when navigating onward, preserving returnTo
 *
 * No React, no localStorage, no side effects.
 */

export interface DesktopStudyContext {
  scope?: DesktopPaperScope;
  subject?: DesktopSubject;
  stream?: DesktopStream;
  topic?: string;
  topics?: string[];
  mode?: DesktopPracticeMode;
  mistake?: string;
  mistakeAware?: boolean;
  source?: DesktopActionSource;
  returnTo?: string;
}

const SUBJECT_VALUES: DesktopSubject[] = ["Maths", "Science"];
const STREAM_VALUES: DesktopStream[] = ["All", "Physics", "Chemistry", "Biology"];
const SCOPE_VALUES: DesktopPaperScope[] = ["topic", "multi-topic", "full-subject"];
const MODE_VALUES: DesktopPracticeMode[] = [
  "practice-set",
  "worksheet",
  "predicted",
  "full-mock",
  "timed",
  "chapter-test",
  "practice-paper",
];
const SOURCE_VALUES: DesktopActionSource[] = [
  "home",
  "practice",
  "trends",
  "topicHub",
  "worksheet",
  "check",
  "me",
];

const isOneOf = <T extends string>(value: string | null, allowed: readonly T[]): value is T => {
  return value !== null && (allowed as readonly string[]).includes(value);
};

export const parseDesktopStudyContext = (
  searchOrParams: string | URLSearchParams,
): DesktopStudyContext => {
  const params =
    typeof searchOrParams === "string" ? new URLSearchParams(searchOrParams) : searchOrParams;

  const ctx: DesktopStudyContext = {};

  const scope = params.get("scope");
  if (isOneOf(scope, SCOPE_VALUES)) ctx.scope = scope;

  const subject = params.get("subject");
  if (isOneOf(subject, SUBJECT_VALUES)) ctx.subject = subject;

  const stream = params.get("stream");
  if (isOneOf(stream, STREAM_VALUES)) ctx.stream = stream;

  const topic = params.get("topic");
  if (topic) ctx.topic = topic;

  const topicsRaw = params.get("topics");
  if (topicsRaw) {
    const list = topicsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length) ctx.topics = list;
  }

  const mode = params.get("mode");
  if (isOneOf(mode, MODE_VALUES)) ctx.mode = mode;

  const mistake = params.get("mistake");
  if (mistake) ctx.mistake = mistake;

  if (params.get("mistakeAware") === "1") ctx.mistakeAware = true;

  const source = params.get("source");
  if (isOneOf(source, SOURCE_VALUES)) ctx.source = source;

  const returnTo = params.get("returnTo");
  if (returnTo) ctx.returnTo = returnTo;

  return ctx;
};

export const serializeDesktopStudyContext = (ctx: DesktopStudyContext): URLSearchParams => {
  const params = new URLSearchParams();
  if (ctx.scope) params.set("scope", ctx.scope);
  if (ctx.subject) params.set("subject", ctx.subject);
  if (ctx.stream && ctx.stream !== "All") params.set("stream", ctx.stream);
  if (ctx.topic) params.set("topic", ctx.topic);
  if (ctx.topics?.length) params.set("topics", ctx.topics.join(","));
  if (ctx.mode) params.set("mode", ctx.mode);
  if (ctx.mistake) params.set("mistake", ctx.mistake);
  if (ctx.mistakeAware) params.set("mistakeAware", "1");
  if (ctx.source) params.set("source", ctx.source);
  if (ctx.returnTo) params.set("returnTo", ctx.returnTo);
  return params;
};

export const mergeDesktopStudyContext = (
  base: DesktopStudyContext,
  patch: Partial<DesktopStudyContext>,
): DesktopStudyContext => {
  const next: DesktopStudyContext = { ...base };
  for (const key of Object.keys(patch) as Array<keyof DesktopStudyContext>) {
    const value = patch[key];
    if (value === undefined) continue;
    (next as Record<string, unknown>)[key] = value;
  }
  return next;
};

export const isMeaningfulStudyContext = (ctx: DesktopStudyContext): boolean => {
  return Boolean(
    ctx.topic ||
      (ctx.topics && ctx.topics.length > 0) ||
      ctx.mode ||
      ctx.mistake ||
      ctx.mistakeAware ||
      (ctx.scope && ctx.scope !== "topic"),
  );
};

export const describeDesktopStudyScope = (ctx: DesktopStudyContext): string => {
  if (ctx.scope === "full-subject" && ctx.subject) {
    return `${ctx.subject} • full subject`;
  }
  if (ctx.scope === "multi-topic") {
    const n = ctx.topics?.length ?? 0;
    return n > 0 ? `${n} topics selected` : "Multiple topics";
  }
  if (ctx.topic) return ctx.topic;
  return ctx.subject ?? "No scope selected";
};
