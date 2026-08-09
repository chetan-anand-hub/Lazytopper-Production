import { useMemo } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";

import {
  buildDesktopChapterTestPath,
  buildDesktopConceptPracticePath,
  buildDesktopPracticePath,
  type DesktopRouteContext,
  type DesktopSubject,
} from "../../lib/desktop/navigation";
import {
  desktopTopicBySlug,
  desktopTopicSlugFromName,
} from "../../lib/desktop/topics";
import {
  buildActionableDesktopTopicHubContent,
  type ActionableTopicHubContent,
  type BoardConcept,
} from "../../lib/desktop/topicHubContent";
import { Card } from "../../components/grammar/Card";
import { ConceptSpine } from "../../components/topichub/ConceptSpine";
import { TopicProgressTrend } from "../../components/progress/TopicProgressTrend";
import { normalizeTopicKey } from "../../utils/topicResolver";
import { buildTutorPath } from "../tutor/tutorPath";

/**
 * DesktopTopicHubPage — rebuilt as the Topic Hub concept-spine main view
 * (Learn-Flow rebuild PR-B, layout only).
 *
 * This page now resolves the topic from the route and renders the single,
 * responsive <ConceptSpine> (which works desktop → 360px via a pure-CSS reflow).
 * The route layer renders this page at EVERY width, so the spine is the Topic Hub
 * main view on both platforms, single-sourced from BoardConcept.
 *
 * LOCKED DELETIONS (removed from the rebuilt view, per the locked spec):
 *   prose blurb snapshot · "Need a quick hand?" panels · "How boards use it" /
 *   "Mistakes & next action" accordions · "Recommended next" banner · the prose
 *   right-rail · Mistake Intelligence. Examiner tip survives as ONE line (in the
 *   spine header). No tutor wiring here (PR-C+D); no HPQ / mistake-log reads.
 */

function prettify(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isValidSubject(value: string | undefined): value is DesktopSubject {
  return value === "Maths" || value === "Science";
}

/** Reject any non-relative / protocol-bearing redirect (safe-redirect doctrine). */
function safeInternalReturnTo(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return null;
  return value;
}

function resolveTopicSlug(args: {
  pathTopicKey?: string;
  pathTopicName?: string;
  queryTopic?: string;
}): string {
  const raw = args.pathTopicKey ?? args.pathTopicName ?? args.queryTopic ?? "";
  if (!raw) return "";
  return desktopTopicSlugFromName(raw);
}

const NOT_FOUND_CSS = `
.lt-hub-notfound {
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  color: hsl(220, 25%, 12%);
  max-width: 760px;
  margin: 0 auto;
  padding: 32px clamp(16px, 4vw, 32px) 64px;
}
.lt-hub-notfound__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: hsl(220, 15%, 42%);
  text-decoration: none;
  margin-bottom: 16px;
}
.lt-hub-notfound__title {
  margin: 0 0 10px;
  font-family: var(--font-display, "Fraunces", Georgia, serif);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.lt-hub-notfound__body {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: hsl(220, 15%, 42%);
}
`;

function TopicNotFound({ rawSlug }: { rawSlug: string }) {
  const display = rawSlug ? prettify(rawSlug) : "this topic";
  return (
    <div className="lt-hub-notfound">
      <style>{NOT_FOUND_CSS}</style>
      <Link to="/exam-trends" className="lt-hub-notfound__back">
        <span aria-hidden="true">←</span>
        <span>Back to Exam Trends</span>
      </Link>
      <Card padding={24}>
        <h1 className="lt-hub-notfound__title">Topic not found</h1>
        <p className="lt-hub-notfound__body">
          We couldn&rsquo;t find a desktop Topic Hub entry for{" "}
          <strong>{display}</strong>. Use Exam Trends to browse the full board
          topic list and pick one that has a hub.
        </p>
      </Card>
    </div>
  );
}

export default function DesktopTopicHubPage() {
  const location = useLocation();
  const params = useParams<{
    grade?: string;
    subject?: string;
    topicKey?: string;
    topicName?: string;
  }>();

  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const navState =
    (location.state as { back?: string; backLabel?: string } | null) || {};

  const topicSlug = useMemo(
    () =>
      resolveTopicSlug({
        pathTopicKey: params.topicKey,
        pathTopicName: params.topicName,
        queryTopic: queryParams.get("topic") ?? undefined,
      }),
    [params.topicKey, params.topicName, queryParams],
  );

  const topic = useMemo(
    () => (topicSlug ? desktopTopicBySlug(topicSlug) : undefined),
    [topicSlug],
  );

  const actionable: ActionableTopicHubContent | undefined = useMemo(
    () => (topic ? buildActionableDesktopTopicHubContent(topic) : undefined),
    [topic],
  );

  // Child CTAs must return to this exact Topic Hub URL.
  const currentUrl = useMemo(
    () => `${location.pathname}${location.search}`,
    [location.pathname, location.search],
  );
  const routeContext: DesktopRouteContext = useMemo(
    () => ({ source: "topicHub", returnTo: currentUrl }),
    [currentUrl],
  );

  // ── Arrival concept (`?concept=`) ────────────────────────────────────────
  // A student can arrive pointed at ONE concept — "this is the thing to look at".
  // Read through the SAME mechanism this page already uses for topic/source/returnTo
  // (the memoised `queryParams`), and as a QUERY PARAM rather than location.state, so
  // it survives a reload and a bare <a href>.
  //
  // The param carries the concept LABEL, which is this product's cross-surface
  // vocabulary for a concept: it is what `buildTutorPath` already emits
  // (`concept: concept.name`) and what the tutor's figure catalogue uses as its own
  // documented lookup key. Resolution is therefore an EXACT match against THIS topic's
  // rendered rows (`actionable.boardEssentials[].name`) — the only set the spine can
  // actually scroll to.
  //
  // Deliberately NOT `resolveCanonicalSlug`: that is the canonical CHAPTER-key
  // authority and returns a topic slug, never a concept. Deliberately NOT
  // `conceptKeyForLabel`: it resolves against the figure catalogue, which is a strict
  // SUBSET of the live concept rows, so it returns null for concepts that exist and
  // are on screen. And no slugifying — a conceptKey is editorial and is never
  // re-derived by transforming a label.
  //
  // Unresolved (or absent) is a NORMAL state, not an error: it yields null and the
  // page renders exactly as it does today, at the top.
  const arrivalConceptName = useMemo(() => {
    const raw = queryParams.get("concept")?.trim();
    if (!raw || !actionable) return null;
    return actionable.boardEssentials.find((c) => c.name === raw)?.name ?? null;
  }, [queryParams, actionable]);

  // In-page back button: honour an explicit (safe) returnTo, else go to Exam Trends.
  const querySource = queryParams.get("source");
  const safeReturnTo = safeInternalReturnTo(
    queryParams.get("returnTo") || navState.back || null,
  );
  const backSubject: DesktopSubject | undefined = isValidSubject(params.subject)
    ? params.subject
    : topic?.subject;
  const backHref = safeReturnTo || "/exam-trends";
  const backLabel = safeReturnTo
    ? navState.backLabel ||
      (querySource === "hpq" ? "Back to Predicted Questions" : "Back")
    : backSubject
      ? `Back to ${backSubject} on Exam Trends`
      : "Back to Exam Trends";

  // Bare entry (no topic anywhere) → Exam Trends is the topic picker in the new
  // Learn flow, so send the student there rather than an unhelpful "not found".
  const rawTopicInput =
    params.topicKey || params.topicName || queryParams.get("topic") || "";
  if (!rawTopicInput) {
    return <Navigate to="/exam-trends" replace />;
  }

  // A topic WAS named but doesn't resolve to a hub → honest not-found.
  if (!topic || !actionable) {
    return <TopicNotFound rawSlug={topicSlug || rawTopicInput} />;
  }

  const practiceAllHref = buildDesktopPracticePath({
    scope: "topic",
    subject: topic.subject,
    stream: topic.stream,
    topic: topic.slug,
    mode: "practice-set",
    ...routeContext,
  });

  // Chapter test action-band button (PR-E1 item 3) — wires PR-D's inert "Soon"
  // button to the existing ChapterTestPage for THIS topic.
  const chapterTestHref = buildDesktopChapterTestPath({
    subject: topic.subject,
    topicKey: topic.slug,
    ...routeContext,
  });

  // Concept-row "Practise" (PR-E1 items 1+2 + amendment — [FU-PRACTISE-CONCEPT-FILTER]).
  // Lands DIRECTLY in Quick Practice (/practice/:grade/:subject) — NOT the generic
  // /practice-hub (which needed a 2nd click) — carrying the concept focus AND the
  // concept's mark band as an EXACT numeric range (marksMin/marksMax) PracticePage
  // filters on the real `marks` field — no coarse-bucket 2/3-mark fusion. This is
  // the PATH-CONDITIONAL concept entry: the range is pre-applied ONLY here; the
  // hub-entry path forces no range. `backLabel` + the topic-hub `returnTo` (in
  // routeContext) send "Back" to THIS specific topic page (item 4).
  const practiceHrefForConcept = (concept: BoardConcept): string =>
    buildDesktopConceptPracticePath({
      subject: topic.subject,
      topic: topic.slug,
      focus: concept.name,
      subtopicHint: concept.oneLineUse || concept.name,
      markBand: concept.marks,
      backLabel: `Back to ${topic.name}`,
      ...routeContext,
    });

  // Tutor entries (Stage 1) — the fresh /tutor route. Topic-level "Ask the tutor"
  // (cold entry -> continuity + fork) + per-concept "Stuck? Ask" (concept pre-loaded).
  // Additive: the "Teach me" drawer stays as the fallback until the new tutor is
  // owner-verified (decision #5). source/returnTo (routeContext) power back-nav.
  const askTutorHref = buildTutorPath({
    subject: topic.subject,
    topicKey: topic.slug,
    ...routeContext,
  });
  const tutorHrefForConcept = (concept: BoardConcept): string =>
    buildTutorPath({
      subject: topic.subject,
      topicKey: topic.slug,
      concept: concept.name,
      ...routeContext,
    });

  return (
    <ConceptSpine
      topic={topic}
      actionable={actionable}
      backHref={backHref}
      backLabel={backLabel}
      practiceAllHref={practiceAllHref}
      chapterTestHref={chapterTestHref}
      practiceHrefForConcept={practiceHrefForConcept}
      askTutorHref={askTutorHref}
      tutorHrefForConcept={tutorHrefForConcept}
      arrivalConceptName={arrivalConceptName}
      topicProgressSlot={
        <TopicProgressTrend topicKey={normalizeTopicKey(topic.slug) || topic.slug} />
      }
    />
  );
}
