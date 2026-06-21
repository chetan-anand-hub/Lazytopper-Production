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
  type PersistedWorksheet,
  type PersistedWorksheetQuestion,
} from "../../services/worksheetSessionStore";
import { exportWorksheetPdf } from "./worksheetPdfExport";

/**
 * WorksheetGenerator — PR-E2a: ONE responsive worksheet generator that replaces
 * the desktop + mobile twins (DesktopWorksheetsPage 2278ln + app/Worksheets
 * 509ln). Built to the locked prototype
 * (docs/design/worksheet_generator_LOCKED_prototype_2026-06-20.html) and spec:
 *
 *   • Progressive disclosure — Subject → Scope → Topic(s) → Build mode → compact
 *     preview → Generate, all on one screen.
 *   • Presets PRIMARY; Custom filters TUCKED behind a quiet link.
 *   • Live distribution preview (even / board-weightage / MI-weighted) with HONEST
 *     counts — the shown number is exactly what generation produces.
 *   • Deleted topics never offered (worksheetModel.getTopics).
 *   • Two SEPARATE downloads (questions PDF + answer-key PDF) on Generate.
 *   • The generated question-set + marking schemes persist by worksheetId so the
 *     PR-E2b grade loop can grade later.
 *
 * Class-driven styling via a single scoped <style> block with a pure-CSS
 * @media(max-width:1023px) reflow — SAME markup desktop → 360px, no inline style
 * objects, no JS width branch (the ConceptSpine grammar pattern). The page is
 * shell-agnostic: App wraps it in DesktopShell at desktop width and the global
 * mobile BottomNav handles mobile nav (same convention as ExamTrendsRanked /
 * DesktopTopicHubPage).
 */

type Mode = "preset" | "custom";

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
const DIFFICULTIES: DifficultyChoice[] = ["All", "Easy", "Medium", "Hard"];

// ── Mistake hotspot (real Check & Improve log; no fabricated data) ────────────
const MISTAKE_LOG_PREFIX = "lazytopper.mistakeLogs.v1";

function normalizeLabel(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** The in-scope topic the student has lost the most marks on (last 30 days),
 *  resolved against the supplied (already deleted-filtered) topic list. */
function readMistakeHotspot(uid: string | null | undefined, topics: WorksheetTopic[]): WorksheetTopic | null {
  if (!uid || typeof window === "undefined") return null;
  let entries: Array<{ topic?: string; subject?: string; timestamp?: string; marksLost?: number }> = [];
  try {
    const raw = window.localStorage.getItem(`${MISTAKE_LOG_PREFIX}:${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    entries = parsed;
  } catch {
    return null;
  }
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const lost = new Map<string, number>();
  for (const e of entries) {
    const t = e.timestamp ? new Date(e.timestamp).getTime() : NaN;
    if (Number.isFinite(t) && t < cutoff) continue;
    const label = normalizeLabel(String(e.topic || ""));
    if (!label) continue;
    lost.set(label, (lost.get(label) ?? 0) + (Number(e.marksLost) || 0));
  }
  let best: WorksheetTopic | null = null;
  let bestLost = 0;
  for (const t of topics) {
    const v = lost.get(normalizeLabel(t.label)) ?? 0;
    if (v > bestLost) {
      bestLost = v;
      best = t;
    }
  }
  return bestLost > 0 ? best : null;
}

/** Reject any non-relative / protocol-bearing redirect (safe-redirect doctrine). */
function safeInternalReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return null;
  return value;
}

export default function WorksheetGenerator() {
  const { user } = useAuth();
  const ctx = useSubjectContext();
  const location = useLocation();

  // FIX 3 — origin-aware back navigation. The worksheet path carries `returnTo`
  // from its caller (e.g. TopicActions → buildDesktopWorksheetPath, which sets
  // returnTo). Honor it (validated) so "Back" returns where the student came from
  // — on BOTH the build and the in-place generated view — instead of always the
  // generic practice hub. Default to /practice-hub when no safe origin is given.
  const backHref = useMemo(() => {
    const rt = new URLSearchParams(location.search).get("returnTo");
    return safeInternalReturnTo(rt) ?? "/practice-hub";
  }, [location.search]);
  const backLabel = backHref === "/practice-hub" ? "Back to Practice" : "Back";

  // Item 3 — MI personalisation needs a real (non-local) signed-in account that
  // has recorded mistakes. Distinguish "signed out" (→ route to login, returning
  // here after) from "signed in but no in-scope hotspot yet" (→ explain how to
  // unlock), so the locked state never dead-ends or misleads.
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
  const [showCustom, setShowCustom] = useState(false);
  const [customSections, setCustomSections] = useState<SectionId[]>([...ALL_SECTIONS]);
  const [customDifficulty, setCustomDifficulty] = useState<DifficultyChoice>("All");
  const [customCount, setCustomCount] = useState(20);
  const [miEnrich, setMiEnrich] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"build" | "generated">("build");
  const [generated, setGenerated] = useState<PersistedWorksheet | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  // E2a.2 — which PDF (if any) is currently being generated for download.
  const [downloading, setDownloading] = useState<"questions" | "answers" | null>(null);

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

  // MI hotspot for the active subject/stream.
  const hotspot = useMemo(
    () => readMistakeHotspot(user?.uid, topics),
    [user?.uid, topicKeysSig], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const hotspotInScope =
    !!hotspot && inScopeTopics.some((t) => t.key === hotspot.key) && scope !== "topic";
  const canEnrich = hotspotInScope;
  const miBoostTopicKey = miEnrich && hotspotInScope ? hotspot!.key : null;

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
  const totalCount = plan?.totalAllocated ?? 0;
  const shortfall = !!plan && plan.totalAllocated < effCount;

  function switchSubject(s: LTSubjectKey) {
    setSubject(s);
    if (s === "Maths") setStream("All");
    setMiEnrich(false);
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

  function handleGenerate() {
    setError(null);
    setDownloadError(null);
    if (blocker) {
      setError(blocker);
      return;
    }
    setGenerating(true);
    try {
      const p = plan ?? planWorksheet({ subject, scope, topics: inScopeTopics, sections: sectionsArg, difficulty: effDifficulty, requested: effCount, miBoostTopicKey });
      const qs = generateFromPlan(p);
      if (qs.length === 0) {
        setError(`No questions found for ${sectionScopeLabel(effSections)} in this scope. Try a different topic, widen the section filter, or pick "Board exam mix".`);
        setGenerating(false);
        return;
      }
      // Order by section A→E for numbering + PDF grouping.
      const ordered = [...qs].sort((a, b) => (SECTION_RANK[a.section] ?? 9) - (SECTION_RANK[b.section] ?? 9));
      const labelFor = (key: string) => topics.find((t) => t.key === key)?.label ?? key;
      const questions: PersistedWorksheetQuestion[] = ordered.map((q, i) => ({
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
      const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
      const ws: PersistedWorksheet = {
        worksheetId: mintWorksheetId(),
        createdAt: new Date().toISOString(),
        title: `${scopeLabel} — ${modeLabel}`,
        subject: String(subject),
        grade: "10",
        sectionFilter: sectionScopeLabel(effSections),
        totalMarks,
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
      // Renders the worksheet (real math via MathText/KaTeX) into a detached
      // offscreen node and rasterises it into a jsPDF FILE — worksheet only,
      // never the app page. The persisted `generated.questions` array is the
      // single source, so the PDF count matches the header count exactly.
      await exportWorksheetPdf(generated, kind);
    } catch {
      setDownloadError("Couldn’t build the PDF — please try again.");
    } finally {
      setDownloading(null);
    }
  }

  // ── Generated-state derived breakdowns (real counts) ──────────────────────
  const genSectionRows = useMemo(() => {
    if (!generated) return [];
    const counts = new Map<string, number>();
    for (const q of generated.questions) counts.set(q.section, (counts.get(q.section) ?? 0) + 1);
    return ALL_SECTIONS.filter((s) => counts.has(s)).map((s) => ({ section: s, count: counts.get(s) ?? 0 }));
  }, [generated]);

  const maxAlloc = plan ? Math.max(1, ...plan.rows.map((r) => r.allocated)) : 1;

  return (
    <div className="lt-ws">
      <style>{WS_CSS}</style>

      {/* FIX (Item 3) — view-aware Back: on the generated view, Back returns to
          the generator (same component, build-form state intact), NOT to the
          returnTo origin; on the build view it follows returnTo (default hub). */}
      {view === "generated" ? (
        <button type="button" className="lt-ws__back" onClick={() => setView("build")}>
          <span aria-hidden="true">←</span>
          <span>Back to generator</span>
        </button>
      ) : (
        <Link to={backHref} className="lt-ws__back">
          <span aria-hidden="true">←</span>
          <span>{backLabel}</span>
        </Link>
      )}

      {view === "build" ? (
        <>
          <header className="lt-ws__head">
            <div className="lt-ws__crumb">Practice · Worksheet</div>
            <h1 className="lt-ws__title">What worksheet do you want?</h1>
            <p className="lt-ws__lead">Pick what to cover and a build mode. Nothing generates until you press Generate — the preview shows exactly what will come out.</p>
          </header>

          <div className="lt-ws__grid">
            {/* LEFT — build column */}
            <div className="lt-ws__build">
              {/* What to cover */}
              <section className="lt-ws__card">
                <h2 className="lt-ws__ct">What to cover</h2>

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

                {/* Topic picker */}
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
              </section>

              {/* Build mode */}
              <section className="lt-ws__card">
                <h2 className="lt-ws__ct">Build mode</h2>
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
                  {usingCustom ? "▾" : "▸"} Custom filters — set your own sections, difficulty &amp; count
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

              </section>
            </div>

            {/* RIGHT — compact preview */}
            <aside className="lt-ws__previewwrap">
              <div className="lt-ws__preview">
                <div className="lt-ws__pvh">Will be generated</div>

                <div className="lt-ws__pvchips">
                  <span className="lt-ws__pvchip">{scope === "topic" ? "1 topic" : scope === "multi-topic" ? `${inScopeTopics.length} topics` : `${topics.length} topics`}</span>
                  <span className="lt-ws__pvchip">{sectionScopeLabel(effSections)}</span>
                  <span className="lt-ws__pvchip">{effDifficulty === "All" ? "All difficulty" : effDifficulty}</span>
                  <span className="lt-ws__pvchip lt-ws__pvchip--count">{totalCount} Q</span>
                </div>

                {/* Distribution (multi / full only) */}
                {plan && plan.rows.length > 1 && (
                  <div className="lt-ws__pvbreak">
                    <div className="lt-ws__bh">Distribution ({scope === "full-subject" ? "board weightage" : "even"}{miBoostTopicKey ? " · MI-weighted" : ""})</div>
                    {plan.rows.filter((r) => r.allocated > 0).map((r) => (
                      <div key={r.key} className="lt-ws__dist">
                        <span className="lt-ws__distnm">{r.label}</span>
                        <span className="lt-ws__distbar"><span className="lt-ws__distfill" data-w={Math.round((r.allocated / maxAlloc) * 20) * 5} /></span>
                        <span className="lt-ws__distct">{r.allocated}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* MI enrich (Item 2 + 4) — placed in the right preview, next to the
                    live Distribution it controls (toggle on → distribution re-weights
                    toward the weak topic), so the cause-and-effect is visible. Always
                    VISIBLE + explained; the real <input> is hard-scoped so the global
                    input{width:100%;appearance:none} rule can't balloon it. Three
                    honest states: signed-out → login (returns here); enriched →
                    toggle; signed-in-but-no-hotspot → how-to-unlock message. */}
                <div className={`lt-ws__mi${canEnrich ? "" : " locked"}`} data-testid="mi-enrich-box">
                  <div className="lt-ws__mi-title"><span aria-hidden="true">✨</span> Personalise this worksheet</div>
                  <p className="lt-ws__mi-desc">
                    Weight it toward the topics you&rsquo;ve lost the most marks on (from your Mistake Intelligence) — it re-weights the distribution toward your weak topics, and these worksheets feed your Me / Progress growth.
                  </p>
                  {!isSignedIn ? (
                    <Link to={loginHref} className="lt-ws__mi-cta">Sign in to personalise →</Link>
                  ) : canEnrich ? (
                    <label className="lt-ws__mi-toggle" title={`Weight this worksheet toward ${hotspot?.label} — your most marked-down in-scope topic.`}>
                      <input
                        type="checkbox"
                        className="lt-ws__mi-check"
                        checked={miEnrich}
                        onChange={(e) => setMiEnrich(e.target.checked)}
                      />
                      <span className="lt-ws__mi-toggletext">
                        Enrich from Mistake Intelligence — weight toward <strong>{hotspot?.label}</strong>.
                      </span>
                    </label>
                  ) : (
                    <p className="lt-ws__mi-hint">
                      Grade a worksheet or use Check &amp; Improve first — then pick a multi-topic or full-subject scope, and this focuses the worksheet on the topics you&rsquo;ve lost the most marks on.
                    </p>
                  )}
                </div>

                {/* Sections in scope */}
                <div className="lt-ws__pvbreak">
                  <div className="lt-ws__bh">Sections in scope</div>
                  <div className="lt-ws__pvsecs">
                    {ALL_SECTIONS.filter((s) => effSections === "All" || (effSections as string[]).includes(s)).map((s) => (
                      <span key={s} className="lt-ws__pvsec">{SECTION_MARK_LABEL[s]}</span>
                    ))}
                  </div>
                </div>

                {shortfall && !blocker && (
                  <div className="lt-ws__note lt-ws__note--warn">
                    Only {plan?.totalAllocated} unique question{plan?.totalAllocated === 1 ? "" : "s"} match this scope (you asked for {effCount}). The worksheet uses the real available set — honest counts, no padding.
                  </div>
                )}

                {error && <div className="lt-ws__note lt-ws__note--err" role="alert">{error}</div>}

                <button type="button" className="lt-ws__gen" onClick={handleGenerate} disabled={generating || !!blocker} title={blocker ?? undefined}>
                  {generating ? "Generating…" : "Generate worksheet →"}
                </button>
                {blocker && <div className="lt-ws__note">{blocker}</div>}
                <p className="lt-ws__pvnote">Solve on paper, then download the answer key to check — or (soon) upload one PDF to get it graded with solutions.</p>
              </div>
            </aside>
          </div>

          {/* Sticky mobile generate bar */}
          <div className="lt-ws__sticky">
            <div className="lt-ws__stickyprev"><strong>{totalCount} questions</strong> · {scopeLabel} · {modeLabel}</div>
            <button type="button" className="lt-ws__gen" onClick={handleGenerate} disabled={generating || !!blocker}>
              {generating ? "Generating…" : "Generate worksheet →"}
            </button>
          </div>
        </>
      ) : (
        // ── GENERATED ──────────────────────────────────────────────────────
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

          <section className="lt-ws__card">
            <h2 className="lt-ws__ct">Check your answers</h2>
            <p className="lt-ws__lead">Solved it on paper? Upload your answer to Check &amp; Improve for real CBSE-style grading. (One-PDF whole-worksheet grading is coming next.)</p>
            <Link to="/check-improve?source=worksheet" className="lt-ws__uplink">Upload your answers →</Link>
            <p className="lt-ws__pvnote">Tip: label each answer with its question number (Q1, Q2 …) — it helps us match and grade each answer accurately.</p>
          </section>

          <button type="button" className="lt-ws__buildanother" onClick={() => { setView("build"); setGenerated(null); }}>
            ← Build another worksheet
          </button>
        </div>
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
  --ws-fd: "Fraunces", Georgia, serif;
  --ws-fb: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-family: var(--ws-fb);
  color: var(--ws-fg);
  max-width: 1180px;
  margin: 0 auto;
  padding: 22px clamp(16px, 4vw, 32px) 64px;
}
.lt-ws__back {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 600; color: var(--ws-muted);
  text-decoration: none; margin-bottom: 14px;
  /* works identically whether rendered as <a> (build) or <button> (generated) */
  appearance: none; border: none; background: none; padding: 0; cursor: pointer;
  font-family: var(--ws-fb);
}
.lt-ws__back:hover { color: var(--ws-fg); }
.lt-ws__head { margin-bottom: 18px; }
.lt-ws__crumb { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ws-green-fg); margin-bottom: 6px; }
.lt-ws__title { font-family: var(--ws-fd); font-size: 25px; font-weight: 600; margin: 0 0 6px; letter-spacing: -0.01em; }
.lt-ws__lead { font-size: 13.5px; color: var(--ws-muted); margin: 0; max-width: 620px; line-height: 1.55; }

.lt-ws__grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 22px; align-items: start; }
.lt-ws__build { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

.lt-ws__card { background: var(--ws-surface); border: 1px solid var(--ws-line); border-radius: 16px; padding: 18px 20px; }
.lt-ws__ct { font-family: var(--ws-fd); font-weight: 600; font-size: 17px; margin: 0 0 14px; }
.lt-ws__field { margin-bottom: 16px; }
.lt-ws__field:last-child { margin-bottom: 0; }
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

.lt-ws__customlink { appearance: none; border: none; background: none; display: flex; align-items: center; gap: 7px; margin-top: 12px; font-size: 13px; color: var(--ws-green-fg); cursor: pointer; font-weight: 600; font-family: var(--ws-fb); padding: 0; }
.lt-ws__custom { margin-top: 12px; border-top: 1px solid var(--ws-line-soft); padding-top: 14px; display: flex; flex-direction: column; gap: 14px; }
.lt-ws__range { width: 100%; accent-color: var(--ws-green); }

/* Item 2 — MI-enrich: a VISIBLE, inviting, contained field inside the build-mode
   card. Green-tinted when available, neutral when locked; always present so the
   feature is discoverable. */
.lt-ws__mi { margin: 10px 0; border: 1px solid var(--ws-green-b); border-radius: 12px; padding: 12px 13px; background: var(--ws-green-soft); }
.lt-ws__mi.locked { border-color: var(--ws-line); background: var(--ws-surface-2); }
.lt-ws__mi-cta { display: inline-block; margin-top: 2px; border: 1px solid var(--ws-green); background: var(--ws-green); color: #fff; border-radius: 9px; padding: 8px 13px; font-size: 12.5px; font-weight: 600; text-decoration: none; }
.lt-ws__mi-cta:hover { background: hsl(152, 60%, 38%); }
.lt-ws__mi-hint { margin: 0; font-size: 12px; color: var(--ws-muted); line-height: 1.45; }
.lt-ws__mi-title { display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 700; color: var(--ws-green-fg); }
.lt-ws__mi.locked .lt-ws__mi-title { color: var(--ws-fg); }
.lt-ws__mi-desc { margin: 5px 0 11px; font-size: 12px; color: var(--ws-muted); line-height: 1.5; }
.lt-ws__mi-toggle { display: flex; align-items: flex-start; gap: 9px; font-size: 12.5px; color: var(--ws-fg); cursor: pointer; }
.lt-ws__mi.locked .lt-ws__mi-toggle { cursor: not-allowed; color: var(--ws-muted); }
.lt-ws__mi-toggletext { flex: 1; min-width: 0; line-height: 1.45; }
/* Hard-scope the real checkbox so the global input{width:100%;appearance:none}
   rule cannot balloon it into a floating empty box. */
.lt-ws__mi-check {
  width: 18px; height: 18px; min-width: 18px; flex: 0 0 auto;
  margin: 1px 0 0; padding: 0; border: none; border-radius: 0; box-shadow: none;
  appearance: auto; -webkit-appearance: checkbox; background: none;
  accent-color: var(--ws-green); cursor: inherit;
}

.lt-ws__previewwrap { min-width: 0; }
.lt-ws__preview { background: var(--ws-surface); border: 1px solid var(--ws-line); border-radius: 16px; padding: 16px; position: sticky; top: 18px; }
.lt-ws__pvh { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ws-green-fg); margin-bottom: 10px; }
.lt-ws__pvchips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; }
.lt-ws__pvchip { display: inline-block; background: var(--ws-green-soft); border: 1px solid var(--ws-green-b); color: var(--ws-green-fg); font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 14px; }
.lt-ws__pvchip--count { background: var(--ws-green); border-color: var(--ws-green); color: #fff; }

.lt-ws__pvbreak { background: var(--ws-surface-2); border-radius: 10px; padding: 10px 12px; margin: 10px 0; }
.lt-ws__bh { font-size: 10.5px; font-weight: 700; color: var(--ws-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }
.lt-ws__dist { display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 6px; }
.lt-ws__dist:last-child { margin-bottom: 0; }
.lt-ws__distnm { width: 92px; color: var(--ws-muted); flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lt-ws__distbar { flex: 1; height: 7px; background: var(--ws-line); border-radius: 4px; overflow: hidden; }
.lt-ws__distfill { display: block; height: 100%; background: var(--ws-green); width: 0; }
.lt-ws__distct { width: 20px; text-align: right; font-weight: 600; color: var(--ws-fg); }
.lt-ws__pvsecs { display: flex; flex-direction: column; gap: 4px; }
.lt-ws__pvsec { font-size: 12px; color: var(--ws-muted); }

.lt-ws__note { font-size: 12px; line-height: 1.5; border-radius: 9px; padding: 9px 11px; margin: 8px 0; color: var(--ws-muted); background: var(--ws-surface-2); }
.lt-ws__note--warn { background: var(--ws-amber-bg); border: 1px solid var(--ws-amber-b); color: var(--ws-amber-fg); }
.lt-ws__note--err { background: hsl(0, 75%, 97%); border: 1px solid hsl(0, 70%, 88%); color: hsl(0, 65%, 38%); }

.lt-ws__gen { width: 100%; border: none; background: var(--ws-green); color: #fff; border-radius: 10px; padding: 13px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: var(--ws-fd); margin-top: 8px; }
.lt-ws__gen:hover { background: hsl(152, 60%, 38%); }
.lt-ws__gen:disabled { background: hsl(152, 25%, 78%); cursor: not-allowed; }
.lt-ws__pvnote { font-size: 11px; color: var(--ws-hint); margin: 10px 0 0; line-height: 1.5; }

.lt-ws__sticky { display: none; }

/* ── Generated state ─────────────────────────────────────────────────── */
.lt-ws__generated { display: flex; flex-direction: column; gap: 16px; max-width: 760px; }
.lt-ws__gtick { width: 44px; height: 44px; border-radius: 50%; background: var(--ws-green-soft); color: var(--ws-green-fg); display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; margin-bottom: 10px; }
.lt-ws__gsecs { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 14px; }
.lt-ws__dlgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.lt-ws__dl { display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--ws-line); border-radius: 10px; padding: 15px; cursor: pointer; background: var(--ws-surface); text-align: left; font-family: var(--ws-fb); }
.lt-ws__dl--primary { border-color: var(--ws-green-b); background: var(--ws-green-soft); }
.lt-ws__dlt { font-size: 14px; font-weight: 600; color: var(--ws-fg); }
.lt-ws__dld { font-size: 12px; color: var(--ws-muted); line-height: 1.45; }
.lt-ws__uplink { display: inline-block; margin: 4px 0 10px; border: 1px solid var(--ws-green); background: var(--ws-green-soft); color: var(--ws-green-fg); border-radius: 9px; padding: 9px 15px; font-size: 13px; font-weight: 600; text-decoration: none; }
.lt-ws__buildanother { appearance: none; border: 1px solid var(--ws-line); background: var(--ws-surface); color: var(--ws-fg); border-radius: 10px; padding: 11px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--ws-fb); }

/* distribution fill widths via data-w (0..100, step 5) — avoids inline styles */
.lt-ws__distfill[data-w="0"]{width:0}
.lt-ws__distfill[data-w="5"]{width:5%}.lt-ws__distfill[data-w="10"]{width:10%}.lt-ws__distfill[data-w="15"]{width:15%}
.lt-ws__distfill[data-w="20"]{width:20%}.lt-ws__distfill[data-w="25"]{width:25%}.lt-ws__distfill[data-w="30"]{width:30%}
.lt-ws__distfill[data-w="35"]{width:35%}.lt-ws__distfill[data-w="40"]{width:40%}.lt-ws__distfill[data-w="45"]{width:45%}
.lt-ws__distfill[data-w="50"]{width:50%}.lt-ws__distfill[data-w="55"]{width:55%}.lt-ws__distfill[data-w="60"]{width:60%}
.lt-ws__distfill[data-w="65"]{width:65%}.lt-ws__distfill[data-w="70"]{width:70%}.lt-ws__distfill[data-w="75"]{width:75%}
.lt-ws__distfill[data-w="80"]{width:80%}.lt-ws__distfill[data-w="85"]{width:85%}.lt-ws__distfill[data-w="90"]{width:90%}
.lt-ws__distfill[data-w="95"]{width:95%}.lt-ws__distfill[data-w="100"]{width:100%}

/* ── Mobile reflow (same markup) ─────────────────────────────────────── */
@media (max-width: 1023px) {
  .lt-ws { padding-bottom: 110px; }
  .lt-ws__grid { grid-template-columns: 1fr; }
  .lt-ws__preview { position: static; }
  /* The build-column Generate button is hidden in favour of the sticky bar. */
  .lt-ws__previewwrap .lt-ws__gen { display: none; }
  .lt-ws__previewwrap .lt-ws__pvnote { display: none; }
  .lt-ws__sticky {
    display: block; position: fixed; left: 0; right: 0; bottom: var(--mob-nav-height, 56px);
    background: rgba(255,255,255,0.97); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    border-top: 1px solid var(--ws-line); padding: 10px 16px; z-index: 30;
  }
  .lt-ws__stickyprev { font-size: 12px; color: var(--ws-muted); text-align: center; margin-bottom: 8px; }
  .lt-ws__stickyprev strong { color: var(--ws-fg); }
  .lt-ws__sticky .lt-ws__gen { margin-top: 0; }
  .lt-ws__dlgrid { grid-template-columns: 1fr; }
  .lt-ws__seg { display: flex; width: 100%; }
  .lt-ws__segbtn { flex: 1; padding: 9px 6px; }
}
`;
