import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import DailyMixWidget from "../components/DailyMixWidget";
import { topicHubV2Content } from "../data/topicHubV2Full";
import { useVibeMode } from "../context/vibeModeContext";
import { normalizeTopicKey } from "../utils/topicResolver";

type RouteParams = {
  grade?: string;
  subject?: string;
};

type LastTopicRoute = {
  subject?: string;
  topicKey?: string;
};

function normalizeSubject(raw: string): "Maths" | "Science" {
  return String(raw || "").toLowerCase().includes("science") ? "Science" : "Maths";
}

function readLastTopicRoute(): LastTopicRoute | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("lazytopper.topicHub.lastRoute.v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastTopicRoute;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function firstTopicForSubject(subject: "Maths" | "Science"): string {
  const keys = Object.keys(topicHubV2Content || {});
  const match = keys.find((key) => {
    const rec = (topicHubV2Content as Record<string, unknown>)[key] as Record<string, unknown>;
    return normalizeSubject(String(rec?.subject || "Maths")) === subject;
  });
  return normalizeTopicKey(match || "triangles") || "triangles";
}

export default function DailyMixPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { grade, subject } = useParams<RouteParams>();
  const { mode } = useVibeMode();

  const safeGrade = useMemo(() => {
    const raw = String(grade || "10").trim();
    const numeric = Number.parseInt(raw, 10);
    return Number.isFinite(numeric) ? numeric : 10;
  }, [grade]);

  const safeSubject = useMemo(() => normalizeSubject(String(subject || "Maths")), [subject]);

  const topicKey = useMemo(() => {
    const queryTopic = normalizeTopicKey(String(searchParams.get("topic") || ""));
    if (queryTopic) return queryTopic;

    const last = readLastTopicRoute();
    const lastSubject = normalizeSubject(String(last?.subject || safeSubject));
    const lastTopic = normalizeTopicKey(String(last?.topicKey || ""));
    if (lastTopic && lastSubject === safeSubject) return lastTopic;

    return firstTopicForSubject(safeSubject);
  }, [searchParams, safeSubject]);

  const intensity = mode === "zombie" ? "light" : "hard";

  return (
    <div className="lt-page">
      <DailyMixWidget
        grade={safeGrade}
        subject={safeSubject}
        topic={topicKey}
        seedKey={new Date().toISOString().slice(0, 10)}
        intensity={intensity}
        count={5}
      />

      <div style={{ marginTop: 12 }}>
        <button type="button" className="lt-pill" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
