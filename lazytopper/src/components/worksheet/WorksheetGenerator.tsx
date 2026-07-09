import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
import { getSurfaceHistory } from "../../services/progressStore";
import {
  readWorksheetMi,
  weakestTopic,
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

/** "C" · "C & D" · "C, D & E" — human-readable section list for enrichment copy. */
function formatSectionList(sections: string[]): string {
  if (sections.length === 0) return "";
  if (sections.length === 1) return sections[0];
  return `${sections.slice(0, -1).join(", ")} & ${sections[sections.length - 1]}`;
}

export default function WorksheetGenerator() {
  const { user } = useAuth();
  const ctx = useSubjectContext();
  const location = useLocation();

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

  const [subject, setSubject] = useState<LTSubjectKey>((ctx.subject as LTSubjectKey) || "Maths");
  const [stream, setStream] = useState<ScienceStream>("All");
  const [scope, setScope] = useState<PaperScope>("topic");

  const topics = useMemo(() => getTopics(subject, stream), [subject, stream]);

  const [singleTopic, setSingleTopic] = useState<string>(topics[0]?.key ?? "");
  const [multiTopics, setMultiTopics] = useState<string[]>([]);

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

  // Keep single/multi selections valid when the visible catalogue changes.
  const topicKeysSig = topics.map((t) => t.key).join(",");
  useEffect(() => {
    if (!topics.find((t) => t.key === singleTopic)) setSingleTopic(topics[0]?.key ?? "");
    setMultiTopics((prev) => prev.filter((k) => topics.some((t) => t.key === k)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicKeysSig]);

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
  const selectedTopicMi = scope === "topic" ? mi.byTopic.get(singleTopic) ?? null : null;
  const topicSectionBoosts = useMemo(() => sectionBoostsFor(selectedTopicMi), [selectedTopicMi]);
  const weakSecs = useMemo(() => weakSections(selectedTopicMi), [selectedTopicMi]);

  // Cross-TOPIC boost (multi/full) — the scope-relative weakest in-scope topic. Feeds the
  // plan directly (allocateCounts weight). The WITHIN-topic section skew is resolved BELOW,
  // after the plan, because it must gate on the topic's real drawable pool (§ section-skew).
  const miBoostTopicKey =
    scope !== "topic" && miEnrich && scopeHotspot ? scopeHotspot.key : null;

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
      miBoostTopicKey,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, scope, inScopeTopics, JSON.stringify(sectionsArg), effDifficulty, effCount, miBoostTopicKey, blocker]);

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
  const canEnrich = scope === "topic" ? canSectionSkew : !!scopeHotspot;
  // WITHIN-topic section skew (single topic) — injected onto the (skew-independent) plan
  // at candidate-generation time.
  const sectionBoosts =
    scope === "topic" && miEnrich && canSectionSkew ? topicSectionBoosts : null;

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
    const ordered = [...generateFromPlan({ ...plan, sectionBoosts })].sort(
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
  }, [plan, blocker, drawNonce, JSON.stringify(sectionBoosts)]);

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

  // Enrichment count — how many DRAWN questions the enrichment actually targets.
  // Computed from the real set; zero (and the callout omitted) when enrich is off or
  // the bank can't honour it. Multi/full → questions from the weak in-scope topic;
  // single-topic → questions in the student's actually-drawn weak sections.
  const enrichCount = useMemo(() => {
    if (miBoostTopicKey && scopeHotspot) {
      return candidate.filter((q) => q.topicKey === scopeHotspot.key).length;
    }
    if (drawnWeakSecs.length > 0) {
      return candidate.filter((q) => drawnWeakSecs.includes(q.section as MistakeSection)).length;
    }
    return 0;
  }, [candidate, miBoostTopicKey, scopeHotspot, drawnWeakSecs]);

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
  function toggleMulti(key: string) {
    setMultiTopics((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
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

  // The header history control renders across build + preview (shared chrome).
  const historyControl = (
    <button type="button" className="lt-ws__histbtn" onClick={() => openHistory(false)}>
      <span className="lt-ws__histmain">Your worksheets</span>
      <span className="lt-ws__histcnt">· {records.length}</span>
      {pending.length > 0 && <span className="lt-ws__histawait">{pending.length} awaiting</span>}
      <span className="lt-ws__histcaret" aria-hidden="true">⌄</span>
    </button>
  );

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
                <span className="lt-ws__pvchip lt-ws__pvchip--count">{totalCount} question{totalCount === 1 ? "" : "s"}</span>
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
                  <label className="lt-ws__mi-toggle">
                    <input
                      type="checkbox"
                      className="lt-ws__mi-check"
                      checked={miEnrich}
                      onChange={(e) => setMiEnrich(e.target.checked)}
                    />
                    <span className="lt-ws__mi-toggletext">
                      Focus on your weak spots in <strong>{selectedTopicMi?.label}</strong> — weight toward Section{weakSecsInScope.length === 1 ? "" : "s"} {formatSectionList(weakSecsInScope)}.
                    </span>
                  </label>
                  <p className="lt-ws__mi-hint">From your Mistake Intelligence — the sections of this topic where you&rsquo;ve lost the most marks.</p>
                </>
              ) : selectedTopicMi ? (
                // (2b) The chosen topic IS a weak area but has no skewable section signal.
                <p className="lt-ws__mi-hint">
                  <strong>{selectedTopicMi.label}</strong> is one of your weak areas — the whole worksheet already targets it.
                </p>
              ) : globalHotspot ? (
                // (2c) The chosen single topic is NOT a weak area; name the true one + one-tap remedy.
                <>
                  <p className="lt-ws__mi-hint">
                    Your weak area is <strong>{globalHotspot.label}</strong>, not {scopeLabel}. Focus this worksheet there, or widen to multi-topic / full subject.
                  </p>
                  <button type="button" className="lt-ws__mi-cta" onClick={() => setSingleTopic(globalHotspot.key)}>
                    Focus on {globalHotspot.label} →
                  </button>
                </>
              ) : (
                // Safety fallback (has data, nothing resolvable in this subject) — never assert "do it first".
                <p className="lt-ws__mi-hint">Pick a topic you&rsquo;ve been graded on to personalise this worksheet.</p>
              )
            ) : scopeHotspot ? (
              // (3a) multi/full with a weak in-scope topic → scope-relative cross-topic boost.
              <>
                <label className="lt-ws__mi-toggle">
                  <input
                    type="checkbox"
                    className="lt-ws__mi-check"
                    checked={miEnrich}
                    onChange={(e) => setMiEnrich(e.target.checked)}
                  />
                  <span className="lt-ws__mi-toggletext">
                    Enrich from my weak areas — weight toward <strong>{scopeHotspot.label}</strong>.
                  </span>
                </label>
                <p className="lt-ws__mi-hint">Weighted by your Mistake Intelligence — the in-scope topic where you&rsquo;ve lost the most marks.</p>
              </>
            ) : globalHotspot ? (
              // (3b) A weak area exists but isn't in this multi-topic selection → one-tap add.
              <>
                <p className="lt-ws__mi-hint">
                  Your weak area is <strong>{globalHotspot.label}</strong>, which isn&rsquo;t in this selection. Add it to focus this worksheet there.
                </p>
                <button type="button" className="lt-ws__mi-cta" onClick={() => toggleMulti(globalHotspot.key)}>
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

              <div className="lt-ws__field">
                <div className="lt-ws__lbl">Scope</div>
                <div className="lt-ws__seg">
                  {(["topic", "multi-topic", "full-subject"] as PaperScope[]).map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      className={`lt-ws__segbtn${scope === sc ? " on" : ""}`}
                      onClick={() => {
                        setScope(sc);
                        if (sc === "multi-topic" && multiTopics.length === 0 && singleTopic) setMultiTopics([singleTopic]);
                      }}
                    >
                      {sc === "topic" ? "Single topic" : sc === "multi-topic" ? "Multi-topic" : "Full subject"}
                    </button>
                  ))}
                </div>
              </div>

              {scope === "topic" && (
                <div className="lt-ws__field">
                  <div className="lt-ws__lbl">Topic</div>
                  <select className="lt-ws__select" value={singleTopic} onChange={(e) => setSingleTopic(e.target.value)}>
                    {topics.map((t) => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {scope === "multi-topic" && (
                <div className="lt-ws__field">
                  <div className="lt-ws__lbl">Topics — pick one or more ({multiTopics.length} selected)</div>
                  <div className="lt-ws__chips">
                    {topics.map((t) => (
                      <button key={t.key} type="button" className={`lt-ws__chip${multiTopics.includes(t.key) ? " on" : ""}`} onClick={() => toggleMulti(t.key)}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {scope === "full-subject" && (
                <div className="lt-ws__field">
                  <div className="lt-ws__lbl">Topics in scope ({topics.length})</div>
                  <div className="lt-ws__chips lt-ws__chips--readonly">
                    {topics.map((t) => (
                      <span key={t.key} className="lt-ws__chip lt-ws__chip--static">{t.label}</span>
                    ))}
                  </div>
                </div>
              )}

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

          {/* Sticky mobile action bar */}
          <div className="lt-ws__sticky">
            <div className="lt-ws__stickyprev"><strong>{totalCount} question{totalCount === 1 ? "" : "s"}</strong> · {scopeLabel} · {modeLabel}</div>
            <button type="button" className="lt-ws__gen" onClick={handlePreview} disabled={!!blocker || noQuestions}>
              Preview worksheet →
            </button>
          </div>
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
                <div className="lt-ws__bh">Topic mix ({scope === "full-subject" ? "board weightage" : "even"}{miBoostTopicKey ? " · MI-weighted" : ""})</div>
                {plan.rows.filter((r) => r.allocated > 0).map((r) => (
                  <div key={r.key} className="lt-ws__dist">
                    <span className="lt-ws__distnm">{r.label}</span>
                    <span className="lt-ws__distbar"><span className="lt-ws__distfill" data-w={widthStep(r.allocated / maxAlloc)} /></span>
                    <span className="lt-ws__distct">{r.allocated}</span>
                  </div>
                ))}
              </div>
            )}

            {enrichCount > 0 && miBoostTopicKey && scopeHotspot && (
              <div className="lt-ws__warn">
                <span aria-hidden="true">⚡</span> <strong>Enriched:</strong> {enrichCount} of {totalCount} question{enrichCount === 1 ? "" : "s"} target {scopeHotspot.label} — your weakest in-scope topic, where you&rsquo;ve lost the most marks.
              </div>
            )}
            {enrichCount > 0 && drawnWeakSecs.length > 0 && (
              <div className="lt-ws__warn">
                <span aria-hidden="true">⚡</span> <strong>Enriched:</strong> {enrichCount} of {totalCount} question{enrichCount === 1 ? "" : "s"} target Section{drawnWeakSecs.length === 1 ? "" : "s"} {formatSectionList(drawnWeakSecs)} — where you&rsquo;ve lost the most marks in {scopeLabel}.
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
.lt-ws__mi-toggle { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: hsl(220, 18%, 88%); cursor: pointer; }
.lt-ws__mi.locked .lt-ws__mi-toggle { cursor: not-allowed; }
.lt-ws__mi-toggletext { flex: 1; min-width: 0; line-height: 1.45; }
.lt-ws__mi-toggletext strong { color: #ffffff; }
/* Hard-scope the real checkbox so the global input{width:100%;appearance:none} rule can't balloon it. */
.lt-ws__mi-check {
  width: 18px; height: 18px; min-width: 18px; flex: 0 0 auto;
  margin: 1px 0 0; padding: 0; border: none; border-radius: 0; box-shadow: none;
  appearance: auto; -webkit-appearance: checkbox; background: none;
  accent-color: var(--ws-green); cursor: inherit;
}

/* ── Customise drawer + fields ──────────────────────────────────────────── */
.lt-ws__drawer { background: var(--ws-surface); border: 1px solid var(--ws-line); border-radius: 16px; padding: 18px 20px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 16px; }
.lt-ws__lbl { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ws-muted); margin-bottom: 8px; }

.lt-ws__seg { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--ws-line); border-radius: 10px; overflow: hidden; }
.lt-ws__segbtn { appearance: none; border: none; background: var(--ws-surface); padding: 9px 16px; font-size: 13.5px; cursor: pointer; color: var(--ws-muted); border-right: 1px solid var(--ws-line); font-family: var(--ws-fb); }
.lt-ws__segbtn:last-child { border-right: none; }
.lt-ws__segbtn.on { background: var(--ws-green-soft); color: var(--ws-green-fg); font-weight: 600; }

.lt-ws__select { width: 100%; border: 1px solid var(--ws-line); border-radius: 10px; padding: 11px 14px; font-size: 14px; font-family: var(--ws-fb); color: var(--ws-fg); background: var(--ws-surface); cursor: pointer; }

.lt-ws__chips { display: flex; flex-wrap: wrap; gap: 7px; }
.lt-ws__chips--readonly { padding: 10px 12px; border: 1px dashed var(--ws-line); border-radius: 10px; background: var(--ws-surface-2); }
.lt-ws__chip { appearance: none; border: 1px solid var(--ws-line); background: var(--ws-surface); border-radius: 999px; padding: 6px 13px; font-size: 13px; cursor: pointer; color: var(--ws-muted); font-family: var(--ws-fb); }
.lt-ws__chip.on { background: var(--ws-green-soft); border-color: var(--ws-green-b); color: var(--ws-green-fg); font-weight: 600; }
.lt-ws__chip--static { cursor: default; color: var(--ws-fg); background: var(--ws-surface); }

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

/* FIX B — on DESKTOP the action bar is a slim sticky footer while the build view is
   open, so a Preview CTA stays reachable after the Customise drawer pushes the hero
   off-screen. position:sticky keeps it inside the content column (never overlapping
   the navy shell sidebar); z-index sits well below the history overlay (900). Mobile
   overrides this to the original fixed full-width bar above the bottom nav. */
.lt-ws__sticky {
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  position: sticky; bottom: 12px; z-index: 20; margin-top: 16px;
  background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--ws-line); border-radius: 14px; padding: 10px 10px 10px 16px;
  box-shadow: 0 8px 24px rgba(21, 35, 58, 0.12);
}
.lt-ws__stickyprev { font-size: 12.5px; color: var(--ws-muted); }
.lt-ws__stickyprev strong { color: var(--ws-fg); }
.lt-ws__sticky .lt-ws__gen { width: auto; flex-shrink: 0; }

/* ── Mobile reflow (same markup) ─────────────────────────────────────────── */
@media (max-width: 1023px) {
  .lt-ws { padding-bottom: 110px; }
  .lt-ws__headrow { flex-direction: column; }
  .lt-ws__histbtn { align-self: flex-start; }
  /* The hero's Preview button is hidden in favour of the sticky bar (no duplicate CTA). */
  .lt-ws__herobot .lt-ws__gen { display: none; }
  .lt-ws__herobot .lt-ws__btnt { flex: 1; }
  .lt-ws__pvactions .lt-ws__gen { flex: 1 1 100%; }
  .lt-ws__dlgrid { grid-template-columns: 1fr; }
  .lt-ws__seg { display: flex; width: 100%; }
  .lt-ws__segbtn { flex: 1; padding: 9px 6px; }
  .lt-ws__sticky {
    display: block; position: fixed; left: 0; right: 0; bottom: var(--mob-nav-height, 56px);
    margin-top: 0; border: none; border-top: 1px solid var(--ws-line); border-radius: 0;
    box-shadow: none; padding: 10px 16px; z-index: 30;
    background: rgba(255, 255, 255, 0.97); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  }
  .lt-ws__stickyprev { font-size: 12px; color: var(--ws-muted); text-align: center; margin-bottom: 8px; }
  .lt-ws__stickyprev strong { color: var(--ws-fg); }
  .lt-ws__sticky .lt-ws__gen { width: 100%; }
}
`;
