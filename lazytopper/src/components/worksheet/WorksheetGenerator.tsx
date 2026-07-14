import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubjectContext } from "../../hooks/useSubjectContext";
import type { LTSubjectKey } from "../../data/predictionTypes";
import type { DifficultyChoice } from "../../data/predictionDataService";
import { sectionScopeLabel } from "../practice/worksheetGenerator";
import type { SectionScope } from "../practice/worksheetGenerator";
import {
  getTopics,
  planWorksheet,
  generateFromPlan,
  miCapFractionFor,
  type PaperScope,
  type ScienceStream,
  type WorksheetTopic,
} from "./worksheetModel";
import {
  mintWorksheetId,
  saveWorksheetSession,
  listStoredWorksheetsLite,
  getWorksheetSession,
  type PersistedWorksheet,
  type PersistedWorksheetQuestion,
} from "../../services/worksheetSessionStore";
import { ensureWorksheetSessionCode, type SessionRecord } from "../../services/sessionRecords";
import { canonicalSlugMatches, resolveCanonicalSlug, resolveCanonicalSlugSet } from "../../data/syllabus/canonicalTopicSlug";
import { getSurfaceHistory } from "../../services/progressStore";
import {
  readWorksheetMi,
  weakestTopic,
  rankedInScopeWeakTopics,
  weakSections,
  sectionBoostsFor,
  type MistakeSection,
} from "./worksheetMiSelector";
import { exportWorksheetPdf } from "./worksheetPdfExport";
import WorksheetGradePanel from "./WorksheetGradePanel";
import WorksheetHistoryPanel from "./WorksheetHistoryPanel";
import WorksheetPendingBanner from "./WorksheetPendingBanner";

/**
 * WorksheetGenerator — the ONE responsive worksheet builder. Redesigned to the
 * LOCKED "A · Smart default" prototype (LazyTopper_WorksheetFlow_endtoend_prototype_
 * 2026-07-08.html):
 *
 *   • BUILD view — a smart-default HERO ("Board exam mix · {Topic}") carrying the
 *     REAL chip line (count · sections · difficulty · marks) next to a primary
 *     "Preview worksheet →". Every other control (subject / scope / topic / build
 *     mode / advanced custom filters) is progressively disclosed behind "Customise"
 *     — nothing is removed, just pre-set to the sensible default. MI personalisation
 *     is one honest toggle (default ON when it can apply; OFF + disabled with an
 *     honest hint otherwise — never a toggle that silently does nothing).
 *   • PREVIEW step (new) — the exact drawn set shown BEFORE anything is created: a
 *     proportional section bar + per-section counts/marks, the (computed, never
 *     fabricated) enrichment callout, 3 real sample questions, an honest bank-shortfall
 *     line, and Generate / Change settings / Shuffle.
 *   • GENERATED view — UNCHANGED (download buttons + <WorksheetGradePanel>).
 *   • History lives in a HEADER CONTROL + overlay panel (FIX B); a pending banner
 *     (FIX C) deep-links ungraded worksheets to their upload flow.
 *
 * ONE responsive component, class-driven scoped styling with a pure-CSS
 * @media(max-width:1023px) reflow — SAME markup desktop → 360px, no inline style
 * objects, no JS width branch. Honest counts throughout: the number shown is exactly
 * the number generated (the preview IS the set that Generate persists).
 */

type Mode = "preset" | "custom";
type View = "build" | "preview" | "generated";

interface PresetConfig {
  key: string;
  label: string;
  desc: string;
  sections: SectionScope;
  difficulty: DifficultyChoice;
  count: number;
}

const PRESETS: PresetConfig[] = [
  { key: "board-mix", label: "Board exam mix", desc: "All sections A–E · all difficulty · 25 questions", sections: "All", difficulty: "All", count: 25 },
  { key: "quick-drill", label: "Quick drill", desc: "Sections A–B · all difficulty · 15 questions", sections: ["A", "B"], difficulty: "All", count: 15 },
  { key: "marks-focus", label: "High-marks focus", desc: "Sections C–E · hard · 20 questions", sections: ["C", "D", "E"], difficulty: "Hard", count: 20 },
];

const ALL_SECTIONS = ["A", "B", "C", "D", "E"] as const;
type SectionId = (typeof ALL_SECTIONS)[number];
const SECTION_RANK: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };
const SECTION_MARK_LABEL: Record<SectionId, string> = {
  A: "A · MCQ / AR (1m)",
  B: "B · Short I (2m)",
  C: "C · Short II (3m)",
  D: "D · Long (5m)",
  E: "E · Case (4m)",
};
const SECTION_NAME: Record<SectionId, string> = {
  A: "MCQ / AR",
  B: "Short I",
  C: "Short II",
  D: "Long",
  E: "Case study",
};
const DIFFICULTIES: DifficultyChoice[] = ["All", "Easy", "Medium", "Hard"];

/** Reject any non-relative / protocol-bearing redirect (safe-redirect doctrine). */
function safeInternalReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return null;
  return value;
}

/** Round a fraction (0..1) to a 5%-step width for the class-driven section bar. */
function widthStep(fraction: number): number {
  return Math.max(0, Math.min(100, Math.round(fraction * 20) * 5));
}

/** "C" · "C & D" · "C, D & E" — human-readable list for enrichment copy (sections or
 *  topic names). */
function formatNameList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} & ${items[items.length - 1]}`;
}

const VALID_SUBJECTS: LTSubjectKey[] = ["Maths", "Science"];
const VALID_SCOPES: PaperScope[] = ["topic", "multi-topic", "full-subject"];
const VALID_STREAMS: ScienceStream[] = ["All", "Physics", "Chemistry", "Biology"];

/** Stable empty reference for the derived `multiTopics` when the scope isn't multi-topic —
 *  keeps every downstream useMemo/useEffect dep referentially stable across renders. */
const EMPTY_TOPICS: string[] = [];

interface EntryContext {
  subject: LTSubjectKey | null;
  stream: ScienceStream;
  scope: PaperScope;
  singleTopic: string; // "" when none
  multiTopics: string[];
  /** true when the URL carries a valid subject + topic(s) (or full-subject) to build
   *  from — the builder opens autofiltered. false → the caller redirects once to the hub. */
  hasContext: boolean;
}

/**
 * FIX-1 — the worksheet builder NEVER invents a topic. It reads subject + topic(s) from
 * the URL (the single source of truth: survives reload / back / share), extending the
 * existing `buildDesktopWorksheetPath` param idiom (scope · subject · stream · topic ·
 * topics). Every incoming topic key is validated against the real catalogue (topics.ts
 * via getTopics); unknown keys are dropped. `hasContext` is false when nothing valid
 * remains — the component then redirects ONCE to the hub instead of guessing topics[0].
 */
function parseEntryContext(search: string): EntryContext {
  const p = new URLSearchParams(search);
  const rawSubject = p.get("subject");
  const subject: LTSubjectKey | null =
    rawSubject && VALID_SUBJECTS.includes(rawSubject as LTSubjectKey) ? (rawSubject as LTSubjectKey) : null;
  const rawStream = p.get("stream");
  const stream: ScienceStream =
    rawStream && VALID_STREAMS.includes(rawStream as ScienceStream) ? (rawStream as ScienceStream) : "All";

  // Validate topic keys against the real catalogue for this subject (+ Science stream).
  const universe = subject ? getTopics(subject, subject === "Science" ? stream : "All") : [];
  const keyset = new Set(universe.map((t) => t.key));
  const validSingle = (() => {
    const t = (p.get("topic") ?? "").trim();
    return keyset.has(t) ? t : "";
  })();
  const validMulti = (p.get("topics") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((k) => keyset.has(k));

  const rawScope = p.get("scope");
  let scope: PaperScope =
    rawScope && VALID_SCOPES.includes(rawScope as PaperScope) ? (rawScope as PaperScope) : "topic";
  if (!rawScope) {
    // No explicit scope → infer from the topic params.
    if (validMulti.length > 1) scope = "multi-topic";
    else scope = "topic";
  }

  let singleTopic = "";
  let multiTopics: string[] = [];
  if (scope === "topic") singleTopic = validSingle || validMulti[0] || "";
  else if (scope === "multi-topic") multiTopics = validMulti.length ? validMulti : validSingle ? [validSingle] : [];

  const hasContext =
    !!subject &&
    (scope === "full-subject" ||
      (scope === "topic" && !!singleTopic) ||
      (scope === "multi-topic" && multiTopics.length > 0));

  return { subject, stream, scope, singleTopic, multiTopics, hasContext };
}

export default function WorksheetGenerator() {
  const { user } = useAuth();
  const ctx = useSubjectContext();
  const location = useLocation();
  const navigate = useNavigate();

  // FIX-1 — the builder's context arrives in the URL (single source of truth). Parsed
  // ONCE at mount; the scope state below seeds from it (never from a guessed topics[0]).
  const [entry] = useState(() => parseEntryContext(location.search));
  // Stage-2 tutor round-trip (P-A): an OPTIONAL concept focus from the URL — narrows the
  // pool toward that sub-topic (best-effort + guarded in buildPools). Additive: absent for
  // every non-tutor entry, so the existing worksheet flow is byte-unchanged. Parsed once,
  // like `entry` (the concept doesn't change within a session).
  const [focus] = useState(
    () => (new URLSearchParams(location.search).get("focus") ?? "").trim() || undefined,
  );

  // Origin-aware back navigation (validated returnTo; default practice hub).
  const backHref = useMemo(() => {
    const rt = new URLSearchParams(location.search).get("returnTo");
    return safeInternalReturnTo(rt) ?? "/practice-hub";
  }, [location.search]);
  const backLabel = backHref === "/practice-hub" ? "Back to Practice" : "Back";

  const isSignedIn = !!user?.uid && !user?.isLocalSession;
  const loginHref = `/login?reason=mistake-aware&redirect=${encodeURIComponent(
    location.pathname + location.search,
  )}`;

  const [subject, setSubject] = useState<LTSubjectKey>(entry.subject ?? ((ctx.subject as LTSubjectKey) || "Maths"));
  const [stream, setStream] = useState<ScienceStream>(entry.stream);

  const topics = useMemo(() => getTopics(subject, stream), [subject, stream]);

  // FIX (derive-scope) — the topic SELECTION is the single source of truth. `selectedTopics`
  // holds the ticked topics; `allTopics` is the full-subject toggle. Both seed from the
  // validated URL context (FIX-1), NOT topics[0]. There is no independent `scope` state that
  // could silently contradict the selection — scope is DERIVED just below.
  const [selectedTopics, setSelectedTopics] = useState<string[]>(() =>
    entry.scope === "multi-topic" ? entry.multiTopics : entry.singleTopic ? [entry.singleTopic] : [],
  );
  const [allTopics, setAllTopics] = useState<boolean>(entry.scope === "full-subject");

  // FIX (derive-scope) — SCOPE IS DERIVED FROM THE SELECTION, never a separately-settable
  // control. A student's ticks ARE the scope: 1 topic → "topic", 2+ → "multi-topic", the
  // "All topics" toggle → "full-subject". This deletes a whole bug class — the worksheet can
  // never be built from a subset of what was ticked (the #357 live-verify defect). `singleTopic`
  // / `multiTopics` are derived views over the same source, so every downstream consumer below
  // is UNCHANGED; only the setters and the picker UI change. `multiTopics` reuses the stable
  // `selectedTopics` / EMPTY_TOPICS reference so memo/effect deps stay referentially stable.
  const scope: PaperScope = allTopics ? "full-subject" : selectedTopics.length >= 2 ? "multi-topic" : "topic";
  const singleTopic = allTopics ? "" : selectedTopics[0] ?? "";
  const multiTopics = scope === "multi-topic" ? selectedTopics : EMPTY_TOPICS;
  const scopeHint = allTopics
    ? `all ${topics.length} · full subject`
    : selectedTopics.length >= 2
      ? `${selectedTopics.length} selected · multi-topic`
      : selectedTopics.length === 1
        ? "1 selected · single topic"
        : "pick at least one topic";

  const [mode, setMode] = useState<Mode>("preset");
  const [preset, setPreset] = useState<string>("board-mix");
  const [showCustom, setShowCustom] = useState(false); // Advanced (custom filters) inside the drawer
  const [customSections, setCustomSections] = useState<SectionId[]>([...ALL_SECTIONS]);
  const [customDifficulty, setCustomDifficulty] = useState<DifficultyChoice>("All");
  const [customCount, setCustomCount] = useState(20);
  // MI personalisation defaults ON — it only takes effect when it can apply
  // (canEnrich), so a default-ON toggle never silently does nothing.
  const [miEnrich, setMiEnrich] = useState(true);
  const [customiseOpen, setCustomiseOpen] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("build");
  const [drawNonce, setDrawNonce] = useState(0); // bumped by Shuffle to redraw the candidate
  const [generated, setGenerated] = useState<PersistedWorksheet | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"questions" | "answers" | null>(null);

  // History (FIX B) + pending banner (FIX C) state.
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPendingOnly, setHistoryPendingOnly] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [historyNonce, setHistoryNonce] = useState(0);

  // Keep the selection valid when the visible catalogue changes via an IN-APP subject /
  // stream switch (a user action inside Customise). The URL-seeded selection is always in
  // the initial catalogue, so this is a no-op on mount (returns `prev` unchanged) — the
  // deleted topics[0] ENTRY fallback is NOT reintroduced; the topics[0] default here only
  // rescues an IN-APP switch that emptied the selection, never guesses a topic at entry (FIX-1).
  const topicKeysSig = topics.map((t) => t.key).join(",");
  useEffect(() => {
    setSelectedTopics((prev) => {
      const valid = prev.filter((k) => topics.some((t) => t.key === k));
      if (valid.length === prev.length) return prev; // all still valid → no churn
      return valid.length ? valid : topics[0] ? [topics[0].key] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicKeysSig]);

  // FIX-1 (D4/D7) — keep the URL in sync with the builder's scope so the URL is the single
  // source of truth: reload / share restore the exact build, and Customise edits re-derive
  // everything. Replace (not push) so edits don't spam history; Back still returns to the
  // origin. Only in the build view, and never while redirecting (no context).
  useEffect(() => {
    if (!entry.hasContext || view !== "build") return;
    const p = new URLSearchParams(location.search);
    p.set("subject", subject);
    p.set("scope", scope);
    if (subject === "Science" && stream !== "All") p.set("stream", stream);
    else p.delete("stream");
    if (scope === "topic") {
      if (singleTopic) p.set("topic", singleTopic);
      else p.delete("topic");
      p.delete("topics");
    } else if (scope === "multi-topic") {
      if (multiTopics.length) p.set("topics", multiTopics.join(","));
      else p.delete("topics");
      p.delete("topic");
    } else {
      p.delete("topic");
      p.delete("topics");
    }
    const nextSearch = p.toString();
    if (nextSearch !== new URLSearchParams(location.search).toString()) {
      navigate(`${location.pathname}?${nextSearch}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, scope, stream, singleTopic, multiTopics, view]);

  const activePreset = PRESETS.find((p) => p.key === preset) ?? PRESETS[0];
  const usingCustom = mode === "custom";

  const effDifficulty: DifficultyChoice = usingCustom ? customDifficulty : activePreset.difficulty;
  const effCount = usingCustom ? customCount : activePreset.count;
  const effSections: SectionScope = usingCustom
    ? customSections.length === ALL_SECTIONS.length
      ? "All"
      : [...customSections].sort((a, b) => SECTION_RANK[a] - SECTION_RANK[b])
    : activePreset.sections;
  const sectionsArg = effSections === "All" ? undefined : (effSections as string[]);

  // In-scope topics for the active scope.
  const inScopeTopics: WorksheetTopic[] = useMemo(() => {
    if (scope === "topic") {
      const t = topics.find((x) => x.key === singleTopic);
      return t ? [t] : [];
    }
    if (scope === "multi-topic") {
      return topics.filter((t) => multiTopics.includes(t.key));
    }
    return topics;
  }, [scope, topics, singleTopic, multiTopics]);

  // ── FIX A — SCOPE-RELATIVE Mistake-Intelligence ─────────────────────────────
  // Read the student's real mistake log once against the whole subject, then resolve
  // weakness RELATIVE to what they picked — never one global hotspot compared to the
  // scope. `scopeHotspot` is the weakest topic among the in-scope topics; `globalHotspot`
  // is the weakest across the subject (used only to name the true weak area when the
  // chosen scope has none). `selectedTopicMi` powers single-topic section weighting.
  const mi = useMemo(
    () => readWorksheetMi(user?.uid, topics),
    [user?.uid, topicKeysSig], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const scopeHotspot = useMemo(() => weakestTopic(mi, inScopeTopics), [mi, inScopeTopics]);
  const globalHotspot = useMemo(() => weakestTopic(mi, topics), [mi, topics]);
  // FIX-3 — the FULL ranked set of in-scope weak topics (multi/full scope), driving the
  // between-topic proportional enrichment and the honest copy that NAMES them.
  const rankedWeak = useMemo(
    () => (scope === "topic" ? [] : rankedInScopeWeakTopics(mi, inScopeTopics)),
    [scope, mi, inScopeTopics],
  );
  // Canonical slugs of the weak topics — so the drawn-gate below matches a bank
  // question regardless of its stored spelling (P0 [FU-TOPICKEY-UNIVERSAL]).
  const rankedWeakKeys = useMemo(
    () => resolveCanonicalSlugSet(rankedWeak.map((t) => t.key)),
    [rankedWeak],
  );
  const selectedTopicMi = scope === "topic" ? mi.byTopic.get(singleTopic) ?? null : null;
  const selectedSectionBoosts = useMemo(() => sectionBoostsFor(selectedTopicMi), [selectedTopicMi]);
  const weakSecs = useMemo(() => weakSections(selectedTopicMi), [selectedTopicMi]);

  // FIX-3 — multi/full cross-TOPIC enrichment is ACTIVE when the toggle is on and at least
  // one in-scope topic has real marks lost. It feeds the plan a marks-lost weight MAP
  // (allocateMiCounts → proportional split with a floor + cap), replacing the old single-
  // target 1.5× boost. WITHIN-topic section skew is resolved BELOW (after the plan) because
  // it must gate on each topic's real drawable pool (§ section-skew).
  const enrichActive = scope !== "topic" && miEnrich && rankedWeak.length > 0;
  const miTopicWeights = useMemo(() => {
    if (!enrichActive) return null;
    const w: Record<string, number> = {};
    for (const t of rankedWeak) w[t.key] = t.marksLost;
    return w;
  }, [enrichActive, rankedWeak]);
  const miCapFraction = miCapFractionFor(inScopeTopics.length);

  // Block reasons.
  const blocker: string | null = (() => {
    if (scope === "multi-topic" && inScopeTopics.length < 2) return "Pick at least 2 topics for a multi-topic worksheet.";
    if (scope === "full-subject" && inScopeTopics.length === 0) return "No topics available for this subject + stream.";
    if (inScopeTopics.length === 0) return "Choose a topic to continue.";
    return null;
  })();

  // Live plan (honest counts + distribution) — recomputed as inputs change.
  const plan = useMemo(() => {
    if (blocker) return null;
    return planWorksheet({
      subject,
      scope,
      topics: inScopeTopics,
      sections: sectionsArg,
      difficulty: effDifficulty,
      requested: effCount,
      miTopicWeights,
      miCapFraction,
      focus, // ADDITIVE (Stage-2 P-A) — undefined for every non-tutor entry → no-op
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, scope, inScopeTopics, JSON.stringify(sectionsArg), effDifficulty, effCount, JSON.stringify(miTopicWeights), miCapFraction, focus, blocker]);

  // ── FIX A — WITHIN-topic section skew, GATED ON THE REAL DRAWABLE POOL ───────
  // Section weighting is only honest when the topic's filtered pool actually holds
  // questions in the weak section AND spans >1 section to skew between — otherwise the
  // toggle would promise a weighting the bank can't deliver (a silent no-op, which the
  // doctrine forbids). Derived from plan.pools; boosts only REORDER the draw, never change
  // pool membership, so reading the pool here creates no circular dependency.
  const poolSections = useMemo<Set<string>>(() => {
    if (scope !== "topic" || !plan) return new Set<string>();
    return new Set((plan.pools.get(singleTopic) ?? []).map((q) => String(q.section || "").toUpperCase()));
  }, [scope, plan, singleTopic]);

  // The skew can only CHANGE the drawn set when the plan takes FEWER than the whole pool —
  // if the topic's filtered pool is exhausted (allocated ≥ pool size) every question is
  // taken regardless of weighting, so the toggle would be a no-op. Depends on plan.rows /
  // plan.pools only (both skew-independent), so no circular dependency.
  const skewHasHeadroom = useMemo(() => {
    if (scope !== "topic" || !plan) return false;
    const poolSize = plan.pools.get(singleTopic)?.length ?? 0;
    const allocated = plan.rows.find((r) => r.key === singleTopic)?.allocated ?? 0;
    return allocated > 0 && allocated < poolSize;
  }, [scope, plan, singleTopic]);

  // The student's weak sections that are BOTH inside the section filter AND actually
  // present in the drawable pool — the only ones a single-topic skew can honestly target.
  const weakSecsInScope = useMemo<MistakeSection[]>(
    () =>
      weakSecs.filter(
        (s) => (effSections === "All" || (effSections as string[]).includes(s)) && poolSections.has(s),
      ),
    [weakSecs, effSections, poolSections],
  );
  // Skew is meaningful only when a drawable weak section exists, the pool spans >1 section
  // to skew between (mirrors orderPoolBySectionBoost's bySection.size<=1 short-circuit), AND
  // the draw doesn't take the whole pool (skewHasHeadroom) — so the toggle is never a no-op.
  const canSectionSkew =
    scope === "topic" && weakSecsInScope.length > 0 && poolSections.size > 1 && skewHasHeadroom;

  // Enrichment is available (a live toggle) when there is something honest to weight
  // toward: a weak in-scope topic (multi/full → cross-topic boost) or weak, drawable
  // sections within the chosen single topic (topic → section skew).
  const canEnrich = scope === "topic" ? canSectionSkew : rankedWeak.length > 0;
  // WITHIN-topic section skew (single topic) — injected onto the (skew-independent) plan
  // at candidate-generation time.
  const sectionBoosts =
    scope === "topic" && miEnrich && canSectionSkew ? selectedSectionBoosts : null;

  // FIX-3 — PER-TOPIC within-topic section skew for multi/full scope (level 2, stacked on
  // the level-1 between-topic allocation). For each in-scope topic, skew its OWN draw
  // toward its OWN weak sections — gated per topic on its real drawable pool (sections
  // present · >1 section to skew between · headroom so it isn't a no-op), so a boost the
  // bank can't supply is never fabricated (the #353 availability lesson, applied per topic).
  const perTopicSectionBoosts = useMemo(() => {
    if (scope === "topic" || !enrichActive || !plan) return null;
    const out: Record<string, Record<string, number>> = {};
    for (const t of inScopeTopics) {
      const boosts = sectionBoostsFor(mi.byTopic.get(t.key) ?? null);
      const boosted = Object.entries(boosts).filter(([, w]) => Number(w) > 1);
      if (boosted.length === 0) continue;
      const pool = plan.pools.get(t.key) ?? [];
      const poolSecs = new Set(pool.map((q) => String(q.section || "").toUpperCase()));
      const allocated = plan.rows.find((r) => r.key === t.key)?.allocated ?? 0;
      if (poolSecs.size <= 1 || allocated <= 0 || allocated >= pool.length) continue; // no honest headroom
      const gated: Record<string, number> = {};
      for (const [s, w] of boosted) {
        if (poolSecs.has(s) && (effSections === "All" || (effSections as string[]).includes(s))) gated[s] = Number(w);
      }
      if (Object.keys(gated).length) out[t.key] = gated;
    }
    return Object.keys(out).length ? out : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, enrichActive, plan, inScopeTopics, mi, JSON.stringify(effSections)]);

  const scopeLabel = useMemo(() => {
    if (scope === "topic") return topics.find((t) => t.key === singleTopic)?.label ?? "Topic";
    if (scope === "multi-topic") {
      const labels = inScopeTopics.map((t) => t.label);
      if (labels.length === 0) return "—";
      if (labels.length <= 2) return labels.join(" + ");
      return `${labels.slice(0, 2).join(" + ")} + ${labels.length - 2} more`;
    }
    return subject === "Science" && stream !== "All" ? `Full ${subject} · ${stream}` : `Full ${subject}`;
  }, [scope, topics, singleTopic, inScopeTopics, subject, stream]);

  const modeLabel = usingCustom ? "Custom filters" : activePreset.label;

  // ── THE CANDIDATE SET ────────────────────────────────────────────────────
  // The single drawn set that the hero chips, the preview step, and Generate all
  // read — so every number shown is exactly the number generated (honest counts).
  // Redrawn only when the plan-affecting inputs change or Shuffle bumps drawNonce.
  const candidate: PersistedWorksheetQuestion[] = useMemo(() => {
    if (blocker || !plan) return [];
    const labelFor = (key: string) => topics.find((t) => t.key === key)?.label ?? key;
    // Inject the within-topic section skew onto the (skew-independent) plan just for the
    // draw; plan.pools/rows are unchanged, so the honest counts and distribution hold.
    const ordered = [...generateFromPlan({ ...plan, sectionBoosts, topicSectionBoosts: perTopicSectionBoosts })].sort(
      (a, b) => (SECTION_RANK[a.section] ?? 9) - (SECTION_RANK[b.section] ?? 9),
    );
    return ordered.map((q, i) => ({
      qNumber: i + 1,
      id: q.id,
      subject: String(q.subject),
      topicKey: q.topicKey,
      topicLabel: labelFor(q.topicKey),
      section: String(q.section || "").toUpperCase(),
      marks: Number(q.marks) || 1,
      questionText: q.questionText,
      options: q.options,
      solutionSteps: q.solutionSteps,
      finalAnswer: q.finalAnswer,
      answer: q.answer,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, blocker, drawNonce, JSON.stringify(sectionBoosts), JSON.stringify(perTopicSectionBoosts)]);

  const totalCount = candidate.length;
  const totalMarks = useMemo(() => candidate.reduce((s, q) => s + q.marks, 0), [candidate]);
  const shortfall = totalCount > 0 && totalCount < effCount;
  const noQuestions = !blocker && totalCount === 0;

  // Per-section breakdown of the candidate (real counts + marks).
  const previewSections = useMemo(() => {
    const agg = new Map<string, { count: number; marks: number }>();
    for (const q of candidate) {
      const s = q.section;
      const cur = agg.get(s) ?? { count: 0, marks: 0 };
      cur.count += 1;
      cur.marks += q.marks;
      agg.set(s, cur);
    }
    return ALL_SECTIONS.filter((s) => agg.has(s)).map((s) => ({ section: s, ...agg.get(s)! }));
  }, [candidate]);

  // 3 real sample questions, spread across the ordered set.
  const previewSamples = useMemo(() => {
    const n = candidate.length;
    if (n === 0) return [];
    if (n <= 3) return candidate;
    const picks = Array.from(new Set([0, Math.floor(n / 2), n - 1]));
    return picks.map((i) => candidate[i]);
  }, [candidate]);

  // The weak sections the DRAWN set actually targets — a pool-present, boosted section can
  // still land zero slots under a thin allocation, so the callout names ONLY these (never
  // over-states which sections the generated worksheet covers).
  const drawnWeakSecs = useMemo<MistakeSection[]>(
    () => (sectionBoosts ? weakSecsInScope.filter((s) => candidate.some((q) => q.section === s)) : []),
    [sectionBoosts, weakSecsInScope, candidate],
  );

  // Weak in-scope topics with questions in the ACTUAL drawn set — for the post-preview
  // "Enriched: N of M target …" claim, so it never over-states which topics the generated
  // worksheet covers (a weak topic can draw zero under a filter that empties its pool).
  // Mirrors the single-topic `drawnWeakSecs` drawn-gate.
  const drawnWeakTopics = useMemo(
    // P0 [FU-TOPICKEY-UNIVERSAL]: resolve BOTH sides to the canonical slug so the
    // drawn-gate matches a weak topic against a bank question of any stored spelling.
    () => rankedWeak.filter((t) => candidate.some((q) => canonicalSlugMatches(q.topicKey, t.key))),
    [rankedWeak, candidate],
  );

  // Enrichment count — how many DRAWN questions the enrichment actually targets.
  // Computed from the real set; zero (and the callout omitted) when enrich is off or
  // the bank can't honour it. Multi/full → questions from the weak in-scope topic;
  // single-topic → questions in the student's actually-drawn weak sections.
  const enrichCount = useMemo(() => {
    if (enrichActive) {
      // Questions drawn on the weak in-scope topics (the ones MI weighted up) — counted
      // from the REAL drawn set, never estimated or fabricated.
      return candidate.filter((q) => rankedWeakKeys.has(resolveCanonicalSlug(q.topicKey))).length;
    }
    if (drawnWeakSecs.length > 0) {
      return candidate.filter((q) => drawnWeakSecs.includes(q.section as MistakeSection)).length;
    }
    return 0;
  }, [candidate, enrichActive, rankedWeakKeys, drawnWeakSecs]);

  // ── History + pending (FIX B/C) ──────────────────────────────────────────
  const records = useMemo(
    () => getSurfaceHistory("worksheet", user?.uid),
    // recompute when returning from a grade (view change) or after opening the panel
    [user?.uid, view, historyNonce],
  );
  const pending = useMemo(
    () => records.filter((r) => r.status === "pending-upload" || r.status === "partial"),
    [records],
  );

  function switchSubject(s: LTSubjectKey) {
    setSubject(s);
    if (s === "Maths") setStream("All");
    setMiEnrich(true);
  }
  function toggleSection(id: SectionId) {
    setCustomSections((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      return next.length === 0 ? prev : next;
    });
  }
  // FIX (derive-scope) — ticking a topic IS the scope. Narrowing from "all topics" collapses
  // to the ticked topic; otherwise add/remove, but never below one (0 topics is an invalid
  // build). No tick is ever silently discarded — the whole worksheet honours the selection.
  function toggleTopic(key: string) {
    if (allTopics) {
      setAllTopics(false);
      setSelectedTopics([key]);
      return;
    }
    setSelectedTopics((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((k) => k !== key);
        return next.length === 0 ? prev : next; // keep at least one selected
      }
      return [...prev, key];
    });
  }
  // One-tap "add the weak area alongside" (multi-topic remedy) — brings a topic INTO the
  // selection without dropping the rest, promoting scope to multi-topic.
  function addTopic(key: string) {
    setAllTopics(false);
    setSelectedTopics((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }
  // One-tap "focus this worksheet on the true weak area" (single-topic remedy) — replaces the
  // selection with just that topic, deriving scope back to single-topic.
  function focusSingleTopic(key: string) {
    setAllTopics(false);
    setSelectedTopics([key]);
  }
  // The "All topics" toggle → full-subject. Turning it OFF with nothing remembered falls back
  // to a single valid topic so the builder never lands in the 0-topics dead-end.
  function toggleAllTopics() {
    const next = !allTopics;
    if (!next && selectedTopics.length === 0 && topics[0]) setSelectedTopics([topics[0].key]);
    setAllTopics(next);
  }
  function pickPreset(key: string) {
    setMode("preset");
    setPreset(key);
    setShowCustom(false);
  }

  function handlePreview() {
    setError(null);
    setDownloadError(null);
    if (blocker) {
      setError(blocker);
      return;
    }
    if (totalCount === 0) {
      setError(`No questions match ${sectionScopeLabel(effSections)} in this scope. Widen the section filter, or pick "Board exam mix".`);
      return;
    }
    setView("preview");
  }

  function handleShuffle() {
    setDrawNonce((n) => n + 1);
  }

  function handleGenerate() {
    setError(null);
    setDownloadError(null);
    if (blocker || candidate.length === 0) {
      setError(blocker ?? "No questions to generate. Change the settings and try again.");
      return;
    }
    setGenerating(true);
    try {
      const questions = candidate;
      const ws: PersistedWorksheet = {
        worksheetId: mintWorksheetId(),
        createdAt: new Date().toISOString(),
        title: `${scopeLabel} — ${modeLabel}`,
        subject: String(subject),
        grade: "10",
        sectionFilter: sectionScopeLabel(effSections),
        totalMarks: questions.reduce((s, q) => s + q.marks, 0),
        questions,
      };
      saveWorksheetSession(ws);
      setGenerated(ws);
      setView("generated");
    } catch {
      setError("Worksheet generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function runDownload(kind: "questions" | "answers") {
    if (!generated || downloading) return;
    setDownloadError(null);
    setDownloading(kind);
    try {
      // Mint (once) the DURABLE session code and print it on the sheet, so each
      // solved worksheet carries the same ID it will later be graded under.
      // Best-effort: a code-mint miss must never block the download.
      let code: string | undefined;
      try {
        code = (await ensureWorksheetSessionCode(generated, user, listStoredWorksheetsLite())).code;
      } catch {
        /* keep downloading without a code rather than fail the PDF */
      }
      await exportWorksheetPdf(generated, kind, code);
    } catch {
      setDownloadError("Couldn’t build the PDF — please try again.");
    } finally {
      setDownloading(null);
    }
  }

  // FIX C deep-link — re-open a pending worksheet in the (unchanged) generated view
  // so its EXISTING WorksheetGradePanel handles the upload; re-grading attaches to the
  // same session record (frozen-code idempotency, #338), never creating a new one.
  function openUploadFor(record: SessionRecord) {
    const ws = getWorksheetSession(record.worksheetId);
    if (ws) {
      setGenerated(ws);
      setView("generated");
      return;
    }
    // The stored worksheet was evicted from the local ring buffer — fall back to the
    // history panel (its row still re-opens the stored read-only scorecard).
    setHistoryPendingOnly(true);
    setHistoryOpen(true);
  }

  function openHistory(pendingOnly = false) {
    setHistoryPendingOnly(pendingOnly);
    setHistoryNonce((n) => n + 1); // fresh read on open
    setHistoryOpen(true);
  }

  // ── Generated-state derived breakdowns (real counts) ──────────────────────
  const genSectionRows = useMemo(() => {
    if (!generated) return [];
    const counts = new Map<string, number>();
    for (const q of generated.questions) counts.set(q.section, (counts.get(q.section) ?? 0) + 1);
    return ALL_SECTIONS.filter((s) => counts.has(s)).map((s) => ({ section: s, count: counts.get(s) ?? 0 }));
  }, [generated]);

  const maxAlloc = plan ? Math.max(1, ...plan.rows.map((r) => r.allocated)) : 1;

  // FIX-5 — accessible MI enrich control: a real switch (role="switch", aria-checked,
  // native-button keyboard operation, visible focus) — never a bare <input type="checkbox">.
  const miSwitch = (label: ReactNode) => (
    <button
      type="button"
      role="switch"
      aria-checked={miEnrich}
      className={`lt-ws__mi-switch${miEnrich ? " on" : ""}`}
      onClick={() => setMiEnrich((v) => !v)}
    >
      <span className="lt-ws__mi-switch-track" aria-hidden="true">
        <span className="lt-ws__mi-switch-thumb" />
      </span>
      <span className="lt-ws__mi-switch-label">{label}</span>
    </button>
  );

  // The header history control renders across build + preview (shared chrome).
  const historyControl = (
    <button type="button" className="lt-ws__histbtn" onClick={() => openHistory(false)}>
      <span className="lt-ws__histmain">Your worksheets</span>
      <span className="lt-ws__histcnt">· {records.length}</span>
      {pending.length > 0 && <span className="lt-ws__histawait">{pending.length} awaiting</span>}
      <span className="lt-ws__histcaret" aria-hidden="true">⌄</span>
    </button>
  );

  // FIX-1 — no valid subject + topic(s) in the URL → the builder never guesses a topic.
  // Send the student to the hub to choose (once; replace so there is no back-loop). Every
  // hook above has already run, so this conditional return respects the Rules of Hooks.
  if (!entry.hasContext) {
    return <Navigate to="/practice-hub" replace />;
  }

  return (
    <div className="lt-ws">
      <style>{WS_CSS}</style>

      {/* View-aware Back: generated/preview return within the component; build follows returnTo. */}
      {view === "generated" ? (
        <button type="button" className="lt-ws__back" onClick={() => setView("build")}>
          <span aria-hidden="true">←</span>
          <span>Back to generator</span>
        </button>
      ) : view === "preview" ? (
        <button type="button" className="lt-ws__back" onClick={() => setView("build")}>
          <span aria-hidden="true">←</span>
          <span>Back to builder</span>
        </button>
      ) : (
        <Link to={backHref} className="lt-ws__back">
          <span aria-hidden="true">←</span>
          <span>{backLabel}</span>
        </Link>
      )}

      {view === "build" && (
        <>
          <header className="lt-ws__head">
            <div className="lt-ws__headrow">
              <div className="lt-ws__headtx">
                <div className="lt-ws__crumb">Practice · Worksheet</div>
                <h1 className="lt-ws__title">{scopeLabel} worksheet</h1>
                <p className="lt-ws__lead">A board-pattern worksheet, ready to generate. Solve on paper, upload, get it graded.</p>
              </div>
              {historyControl}
            </div>
          </header>

          {pending.length > 0 && !bannerDismissed && (
            <WorksheetPendingBanner
              pending={pending}
              onUpload={openUploadFor}
              onSeeAll={() => openHistory(true)}
              onDismiss={() => setBannerDismissed(true)}
            />
          )}

          {/* ── Smart-default hero ─────────────────────────────────────────── */}
          <section className="lt-ws__hero">
            <div className="lt-ws__herotop">
              <h2 className="lt-ws__heroh">{modeLabel} · {scopeLabel}</h2>
              <p className="lt-ws__herosub">The default most students want — a full board-pattern set across every section.</p>
              <div className="lt-ws__herochips">
                <span className="lt-ws__pvchip lt-ws__pvchip--count">{totalCount}<span className="lt-ws__u-full"> question{totalCount === 1 ? "" : "s"}</span><span className="lt-ws__u-abbr"> Q</span></span>
                <span className="lt-ws__pvchip">{sectionScopeLabel(effSections)}</span>
                <span className="lt-ws__pvchip">{effDifficulty === "All" ? "All difficulty" : effDifficulty}</span>
                {totalMarks > 0 && <span className="lt-ws__pvchip lt-ws__pvchip--n">{totalMarks} marks</span>}
              </div>
            </div>
            <div className="lt-ws__herobot">
              <button type="button" className="lt-ws__gen" onClick={handlePreview} disabled={!!blocker || noQuestions}>
                Preview worksheet →
              </button>
              <button type="button" className="lt-ws__btnt" onClick={() => setCustomiseOpen((o) => !o)} aria-expanded={customiseOpen}>
                {customiseOpen ? "Done customising" : "Customise"}
              </button>
            </div>
          </section>

          {/* FIX A — MI personalise, SCOPE-RELATIVE with SPLIT honest states. Never one
              "grade a worksheet first" message for three different situations: the copy
              names the TRUE reason (no data at all / weak area is elsewhere / this topic
              is the weak area / enrich here) and, where the weak area sits outside the
              chosen scope, offers a one-tap remedy. The toggle only appears when there
              is something real to weight toward — never a no-op. */}
          <div className={`lt-ws__mi${canEnrich ? "" : " locked"}`} data-testid="mi-enrich-box">
            <div className="lt-ws__mi-title"><span aria-hidden="true">⚡</span> Personalise this worksheet</div>
            {!isSignedIn ? (
              <>
                <p className="lt-ws__mi-hint">Weight it toward the topics &amp; sections you&rsquo;ve lost the most marks on (from your Mistake Intelligence).</p>
                <Link to={loginHref} className="lt-ws__mi-cta">Sign in to personalise →</Link>
              </>
            ) : !mi.hasData ? (
              // (1) No mistake data for THIS subject — the only honest place for the "do it
              //     first" copy. Named by subject so it stays accurate even for a student
              //     whose graded history is all in the other subject (nothing to weight a
              //     {subject} worksheet toward yet).
              <p className="lt-ws__mi-hint">
                Grade a {subject} worksheet or use Check &amp; Improve first — then this focuses the worksheet on the {subject} topics &amp; sections you&rsquo;ve lost the most marks on.
              </p>
            ) : scope === "topic" ? (
              canSectionSkew ? (
                // (2a) The chosen topic is a weak area with skewable sections → section-skew toggle.
                <>
                  {miSwitch(
                    <>
                      Focus on your weak spots in <strong>{selectedTopicMi?.label}</strong> — weight toward Section{weakSecsInScope.length === 1 ? "" : "s"} {formatNameList(weakSecsInScope)}.
                    </>,
                  )}
                  <p className="lt-ws__mi-hint">From your Mistake Intelligence — the sections of this topic where you&rsquo;ve lost the most marks.</p>
                </>
              ) : selectedTopicMi ? (
                // (2b) The chosen topic IS a weak area but has no skewable section signal.
                <p className="lt-ws__mi-hint">
                  <strong>{selectedTopicMi.label}</strong> is one of your weak areas — the whole worksheet already targets it.
                </p>
              ) : globalHotspot ? (
                // (2c) The chosen single topic is NOT a weak area; name the true one + one-tap remedy.
                // [FU-WS-MI-COPY] — locked wording: state the honest fact (no marks lost here yet)
                // before naming the real weak area; the one-tap remedy (behaviour unchanged) focuses there.
                <>
                  <p className="lt-ws__mi-hint">
                    You haven&rsquo;t lost marks in <strong>{scopeLabel}</strong> yet. Right now your weak area is <strong>{globalHotspot.label}</strong> — focus this worksheet there, or add it alongside.
                  </p>
                  <button type="button" className="lt-ws__mi-cta" onClick={() => focusSingleTopic(globalHotspot.key)}>
                    Focus on {globalHotspot.label} →
                  </button>
                </>
              ) : (
                // Safety fallback (has data, nothing resolvable in this subject) — never assert "do it first".
                <p className="lt-ws__mi-hint">Pick a topic you&rsquo;ve been graded on to personalise this worksheet.</p>
              )
            ) : scopeHotspot ? (
              // (3a) multi/full with a weak in-scope topic → scope-relative cross-topic boost.
              // FIX-3: name the FULL ranked set of weak in-scope topics (not just the weakest).
              <>
                {miSwitch(
                  <>
                    Enrich from my weak areas — weight toward <strong>{formatNameList(rankedWeak.map((t) => t.label))}</strong>.
                  </>,
                )}
                <p className="lt-ws__mi-hint">
                  Weighted by your Mistake Intelligence — the in-scope topic{rankedWeak.length === 1 ? "" : "s"} where you&rsquo;ve lost the most marks.
                </p>
              </>
            ) : globalHotspot ? (
              // (3b) A weak area exists but isn't in this multi-topic selection → one-tap add.
              <>
                <p className="lt-ws__mi-hint">
                  Your weak area is <strong>{globalHotspot.label}</strong>, which isn&rsquo;t in this selection. Add it to focus this worksheet there.
                </p>
                <button type="button" className="lt-ws__mi-cta" onClick={() => addTopic(globalHotspot.key)}>
                  Add {globalHotspot.label} →
                </button>
              </>
            ) : (
              <p className="lt-ws__mi-hint">Pick topics you&rsquo;ve been graded on to personalise this worksheet.</p>
            )}
          </div>

          {/* ── Customise drawer (progressive disclosure) ──────────────────── */}
          {customiseOpen && (
            <section className="lt-ws__drawer">
              <div className="lt-ws__field">
                <div className="lt-ws__lbl">Subject</div>
                <div className="lt-ws__seg">
                  {(["Maths", "Science"] as LTSubjectKey[]).map((s) => (
                    <button key={s} type="button" className={`lt-ws__segbtn${subject === s ? " on" : ""}`} onClick={() => switchSubject(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {subject === "Science" && (
                <div className="lt-ws__field">
                  <div className="lt-ws__lbl">Stream</div>
                  <div className="lt-ws__seg">
                    {(["All", "Physics", "Chemistry", "Biology"] as ScienceStream[]).map((st) => (
                      <button key={st} type="button" className={`lt-ws__segbtn${stream === st ? " on" : ""}`} onClick={() => setStream(st)}>
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* FIX (derive-scope) — ONE topic picker replaces the old three-way Scope
                  segmented control + separate topic dropdown / chip lists. Ticking topics IS
                  the scope (1 → single · 2+ → multi · "All topics" → full-subject), so a
                  control can never silently contradict the selection and no tick is ever
                  discarded. The derived scope is surfaced honestly in the label. */}
              <div className="lt-ws__field">
                <div className="lt-ws__lbl">Topics — {scopeHint}</div>
                <div className="lt-ws__chips">
                  <button
                    type="button"
                    className={`lt-ws__chip lt-ws__chip--all${allTopics ? " on" : ""}`}
                    aria-pressed={allTopics}
                    onClick={toggleAllTopics}
                  >
                    All topics ({topics.length})
                  </button>
                  {topics.map((t) => {
                    const active = allTopics || selectedTopics.includes(t.key);
                    return (
                      <button
                        key={t.key}
                        type="button"
                        className={`lt-ws__chip${active ? " on" : ""}`}
                        aria-pressed={active}
                        onClick={() => toggleTopic(t.key)}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lt-ws__field">
                <div className="lt-ws__lbl">Build mode</div>
                <div className="lt-ws__presets">
                  {PRESETS.map((p) => (
                    <button key={p.key} type="button" className={`lt-ws__preset${!usingCustom && preset === p.key ? " on" : ""}`} onClick={() => pickPreset(p.key)}>
                      <span className="lt-ws__radio" aria-hidden="true" />
                      <span className="lt-ws__pmeta">
                        <span className="lt-ws__pt">{p.label}</span>
                        <span className="lt-ws__pd">{p.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="lt-ws__customlink"
                aria-expanded={usingCustom || showCustom}
                onClick={() => {
                  const next = !(usingCustom || showCustom);
                  setShowCustom(next);
                  setMode(next ? "custom" : "preset");
                }}
              >
                {usingCustom ? "▾" : "▸"} Advanced — set your own sections, difficulty &amp; count
              </button>

              {usingCustom && (
                <div className="lt-ws__custom">
                  <div className="lt-ws__field">
                    <div className="lt-ws__lbl">Sections</div>
                    <div className="lt-ws__chips">
                      {ALL_SECTIONS.map((s) => (
                        <button key={s} type="button" className={`lt-ws__chip${customSections.includes(s) ? " on" : ""}`} onClick={() => toggleSection(s)}>
                          {SECTION_MARK_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="lt-ws__field">
                    <div className="lt-ws__lbl">Difficulty</div>
                    <div className="lt-ws__chips">
                      {DIFFICULTIES.map((d) => (
                        <button key={d} type="button" className={`lt-ws__chip${customDifficulty === d ? " on" : ""}`} onClick={() => setCustomDifficulty(d)}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="lt-ws__field">
                    <div className="lt-ws__lbl">Question count: {customCount}</div>
                    <input type="range" min={5} max={50} step={5} value={customCount} onChange={(e) => setCustomCount(Number(e.target.value))} className="lt-ws__range" />
                  </div>
                </div>
              )}

              {/* FIX B — a Preview action at the FOOT of the drawer, beside "Done
                  customising", so the next step sits where the student finishes editing
                  (no scroll back up to the hero). Same handler + disabled logic as the hero. */}
              <div className="lt-ws__drawerfoot">
                <button type="button" className="lt-ws__gen" onClick={handlePreview} disabled={!!blocker || noQuestions}>
                  Preview worksheet →
                </button>
                <button type="button" className="lt-ws__btnt" onClick={() => setCustomiseOpen(false)}>
                  Done customising
                </button>
              </div>
            </section>
          )}

          {noQuestions && (
            <div className="lt-ws__note lt-ws__note--warn">
              No questions match {sectionScopeLabel(effSections)} for this scope. Widen the section filter or pick &ldquo;Board exam mix&rdquo;.
            </div>
          )}
          {blocker && <div className="lt-ws__note">{blocker}</div>}
          {error && <div className="lt-ws__note lt-ws__note--err" role="alert">{error}</div>}
        </>
      )}

      {view === "preview" && (
        <>
          <header className="lt-ws__head">
            <div className="lt-ws__headrow">
              <div className="lt-ws__headtx">
                <div className="lt-ws__crumb">Practice · Worksheet · Preview</div>
                <h1 className="lt-ws__title">Here&rsquo;s what will be generated</h1>
                <p className="lt-ws__lead">Nothing is created until you press Generate. Check the mix, then go.</p>
              </div>
              {historyControl}
            </div>
          </header>

          <section className="lt-ws__pvcard">
            <div className="lt-ws__pvhead">
              <div>
                <h2 className="lt-ws__pvtitle">{scopeLabel} — {modeLabel}</h2>
                <div className="lt-ws__pvmeta">
                  {totalCount} question{totalCount === 1 ? "" : "s"} · {totalMarks} marks{enrichCount > 0 ? " · enriched from your weak areas" : ""}
                </div>
              </div>
              <span className="lt-ws__pvready">Ready</span>
            </div>

            {/* Proportional section bar + legend (real per-section counts/marks). */}
            {previewSections.length > 0 && (
              <>
                <div className="lt-ws__secbar">
                  {previewSections.map((r) => (
                    <span key={r.section} className={`lt-ws__segfill lt-ws__c--${r.section}`} data-w={widthStep(r.count / totalCount)} />
                  ))}
                </div>
                <div className="lt-ws__seclegend">
                  {previewSections.map((r) => (
                    <div key={r.section} className="lt-ws__legitem">
                      <span className={`lt-ws__legsw lt-ws__c--${r.section}`} />
                      {r.section} · {SECTION_NAME[r.section as SectionId]} — {r.count} × {r.count > 0 ? Math.round(r.marks / r.count) : 0}m
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Topic distribution (multi / full scope) — reuses the honest allocation. */}
            {plan && plan.rows.length > 1 && (
              <div className="lt-ws__pvbreak">
                <div className="lt-ws__bh">Topic mix ({scope === "full-subject" ? "board weightage" : "even"}{enrichActive ? " · MI-weighted" : ""})</div>
                {plan.rows.filter((r) => r.allocated > 0).map((r) => (
                  <div key={r.key} className="lt-ws__dist">
                    <span className="lt-ws__distnm">{r.label}</span>
                    <span className="lt-ws__distbar"><span className="lt-ws__distfill" data-w={widthStep(r.allocated / maxAlloc)} /></span>
                    <span className="lt-ws__distct">{r.allocated}</span>
                  </div>
                ))}
              </div>
            )}

            {enrichCount > 0 && enrichActive && drawnWeakTopics.length > 0 && (
              <div className="lt-ws__warn">
                <span aria-hidden="true">⚡</span> <strong>Enriched:</strong> {enrichCount} of {totalCount} question{enrichCount === 1 ? "" : "s"} target {formatNameList(drawnWeakTopics.map((t) => t.label))} — {drawnWeakTopics.length === 1 ? "where" : "the in-scope topics where"} you&rsquo;ve lost the most marks.
              </div>
            )}
            {enrichCount > 0 && drawnWeakSecs.length > 0 && (
              <div className="lt-ws__warn">
                <span aria-hidden="true">⚡</span> <strong>Enriched:</strong> {enrichCount} of {totalCount} question{enrichCount === 1 ? "" : "s"} target Section{drawnWeakSecs.length === 1 ? "" : "s"} {formatNameList(drawnWeakSecs)} — where you&rsquo;ve lost the most marks in {scopeLabel}.
              </div>
            )}

            {shortfall && (
              <div className="lt-ws__note lt-ws__note--warn">
                Only {totalCount} unique question{totalCount === 1 ? "" : "s"} available for this scope (you asked for {effCount}). This worksheet will generate {totalCount} — honest counts, no padding.
              </div>
            )}

            <div className="lt-ws__lbl lt-ws__pvsamplbl">Sample of what&rsquo;s coming</div>
            {previewSamples.map((q) => (
              <div key={q.qNumber} className="lt-ws__qprev">
                <div className="lt-ws__qprevhead">
                  <span>Q{q.qNumber} · Section {q.section}</span>
                  <span>{q.marks} mark{q.marks === 1 ? "" : "s"}</span>
                </div>
                <div className="lt-ws__qprevtext">{q.questionText}</div>
              </div>
            ))}
            {totalCount > previewSamples.length && (
              <div className="lt-ws__more">…{totalCount - previewSamples.length} more question{totalCount - previewSamples.length === 1 ? "" : "s"}</div>
            )}
          </section>

          <div className="lt-ws__pvactions">
            <button type="button" className="lt-ws__gen" onClick={handleGenerate} disabled={generating || candidate.length === 0}>
              {generating ? "Generating…" : "Generate worksheet →"}
            </button>
            <button type="button" className="lt-ws__btnt" onClick={() => setView("build")}>Change settings</button>
            <button type="button" className="lt-ws__btnt" onClick={handleShuffle}>⟳ Shuffle questions</button>
          </div>
          {error && <div className="lt-ws__note lt-ws__note--err" role="alert">{error}</div>}
        </>
      )}

      {view === "generated" && (
        // ── GENERATED (UNCHANGED design + behaviour) ──────────────────────────
        <div className="lt-ws__generated">
          <section className="lt-ws__card">
            <div className="lt-ws__gtick" aria-hidden="true">✓</div>
            <h1 className="lt-ws__title">Your {generated?.title} worksheet is ready</h1>
            <p className="lt-ws__lead">{generated?.questions.length} questions · {generated?.totalMarks} marks · {generated?.sectionFilter}. Download, solve on paper, then check against the answer key.</p>

            {genSectionRows.length > 0 && (
              <div className="lt-ws__gsecs">
                {genSectionRows.map((r) => (
                  <span key={r.section} className="lt-ws__pvsec">Section {r.section}: {r.count}</span>
                ))}
              </div>
            )}

            <div className="lt-ws__dlgrid">
              <button type="button" className="lt-ws__dl lt-ws__dl--primary" onClick={() => runDownload("questions")} disabled={!!downloading}>
                <span className="lt-ws__dlt">{downloading === "questions" ? "Preparing PDF…" : "↓ Worksheet (questions)"}</span>
                <span className="lt-ws__dld">{generated?.questions.length} numbered questions · sections A–E. No answers — attempt honestly.</span>
              </button>
              <button type="button" className="lt-ws__dl" onClick={() => runDownload("answers")} disabled={!!downloading}>
                <span className="lt-ws__dlt">{downloading === "answers" ? "Preparing PDF…" : "↓ Answer key + solutions"}</span>
                <span className="lt-ws__dld">Step-by-step solutions with CBSE mark weights. Open after you attempt.</span>
              </button>
            </div>
            {downloadError && <div className="lt-ws__note lt-ws__note--err" role="alert">{downloadError}</div>}
          </section>

          {generated && (
            <section className="lt-ws__card">
              <WorksheetGradePanel ws={generated} />
            </section>
          )}

          <button type="button" className="lt-ws__buildanother" onClick={() => { setView("build"); setGenerated(null); }}>
            ← Build another worksheet
          </button>
        </div>
      )}

      {historyOpen && (
        <WorksheetHistoryPanel
          uid={user?.uid}
          count={records.length}
          pendingOnly={historyPendingOnly}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  );
}

const WS_CSS = `
.lt-ws {
  --ws-green: hsl(152, 55%, 45%);
  --ws-green-soft: hsl(152, 55%, 96%);
  --ws-green-b: hsl(152, 45%, 80%);
  --ws-green-fg: hsl(152, 55%, 28%);
  --ws-fg: hsl(220, 25%, 12%);
  --ws-muted: hsl(220, 15%, 42%);
  --ws-hint: hsl(220, 12%, 58%);
  --ws-line: hsl(220, 18%, 90%);
  --ws-line-soft: hsl(220, 20%, 94%);
  --ws-surface: #ffffff;
  --ws-surface-2: hsl(210, 33%, 97%);
  --ws-amber-bg: hsl(38, 92%, 95%);
  --ws-amber-b: hsl(38, 60%, 82%);
  --ws-amber-fg: hsl(33, 70%, 32%);
  --ws-blue: hsl(222, 64%, 53%);
  --ws-fd: "Fraunces", Georgia, serif;
  --ws-fb: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-family: var(--ws-fb);
  color: var(--ws-fg);
  max-width: 820px;
  margin: 0 auto;
  padding: 22px clamp(16px, 4vw, 32px) 64px;
}
.lt-ws__back {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 600; color: var(--ws-muted);
  text-decoration: none; margin-bottom: 14px;
  appearance: none; border: none; background: none; padding: 0; cursor: pointer;
  font-family: var(--ws-fb);
}
.lt-ws__back:hover { color: var(--ws-fg); }
.lt-ws__head { margin-bottom: 16px; }
.lt-ws__headrow { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.lt-ws__headtx { min-width: 0; }
.lt-ws__crumb { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ws-green-fg); margin-bottom: 6px; }
.lt-ws__title { font-family: var(--ws-fd); font-size: 25px; font-weight: 600; margin: 0 0 6px; letter-spacing: -0.01em; }
.lt-ws__lead { font-size: 13.5px; color: var(--ws-muted); margin: 0; max-width: 560px; line-height: 1.55; }

/* Header history control (FIX B) */
.lt-ws__histbtn {
  flex-shrink: 0; display: inline-flex; align-items: center; gap: 7px;
  background: var(--ws-surface); border: 1px solid var(--ws-line); border-radius: 12px;
  padding: 9px 13px; font-size: 13px; font-weight: 600; cursor: pointer; color: var(--ws-fg);
  font-family: var(--ws-fb); box-shadow: 0 1px 3px rgba(21, 35, 58, 0.05);
}
.lt-ws__histbtn:hover { border-color: var(--ws-green); }
.lt-ws__histcnt { color: var(--ws-hint); font-weight: 500; }
.lt-ws__histawait {
  font-size: 10.5px; font-weight: 700; color: var(--ws-blue);
  background: hsl(222, 70%, 96%); padding: 3px 7px; border-radius: 6px;
}
.lt-ws__histcaret { color: var(--ws-hint); font-size: 11px; }

/* ── Smart-default hero ─────────────────────────────────────────────────── */
.lt-ws__hero {
  background: var(--ws-surface); border: 1px solid var(--ws-line); border-radius: 18px;
  overflow: hidden; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(21, 35, 58, 0.05), 0 4px 16px rgba(21, 35, 58, 0.04);
}
.lt-ws__herotop { padding: 22px 22px 18px; }
.lt-ws__heroh { font-family: var(--ws-fd); font-size: 20px; font-weight: 600; margin: 0 0 3px; }
.lt-ws__herosub { font-size: 13.5px; color: var(--ws-muted); margin: 0 0 15px; line-height: 1.5; }
.lt-ws__herochips { display: flex; flex-wrap: wrap; gap: 7px; }
.lt-ws__herobot {
  background: var(--ws-surface-2); border-top: 1px solid var(--ws-line);
  padding: 15px 22px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}
.lt-ws__herobot .lt-ws__gen { width: auto; margin-top: 0; }

.lt-ws__pvchip { display: inline-block; background: var(--ws-green-soft); border: 1px solid var(--ws-green-b); color: var(--ws-green-fg); font-size: 12.5px; font-weight: 600; padding: 5px 11px; border-radius: 999px; }
.lt-ws__pvchip--count { background: var(--ws-green); border-color: var(--ws-green); color: #fff; }
.lt-ws__pvchip--n { background: var(--ws-surface-2); border-color: var(--ws-line); color: var(--ws-muted); }

/* ── MI personalise (navy dark card → a toggle + one hint line) ─────────── */
.lt-ws__mi { margin: 0 0 14px; border: 1px solid hsl(220, 25%, 12%); border-radius: 14px; padding: 15px 17px; background: hsl(220, 25%, 12%); }
.lt-ws__mi-title { display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 700; color: #ffffff; margin-bottom: 9px; }
/* Shared by the sign-in <Link> and the one-tap-remedy <button> — button-safe resets
   so both render identically (FIX A). */
.lt-ws__mi-cta { display: inline-block; margin-top: 4px; border: 1px solid var(--ws-green); background: var(--ws-green); color: #fff; border-radius: 9px; padding: 8px 13px; font-size: 12.5px; font-weight: 700; text-decoration: none; appearance: none; cursor: pointer; font-family: var(--ws-fb); }
.lt-ws__mi-cta:hover { background: hsl(152, 60%, 40%); }
.lt-ws__mi-hint { margin: 8px 0 0; font-size: 12px; color: hsl(220, 18%, 82%); line-height: 1.5; }
/* FIX-5 — accessible enrich switch (role="switch"): keyboard-operable native button,
   visible focus ring; replaces the bare <input type="checkbox">. */
.lt-ws__mi-switch {
  display: flex; align-items: flex-start; gap: 11px; width: 100%; text-align: left;
  appearance: none; border: none; background: none; padding: 0; cursor: pointer;
  font-family: var(--ws-fb); font-size: 13px; color: hsl(220, 18%, 88%);
}
.lt-ws__mi.locked .lt-ws__mi-switch { cursor: not-allowed; }
.lt-ws__mi-switch-track {
  position: relative; flex: 0 0 auto; width: 38px; height: 22px; margin-top: 1px;
  border-radius: 999px; background: hsl(220, 12%, 45%); transition: background 0.15s;
}
.lt-ws__mi-switch.on .lt-ws__mi-switch-track { background: var(--ws-green); }
.lt-ws__mi-switch-thumb {
  position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%;
  background: #fff; transition: left 0.15s;
}
.lt-ws__mi-switch.on .lt-ws__mi-switch-thumb { left: 19px; }
.lt-ws__mi-switch-label { flex: 1; min-width: 0; line-height: 1.45; }
.lt-ws__mi-switch-label strong { color: #ffffff; }
.lt-ws__mi-switch:focus-visible { outline: 2px solid var(--ws-green); outline-offset: 3px; border-radius: 8px; }

/* ── Customise drawer + fields ──────────────────────────────────────────── */
.lt-ws__drawer { background: var(--ws-surface); border: 1px solid var(--ws-line); border-radius: 16px; padding: 18px 20px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 16px; }
.lt-ws__lbl { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ws-muted); margin-bottom: 8px; }

.lt-ws__seg { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--ws-line); border-radius: 10px; overflow: hidden; }
.lt-ws__segbtn { appearance: none; border: none; background: var(--ws-surface); padding: 9px 16px; font-size: 13.5px; cursor: pointer; color: var(--ws-muted); border-right: 1px solid var(--ws-line); font-family: var(--ws-fb); }
.lt-ws__segbtn:last-child { border-right: none; }
.lt-ws__segbtn.on { background: var(--ws-green-soft); color: var(--ws-green-fg); font-weight: 600; }

.lt-ws__chips { display: flex; flex-wrap: wrap; gap: 7px; }
.lt-ws__chip { appearance: none; border: 1px solid var(--ws-line); background: var(--ws-surface); border-radius: 999px; padding: 6px 13px; font-size: 13px; cursor: pointer; color: var(--ws-muted); font-family: var(--ws-fb); }
.lt-ws__chip.on { background: var(--ws-green-soft); border-color: var(--ws-green-b); color: var(--ws-green-fg); font-weight: 600; }
/* FIX (derive-scope) — the "All topics" (full-subject) toggle leads the unified topic picker. */
.lt-ws__chip--all { font-weight: 600; }

.lt-ws__presets { display: flex; flex-direction: column; gap: 9px; }
.lt-ws__preset { display: flex; align-items: center; gap: 13px; border: 1px solid var(--ws-line); border-radius: 10px; padding: 13px 15px; cursor: pointer; background: var(--ws-surface); text-align: left; font-family: var(--ws-fb); }
.lt-ws__preset.on { border-color: var(--ws-green); background: var(--ws-green-soft); }
.lt-ws__radio { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--ws-line); flex-shrink: 0; position: relative; }
.lt-ws__preset.on .lt-ws__radio { border-color: var(--ws-green); }
.lt-ws__preset.on .lt-ws__radio::after { content: ""; position: absolute; inset: 3px; border-radius: 50%; background: var(--ws-green); }
.lt-ws__pmeta { display: flex; flex-direction: column; }
.lt-ws__pt { font-size: 14px; font-weight: 600; color: var(--ws-fg); }
.lt-ws__pd { font-size: 12px; color: var(--ws-muted); margin-top: 2px; }

.lt-ws__customlink { appearance: none; border: none; background: none; display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--ws-green-fg); cursor: pointer; font-weight: 600; font-family: var(--ws-fb); padding: 0; }
.lt-ws__custom { border-top: 1px solid var(--ws-line-soft); padding-top: 14px; display: flex; flex-direction: column; gap: 14px; }
.lt-ws__range { width: 100%; accent-color: var(--ws-green); }
/* FIX B — drawer-foot actions (Preview + Done customising). */
.lt-ws__drawerfoot { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; border-top: 1px solid var(--ws-line-soft); padding-top: 16px; }
.lt-ws__drawerfoot .lt-ws__gen { width: auto; }

/* ── Buttons ────────────────────────────────────────────────────────────── */
.lt-ws__gen { border: none; background: var(--ws-green); color: #fff; border-radius: 11px; padding: 13px 22px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: var(--ws-fd); }
.lt-ws__gen:hover { background: hsl(152, 60%, 38%); }
.lt-ws__gen:disabled { background: hsl(152, 25%, 78%); cursor: not-allowed; }
.lt-ws__btnt { background: var(--ws-surface); border: 1px solid var(--ws-line); color: var(--ws-fg); border-radius: 11px; padding: 12px 16px; font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: var(--ws-fb); }
.lt-ws__btnt:hover { border-color: var(--ws-hint); }

.lt-ws__note { font-size: 12px; line-height: 1.5; border-radius: 9px; padding: 9px 11px; margin: 8px 0; color: var(--ws-muted); background: var(--ws-surface-2); }
.lt-ws__note--warn { background: var(--ws-amber-bg); border: 1px solid var(--ws-amber-b); color: var(--ws-amber-fg); }
.lt-ws__note--err { background: hsl(0, 75%, 97%); border: 1px solid hsl(0, 70%, 88%); color: hsl(0, 65%, 38%); }

/* ── Preview step ───────────────────────────────────────────────────────── */
.lt-ws__pvcard { background: var(--ws-surface); border: 1px solid var(--ws-line); border-radius: 18px; padding: 20px 22px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(21, 35, 58, 0.05); }
.lt-ws__pvhead { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.lt-ws__pvtitle { font-family: var(--ws-fd); font-size: 17px; font-weight: 600; margin: 0 0 3px; }
.lt-ws__pvmeta { font-size: 12.5px; color: var(--ws-muted); }
.lt-ws__pvready { flex-shrink: 0; font-size: 11.5px; font-weight: 700; color: var(--ws-green-fg); background: var(--ws-green-soft); border: 1px solid var(--ws-green-b); border-radius: 999px; padding: 4px 11px; }

.lt-ws__secbar { display: flex; gap: 2px; height: 9px; margin: 4px 0 12px; overflow: hidden; border-radius: 5px; }
.lt-ws__segfill { flex: 0 0 auto; height: 100%; border-radius: 3px; min-width: 4px; }
.lt-ws__c--A { background: hsl(222, 64%, 53%); }
.lt-ws__c--B { background: var(--ws-green); }
.lt-ws__c--C { background: hsl(38, 80%, 50%); }
.lt-ws__c--D { background: hsl(348, 72%, 58%); }
.lt-ws__c--E { background: hsl(265, 50%, 58%); }
.lt-ws__seclegend { display: flex; flex-wrap: wrap; gap: 9px 16px; margin-bottom: 16px; }
.lt-ws__legitem { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ws-muted); }
.lt-ws__legsw { width: 11px; height: 11px; border-radius: 3px; flex-shrink: 0; }

.lt-ws__pvbreak { background: var(--ws-surface-2); border-radius: 10px; padding: 10px 12px; margin: 0 0 14px; }
.lt-ws__bh { font-size: 10.5px; font-weight: 700; color: var(--ws-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }
.lt-ws__dist { display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 6px; }
.lt-ws__dist:last-child { margin-bottom: 0; }
.lt-ws__distnm { width: 120px; color: var(--ws-muted); flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lt-ws__distbar { flex: 1; height: 7px; background: var(--ws-line); border-radius: 4px; overflow: hidden; }
.lt-ws__distfill { display: block; height: 100%; background: var(--ws-green); width: 0; }
.lt-ws__distct { width: 20px; text-align: right; font-weight: 600; color: var(--ws-fg); }

.lt-ws__warn { background: var(--ws-amber-bg); border: 1px solid var(--ws-amber-b); border-radius: 11px; padding: 11px 13px; font-size: 12.5px; color: var(--ws-amber-fg); margin-bottom: 14px; line-height: 1.5; }
.lt-ws__warn strong { color: hsl(33, 75%, 26%); }

.lt-ws__pvsamplbl { margin-bottom: 8px; }
.lt-ws__qprev { border: 1px solid var(--ws-line); border-radius: 12px; padding: 12px 14px; margin-bottom: 8px; background: var(--ws-surface-2); }
.lt-ws__qprevhead { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: var(--ws-hint); text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 5px; }
.lt-ws__qprevtext { font-size: 13.5px; color: var(--ws-fg); line-height: 1.5; }
.lt-ws__more { font-size: 12.5px; color: var(--ws-hint); font-style: italic; text-align: center; padding: 6px; }

.lt-ws__pvactions { display: flex; gap: 10px; flex-wrap: wrap; }

/* ── Generated state (UNCHANGED) ────────────────────────────────────────── */
.lt-ws__card { background: var(--ws-surface); border: 1px solid var(--ws-line); border-radius: 16px; padding: 18px 20px; }
.lt-ws__generated { display: flex; flex-direction: column; gap: 16px; max-width: 760px; }
.lt-ws__gtick { width: 44px; height: 44px; border-radius: 50%; background: var(--ws-green-soft); color: var(--ws-green-fg); display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; margin-bottom: 10px; }
.lt-ws__gsecs { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 14px; }
.lt-ws__pvsec { font-size: 12px; color: var(--ws-muted); }
.lt-ws__dlgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.lt-ws__dl { display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--ws-line); border-radius: 10px; padding: 15px; cursor: pointer; background: var(--ws-surface); text-align: left; font-family: var(--ws-fb); }
.lt-ws__dl--primary { border-color: var(--ws-green-b); background: var(--ws-green-soft); }
.lt-ws__dlt { font-size: 14px; font-weight: 600; color: var(--ws-fg); }
.lt-ws__dld { font-size: 12px; color: var(--ws-muted); line-height: 1.45; }
.lt-ws__buildanother { appearance: none; border: 1px solid var(--ws-line); background: var(--ws-surface); color: var(--ws-fg); border-radius: 10px; padding: 11px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--ws-fb); }

/* distribution / section-bar fill widths via data-w (0..100, step 5) — no inline styles */
.lt-ws__distfill[data-w="0"]{width:0}.lt-ws__segfill[data-w="0"]{width:0}
.lt-ws__distfill[data-w="5"]{width:5%}.lt-ws__segfill[data-w="5"]{width:5%}
.lt-ws__distfill[data-w="10"]{width:10%}.lt-ws__segfill[data-w="10"]{width:10%}
.lt-ws__distfill[data-w="15"]{width:15%}.lt-ws__segfill[data-w="15"]{width:15%}
.lt-ws__distfill[data-w="20"]{width:20%}.lt-ws__segfill[data-w="20"]{width:20%}
.lt-ws__distfill[data-w="25"]{width:25%}.lt-ws__segfill[data-w="25"]{width:25%}
.lt-ws__distfill[data-w="30"]{width:30%}.lt-ws__segfill[data-w="30"]{width:30%}
.lt-ws__distfill[data-w="35"]{width:35%}.lt-ws__segfill[data-w="35"]{width:35%}
.lt-ws__distfill[data-w="40"]{width:40%}.lt-ws__segfill[data-w="40"]{width:40%}
.lt-ws__distfill[data-w="45"]{width:45%}.lt-ws__segfill[data-w="45"]{width:45%}
.lt-ws__distfill[data-w="50"]{width:50%}.lt-ws__segfill[data-w="50"]{width:50%}
.lt-ws__distfill[data-w="55"]{width:55%}.lt-ws__segfill[data-w="55"]{width:55%}
.lt-ws__distfill[data-w="60"]{width:60%}.lt-ws__segfill[data-w="60"]{width:60%}
.lt-ws__distfill[data-w="65"]{width:65%}.lt-ws__segfill[data-w="65"]{width:65%}
.lt-ws__distfill[data-w="70"]{width:70%}.lt-ws__segfill[data-w="70"]{width:70%}
.lt-ws__distfill[data-w="75"]{width:75%}.lt-ws__segfill[data-w="75"]{width:75%}
.lt-ws__distfill[data-w="80"]{width:80%}.lt-ws__segfill[data-w="80"]{width:80%}
.lt-ws__distfill[data-w="85"]{width:85%}.lt-ws__segfill[data-w="85"]{width:85%}
.lt-ws__distfill[data-w="90"]{width:90%}.lt-ws__segfill[data-w="90"]{width:90%}
.lt-ws__distfill[data-w="95"]{width:95%}.lt-ws__segfill[data-w="95"]{width:95%}
.lt-ws__distfill[data-w="100"]{width:100%}.lt-ws__segfill[data-w="100"]{width:100%}

/* FIX-6 — width-conditional chip text (pure CSS, no JS width branch): the full label
   shows on desktop, the abbreviation on the mobile reflow. */
.lt-ws__u-abbr { display: none; }

/* ── Mobile reflow (same markup) ─────────────────────────────────────────── */
@media (max-width: 1023px) {
  .lt-ws { padding-bottom: 48px; }
  .lt-ws__headrow { flex-direction: column; }
  .lt-ws__histbtn { align-self: flex-start; }
  /* FIX-4 + FIX-6 — the hero + drawer-foot are now the ONLY Preview CTAs (sticky bar
     removed), so the hero button must STAY visible on mobile; both hero actions stack
     full-width so the primary CTA is thumb-reachable. */
  .lt-ws__herobot { flex-direction: column; align-items: stretch; }
  .lt-ws__herobot .lt-ws__gen, .lt-ws__herobot .lt-ws__btnt { width: 100%; }
  /* Drawer foot stacks with the primary Preview at the bottom (thumb-reachable). */
  .lt-ws__drawerfoot { flex-direction: column-reverse; align-items: stretch; }
  .lt-ws__drawerfoot .lt-ws__gen, .lt-ws__drawerfoot .lt-ws__btnt { width: 100%; }
  .lt-ws__pvactions { flex-direction: column; }
  .lt-ws__pvactions .lt-ws__gen, .lt-ws__pvactions .lt-ws__btnt { width: 100%; flex: none; }
  .lt-ws__dlgrid { grid-template-columns: 1fr; }
  .lt-ws__seg { display: flex; width: 100%; }
  .lt-ws__segbtn { flex: 1; padding: 9px 6px; }
  /* Shorten the count chip at mobile width via pure CSS (no JS width branch). */
  .lt-ws__u-full { display: none; }
  .lt-ws__u-abbr { display: inline; }
}
`;
