/**
 * GUIDE-PUBLIC-1 (review F5) — where "Important questions for <Chapter>" goes. Loaded only on
 * that tap (it pulls the HPQ question data, ~134 kB of source), from ./publicPeekChunk.tsx.
 *
 * The HPQ page (`/highly-probable/:grade/:subject`, pages/HighlyProbableQuestions.tsx) scopes
 * itself to `?topic=` ONLY when that value matches one of the subject's HPQ topic buckets
 * (`resolveTopicFilterValue`: exact, case-insensitive name, else `topicsMatch` over the alias
 * tokens). An unmatched value leaves the page showing an empty scoped list. So the chapter-level
 * link is used only when the same match succeeds here; otherwise the subject-level page.
 *
 * ⚠ MIRROR: `topicMatchTokens` / `topicsMatch` below copy the HPQ page's private helpers
 * (HighlyProbableQuestions.tsx, not exported and outside this lane). The test pins every
 * registry chapter's answer, so a change there that moves a chapter shows up here.
 */
import { getHighlyProbableQuestions } from "../../../data/highlyProbableQuestions";
import { getRuntimeTopicCandidates, normalizeTopicSlug, resolveCanonicalTopicKey } from "../../../data/syllabus/topicAliasMap";
import { importantPath, type PeekChapter } from "./publicPeekModel";

function topicMatchTokens(rawTopic: string): Set<string> {
  const tokens = [rawTopic, normalizeTopicSlug(rawTopic), resolveCanonicalTopicKey(rawTopic), ...getRuntimeTopicCandidates(rawTopic)];
  const out = new Set<string>();
  tokens.forEach((token) => {
    const trimmed = String(token || "").trim();
    if (!trimmed) return;
    out.add(trimmed.toLowerCase());
    out.add(normalizeTopicSlug(trimmed).toLowerCase());
    out.add(resolveCanonicalTopicKey(trimmed).toLowerCase());
  });
  return out;
}

function topicsMatch(left: string, right: string): boolean {
  const l = topicMatchTokens(left);
  const r = topicMatchTokens(right);
  for (const t of l) if (r.has(t)) return true;
  return false;
}

/** True when the HPQ page will scope `?topic=<slug>` to one of the subject's buckets. */
export function hpqTopicMatches(chapter: Pick<PeekChapter, "slug" | "subject">): boolean {
  const slug = String(chapter.slug || "").trim();
  if (!slug) return false;
  const topics = Array.from(
    new Set(
      getHighlyProbableQuestions(chapter.subject)
        .filter((b) => (b.subject ?? chapter.subject) === chapter.subject && b.questions.length > 0)
        .map((b) => b.topic),
    ),
  );
  return topics.some((t) => t.toLowerCase() === slug.toLowerCase()) || topics.some((t) => topicsMatch(slug, t));
}

/** The chapter-level HPQ link when it will match, else the subject-level page (never a dead filter). */
export function importantTargetFor(chapter: Pick<PeekChapter, "slug" | "subject">): string {
  return hpqTopicMatches(chapter) ? importantPath(chapter) : importantPath({ slug: null, subject: chapter.subject });
}
