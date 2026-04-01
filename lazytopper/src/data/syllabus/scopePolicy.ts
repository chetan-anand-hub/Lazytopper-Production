import registry from "./cbse10Registry_2025_26.json";
import { canonicalChapters } from "./cbse10Canonical";
import { resolveCanonicalTopicKey } from "./topicAliasMap";

type ScopeMode = "assessed" | "enrichment";

export interface ChapterScopePolicy {
  canonicalTopicKey: string;
  chapterId: string;
  title: string;
  subjectId: "maths" | "science";
  assessedScopeBullets: string[];
  enrichmentScopeBullets: string[];
  excludedTermsInAssessed: string[];
  preferredTerms: string[];
}

const chapterSlugById = new Map<string, string>(
  canonicalChapters.map((chapter) => [chapter.chapterId, chapter.canonicalSlug])
);

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

function buildPolicyMap(): Map<string, ChapterScopePolicy> {
  const out = new Map<string, ChapterScopePolicy>();
  const subjects = Array.isArray((registry as { subjects?: unknown[] }).subjects)
    ? (registry as { subjects: Array<Record<string, unknown>> }).subjects
    : [];

  for (const subject of subjects) {
    const subjectId = String(subject.subject_id || "").toLowerCase().includes("science")
      ? "science"
      : "maths";
    const chapters = Array.isArray(subject.chapters)
      ? (subject.chapters as Array<Record<string, unknown>>)
      : [];
    for (const chapter of chapters) {
      const chapterId = String(chapter.chapter_id || "").trim();
      const canonicalTopicKey = resolveCanonicalTopicKey(
        chapterSlugById.get(chapterId) || String(chapter.title || "")
      );
      if (!canonicalTopicKey) continue;

      const baseBullets = toStringArray(chapter.cbse_scope_bullets);
      const excludedTermsInAssessed: string[] = [];
      const enrichmentScopeBullets: string[] = [];

      if (canonicalTopicKey === "triangles") {
        excludedTermsInAssessed.push(
          "pythagoras",
          "areas of similar triangles",
          "area-ratio"
        );
        enrichmentScopeBullets.push(
          "Pythagoras and areas-of-similar-triangles are enrichment-only in this policy layer."
        );
      }

      out.set(canonicalTopicKey, {
        canonicalTopicKey,
        chapterId,
        title: String(chapter.title || canonicalTopicKey),
        subjectId,
        assessedScopeBullets: baseBullets,
        enrichmentScopeBullets,
        excludedTermsInAssessed,
        preferredTerms:
          subjectId === "science"
            ? ["concept", "principle", "reasoning", "conclusion"]
            : ["given", "to prove/find", "criterion/theorem", "therefore/hence"],
      });
    }
  }

  return out;
}

const chapterPolicyBySlug = buildPolicyMap();

export function getChapterScopePolicy(rawTopicKey: string): ChapterScopePolicy | null {
  const canonical = resolveCanonicalTopicKey(rawTopicKey);
  if (!canonical) return null;
  return chapterPolicyBySlug.get(canonical) || null;
}

export function getScopeBullets(rawTopicKey: string, mode: ScopeMode): string[] {
  const policy = getChapterScopePolicy(rawTopicKey);
  if (!policy) return [];
  return mode === "enrichment" ? policy.enrichmentScopeBullets : policy.assessedScopeBullets;
}

export function violatesAssessedScope(rawTopicKey: string, text: string): boolean {
  const policy = getChapterScopePolicy(rawTopicKey);
  if (!policy) return false;
  const blob = String(text || "").toLowerCase();
  return policy.excludedTermsInAssessed.some((term) => blob.includes(term));
}

export function getScopeGuardLine(rawTopicKey: string): string {
  const policy = getChapterScopePolicy(rawTopicKey);
  if (!policy || !policy.excludedTermsInAssessed.length) return "";
  const terms = policy.excludedTermsInAssessed.join(", ");
  return `Scope guard: keep assessed answers inside chapter scope; avoid ${terms} unless explicitly requested as enrichment.`;
}
