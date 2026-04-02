import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { getCanonicalChapters, toCanonicalSubjectId } from "../data/syllabus/cbse10Canonical";
import { getTopicV2Content, normalizeTopicKey } from "../utils/topicHubV2Store";
import { generatePracticeSet } from "../data/practiceSetGenerator";
import JourneyStrip from "../components/ux/JourneyStrip";
import ConceptTeachDrawer, { type ConceptTeachContext } from "../components/tutor/ConceptTeachDrawer";
import {
  navigateToPractice,
} from "../navigation/practiceNavigation";
import {
  ensureTopicMasterySnapshot,
  loadTopicMasterySnapshot,
  saveTopicMasterySnapshot,
  markNodeLearning,
  getMasteryCounts,
  type TopicHubMasterySnapshot,
} from "../services/topicHubMastery";
import { trackUxEvent } from "../services/uxTelemetry";
import type { V2Definition, V2Example } from "../utils/getTopicV2Content";

type SubjectKey = "maths" | "science";

function asSubjectKey(raw: string): SubjectKey {
  return String(raw || "").toLowerCase().includes("science") ? "science" : "maths";
}

function defaultTopicKeyFor(subject: SubjectKey): string {
  const canonicalSubject = toCanonicalSubjectId(subject);
  const chapters = getCanonicalChapters(canonicalSubject);
  return chapters[0]?.canonicalSlug || (subject === "science" ? "chemical-reactions-and-equations" : "real-numbers");
}

function buildTopicOptions(subject: SubjectKey) {
  const canonicalSubject = toCanonicalSubjectId(subject);
  const chapters = getCanonicalChapters(canonicalSubject);
  return chapters.map((ch) => ({
    key: ch.canonicalSlug,
    label: ch.title,
  }));
}

type RecentTopicRecord = {
  grade: string;
  subject: string;
  topicKey: string;
  topicName?: string;
  path: string;
  updatedAt: string;
};

const TOPICHUB_LAST_ROUTE_KEY = "lazytopper.topicHub.lastRoute.v1";
const TOPICHUB_RECENT_TOPICS_KEY = "lazytopper.topicHub.recentTopics.v1";
const MAX_RECENT_TOPICS = 10;

function upsertRecentTopic(list: RecentTopicRecord[], entry: RecentTopicRecord): RecentTopicRecord[] {
  const filtered = list.filter((r) => r.topicKey !== entry.topicKey);
  return [entry, ...filtered].slice(0, MAX_RECENT_TOPICS);
}

type LessonStep = "overview" | "concepts" | "exam-patterns" | "quiz" | "practice";

const STEP_META: Record<LessonStep, { label: string; icon: string }> = {
  overview: { label: "Overview", icon: "📖" },
  concepts: { label: "Key Concepts", icon: "💡" },
  "exam-patterns": { label: "Exam Patterns", icon: "🎯" },
  quiz: { label: "Quick Quiz", icon: "⚡" },
  practice: { label: "Practice", icon: "🏆" },
};

const STEPS: LessonStep[] = ["overview", "concepts", "exam-patterns", "quiz", "practice"];

export default function TopicHub() {
  const params = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const grade = String(params.grade || sp.get("grade") || "10");
  const subject = asSubjectKey(String(params.subject || sp.get("subject") || "maths"));
  const subjectTitle = subject === "science" ? "Science" : "Maths";

  const rawTopicKey =
    (params as Record<string, string | undefined>).topicKey ||
    sp.get("topicKey") ||
    sp.get("topic") ||
    sp.get("k") ||
    "";

  const topicKey = normalizeTopicKey(rawTopicKey) || defaultTopicKeyFor(subject);
  const navState = (location.state as { back?: string; backLabel?: string } | null) || null;
  const backTo = String(navState?.back || `/trends/${grade}/${subject}`);
  const backLabel = String(navState?.backLabel || "Back to trends");

  useEffect(() => {
    const hasRouteTopicKey = Boolean((params as Record<string, string | undefined>).topicKey);
    if (!hasRouteTopicKey) {
      const target = `/topic-hub/${grade}/${subject}/${topicKey}`;
      if (window.location.pathname !== target) navigate(target, { replace: true });
    }
  }, [grade, subject, topicKey, navigate, params]);

  const v2 = useMemo(() => getTopicV2Content(topicKey), [topicKey]);
  const title = String(v2?.topicName || topicKey || "").trim() || "Topic";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: RecentTopicRecord = {
      grade: String(grade),
      subject: subjectTitle,
      topicKey: String(topicKey),
      topicName: title,
      path: `/topic-hub/${grade}/${subject}/${topicKey}`,
      updatedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(TOPICHUB_LAST_ROUTE_KEY, JSON.stringify(payload));
      const recentRaw = window.localStorage.getItem(TOPICHUB_RECENT_TOPICS_KEY);
      const recent = recentRaw ? (JSON.parse(recentRaw) as RecentTopicRecord[]) : [];
      const nextRecent = upsertRecentTopic(Array.isArray(recent) ? recent : [], payload);
      window.localStorage.setItem(TOPICHUB_RECENT_TOPICS_KEY, JSON.stringify(nextRecent));
    } catch { /* ignore */ }
  }, [grade, subjectTitle, title, topicKey]);

  const topicOptions = useMemo(() => buildTopicOptions(subject), [subject]);
  const onChangeTopic = useCallback(
    (nextKey: string) => {
      const k = normalizeTopicKey(nextKey);
      if (!k) return;
      navigate(`/topic-hub/${grade}/${subject}/${k}`);
    },
    [navigate, grade, subject]
  );

  const overview = useMemo(() => {
    const raw = v2?.overview;
    return Array.isArray(raw) ? raw.map((s) => String(s || "").trim()).filter(Boolean) : [];
  }, [v2]);

  const definitions = useMemo(() => {
    const raw = v2?.definitions;
    return Array.isArray(raw) ? raw.filter((d): d is V2Definition => Boolean(d?.title)) : [];
  }, [v2]);

  const examPatterns = useMemo(() => {
    const raw = v2?.examPatterns;
    return Array.isArray(raw) ? raw.map((s) => String(s || "").trim()).filter(Boolean) : [];
  }, [v2]);

  const markingTips = useMemo(() => {
    const raw = v2?.markingTips;
    return Array.isArray(raw) ? raw.map((s) => String(s || "").trim()).filter(Boolean) : [];
  }, [v2]);

  const scoreTips = useMemo(() => {
    const raw = v2?.scoreTips;
    return Array.isArray(raw) ? raw.map((s) => String(s || "").trim()).filter(Boolean) : [];
  }, [v2]);

  const quickQuizFromPractice = useMemo(() => {
    const practiceTopicKey = normalizeTopicKey(topicKey) || topicKey;
    const practiceSet = generatePracticeSet({
      subject: subject as "Maths" | "Science",
      topicKey: practiceTopicKey,
      totalQuestions: 5,
      shuffle: true,
    });
    return (practiceSet.questions || [])
      .map((q, idx: number) => {
        const text = String(q?.questionText ?? "").trim();
        if (!text) return null;
        return { title: `Q${idx + 1}`, question: text } as V2Example;
      })
      .filter(Boolean) as V2Example[];
  }, [subject, topicKey]);

  const rawQuickQuiz = useMemo(() => {
    const raw = (v2 as Record<string, unknown> | null)?.quickQuiz;
    return Array.isArray(raw) ? raw.filter((q): q is V2Example => Boolean(q?.question)) : [];
  }, [v2]);

  const quickQuiz = quickQuizFromPractice.length
    ? quickQuizFromPractice.slice(0, 5)
    : rawQuickQuiz.length
      ? rawQuickQuiz.slice(0, 5)
      : [];

  const tier = String(v2?.tier || "good-to-do");

  const [currentStep, setCurrentStep] = useState<LessonStep>("overview");
  const [expandedQuizIdx, setExpandedQuizIdx] = useState<number | null>(null);
  const [teachDrawerOpen, setTeachDrawerOpen] = useState(false);
  const [teachContext, setTeachContext] = useState<ConceptTeachContext>({
    topicKey,
    subject: subjectTitle,
    questionText: "",
  });

  useEffect(() => {
    setCurrentStep("overview");
    setExpandedQuizIdx(null);
  }, [topicKey]);

  const nodeIds = useMemo(() => definitions.map((_, i) => `concept-${i}`), [definitions]);

  const [topicMastery, setTopicMastery] = useState<TopicHubMasterySnapshot>(() =>
    loadTopicMasterySnapshot(topicKey)
  );
  useEffect(() => {
    setTopicMastery(loadTopicMasterySnapshot(topicKey));
  }, [topicKey]);

  const masteryCounts = useMemo(
    () => getMasteryCounts(nodeIds, topicMastery),
    [nodeIds, topicMastery]
  );

  const masteryPercent = masteryCounts.total > 0
    ? Math.round((masteryCounts.mastered / masteryCounts.total) * 100)
    : 0;

  const updateTopicMastery = useCallback(
    (updater: (prev: TopicHubMasterySnapshot) => TopicHubMasterySnapshot) => {
      setTopicMastery((prev) => {
        const base = ensureTopicMasterySnapshot(topicKey, prev);
        const next = ensureTopicMasterySnapshot(topicKey, updater(base));
        saveTopicMasterySnapshot(next, topicKey);
        return next;
      });
    },
    [topicKey]
  );

  const openTeachDrawer = useCallback(
    (concept: string, questionText: string, subtopic?: string) => {
      setTeachContext({
        topicKey,
        subject: subjectTitle,
        questionText,
        subtopic,
        concept,
      });
      setTeachDrawerOpen(true);
      const nodeId = `concept-${definitions.findIndex((d) => d.title === concept)}`;
      if (nodeId !== "concept--1") {
        updateTopicMastery((snap) => markNodeLearning(snap, nodeId));
      }
      trackUxEvent("topichub_open_practice", "TopicHub", { topicKey, concept });
    },
    [topicKey, subjectTitle, definitions, updateTopicMastery]
  );

  const goToPractice = useCallback(() => {
    trackUxEvent("topichub_open_practice", "TopicHub", { topicKey });
    navigateToPractice(navigate, {
      grade,
      subject: subjectTitle as "Maths" | "Science",
      topicKey,
      topicName: title,
      backPath: `/topic-hub/${grade}/${subject}/${topicKey}`,
      backLabel: `Back to ${title}`,
      source: "topichub",
    });
  }, [grade, navigate, subject, subjectTitle, title, topicKey]);

  const currentStepIdx = STEPS.indexOf(currentStep);
  const canGoNext = currentStepIdx < STEPS.length - 1;
  const canGoPrev = currentStepIdx > 0;

  const tierColors: Record<string, { bg: string; text: string; label: string }> = {
    "must-crack": { bg: "#fef2f2", text: "#dc2626", label: "Must Crack" },
    "high-roi": { bg: "#fffbeb", text: "#d97706", label: "High ROI" },
    "good-to-do": { bg: "#f0fdf4", text: "#16a34a", label: "Good to Do" },
  };
  const tierStyle = tierColors[tier] || tierColors["good-to-do"];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "16px 16px 80px" }}>

        <JourneyStrip current="topichub" grade={grade} subject={subjectTitle} topic={topicKey} />

        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => navigate(backTo)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "0.85rem", color: "#6366f1", fontWeight: 500,
              padding: "4px 0",
            }}
          >
            ← {backLabel}
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{
              fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: 0,
              lineHeight: 1.3,
            }}>
              {title}
            </h1>
            <span style={{
              fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px",
              borderRadius: 999, background: tierStyle.bg, color: tierStyle.text,
            }}>
              {tierStyle.label}
            </span>
          </div>

          <div style={{ marginTop: 8 }}>
            <select
              value={topicKey}
              onChange={(e) => onChangeTopic(e.target.value)}
              style={{
                padding: "6px 12px", borderRadius: 10, border: "1px solid #e2e8f0",
                fontSize: "0.82rem", color: "#475569", background: "#fff",
                cursor: "pointer",
              }}
            >
              {topicOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{
          marginTop: 16, background: "#fff", borderRadius: 16, padding: "12px 16px",
          border: "1px solid #e2e8f0",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
              Progress
            </span>
            <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
              {masteryCounts.mastered}/{masteryCounts.total} concepts mastered
            </span>
          </div>
          <div style={{
            marginTop: 8, height: 8, borderRadius: 999, background: "#f1f5f9",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 999, transition: "width 0.4s ease",
              width: `${masteryPercent}%`,
              background: masteryPercent >= 80
                ? "linear-gradient(90deg, #22c55e, #16a34a)"
                : masteryPercent >= 40
                  ? "linear-gradient(90deg, #3b82f6, #6366f1)"
                  : "linear-gradient(90deg, #94a3b8, #64748b)",
            }} />
          </div>
        </div>

        <div style={{
          marginTop: 20, display: "flex", gap: 6, overflowX: "auto",
          paddingBottom: 4,
        }}>
          {STEPS.map((step, idx) => {
            const meta = STEP_META[step];
            const isActive = step === currentStep;
            const isCompleted = idx < currentStepIdx;
            return (
              <button
                key={step}
                type="button"
                onClick={() => setCurrentStep(step)}
                style={{
                  flex: "0 0 auto",
                  padding: "8px 14px",
                  borderRadius: 12,
                  border: isActive ? "2px solid #6366f1" : "1px solid #e2e8f0",
                  background: isActive ? "#eef2ff" : isCompleted ? "#f0fdf4" : "#fff",
                  color: isActive ? "#4338ca" : isCompleted ? "#16a34a" : "#64748b",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s",
                }}
              >
                {meta.icon} {meta.label}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 16 }}>

          {currentStep === "overview" && (
            <div style={{ display: "grid", gap: 12 }}>
              {overview.length > 0 ? overview.map((line, idx) => (
                <div key={idx} style={{
                  background: "#fff", borderRadius: 14, padding: "14px 18px",
                  border: "1px solid #e2e8f0", fontSize: "0.88rem", color: "#334155",
                  lineHeight: 1.6,
                }}>
                  {line}
                </div>
              )) : (
                <div style={{
                  background: "#fff", borderRadius: 14, padding: "20px 18px",
                  border: "1px solid #e2e8f0", textAlign: "center", color: "#94a3b8",
                }}>
                  No overview available for this topic yet.
                </div>
              )}
              {scoreTips.length > 0 && (
                <div style={{
                  background: "linear-gradient(135deg, #eff6ff, #f5f3ff)",
                  borderRadius: 14, padding: "16px 18px",
                  border: "1px solid #c7d2fe",
                }}>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#4338ca", marginBottom: 8 }}>
                    Score Maximizer Tips
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {scoreTips.map((tip, idx) => (
                      <li key={idx} style={{ fontSize: "0.82rem", color: "#475569", marginBottom: 4, lineHeight: 1.5 }}>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {currentStep === "concepts" && (
            <div style={{ display: "grid", gap: 12 }}>
              {definitions.length > 0 ? definitions.map((def, idx) => (
                <div key={idx} style={{
                  background: "#fff", borderRadius: 14, padding: "16px 18px",
                  border: "1px solid #e2e8f0",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <span style={{
                          width: 28, height: 28, borderRadius: 999,
                          background: "#eef2ff", color: "#6366f1",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 800, fontSize: "0.78rem", flexShrink: 0,
                        }}>
                          {idx + 1}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>
                          {def.title}
                        </span>
                      </div>
                      <div style={{ marginTop: 6, fontSize: "0.82rem", color: "#475569", lineHeight: 1.55, paddingLeft: 36 }}>
                        {def.description}
                      </div>
                      {def.examTip && (
                        <div style={{
                          marginTop: 6, fontSize: "0.78rem", color: "#d97706",
                          paddingLeft: 36, fontStyle: "italic",
                        }}>
                          Exam tip: {def.examTip}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openTeachDrawer(
                        def.title,
                        `Teach me about "${def.title}" in ${title}. ${def.description}`,
                        def.title
                      )}
                      style={{
                        flexShrink: 0, padding: "6px 12px", borderRadius: 10,
                        background: "#eef2ff", border: "1px solid #c7d2fe",
                        color: "#4338ca", fontWeight: 600, fontSize: "0.75rem",
                        cursor: "pointer", whiteSpace: "nowrap",
                      }}
                    >
                      Teach Me
                    </button>
                  </div>
                </div>
              )) : (
                <div style={{
                  background: "#fff", borderRadius: 14, padding: "20px 18px",
                  border: "1px solid #e2e8f0", textAlign: "center", color: "#94a3b8",
                }}>
                  No concepts available for this topic yet.
                </div>
              )}
            </div>
          )}

          {currentStep === "exam-patterns" && (
            <div style={{ display: "grid", gap: 12 }}>
              {examPatterns.length > 0 ? examPatterns.map((pattern, idx) => (
                <div key={idx} style={{
                  background: "#fff", borderRadius: 14, padding: "14px 18px",
                  border: "1px solid #e2e8f0", display: "flex", gap: 10, alignItems: "flex-start",
                }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 999,
                    background: "#fef3c7", color: "#d97706",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: "0.72rem", flexShrink: 0, marginTop: 1,
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "#334155", lineHeight: 1.55 }}>
                    {pattern}
                  </span>
                </div>
              )) : (
                <div style={{
                  background: "#fff", borderRadius: 14, padding: "20px 18px",
                  border: "1px solid #e2e8f0", textAlign: "center", color: "#94a3b8",
                }}>
                  No exam patterns available for this topic yet.
                </div>
              )}
              {markingTips.length > 0 && (
                <div style={{
                  background: "#fef2f2", borderRadius: 14, padding: "16px 18px",
                  border: "1px solid #fecaca",
                }}>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#dc2626", marginBottom: 8 }}>
                    Common Mistakes to Avoid
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {markingTips.map((tip, idx) => (
                      <li key={idx} style={{ fontSize: "0.82rem", color: "#7f1d1d", marginBottom: 4, lineHeight: 1.5 }}>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {currentStep === "quiz" && (
            <div style={{ display: "grid", gap: 12 }}>
              {quickQuiz.length > 0 ? quickQuiz.map((q, idx) => (
                <div key={idx} style={{
                  background: "#fff", borderRadius: 14, padding: "14px 18px",
                  border: expandedQuizIdx === idx ? "2px solid #6366f1" : "1px solid #e2e8f0",
                  cursor: "pointer", transition: "border 0.2s",
                }}
                  onClick={() => setExpandedQuizIdx(expandedQuizIdx === idx ? null : idx)}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: 999,
                        background: "#f0fdf4", color: "#16a34a",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, fontSize: "0.78rem", flexShrink: 0,
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: "0.85rem", color: "#1e293b", lineHeight: 1.5 }}>
                        {q.question}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "#94a3b8", flexShrink: 0 }}>
                      {expandedQuizIdx === idx ? "▲" : "▼"}
                    </span>
                  </div>
                  {expandedQuizIdx === idx && (
                    <div style={{ marginTop: 12, paddingLeft: 38, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openTeachDrawer(
                            q.title || `Quiz Q${idx + 1}`,
                            q.question,
                            q.title
                          );
                        }}
                        style={{
                          padding: "7px 14px", borderRadius: 10,
                          background: "#eef2ff", border: "1px solid #c7d2fe",
                          color: "#4338ca", fontWeight: 600, fontSize: "0.78rem",
                          cursor: "pointer",
                        }}
                      >
                        Teach Me This
                      </button>
                    </div>
                  )}
                </div>
              )) : (
                <div style={{
                  background: "#fff", borderRadius: 14, padding: "20px 18px",
                  border: "1px solid #e2e8f0", textAlign: "center", color: "#94a3b8",
                }}>
                  No quiz questions available for this topic yet.
                </div>
              )}
            </div>
          )}

          {currentStep === "practice" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{
                background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
                borderRadius: 20, padding: "28px 24px", textAlign: "center",
                border: "1px solid #c7d2fe",
              }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🏆</div>
                <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#312e81" }}>
                  Ready to practice {title}?
                </div>
                <div style={{ fontSize: "0.85rem", color: "#4338ca", marginTop: 6, lineHeight: 1.5 }}>
                  Apply what you learned with real board-style questions.
                  Focus on writing clean, exam-ready answers.
                </div>
                <button
                  type="button"
                  onClick={goToPractice}
                  style={{
                    marginTop: 16, padding: "12px 32px", borderRadius: 14,
                    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                    color: "#fff", fontWeight: 700, fontSize: "0.95rem",
                    border: "none", cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
                  }}
                >
                  Start Practice
                </button>
              </div>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
              }}>
                <button
                  type="button"
                  onClick={() => {
                    navigateToPractice(navigate, {
                      grade,
                      subject: subjectTitle as "Maths" | "Science",
                      topicKey,
                      topicName: title,
                      difficultyPreset: "Easy",
                      backPath: `/topic-hub/${grade}/${subject}/${topicKey}`,
                      backLabel: `Back to ${title}`,
                      source: "topichub",
                    });
                  }}
                  style={{
                    padding: "14px 16px", borderRadius: 14, background: "#f0fdf4",
                    border: "1px solid #bbf7d0", color: "#16a34a", fontWeight: 600,
                    fontSize: "0.82rem", cursor: "pointer", textAlign: "center",
                  }}
                >
                  Easy Questions
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigateToPractice(navigate, {
                      grade,
                      subject: subjectTitle as "Maths" | "Science",
                      topicKey,
                      topicName: title,
                      difficultyPreset: "Hard",
                      backPath: `/topic-hub/${grade}/${subject}/${topicKey}`,
                      backLabel: `Back to ${title}`,
                      source: "topichub",
                    });
                  }}
                  style={{
                    padding: "14px 16px", borderRadius: 14, background: "#fef2f2",
                    border: "1px solid #fecaca", color: "#dc2626", fontWeight: 600,
                    fontSize: "0.82rem", cursor: "pointer", textAlign: "center",
                  }}
                >
                  Hard Questions
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{
          marginTop: 20, display: "flex", justifyContent: "space-between", gap: 12,
        }}>
          {canGoPrev ? (
            <button
              type="button"
              onClick={() => setCurrentStep(STEPS[currentStepIdx - 1])}
              style={{
                padding: "10px 20px", borderRadius: 12,
                background: "#fff", border: "1px solid #e2e8f0",
                color: "#64748b", fontWeight: 600, fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              ← {STEP_META[STEPS[currentStepIdx - 1]].label}
            </button>
          ) : <div />}
          {canGoNext ? (
            <button
              type="button"
              onClick={() => setCurrentStep(STEPS[currentStepIdx + 1])}
              style={{
                padding: "10px 20px", borderRadius: 12,
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                border: "none", color: "#fff", fontWeight: 600, fontSize: "0.85rem",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(99,102,241,0.25)",
              }}
            >
              {STEP_META[STEPS[currentStepIdx + 1]].label} →
            </button>
          ) : null}
        </div>
      </div>

      <ConceptTeachDrawer
        open={teachDrawerOpen}
        onClose={() => setTeachDrawerOpen(false)}
        context={teachContext}
      />
    </div>
  );
}
