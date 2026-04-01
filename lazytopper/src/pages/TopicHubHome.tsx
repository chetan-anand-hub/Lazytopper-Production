import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { RequireAuth } from "../components/auth/RequireAuth";
import { getTopicContent } from "../data/class10ContentConfig";
import { getCanonicalChapters, toCanonicalSubjectId } from "../data/syllabus/cbse10Canonical";
import { isSupplementalTopicKey } from "../data/syllabus/topicAliasMap";
import { topicHubV2Content } from "../data/topicHubV2Full";
import { useSmartLearning } from "../engine/smartLearningStore";
import type { ChapterMeta } from "../engine/smartLearningTypes";
import {
  SESSION_AUTH_TIMEOUT,
  SESSION_AUTH_UNAVAILABLE,
  SESSION_FIRESTORE_UNAVAILABLE,
  getSessionApiErrorCode,
  startSession,
} from "../services/sessionApi";
import { loadTopicMasterySnapshot } from "../services/topicHubMastery";
import { normalizeTopicKey, resolveRuntimeTopicKey } from "../utils/topicHubV2Store";

type SubjectTitle = "Maths" | "Science";
type TierLabel = "must-crack" | "high-roi" | "good-to-do" | "topic";

type TopicOption = {
  key: string;
  name: string;
  tier: TierLabel;
};

type LastTopicHubRoute = {
  grade: string;
  subject: SubjectTitle;
  topicKey: string;
  topicName?: string;
  path: string;
  updatedAt: string;
};

const TOPICHUB_LAST_ROUTE_KEY = "lazytopper.topicHub.lastRoute.v1";
const TOPICHUB_RECENT_TOPICS_KEY = "lazytopper.topicHub.recentTopics.v1";

type RecentTopicRecord = {
  grade: string;
  subject: SubjectTitle;
  topicKey: string;
  topicName?: string;
  path: string;
  updatedAt: string;
};

function toSubjectTitle(raw: unknown): SubjectTitle {
  return String(raw || "").toLowerCase().includes("science") ? "Science" : "Maths";
}

function toTierLabel(raw: unknown): TierLabel {
  const value = String(raw || "").toLowerCase();
  if (value.includes("must")) return "must-crack";
  if (value.includes("high")) return "high-roi";
  if (value.includes("good")) return "good-to-do";
  return "topic";
}

function tierRank(tier: TierLabel): number {
  if (tier === "must-crack") return 0;
  if (tier === "high-roi") return 1;
  if (tier === "good-to-do") return 2;
  return 3;
}

function buildTopicOptions(subject: SubjectTitle): TopicOption[] {
  const out: TopicOption[] = [];
  const canonicalSubject = toCanonicalSubjectId(subject);
  const runtimeKeys = Object.keys(topicHubV2Content || {});
  const seen = new Set<string>();

  for (const chapter of getCanonicalChapters(canonicalSubject)) {
    const canonicalKey = normalizeTopicKey(chapter.canonicalSlug);
    if (!canonicalKey || isSupplementalTopicKey(canonicalKey) || seen.has(canonicalKey)) continue;
    seen.add(canonicalKey);

    const runtimeKey = resolveRuntimeTopicKey(canonicalKey, runtimeKeys);
    const recRaw =
      (topicHubV2Content as Record<string, unknown>)[runtimeKey] ??
      (topicHubV2Content as Record<string, unknown>)[canonicalKey];
    const rec = recRaw && typeof recRaw === "object" ? (recRaw as Record<string, unknown>) : {};

    out.push({
      key: canonicalKey,
      name: String(rec.topicName || chapter.title || canonicalKey),
      tier: toTierLabel(rec.tier),
    });
  }
  out.sort((a, b) => {
    const byTier = tierRank(a.tier) - tierRank(b.tier);
    if (byTier !== 0) return byTier;
    return a.name.localeCompare(b.name);
  });
  return out;
}

function readLastRoute(): LastTopicHubRoute | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TOPICHUB_LAST_ROUTE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastTopicHubRoute>;
    if (!parsed || typeof parsed !== "object") return null;
    const topicKey = normalizeTopicKey(String(parsed.topicKey || ""));
    const grade = String(parsed.grade || "").trim();
    const path = String(parsed.path || "").trim();
    if (!topicKey || !grade || !path) return null;
    return {
      grade,
      subject: toSubjectTitle(parsed.subject),
      topicKey,
      topicName: String(parsed.topicName || "").trim() || topicKey,
      path,
      updatedAt: String(parsed.updatedAt || ""),
    };
  } catch {
    return null;
  }
}

function formatUpdatedAt(value: string): string {
  const ts = Date.parse(String(value || ""));
  if (!Number.isFinite(ts)) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

function toCloudSessionErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : "Unknown cloud error.";
  return `Cloud session start failed: ${detail}`;
}

function readRecentTopics(subject: SubjectTitle): RecentTopicRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TOPICHUB_RECENT_TOPICS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentTopicRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && item.subject === subject && item.topicKey && item.path)
      .slice(0, 5);
  } catch {
    return [];
  }
}

function TopicHubHomeContent() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { getMatchScoreForChapter } = useSmartLearning();
  const [lastRoute] = useState<LastTopicHubRoute | null>(() => readLastRoute());

  const [grade, setGrade] = useState<string>(() => {
    const value = String(sp.get("grade") || lastRoute?.grade || "10").trim();
    return value || "10";
  });
  const [subject, setSubject] = useState<SubjectTitle>(() =>
    toSubjectTitle(sp.get("subject") || lastRoute?.subject || "Maths")
  );
  const [query, setQuery] = useState<string>("");
  const [recentTopics, setRecentTopics] = useState<RecentTopicRecord[]>([]);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [sessionLaunchError, setSessionLaunchError] = useState("");
  const [retryTopicKey, setRetryTopicKey] = useState("");

  const topicOptions = useMemo(() => buildTopicOptions(subject), [subject]);

  useEffect(() => {
    setRecentTopics(readRecentTopics(subject));
  }, [subject]);

  const [selectedTopicKeyRaw, setSelectedTopicKeyRaw] = useState<string>(() => {
    const rawQueryTopic = String(sp.get("topic") || "").trim();
    const normalized = normalizeTopicKey(rawQueryTopic);
    if (normalized) return normalized;
    const preferredSubject = toSubjectTitle(sp.get("subject") || lastRoute?.subject || "Maths");
    if (lastRoute?.subject === preferredSubject) {
      return normalizeTopicKey(lastRoute.topicKey) || "";
    }
    return "";
  });

  const selectedTopicKey = useMemo(() => {
    if (!topicOptions.length) return "";
    const normalizedSelected = normalizeTopicKey(selectedTopicKeyRaw);
    const hasSelected = topicOptions.some((item) => item.key === normalizedSelected);
    if (hasSelected && normalizedSelected) return normalizedSelected;

    const rawTopic = String(sp.get("topic") || "").trim();
    const normalizedQueryTopic = normalizeTopicKey(rawTopic);
    if (normalizedQueryTopic) {
      const fromQuery = topicOptions.find((item) => item.key === normalizedQueryTopic);
      if (fromQuery) return fromQuery.key;
    }

    if (lastRoute?.subject === subject) {
      const fromLast = topicOptions.find(
        (item) => item.key === normalizeTopicKey(lastRoute.topicKey)
      );
      if (fromLast) return fromLast.key;
    }

    return topicOptions[0].key;
  }, [lastRoute, selectedTopicKeyRaw, sp, subject, topicOptions]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topicOptions;
    return topicOptions.filter((item) =>
      `${item.name} ${item.key} ${item.tier}`.toLowerCase().includes(q)
    );
  }, [query, topicOptions]);

  const selectedTopic = useMemo(
    () => topicOptions.find((item) => item.key === selectedTopicKey) || null,
    [selectedTopicKey, topicOptions]
  );
  const selectedTopicContent = useMemo(
    () => getTopicContent(subject, selectedTopicKey || selectedTopic?.key || ""),
    [selectedTopic?.key, selectedTopicKey, subject]
  );
  const isTrianglesSelected = selectedTopicKey === "triangles";

  const maxBoardWeightageForSubject = useMemo(() => {
    const runtimeKeys = Object.keys(topicHubV2Content || {});
    const values = topicOptions
      .map((item) => {
        const runtimeKey = resolveRuntimeTopicKey(item.key, runtimeKeys);
        const rec = ((topicHubV2Content as Record<string, unknown>)[runtimeKey] ||
          {}) as Record<string, unknown>;
        return Number(rec?.weightagePercent ?? rec?.approxWeightage ?? 0);
      })
      .filter((v) => Number.isFinite(v) && v > 0);
    return values.length ? Math.max(...values) : 14;
  }, [topicOptions]);

  const matchScoreByTopic = useMemo(() => {
    const runtimeKeys = Object.keys(topicHubV2Content || {});
    const out: Record<string, number> = {};
    for (const item of topicOptions) {
      const runtimeKey = resolveRuntimeTopicKey(item.key, runtimeKeys);
      const rec = ((topicHubV2Content as Record<string, unknown>)[runtimeKey] ||
        {}) as Record<string, unknown>;
      const chapterMeta: ChapterMeta = {
        id: `${grade}-${subject}-${item.key}`,
        grade: String(grade || "10"),
        subject,
        topicKey: item.key,
        name: item.name,
        boardWeightage: Number(rec?.weightagePercent ?? rec?.approxWeightage ?? 0),
        tier: item.tier === "topic" ? "high-roi" : item.tier,
      };
      out[item.key] = getMatchScoreForChapter(chapterMeta, maxBoardWeightageForSubject);
    }
    return out;
  }, [topicOptions, grade, subject, getMatchScoreForChapter, maxBoardWeightageForSubject]);

  const masteryHint = useMemo(() => {
    if (!selectedTopicKey) return "Pick a topic to start.";
    const snapshot = loadTopicMasterySnapshot(selectedTopicKey);
    const records = Object.values(snapshot.nodes || {});
    if (!records.length) {
      return "New topic. Start Learn and attempt the first checkpoint.";
    }
    const needsPractice = records.filter((rec) => rec.state === "needs_practice").length;
    const mastered = records.filter((rec) => rec.state === "mastered").length;
    const passed = records.filter(
      (rec) => rec.state === "checkpoint_passed" || rec.state === "mastered"
    ).length;
    return `Mastered ${mastered}/${records.length}, checkpoint-passed ${passed}/${records.length}, needs-practice ${needsPractice}.`;
  }, [selectedTopicKey]);

  const goToSelectedTopic = () => {
    if (!selectedTopicKey) return;
    const target = `/topic-hub/${encodeURIComponent(grade)}/${encodeURIComponent(
      subject
    )}/${encodeURIComponent(selectedTopicKey)}`;
    navigate(target);
  };

  const startChapterSession = async (topicKey: string) => {
    const targetKey = normalizeTopicKey(topicKey);
    if (!targetKey || sessionBusy) return;
    setSessionLaunchError("");
    setRetryTopicKey(targetKey);
    setSessionBusy(true);
    try {
      const started = await startSession({
        kind: "chapter",
        subjectId: subject === "Science" ? "science" : "maths",
        chapterId: targetKey,
        vibe: "high",
      });
      setSessionLaunchError("");
      setRetryTopicKey("");
      navigate(`/play/${encodeURIComponent(started.sessionId)}`);
    } catch (error) {
      const code = getSessionApiErrorCode(error);
      if (
        code === SESSION_AUTH_TIMEOUT ||
        code === SESSION_AUTH_UNAVAILABLE ||
        code === SESSION_FIRESTORE_UNAVAILABLE
      ) {
        setSessionLaunchError(
          "Cloud session start is blocked because authentication is not ready. Please retry."
        );
        return;
      }
      setSessionLaunchError(toCloudSessionErrorMessage(error));
    } finally {
      setSessionBusy(false);
    }
  };

  const playSelectedTopic = async () => {
    if (!selectedTopicKey) return;
    await startChapterSession(selectedTopicKey);
  };

  const goToLastRoute = () => {
    if (!lastRoute?.path) return;
    navigate(lastRoute.path);
  };

  const selectedTier = selectedTopic?.tier || "topic";

  return (
    <div className="lt-page">
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px 32px" }}>
        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(15,23,42,0.08)",
            background: "rgba(255,255,255,0.9)",
            padding: 16,
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.2 }}>TopicHub</div>
          <div style={{ marginTop: 6, opacity: 0.76 }}>
            One place to Learn, Grind, and revise with human-tutor flow.
          </div>
        </div>

        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(15,23,42,0.1)",
            background: "rgba(255,255,255,0.88)",
            padding: 16,
            marginBottom: 14,
          }}
          data-ux-priority-block="topichub-entry-flow"
          data-testid="topichub-priority-block"
        >
          <div style={{ fontWeight: 900, fontSize: 18 }}>3-step flow</div>
          <div style={{ marginTop: 8, opacity: 0.82, lineHeight: 1.5 }}>
            1. Pick subject and topic. 2. Learn with tutor checkpoints. 3. Move to Grind and Practice for mastery.
          </div>
        </div>

        {lastRoute ? (
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(37,99,235,0.28)",
              background: "rgba(239,246,255,0.75)",
              padding: 16,
              marginBottom: 14,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 18 }}>Continue where you left off</div>
            <div style={{ marginTop: 6, opacity: 0.88 }}>
              Class {lastRoute.grade} {lastRoute.subject} -{" "}
              {lastRoute.topicName || lastRoute.topicKey}
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
              Last opened: {formatUpdatedAt(lastRoute.updatedAt) || "recently"}
            </div>
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className="lt-pill"
                onClick={goToLastRoute}
                data-ux-above-fold-cta="topichub"
              >
                Resume topic
              </button>
            </div>
          </div>
        ) : null}

        {recentTopics.length > 0 ? (
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(15,23,42,0.09)",
              background: "rgba(255,255,255,0.86)",
              padding: 14,
              marginBottom: 14,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 16 }}>Recent topics</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {recentTopics.map((topic) => (
                <button
                  key={`${topic.grade}:${topic.subject}:${topic.topicKey}`}
                  type="button"
                  className="lt-pill"
                  style={{ padding: "7px 10px", fontSize: 13 }}
                  onClick={() => navigate(topic.path)}
                >
                  {topic.topicName || topic.topicKey}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(15,23,42,0.08)",
            background: "rgba(255,255,255,0.86)",
            padding: 16,
          }}
        >
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
            <div style={{ gridColumn: "span 12" }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>Class</div>
              <select
                value={grade}
                onChange={(event) => setGrade(String(event.target.value || "10"))}
                style={{
                  width: "100%",
                  border: "1px solid rgba(15,23,42,0.18)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontSize: 15,
                  background: "#fff",
                }}
              >
                <option value="10">Class 10</option>
              </select>
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>Subject</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["Maths", "Science"] as SubjectTitle[]).map((value) => {
                  const active = value === subject;
                  return (
                    <button
                      key={value}
                      type="button"
                      className="lt-pill"
                      style={{
                        padding: "8px 12px",
                        background: active ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.9)",
                        color: active ? "#fff" : "rgba(15,23,42,0.9)",
                        borderColor: active ? "rgba(15,23,42,0.92)" : "rgba(15,23,42,0.22)",
                      }}
                      onClick={() => setSubject(value)}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>Find topic</div>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(String(event.target.value || ""))}
                placeholder="Search topic"
                style={{
                  width: "100%",
                  border: "1px solid rgba(15,23,42,0.18)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontSize: 15,
                  background: "#fff",
                }}
              />
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>Topic</div>
              <select
                value={selectedTopicKey}
                onChange={(event) => setSelectedTopicKeyRaw(String(event.target.value || ""))}
                style={{
                  width: "100%",
                  border: "1px solid rgba(15,23,42,0.18)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontSize: 15,
                  background: "#fff",
                }}
              >
                {filteredOptions.length ? (
                  filteredOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.name} ({option.tier} | Match Score: {matchScoreByTopic[option.key] ?? 0}%)
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No topics found for this search
                  </option>
                )}
              </select>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.12)",
              background: "rgba(248,250,252,0.9)",
              padding: 12,
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.78 }}>Selected:</span>
              <span style={{ fontWeight: 900 }}>{selectedTopic?.name || "None"}</span>
              {selectedTopic ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    borderRadius: 999,
                    border: "1px solid rgba(22,163,74,0.45)",
                    padding: "2px 8px",
                    background: "rgba(220,252,231,0.95)",
                    color: "rgba(22,101,52,1)",
                  }}
                >
                  Match Score: {matchScoreByTopic[selectedTopic.key] ?? 0}%
                </span>
              ) : null}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  borderRadius: 999,
                  border: "1px solid rgba(15,23,42,0.22)",
                  padding: "2px 8px",
                  background:
                    selectedTier === "must-crack"
                      ? "rgba(254,226,226,0.9)"
                      : selectedTier === "high-roi"
                      ? "rgba(254,249,195,0.95)"
                      : "rgba(220,252,231,0.95)",
                }}
              >
                {selectedTier}
              </span>
            </div>
            <div style={{ fontSize: 13, opacity: 0.82, marginTop: 6 }}>{masteryHint}</div>
          </div>

          {isTrianglesSelected ? (
            <div
              style={{
                marginTop: 14,
                borderRadius: 18,
                border: "1px solid rgba(15,23,42,0.12)",
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(239,246,255,0.94) 52%, rgba(254,249,195,0.42) 100%)",
                padding: 14,
              }}
              data-testid="triangles-topic-preview"
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    padding: "3px 9px",
                    borderRadius: 999,
                    border: "1px solid rgba(15,23,42,0.18)",
                    background: "rgba(255,255,255,0.9)",
                  }}
                >
                  Start here
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    padding: "3px 9px",
                    borderRadius: 999,
                    border: "1px solid rgba(15,23,42,0.18)",
                    background: "rgba(255,255,255,0.9)",
                  }}
                >
                  ~{selectedTopicContent.weightagePercent}% boards signal
                </span>
              </div>
              <div style={{ marginTop: 10, fontWeight: 900, fontSize: 18 }}>
                Triangles runway
              </div>
              <div style={{ marginTop: 6, opacity: 0.86, lineHeight: 1.55 }}>
                {selectedTopicContent.heroTagline}
              </div>
              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.82, lineHeight: 1.55 }}>
                First move: similarity basics {"->"} BPT {"->"} one clean proof. Strong students can jump to Grind or HPQ once theorem naming feels stable.
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="lt-pill"
                  style={{ padding: "9px 12px" }}
                  onClick={() =>
                    navigate(
                      `/topic-hub/${encodeURIComponent(grade)}/${encodeURIComponent(subject)}/triangles?tab=learn&teach=1`
                    )
                  }
                >
                  Start with tutor
                </button>
                <button
                  type="button"
                  className="lt-pill"
                  style={{ padding: "9px 12px" }}
                  onClick={() =>
                    navigate(
                      `/topic-hub/${encodeURIComponent(grade)}/${encodeURIComponent(subject)}/triangles?tab=grind`
                    )
                  }
                >
                  Boards fast lane
                </button>
                <button
                  type="button"
                  className="lt-pill"
                  style={{ padding: "9px 12px" }}
                  onClick={() =>
                    navigate(
                      `/highly-probable/${encodeURIComponent(grade)}/${encodeURIComponent(subject)}?topic=${encodeURIComponent("Triangles")}`
                    )
                  }
                >
                  Open HPQ
                </button>
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="lt-pill"
              style={{ padding: "10px 14px" }}
              data-ux-above-fold-cta="topichub"
              onClick={() => void playSelectedTopic()}
              disabled={!selectedTopicKey}
            >
              Start Learning
            </button>
            <button
              type="button"
              className="lt-pill"
              style={{ padding: "10px 14px" }}
              data-ux-above-fold-cta="topichub"
              onClick={goToSelectedTopic}
              disabled={!selectedTopicKey || sessionBusy}
            >
              {sessionBusy ? "Starting..." : "Open Topic Hub"}
            </button>
            <button
              type="button"
              className="lt-pill"
              style={{ padding: "10px 14px" }}
              data-ux-above-fold-cta="topichub"
              onClick={() => navigate(`/trends/${encodeURIComponent(grade)}/${encodeURIComponent(subject)}`)}
            >
              See trends (optional)
            </button>
          </div>
          {sessionLaunchError ? (
            <div
              style={{
                marginTop: 10,
                border: "1px solid rgba(185,28,28,0.35)",
                background: "rgba(254,242,242,0.95)",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              <div style={{ color: "#991b1b", fontWeight: 800, fontSize: 13 }}>
                {sessionLaunchError}
              </div>
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="lt-pill"
                  style={{ padding: "8px 12px" }}
                  onClick={() => {
                    if (!retryTopicKey) return;
                    void startChapterSession(retryTopicKey);
                  }}
                  disabled={!retryTopicKey || sessionBusy}
                >
                  Retry session start
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function TopicHubHome() {
  return (
    <RequireAuth>
      <TopicHubHomeContent />
    </RequireAuth>
  );
}
