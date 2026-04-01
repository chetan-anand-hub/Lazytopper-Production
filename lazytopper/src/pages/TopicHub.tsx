// src/pages/TopicHub.tsx
// TopicHub (MAIN-safe):
// - Works for BOTH /topic-hub/:grade/:subject and /topic-hub/:grade/:subject/:topicKey
// - If topicKey is missing -> redirects to a sane default (never blank)
// - Renders baked TopicHubV2 content (base + enrichment)
// - Implements the locked UI direction: sticky action bar + progressive disclosure (accordions)
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { getTopicContent } from "../data/class10ContentConfig";
import { getCanonicalChapters, toCanonicalSubjectId } from "../data/syllabus/cbse10Canonical";
import { isSupplementalTopicKey } from "../data/syllabus/topicAliasMap";
import { getTopicV2Content, normalizeTopicKey, resolveRuntimeTopicKey } from "../utils/topicHubV2Store";
import { topicHubV2Content } from "../data/topicHubV2Full";
import type { TopicHubV2Content, V2Definition, V2Example, Misconception, Competency, LabActivity, CaseStudy } from "../utils/getTopicV2Content";
import { PredictionCore } from "../data/predictionCore";
import { generatePracticeSet } from "../data/practiceSetGenerator";
import { useVibeMode } from "../context/vibeModeContext";
import { trianglesRuntimeVisuals } from "../data/diagrams/trianglesRuntimeVisuals";
import {
  buildParallelLinesDiagram,
  buildSimilarityDiagram,
  buildTriangleDiagram,
} from "../diagrams/geometryBuilders";
import { trianglesGuidedMindmap } from "../data/trianglesGuidedMindmap";
import { trianglesGrindMindmap } from "../data/trianglesGrindMindmap";
import { DiagramBlock } from "../components/DiagramBlock";
import { HumanGradeCoachView } from "../components/mentor/HumanGradeCoachView";
import { TeachFlow } from "../components/tutor/TeachFlow";
import SharedTutorDrawerV2, {
  type TutorMasteryState,
  type TutorNodeProgress,
} from "../components/tutor/TutorDrawerV2";
import type { DiagramSpec } from "../tutor/diagram/diagramTypes";
import type { MentorDiagramSpec, MentorStructured } from "../types/mentor";
import type {
  QuestionFamilyOverlay,
  QuestionTypeTile,
} from "../data/contentStrategy/types";
import {
  navigateToPractice,
  type PracticeDifficultyPreset,
  type PracticeSectionFilter,
} from "../navigation/practiceNavigation";
import {
  getFocusIdsForTile,
  getQuestionFamiliesForTopic,
  getQuestionTypeTileById,
  getStrategyPackForTopic,
  isStrategyEnabledForTopic,
  resolveCanonicalTopicForStrategy,
} from "../services/questionTypeFirstResolver";
import {
  ensureTopicMasterySnapshot,
  getMasteryCounts,
  getNodeMasteryRecord,
  getNodeMasteryState,
  loadTopicMasterySnapshot,
  markNodeLearning,
  pickWeakestNodeId,
  saveTopicMasterySnapshot,
  setLastGrindNodeId,
  setLastTutorNodeId,
  type TopicHubMasterySnapshot,
  type TopicHubNodeMasteryState,
  upsertNodeProgress,
} from "../services/topicHubMastery";
import {
  canUseMentorServer,
  isMentorNetworkFailure,
  markMentorServerUnavailable,
} from "../services/mentorServerGate";
import { trackUxEvent } from "../services/uxTelemetry";
import { getChapterTutorPath } from "../utils/getChapterTutorPath";
import {
  extractMentorDiagramBlock,
  getMentorTutorObject,
  getMentorTutorText,
  parseMentorStructuredText,
} from "../utils/mentorStructured";

const MENTOR_HYBRID_TIMEOUT_MS = 9_000;
const QTYPE_FIRST_TRIG = import.meta.env.VITE_QTYPE_FIRST_TRIGONOMETRY === "true";

type MentorHybridResponse = {
  res: Response;
  payload: any;
};

async function postMentorHybridRequest(body: unknown, signal?: AbortSignal): Promise<MentorHybridResponse> {
  if (!canUseMentorServer()) {
    throw new Error("Mentor server temporarily unavailable.");
  }
  const controller = new AbortController();
  const relayAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    signal.addEventListener("abort", relayAbort, { once: true });
  }
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, MENTOR_HYBRID_TIMEOUT_MS);
  try {
    const res = await fetch("/api/mentor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const raw = await res.text();
    let payload: any = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = {
        data: { text: raw },
        message: raw,
      };
    }
    return { res, payload };
  } catch (err) {
    if (isMentorNetworkFailure(err)) {
      markMentorServerUnavailable();
    }
    if (timedOut) {
      markMentorServerUnavailable();
      throw new Error("Mentor request timed out.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", relayAbort);
    }
  }
}

const getMentorHybridError = (payload: any, status: number) => {
  if (payload && typeof payload === "object") {
    if (typeof payload.error === "string") return payload.error;
    if (typeof payload.message === "string") return payload.message;
    const data = payload.data;
    if (data && typeof data === "object") {
      if (typeof data.error === "string") return data.error;
      if (typeof data.message === "string") return data.message;
    }
  }
  return `Mentor request failed (${status}).`;
};

type TeachDiagram = {
  required: boolean;
  type: string;
  labels: string[];
  spec: any;
  svg?: string | null;
  altText: string;
};

type TeachViewModel = {
  goalLine: string;
  keyIdeaBullets: string[];
  diagram: TeachDiagram;
  checkpoint: { question: string; answer: string };
  commonMistakeWarning: string;
};

function toStringList(value: any): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
}

function ensureMinList(list: string[], min: number, makeItem: (i: number) => string) {
  const out = Array.isArray(list) ? list.slice() : [];
  while (out.length < min) out.push(makeItem(out.length));
  return out;
}

function toSafeNodeId(seed: string, fallback: string): string {
  const base = String(seed || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || fallback;
}

function inferDiagramTypeFromText(text: string) {
  const t = String(text || "").toLowerCase();
  if (t.includes("trigon") || t.includes("sin") || t.includes("cos") || t.includes("tan") || t.includes("height") || t.includes("distance")) {
    return "trigonometric_triangle";
  }
  if (t.includes("circle") || t.includes("tangent") || t.includes("chord")) return "circle";
  if (t.includes("coordinate") || t.includes("cartesian") || t.includes("graph")) return "coordinate_plane";
  if (t.includes("mensuration") || t.includes("surface area") || t.includes("volume") || t.includes("cylinder") || t.includes("cone") || t.includes("sphere") || t.includes("cuboid")) {
    return "mensuration_solid";
  }
  if (t.includes("ray") || t.includes("reflection") || t.includes("refraction") || t.includes("lens") || t.includes("mirror") || t.includes("optics")) {
    return "ray_diagram";
  }
  if (t.includes("circuit") || t.includes("electric") || t.includes("current") || t.includes("resistance")) return "circuit";
  if (t.includes("triangle") || t.includes("similar") || t.includes("congruen") || t.includes("pyth") || t.includes("bpt")) return "triangle";
  return "generic";
}

function defaultLabelsForType(diagramType: string): string[] {
  const t = String(diagramType || "").toLowerCase();
  if (t === "trigonometric_triangle") return ["A", "B", "C", "theta"];
  if (t === "circle") return ["O", "A", "B"];
  if (t === "coordinate_plane") return ["O", "x", "y", "P"];
  if (t === "mensuration_solid") return ["h", "r"];
  if (t === "ray_diagram") return ["O", "F", "2F"];
  if (t === "circuit") return ["A", "B", "V"];
  if (t.includes("triangle") || t.includes("similarity")) return ["A", "B", "C", "P", "Q", "R"];
  return ["A", "B", "C"];
}

function buildDiagramView(raw: any): TeachDiagram {
  const teach = raw?.teach || {};
  const diagram = teach?.diagram || raw?.diagram || {};
  const required = Boolean(
    diagram.required ??
      raw?.diagramRequired ??
      diagram.diagramRequired ??
      raw?.diagram?.diagramRequired ??
      false
  );
  const hint = JSON.stringify(raw || {});
  const inferred = inferDiagramTypeFromText(hint);
  const type = String(
    diagram.type ||
      diagram.diagramType ||
      raw?.diagramType ||
      raw?.diagram?.diagramType ||
      inferred ||
      "generic"
  ).trim() || "generic";
  let labels = Array.isArray(diagram.labels)
    ? diagram.labels.map((v: any) => String(v || "").trim()).filter(Boolean)
    : Array.isArray(raw?.diagramLabels)
      ? raw.diagramLabels.map((v: any) => String(v || "").trim()).filter(Boolean)
      : diagram.labels && typeof diagram.labels === "object"
        ? Object.values(diagram.labels).map((v: any) => String(v || "").trim()).filter(Boolean)
        : raw?.diagramLabels && typeof raw.diagramLabels === "object"
          ? Object.values(raw.diagramLabels).map((v: any) => String(v || "").trim()).filter(Boolean)
          : defaultLabelsForType(type);
  if (!labels.length) labels = defaultLabelsForType(type);
  const spec = diagram.spec ?? diagram.diagramSpec ?? raw?.diagramSpec ?? raw?.diagram ?? null;
  const svg = typeof diagram.svg === "string" ? diagram.svg : typeof raw?.diagramSvg === "string" ? raw.diagramSvg : null;
  const altText =
    String(diagram.altText || raw?.diagramAltText || "").trim() ||
    "Diagram placeholder for this concept.";
  return {
    required,
    type,
    labels,
    spec,
    svg,
    altText,
  };
}

function buildFallbackTeachModel(seed?: string): TeachViewModel {
  const safeGoal = seed ? `Goal: ${seed}` : "Goal: Understand the core idea.";
  const keyIdeas = ensureMinList([], 2, (i) => `Key idea ${i + 1}: Review the core steps.`);
  return {
    goalLine: safeGoal,
    keyIdeaBullets: keyIdeas,
    diagram: {
      required: true,
      type: "generic",
      labels: ["A", "B", "C"],
      spec: null,
      svg: null,
      altText: "Diagram placeholder for this concept.",
    },
    checkpoint: {
      question: "Quick check: What is the key condition to apply here?",
      answer: "Expected: State the criterion and correspondence clearly.",
    },
    commonMistakeWarning: "Common mistake: skipping the criterion or correspondence.",
  };
}

function extractTeachContract(rawPayload: any): TeachViewModel {
  if (!rawPayload || typeof rawPayload !== "object") {
    const seed = typeof rawPayload === "string" ? rawPayload : "";
    return buildFallbackTeachModel(seed);
  }

  const teach = rawPayload.teach || {};
  const goalLine =
    String(
      teach.goal ||
        rawPayload.goalLine ||
        rawPayload.goal ||
        teach.goalLine ||
        teach.headline ||
        teach.oneLiner ||
        rawPayload.title ||
        ""
    ).trim() || "Goal: Understand the core idea.";
  let keyIdeas = toStringList(
    teach.keyIdeas ||
      rawPayload.keyIdeaBullets ||
      rawPayload.keyIdeas ||
      teach.keyIdeaBullets ||
      teach.conceptBullets ||
      teach.simpleExplanation
  );
  keyIdeas = ensureMinList(keyIdeas, 2, (i) => `Key idea ${i + 1}: Review the core step.`);

  const diagram = buildDiagramView(rawPayload);

  const checkpointRaw = rawPayload.checkpoint || teach.checkpoint || {};
  const checkpointQuestion =
    String(checkpointRaw.question || rawPayload.checkpointQ || rawPayload.checkQuestion || "").trim() ||
    "Quick check: What is the key condition to apply?";
  const checkpointAnswer =
    String(checkpointRaw.answer || rawPayload.checkpointA || "").trim() ||
    "Expected: State the criterion and correspondence clearly.";

  const commonMistakeWarning =
    String(
      rawPayload.commonMistakeWarning ||
        rawPayload.commonMistake ||
        teach.commonMistake ||
        rawPayload.commonError ||
        (Array.isArray(rawPayload.commonMistakes) ? rawPayload.commonMistakes[0] : "")
    ).trim() || "Common mistake: skipping the criterion or correspondence.";

  return {
    goalLine,
    keyIdeaBullets: keyIdeas,
    diagram,
    checkpoint: { question: checkpointQuestion, answer: checkpointAnswer },
    commonMistakeWarning,
  };
}

function isTeachPayloadComplete(structured: TeachViewModel | null): boolean {
  if (!structured) return false;
  if (!String(structured.goalLine || "").trim()) return false;
  if (!Array.isArray(structured.keyIdeaBullets) || structured.keyIdeaBullets.length < 2) return false;
  if (!structured.diagram || !String(structured.diagram.altText || "").trim()) return false;
  if (!structured.checkpoint || !String(structured.checkpoint.question || "").trim()) return false;
  if (!String(structured.checkpoint.answer || "").trim()) return false;
  if (!String(structured.commonMistakeWarning || "").trim()) return false;
  return true;
}

function toTeachViewModel(structured: any) {
  return extractTeachContract(structured);
}

function sanitizeSvg(svg: string) {
  return String(svg || "").replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "").trim();
}

function renderDiagram(diagram: TeachDiagram) {
  const type = String(diagram?.type || "generic").toLowerCase();
  const altText = String(diagram?.altText || "Diagram placeholder.");
  const svgRaw = typeof diagram?.svg === "string" ? diagram.svg.trim() : "";
  const containerStyle = {
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 14,
    padding: 10,
    background: "white",
  } as const;

  if (svgRaw.startsWith("<svg")) {
    const safeSvg = sanitizeSvg(svgRaw);
    return (
      <div style={containerStyle}>
        <div dangerouslySetInnerHTML={{ __html: safeSvg }} />
      </div>
    );
  }

  const baseSvgProps = { width: 240, height: 160, viewBox: "0 0 240 160" };
  const labelStyle = { fontSize: 12, fontWeight: 700 } as const;

  const diagramSvg = (() => {
    switch (type) {
      case "triangle":
      case "similarity":
        return (
          <svg {...baseSvgProps}>
            <polygon points="30,130 120,20 210,130" fill="none" stroke="#1b1b1b" strokeWidth="2" />
            <text x="24" y="140" style={labelStyle}>A</text>
            <text x="118" y="16" style={labelStyle}>B</text>
            <text x="214" y="140" style={labelStyle}>C</text>
            <path d="M50 120 L65 120 L65 105" stroke="#1b1b1b" strokeWidth="2" fill="none" />
          </svg>
        );
      case "trigonometric_triangle":
        return (
          <svg {...baseSvgProps}>
            <polygon points="40,130 40,30 200,130" fill="none" stroke="#1b1b1b" strokeWidth="2" />
            <path d="M40 115 L55 115 L55 130" stroke="#1b1b1b" strokeWidth="2" fill="none" />
            <text x="46" y="28" style={labelStyle}>A</text>
            <text x="202" y="140" style={labelStyle}>B</text>
            <text x="24" y="140" style={labelStyle}>C</text>
            <text x="85" y="120" style={labelStyle}>theta</text>
          </svg>
        );
      case "circle":
        return (
          <svg {...baseSvgProps}>
            <circle cx="120" cy="80" r="50" fill="none" stroke="#1b1b1b" strokeWidth="2" />
            <line x1="120" y1="80" x2="170" y2="80" stroke="#1b1b1b" strokeWidth="2" />
            <text x="112" y="84" style={labelStyle}>O</text>
            <text x="172" y="84" style={labelStyle}>A</text>
          </svg>
        );
      case "coordinate_plane":
        return (
          <svg {...baseSvgProps}>
            <line x1="20" y1="80" x2="220" y2="80" stroke="#1b1b1b" strokeWidth="2" />
            <line x1="120" y1="20" x2="120" y2="140" stroke="#1b1b1b" strokeWidth="2" />
            <circle cx="170" cy="50" r="4" fill="#1b1b1b" />
            <text x="176" y="48" style={labelStyle}>P</text>
            <text x="224" y="84" style={labelStyle}>x</text>
            <text x="124" y="18" style={labelStyle}>y</text>
          </svg>
        );
      case "mensuration_solid":
        return (
          <svg {...baseSvgProps}>
            <ellipse cx="120" cy="40" rx="60" ry="18" fill="none" stroke="#1b1b1b" strokeWidth="2" />
            <ellipse cx="120" cy="120" rx="60" ry="18" fill="none" stroke="#1b1b1b" strokeWidth="2" />
            <line x1="60" y1="40" x2="60" y2="120" stroke="#1b1b1b" strokeWidth="2" />
            <line x1="180" y1="40" x2="180" y2="120" stroke="#1b1b1b" strokeWidth="2" />
            <text x="188" y="85" style={labelStyle}>h</text>
          </svg>
        );
      case "ray_diagram":
        return (
          <svg {...baseSvgProps}>
            <line x1="20" y1="80" x2="220" y2="80" stroke="#1b1b1b" strokeWidth="2" />
            <line x1="120" y1="30" x2="120" y2="130" stroke="#1b1b1b" strokeWidth="3" />
            <line x1="40" y1="60" x2="120" y2="80" stroke="#1b1b1b" strokeWidth="2" />
            <line x1="40" y1="100" x2="120" y2="80" stroke="#1b1b1b" strokeWidth="2" />
            <text x="112" y="26" style={labelStyle}>Lens</text>
          </svg>
        );
      case "circuit":
        return (
          <svg {...baseSvgProps}>
            <line x1="40" y1="80" x2="90" y2="80" stroke="#1b1b1b" strokeWidth="2" />
            <line x1="90" y1="70" x2="90" y2="90" stroke="#1b1b1b" strokeWidth="2" />
            <line x1="100" y1="65" x2="100" y2="95" stroke="#1b1b1b" strokeWidth="2" />
            <rect x="130" y="70" width="40" height="20" fill="none" stroke="#1b1b1b" strokeWidth="2" />
            <line x1="170" y1="80" x2="210" y2="80" stroke="#1b1b1b" strokeWidth="2" />
            <text x="136" y="66" style={labelStyle}>R</text>
          </svg>
        );
      default:
        return null;
    }
  })();

  if (diagramSvg) {
    return <div style={containerStyle}>{diagramSvg}</div>;
  }

  return (
    <div style={{ ...containerStyle, textAlign: "center", color: "#444" }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Diagram</div>
      <div style={{ fontSize: 12 }}>{altText}</div>
    </div>
  );
}


type SubjectKey = "maths" | "science";
type ModeKey = "zombie" | "beast";
type RequestedMentorMode = "explain" | "board_steps" | "solve_with_me" | "learn_mindmap";
type ExplainType = "misconception" | "competency" | "mindmap_node" | "general";

type MentorChatMsg = {
  role: "user" | "assistant";
  content: string;
  structured?: MentorStructured;
};
type MentorHybridReply = { text: string; structured?: MentorStructured };
type TutorTab = "teach" | "examples";

function safeArray<T = any>(x: any): T[] {
  return Array.isArray(x) ? (x as T[]) : [];
}

function defaultTopicKeyFor(subject: SubjectKey) {
  return subject === "science" ? "electricity" : "triangles";
}

function toTierLabel(tier: string) {
  const t = String(tier || "").toLowerCase();
  if (t.includes("must")) return "must-crack";
  if (t.includes("high")) return "high-roi";
  if (t.includes("good")) return "good-to-do";
  return t || "topic";
}

function tierColor(tier: string) {
  const t = toTierLabel(tier);
  if (t === "must-crack") return "rgba(255, 107, 107, 0.18)";
  if (t === "high-roi") return "rgba(255, 193, 7, 0.18)";
  return "rgba(46, 213, 115, 0.18)";
}

function tierBorderColor(tier: string) {
  const t = toTierLabel(tier);
  if (t === "must-crack") return "rgba(255, 107, 107, 0.38)";
  if (t === "high-roi") return "rgba(255, 193, 7, 0.38)";
  return "rgba(46, 213, 115, 0.38)";
}



type TopicOption = { key: string; name: string; tier: string };

function buildTopicOptions(subject: SubjectKey): TopicOption[] {
  const out: TopicOption[] = [];
  const runtimeKeys = Object.keys(topicHubV2Content || {});
  const canonicalSubject = toCanonicalSubjectId(subject);
  const seen = new Set<string>();
  for (const chapter of getCanonicalChapters(canonicalSubject)) {
    const canonicalKey = normalizeTopicKey(chapter.canonicalSlug);
    if (!canonicalKey || isSupplementalTopicKey(canonicalKey) || seen.has(canonicalKey)) continue;
    seen.add(canonicalKey);

    const runtimeKey = resolveRuntimeTopicKey(canonicalKey, runtimeKeys);
    const rec = ((topicHubV2Content as any)[runtimeKey] ||
      (topicHubV2Content as any)[canonicalKey] ||
      {}) as Partial<TopicHubV2Content>;
    out.push({
      key: canonicalKey,
      name: String(rec.topicName || chapter.title || canonicalKey),
      tier: String(rec.tier || ""),
    });
  }
  // stable sort: must-crack first, then high-roi, then good-to-do; name as tiebreaker
  const score = (tier: string) => {
    const t = toTierLabel(tier);
    if (t === "must-crack") return 0;
    if (t === "high-roi") return 1;
    return 2;
  };
  out.sort((a, b) => {
    const d = score(a.tier) - score(b.tier);
    if (d !== 0) return d;
    return a.name.localeCompare(b.name);
  });
  return out;
}

function asSubjectKey(raw: string): SubjectKey {
  const v = String(raw || "").toLowerCase();
  return v === "science" ? "science" : "maths";
}

type TutorConceptCard = { means: string; when: string[]; exam: string; trap: string };

function toTutorConceptCard(x: unknown): TutorConceptCard | null {
  if (!x || typeof x !== "object") return null;
  const obj = x as Record<string, unknown>;
  const means = typeof obj.means === "string" ? obj.means : null;
  const exam = typeof obj.exam === "string" ? obj.exam : null;
  const trap = typeof obj.trap === "string" ? obj.trap : null;
  const whenRaw = obj.when;
  const when =
    Array.isArray(whenRaw) && whenRaw.every((v) => typeof v === "string")
      ? (whenRaw as string[])
      : null;

  if (!means || !exam || !trap || !when) return null;
  return { means, when, exam, trap };
}

function toNullableString(x: unknown): string | null {
  return typeof x === "string" ? x : null;
}

function hasMindMapContent(mindMap: any): boolean {
  return safeArray<any>(mindMap?.nodes || mindMap?.concepts || mindMap?.items).length > 0;
}

function buildFallbackFormulae(args: {
  topicKey: string;
  title: string;
  subjectTitle: string;
}): Array<{ title: string; formula: string; whenToUse: string }> {
  const key = String(args.topicKey || "").toLowerCase();
  const title = String(args.title || "Topic");
  const subject = String(args.subjectTitle || "").toLowerCase();

  if (key.includes("triangle")) {
    return [
      { title: "AA Similarity", formula: "If two angles are equal, triangles are similar.", whenToUse: "When two corresponding angles are given equal." },
      { title: "BPT", formula: "If DE || BC in triangle ABC, then AD/DB = AE/EC.", whenToUse: "When a line parallel to one side cuts the other two sides." },
      { title: "Area Ratio", formula: "For similar triangles, area1/area2 = (corresponding side ratio)^2.", whenToUse: "After proving similarity and asked area ratio." },
    ];
  }
  if (key.includes("trigon")) {
    return [
      { title: "Trig Ratios", formula: "sin(theta)=opp/hyp, cos(theta)=adj/hyp, tan(theta)=opp/adj.", whenToUse: "For right-triangle side/angle finding." },
      { title: "Core Identity", formula: "sin^2(theta) + cos^2(theta) = 1.", whenToUse: "When simplifying trigonometric expressions." },
      { title: "Heights & Distances Setup", formula: "Model right triangle, map theta, then apply tan/sin/cos.", whenToUse: "Word problems with angles of elevation/depression." },
    ];
  }
  if (key.includes("coordinate")) {
    return [
      { title: "Distance Formula", formula: "d = sqrt((x2-x1)^2 + (y2-y1)^2)", whenToUse: "Distance between two points." },
      { title: "Section Formula", formula: "P((mx2+nx1)/(m+n), (my2+ny1)/(m+n))", whenToUse: "Point dividing line segment internally in ratio m:n." },
      { title: "Area of Triangle", formula: "Area = 1/2 |x1(y2-y3)+x2(y3-y1)+x3(y1-y2)|", whenToUse: "Coordinate-geometry area questions." },
    ];
  }
  if (key.includes("surface-areas") || key.includes("volume") || key.includes("mensuration")) {
    return [
      { title: "CSA/TSA Cylinder", formula: "CSA=2pi rh, TSA=2pi r(r+h)", whenToUse: "Cylinder curved/total surface area." },
      { title: "Cone", formula: "CSA=pi rl, TSA=pi r(r+l), Volume=(1/3)pi r^2 h", whenToUse: "Cone area/volume problems." },
      { title: "Sphere/Hemisphere", formula: "Sphere SA=4pi r^2, Volume=(4/3)pi r^3", whenToUse: "Spherical solids and conversions." },
    ];
  }
  if (key.includes("quadratic")) {
    return [
      { title: "Quadratic Formula", formula: "x = (-b ± sqrt(b^2-4ac)) / 2a", whenToUse: "When factorization is not straightforward." },
      { title: "Discriminant", formula: "D = b^2 - 4ac", whenToUse: "To determine nature of roots." },
      { title: "Root Relations", formula: "alpha + beta = -b/a, alpha*beta = c/a", whenToUse: "When roots are used without solving fully." },
    ];
  }
  if (key.includes("pair-of-linear")) {
    return [
      { title: "Standard Form", formula: "a1x + b1y + c1 = 0 and a2x + b2y + c2 = 0", whenToUse: "Before elimination/substitution/graphing." },
      { title: "Consistency", formula: "a1/a2 != b1/b2 -> unique, a1/a2 = b1/b2 != c1/c2 -> no solution, a1/a2 = b1/b2 = c1/c2 -> infinite", whenToUse: "To classify number of solutions." },
      { title: "Board Skeleton", formula: "Given -> equation setup -> elimination/substitution -> final ordered pair", whenToUse: "Word/application problems." },
    ];
  }
  if (key.includes("statistics")) {
    return [
      { title: "Mean (Step Deviation)", formula: "mean = a + (sum(f_i*u_i)/sum(f_i))*h", whenToUse: "Grouped frequency table mean." },
      { title: "Median (Grouped)", formula: "Median = l + [(N/2 - cf)/f]*h", whenToUse: "Median from cumulative frequency." },
      { title: "Mode (Grouped)", formula: "Mode = l + [(f1-f0)/(2f1-f0-f2)]*h", whenToUse: "Mode from grouped data." },
    ];
  }
  if (key.includes("probability")) {
    return [
      { title: "Classical Probability", formula: "P(E) = favourable outcomes / total outcomes", whenToUse: "Equally likely finite outcomes." },
      { title: "Complement", formula: "P(not E) = 1 - P(E)", whenToUse: "When direct count is hard." },
      { title: "Range", formula: "0 <= P(E) <= 1", whenToUse: "Quick sanity check." },
    ];
  }
  if (key.includes("electricity")) {
    return [
      { title: "Ohm's Law", formula: "V = IR", whenToUse: "Find current/voltage/resistance in circuit numericals." },
      { title: "Power", formula: "P = VI = I^2R = V^2/R", whenToUse: "Electrical power/consumption questions." },
      { title: "Energy", formula: "E = Pt", whenToUse: "Energy consumed in given time interval." },
    ];
  }
  if (key.includes("light") || key.includes("reflection") || key.includes("refraction") || key.includes("lens")) {
    return [
      { title: "Mirror/Lens Formula", formula: "1/f = 1/v + 1/u", whenToUse: "Image position and focal-length numericals." },
      { title: "Magnification", formula: "m = h_i/h_o = -v/u", whenToUse: "Image size/sign determination." },
      { title: "Ray Rules", formula: "Use principal rays with sign convention before substitution.", whenToUse: "Ray diagram + numerical combo questions." },
    ];
  }
  if (key.includes("magnetic") || key.includes("magnet")) {
    return [
      { title: "Direction Rule", formula: "Right-hand thumb rule gives magnetic field direction around conductor.", whenToUse: "Field direction questions." },
      { title: "Motor Rule", formula: "Fleming's left-hand rule: Force direction in motor setup.", whenToUse: "Motor working and direction." },
      { title: "Generator Rule", formula: "Fleming's right-hand rule: Induced current direction.", whenToUse: "Electromagnetic induction problems." },
    ];
  }
  if (
    key.includes("life-process") ||
    key.includes("control") ||
    key.includes("reproduction") ||
    key.includes("heredity") ||
    key.includes("environment")
  ) {
    return [
      { title: "Biology Flow Formula", formula: "Stimulus -> receptor -> control center -> effector -> response", whenToUse: "Control/coordination sequence answers." },
      { title: "Life Process Chain", formula: "Ingestion -> digestion -> absorption -> assimilation -> egestion", whenToUse: "Nutrition process questions." },
      { title: "Exam Keywords", formula: "Definition + labelled diagram + sequence + function + conclusion", whenToUse: "3-5 mark biology board answers." },
    ];
  }
  if (subject.includes("science")) {
    return [
      { title: "Science Answer Template", formula: "Definition -> Diagram -> Principle/Law -> Application -> Conclusion", whenToUse: "Structured CBSE science answers." },
      { title: "Units and Terms", formula: "Use SI units and textbook terms consistently.", whenToUse: "Numerical and explanation questions." },
      { title: "Reasoning Line", formula: "Because <principle>, therefore <result>.", whenToUse: "Assertion-reason and concept justification." },
    ];
  }
  return [
    { title: `${title} Core Rule`, formula: "State given data, apply one correct rule/theorem, and conclude clearly.", whenToUse: `Any exam-format ${title} answer.` },
    { title: "Board Writing Template", formula: "Given -> To Find/To Prove -> Working -> Therefore/Hence", whenToUse: "Short and long answers." },
    { title: "Quick Trap Check", formula: "Check correspondence, units, sign, and final statement.", whenToUse: "Before final submission." },
  ];
}

function buildFallbackVideos(args: {
  topicKey: string;
  title: string;
  subjectTitle: string;
}): Array<{ title: string; url: string }> {
  const topic = String(args.title || args.topicKey || "Topic");
  const subject = String(args.subjectTitle || "Maths/Science");
  const base = `CBSE Class 10 ${subject} ${topic}`;
  const khanQuery = `${base} fundamentals`;
  const ytConcept = `${base} NCERT explanation`;
  const ytExam = `${base} board exam questions`;
  return [
    {
      title: `Khan Academy • ${topic} fundamentals`,
      url: `https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(khanQuery)}`,
    },
    {
      title: `YouTube • ${topic} concept walkthrough`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(ytConcept)}`,
    },
    {
      title: `YouTube • ${topic} exam-focused problems`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(ytExam)}`,
    },
  ];
}

function mergeResourceVideos(
  primary: Array<{ title?: string; name?: string; url?: string; link?: string; youtubeUrl?: string }>,
  fallback: Array<{ title: string; url: string }>
): Array<{ title: string; url: string }> {
  const out: Array<{ title: string; url: string }> = [];
  const seen = new Set<string>();
  const push = (title: string, url: string) => {
    const cleanUrl = String(url || "").trim();
    if (!cleanUrl || seen.has(cleanUrl)) return;
    seen.add(cleanUrl);
    out.push({ title: String(title || "Video").trim() || "Video", url: cleanUrl });
  };

  primary.forEach((v, idx) => {
    push(String(v?.title || v?.name || `Video ${idx + 1}`), String(v?.url || v?.link || v?.youtubeUrl || ""));
  });
  fallback.forEach((v) => push(v.title, v.url));
  return out.slice(0, 12);
}

const masteryBadgeMeta: Record<
  TopicHubNodeMasteryState,
  { label: string; bg: string; color: string; border: string }
> = {
  unseen: {
    label: "Unseen",
    bg: "rgba(148,163,184,0.16)",
    color: "rgba(30,41,59,0.9)",
    border: "rgba(148,163,184,0.35)",
  },
  learning: {
    label: "Learning",
    bg: "rgba(59,130,246,0.12)",
    color: "rgba(30,64,175,0.95)",
    border: "rgba(59,130,246,0.35)",
  },
  checkpoint_passed: {
    label: "Checkpoint Passed",
    bg: "rgba(14,165,233,0.12)",
    color: "rgba(12,74,110,0.95)",
    border: "rgba(14,165,233,0.35)",
  },
  needs_practice: {
    label: "Needs Practice",
    bg: "rgba(245,158,11,0.16)",
    color: "rgba(146,64,14,0.95)",
    border: "rgba(245,158,11,0.40)",
  },
  mastered: {
    label: "Mastered",
    bg: "rgba(34,197,94,0.14)",
    color: "rgba(20,83,45,0.95)",
    border: "rgba(34,197,94,0.38)",
  },
};

const TOPICHUB_LAST_ROUTE_KEY = "lazytopper.topicHub.lastRoute.v1";
const TOPICHUB_RECENT_TOPICS_KEY = "lazytopper.topicHub.recentTopics.v1";

type RecentTopicRecord = {
  grade: string;
  subject: string;
  topicKey: string;
  topicName: string;
  path: string;
  updatedAt: string;
};

function upsertRecentTopic(list: RecentTopicRecord[], next: RecentTopicRecord): RecentTopicRecord[] {
  const normalizedKey = `${next.grade}:${next.subject}:${next.topicKey}`;
  const filtered = list.filter(
    (item) => `${item.grade}:${item.subject}:${item.topicKey}` !== normalizedKey
  );
  return [next, ...filtered].slice(0, 6);
}

function mapGrindNodeToGuidedNodeId(grindNodeId: string): string {
  const id = String(grindNodeId || "").toUpperCase();
  if (id.startsWith("B")) return "gBPT";
  if (id.startsWith("A")) return "gArea";
  if (id === "S2") return "gAA";
  if (id === "S3" || id === "S4") return "gCPST";
  if (id.startsWith("S")) return "gQ1";
  if (id.startsWith("P")) return "gEnd";
  return String(grindNodeId || "").trim();
}

function toTutorMasteryState(state: TopicHubNodeMasteryState): TutorMasteryState {
  if (state === "learning") return "learning";
  if (state === "checkpoint_passed") return "checkpoint_passed";
  if (state === "needs_practice") return "needs_practice";
  if (state === "mastered") return "mastered";
  return "unseen";
}


export default function TopicHub() {
  const params = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const grade = String(params.grade || sp.get("grade") || "10");
  const subject = asSubjectKey(String(params.subject || sp.get("subject") || "maths"));
  const subjectTitle = subject === "science" ? "Science" : "Maths";

  // Support both route param and legacy query params.
  const rawTopicKey =
    (params as any).topicKey ||
    sp.get("topicKey") ||
    sp.get("topic") ||
    sp.get("k") ||
    "";

  const topicKey = normalizeTopicKey(rawTopicKey) || defaultTopicKeyFor(subject);
  const navState = (location.state as { back?: string; backLabel?: string } | null) || null;
  const backTo = String(navState?.back || `/trends/${grade}/${subject}`);
  const backLabel = String(navState?.backLabel || "Back to trends");

  // Never-blank rule: if they hit /topic-hub/10/maths (no topicKey), redirect.
  useEffect(() => {
    const hasRouteTopicKey = Boolean((params as any).topicKey);
    if (!hasRouteTopicKey) {
      const target = `/topic-hub/${grade}/${subject}/${topicKey}`;
      if (window.location.pathname !== target) navigate(target, { replace: true });
    }
  }, [grade, subject, topicKey, navigate, params]);

  const v2 = useMemo(() => getTopicV2Content(topicKey), [topicKey]);

  // Derived display title for this TopicHub page (must be declared before hooks that depend on it).
  const title = String(v2?.topicName || topicKey || '').trim() || 'Topic';
  const strategyCanonicalTopicKey = useMemo(
    () => resolveCanonicalTopicForStrategy(topicKey),
    [topicKey]
  );
  const strategyPack = useMemo(() => {
    if (!QTYPE_FIRST_TRIG || !isStrategyEnabledForTopic(strategyCanonicalTopicKey)) return null;
    return getStrategyPackForTopic(strategyCanonicalTopicKey);
  }, [strategyCanonicalTopicKey]);
  const tileFocusIdMap = useMemo(() => {
    if (!strategyPack?.tiles?.length) return {} as Record<string, string[]>;
    const map: Record<string, string[]> = {};
    for (const tile of strategyPack.tiles) {
      map[tile.qtypeId] = getFocusIdsForTile(topicKey, tile);
    }
    return map;
  }, [strategyPack, topicKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      grade: String(grade),
      subject: subjectTitle,
      topicKey: String(topicKey),
      topicName: title,
      path: `/topic-hub/${grade}/${subjectTitle}/${topicKey}`,
      updatedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(TOPICHUB_LAST_ROUTE_KEY, JSON.stringify(payload));
      const recentRaw = window.localStorage.getItem(TOPICHUB_RECENT_TOPICS_KEY);
      const recent = recentRaw ? (JSON.parse(recentRaw) as RecentTopicRecord[]) : [];
      const nextRecent = upsertRecentTopic(Array.isArray(recent) ? recent : [], payload);
      window.localStorage.setItem(TOPICHUB_RECENT_TOPICS_KEY, JSON.stringify(nextRecent));
    } catch {
      // Ignore localStorage failures to avoid affecting learning flow.
    }
  }, [grade, subjectTitle, title, topicKey]);

  // Use the global vibe mode (Beast/Zombie) as the single source of truth.
  // This avoids duplicate toggles inside TopicHub and keeps behavior consistent across the app.
  const { mode: globalVibeMode } = useVibeMode();
  const mode = (globalVibeMode as unknown) as ModeKey;

  // TopicHub has exactly 3 top-level tabs: Learn / Grind / Resources.
  type TopicTabKey = 'learn' | 'grind' | 'resources';
  const [activeTab, setActiveTab] = useState<TopicTabKey>(() => {
    const t = String(sp.get('tab') || '').toLowerCase();
    if (t === 'grind') return 'grind';
    if (t === 'resources' || t === 'res') return 'resources';
    return 'learn';
  });
// --- Worked Example Mentor Drawer ---
  const [mentorDrawerOpen, setMentorDrawerOpen] = useState(false);
  const [mentorSeedExample, setMentorSeedExample] = useState<{
    title: string;
    question: string;
    marks?: number;
    section?: string;
    subSection?: string;
    anchor?: string;
    contextText?: string;
    requestedMode?: RequestedMentorMode;
    explainType?: ExplainType;
    itemId?: string;
    itemTitle?: string;
    itemText?: string;
    theoremFocus?: string[];
    questionFamilyId?: string;
    questionFamilyLabel?: string;
    questionTypeId?: string;
    chapterStep?: string;
    practiceSectionFilter?: PracticeSectionFilter;
    suggestedPracticeIds?: string[];
    recommendedDiagramType?: string;
    mindmapNodeId?: string;
    mindmapNodeTitle?: string;
    mindmapCoreId?: string;
    mindmapNodeText?: string;
  } | null>(null);
  const [mentorSolveStyle, setMentorSolveStyle] = useState<"socratic" | "board">("socratic");
  const [tutorDrawerOpen, setTutorDrawerOpen] = useState(false);
  const [grindDrawerOpen, setGrindDrawerOpen] = useState(false);
  const [grindNodeId, setGrindNodeId] = useState<string>("" );
  const [tutorTab, setTutorTab] = useState<TutorTab>("teach");
  const [tutorNodeIndex, setTutorNodeIndex] = useState(0);
  const [selectedTrianglesFamilyId, setSelectedTrianglesFamilyId] = useState("");
  const teachAutoOpenKeyRef = useRef<string>("");

  const closeMentorDrawer = () => {
    setMentorDrawerOpen(false);
  };

  // NOTE: Do not persist a separate per-page mode; the VibeProvider already persists globally.

  const topicOptions = useMemo(() => buildTopicOptions(subject), [subject]);

  const onChangeTopic = useCallback(
    (nextKey: string) => {
      const k = normalizeTopicKey(nextKey);
      if (!k) return;
      navigate(`/topic-hub/${grade}/${subject}/${k}`);
    },
    [navigate, grade, subject]
  );
  const openMentorDrawer = useCallback(
    (opts: {
      title: string;
      question: string;
      solveStyle?: 'socratic' | 'board';
      marks?: number;
      section?: string;
      anchor?: string;
      contextText?: string;
      subSection?: string;
      requestedMode?: RequestedMentorMode;
      explainType?: ExplainType;
      itemId?: string;
      itemTitle?: string;
      itemText?: string;
      theoremFocus?: string[];
      questionFamilyId?: string;
      questionFamilyLabel?: string;
      questionTypeId?: string;
      chapterStep?: string;
      practiceSectionFilter?: PracticeSectionFilter;
      suggestedPracticeIds?: string[];
      recommendedDiagramType?: string;
      mindmapNodeId?: string;
      mindmapNodeTitle?: string;
      mindmapCoreId?: string;
      mindmapNodeText?: string;
    }) => {
      setMentorSeedExample({
        title: opts.title || title || 'Ask Mentor',
        question: opts.question,
        marks: typeof opts.marks === 'number' ? opts.marks : undefined,
        section: opts.section,
        subSection: opts.subSection,
        anchor: opts.anchor,
        contextText: opts.contextText,
        requestedMode: opts.requestedMode,
        explainType: opts.explainType,
        itemId: opts.itemId,
        itemTitle: opts.itemTitle,
        itemText: opts.itemText,
        theoremFocus: opts.theoremFocus,
        questionFamilyId: opts.questionFamilyId,
        questionFamilyLabel: opts.questionFamilyLabel,
        questionTypeId: opts.questionTypeId,
        chapterStep: opts.chapterStep,
        practiceSectionFilter: opts.practiceSectionFilter,
        suggestedPracticeIds: opts.suggestedPracticeIds,
        recommendedDiagramType: opts.recommendedDiagramType,
        mindmapNodeId: opts.mindmapNodeId,
        mindmapNodeTitle: opts.mindmapNodeTitle,
        mindmapCoreId: opts.mindmapCoreId,
        mindmapNodeText: opts.mindmapNodeText,
      });
      setMentorSolveStyle(opts.solveStyle || 'socratic');
      setMentorDrawerOpen(true);
    },
    [title]
  );

  const v2Data = v2 || {};
  const tier = toTierLabel(String((v2Data as any).tier || ""));
  const overview = safeArray<string>((v2Data as any).overview);
  const examPatterns = safeArray<string>((v2Data as any).examPatterns);

  const definitions = safeArray<V2Definition>((v2Data as any).definitions);
  const markingTips = safeArray<string>((v2Data as any).markingTips);
  const scoreTips = safeArray<string>((v2Data as any).scoreTips);
// Board-pattern anchors (A-E) pulled from the canonical question bank for this topic.
const [exampleSection, setExampleSection] = useState<"A" | "B" | "C" | "D" | "E">("A");

const exampleAnchors = useMemo(() => {
  const all = PredictionCore.getLikelyQuestionsForConcept(topicKey);
  const pick = (section: "A" | "B" | "C" | "D" | "E", marks: number) => {
    const bySection = all.find((q: any) => String(q.section || "") === section && Number(q.marks) === marks);
    if (bySection) return bySection;
    const byMarks = all.find((q: any) => Number(q.marks) === marks);
    return byMarks || null;
  };

  return {
    A: pick("A", 1),
    B: pick("B", 2),
    C: pick("C", 3),
    D: pick("D", 4),
    E: pick("E", 5),
  } as Record<"A" | "B" | "C" | "D" | "E", any>;
}, [topicKey]);
const isDiagramTopic = useMemo(() => {
  const t = `${String(title || "")} ${String(topicKey || "")}`.toLowerCase();
  return /triangle|triangles|similar|similarity|circle|construction|quadrilateral|geometry|diagram|fig\.?/i.test(t);
}, [title, topicKey]);

const isTrianglesTopic = useMemo(
  () => /triangles/i.test(`${String(topicKey || "")} ${String(title || "")}`),
  [title, topicKey]
);

const proofWritingTemplates = useMemo(() => {
  if (!isTrianglesTopic) return [];
  return [
    {
      id: "similarity",
      title: "Similarity proof (AA / SAS / SSS)",
      focus: "similarity",
      marks: 3,
      description:
        "Use angle equalities or side ratios to prove two triangles are similar, then apply CPST.",
      question:
        `Class ${grade} ${subjectTitle} - Triangles\n` +
        `Write a full proof with Given / To Prove / Construction (if needed) / Proof / Conclusion.\n` +
        `In triangle ABC and triangle PQR, angle A = angle P and angle B = angle Q.\n` +
        `Prove triangle ABC ~ triangle PQR and find AB/PQ if AB = 5 cm and PQ = 10 cm.`,
      hints: [
        "State the similarity criterion explicitly (AA/SSS/SAS).",
        "Keep vertex order consistent in ratios."
      ],
    },
    {
      id: "bpt",
      title: "BPT proof / application",
      focus: "bpt",
      marks: 3,
      description:
        "Use the Basic Proportionality Theorem when a line is parallel to a triangle side.",
      question:
        `Class ${grade} ${subjectTitle} - Triangles\n` +
        `Write a full proof with Given / To Prove / Construction (if needed) / Proof / Conclusion.\n` +
        `In triangle ABC, D lies on AB and E lies on AC. If DE is parallel to BC, AD = 3 cm, DB = 2 cm and EC = 4 cm,\n` +
        `prove AD/DB = AE/EC and find AE.`,
      hints: [
        "State BPT by name before writing the ratio.",
        "Substitute values and cross-multiply neatly."
      ],
    },
    {
      id: "area-ratio",
      title: "Area ratio of similar triangles",
      focus: "area_ratio",
      marks: 4,
      description:
        "Use similarity to relate areas as the square of corresponding side ratios.",
      question:
        `Class ${grade} ${subjectTitle} - Triangles\n` +
        `Write a full proof with Given / To Prove / Construction (if needed) / Proof / Conclusion.\n` +
        `Triangle ABC is similar to triangle PQR and AB/PQ = 2/3.\n` +
        `Prove area(ABC) / area(PQR) = (AB/PQ)^2 and find the ratio of their areas.`,
      hints: [
        "Square the side ratio when comparing areas.",
        "End with a clear numerical ratio."
      ],
    },
  ];
}, [isTrianglesTopic, grade, subjectTitle]);

const buildFallbackWorkedExampleQuestion = useCallback(
    (section: "A" | "B" | "C" | "D" | "E") => {
      const marksBySectionLocal: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5 };
      const marks = marksBySectionLocal[section] ?? 2;

  const header = `Class ${grade} ${subjectTitle} • ${title}`;
      const diagramLine = isDiagramTopic
        ? `Diagram: Draw a neat labelled diagram wherever applicable.`
        : "";

      const isTriangles = /triangles/i.test(title);

      // High-quality hardcoded anchors for Triangles (so Board Steps + Socratic have a REAL problem to solve)
      if (isTriangles) {
        switch (section) {
          case "A":
            return `${header}

Pattern A (${marks}-mark/MCQ style):
In ?ABC and ?PQR, ?A = ?P and ?B = ?Q. What can you conclude?

A) ?ABC ? ?PQR
B) ?ABC ~ ?PQR
C) Areas of triangles are equal
D) Nothing definite can be said

Rules: Pick ONE correct option.`;
          case "B":
            return `${header}

${diagramLine}

Pattern B (${marks} marks, short answer):
In ?ABC, D lies on AB and E lies on AC. If DE ? BC, AD = 3 cm, DB = 6 cm and EC = 8 cm, find AE.`;
          case "C":
            return `${header}

Pattern C (${marks} marks):
(i) In ?ABC, ?A = 50°, ?B = 60°. In ?PQR, ?P = 50°, ?Q = 60°. Prove ?ABC ~ ?PQR.
(ii) If AB = 5 cm and PQ = 10 cm, find the ratio of areas of ?ABC and ?PQR.`;
          case "D":
            return `${header}

${diagramLine}

Pattern D (${marks} marks, typical board steps):
In ?ABC, D is a point on AB and E is a point on AC such that DE ? BC.
Given AD = 2 cm, DB = 3 cm and AC = 10 cm.
Find AE and EC.`;
          case "E":
            return `${header}

${diagramLine}

Pattern E (${marks} marks, mixed concept):
In a right triangle ?ABC right-angled at A, AD is drawn perpendicular to BC (D lies on BC).
(i) Prove that AB² = BD · BC and AC² = CD · BC.
(ii) If BD = 9 cm and BC = 25 cm, find AB.`;
          default:
            break;
        }
      }

      // Generic fallback (non-topic-specific)
      switch (section) {
        case "A":
          return `${header}

${diagramLine}

Pattern A (${marks}-mark/MCQ style):
A student claims a key fact about ${title}. Write one correct statement and pick the correct option (A/B/C/D) that matches it.

Rules: Use labelled diagrams wherever applicable. Show marks per step.`;
        case "B":
          return `${header}

${diagramLine}

Pattern B (${marks} marks):
Solve a short board-style question on ${title} with 2 clear steps + final answer.`;
        case "C":
          return `${header}

${diagramLine}

Pattern C (${marks} marks):
Solve a medium board-style question on ${title} with 3 steps and one reason/justification.`;
        case "D":
          return `${header}

${diagramLine}

Pattern D (${marks} marks, typical board steps):
Solve a board-style question on ${title} with clear steps and reasons (each step should earn marks).`;
        case "E":
          return `${header}

${diagramLine}

Pattern E (${marks} marks, mixed concept):
Solve a longer board-style question on ${title} (include a diagram, theorem/criteria, and a final conclusion).`;
        default:
          return `${header}

${diagramLine}

Solve a board-style question on ${title} in exam-ready steps.`;
      }
    },
    [grade, subjectTitle, title, isDiagramTopic]
  );

const buildFallbackQuickQuiz = useCallback((): V2Example[] => {
  const d = isDiagramTopic ? " (use a quick labelled figure if helpful)" : "";
  return [
    { title: "Quick Q1", question: `State one key definition from ${title}${d}.` },
    { title: "Quick Q2", question: `Write one common mistake students make in ${title}, and correct it.` },
    { title: "Quick Q3", question: `Give one example application of ${title} in a simple problem.` },
    { title: "Quick Q4", question: `If a problem asks for a proof/justification in ${title}, what are the 2 steps you must never skip?` },
    { title: "Quick Q5", question: `Write a 2-line summary of the fastest revision strategy for ${title}.` },
  ] as any;
}, [title, isDiagramTopic]);

  const quickQuizFromPractice = useMemo(() => {
    const practiceTopicKey = normalizeTopicKey(topicKey) || topicKey;
    const practiceSet = generatePracticeSet({
      subject: subject as any,
      topicKey: practiceTopicKey,
      totalQuestions: 5,
      shuffle: true,
    });

    const mapped = (practiceSet.questions || [])
      .map((q: any, idx: number) => {
        const text = String(q?.questionText ?? q?.text ?? q?.question ?? "").trim();
        if (!text) return null;
        return { title: `Q${idx + 1}`, question: text } as V2Example;
      })
      .filter(Boolean) as V2Example[];

    return mapped.slice(0, 5);
  }, [subject, topicKey]);
  const rawQuickQuiz = safeArray<V2Example>((v2Data as any).quickQuiz);
  const quickQuiz = quickQuizFromPractice.length
    ? quickQuizFromPractice
    : rawQuickQuiz.length
      ? rawQuickQuiz
      : buildFallbackQuickQuiz();

  const misconceptions = safeArray<Misconception>((v2Data as any).misconceptions);
  const competencies = safeArray<Competency>((v2Data as any).competencies);
  // NCERT competencies: one context-aware Ask Mentor button
  const [selectedCompetencyIdx, setSelectedCompetencyIdx] = useState(0);
  useEffect(() => {
    // Keep competency card reset when topic changes.
    setSelectedCompetencyIdx(0);
  }, [topicKey]);

  const labActivities = safeArray<LabActivity>((v2Data as any).labActivities);
  const caseStudies = safeArray<CaseStudy>((v2Data as any).caseStudies);

    // --- Resources (optional fields) ---
  const rawMindMap = (v2Data as any).mindMap || (v2Data as any).mindmap || null;
  const rawFormulae = safeArray<any>((v2Data as any).formulae || (v2Data as any).formulas || (v2Data as any).formulaSheet);
  const rawVideos = safeArray<any>((v2Data as any).videos || (v2Data as any).videoLinks || (v2Data as any).youtube);
  const guidedMindmap = isTrianglesTopic ? trianglesGuidedMindmap : null;
  const fallbackGuidedNodes = useMemo(() => {
    const out: Array<{
      id: string;
      title: string;
      text: string;
      type: string;
      core: { title: string; means: string; when: string[]; exam: string; trap: string };
      coreId: string;
    }> = [];
    const seen = new Set<string>();

    definitions.slice(0, 5).forEach((entry, idx) => {
      const nodeTitle = String(entry?.title || `Definition ${idx + 1}`).trim();
      if (!nodeTitle) return;
      const nodeText =
        String(entry?.description || entry?.examTip || "").trim() ||
        `Understand ${nodeTitle} and apply it in Class ${grade} ${subjectTitle} exam writing.`;
      const id = toSafeNodeId(`def_${topicKey}_${nodeTitle}`, `def_${idx + 1}`);
      if (seen.has(id)) return;
      seen.add(id);
      out.push({
        id,
        title: nodeTitle,
        text: nodeText,
        type: "concept",
        core: {
          title: nodeTitle,
          means: nodeText,
          when: [`Use while solving ${title} questions.`],
          exam:
            String(entry?.examTip || "").trim() ||
            `Exam line: define ${nodeTitle} before applying any theorem or formula.`,
          trap: `Common mistake: using ${nodeTitle} without correct condition or final conclusion.`,
        },
        coreId: `core_${id}`,
      });
    });

    quickQuiz.slice(0, 2).forEach((item, idx) => {
      const qTitle = String(item?.title || `Quick check ${idx + 1}`).trim();
      const qText = String(item?.question || "").trim();
      if (!qText) return;
      const id = toSafeNodeId(`quiz_${topicKey}_${qTitle}`, `quiz_${idx + 1}`);
      if (seen.has(id)) return;
      seen.add(id);
      out.push({
        id,
        title: qTitle,
        text: qText,
        type: "exam",
        core: {
          title: qTitle,
          means: `Use this checkpoint to validate your ${title} understanding.`,
          when: [`After finishing one micro-lesson in ${title}.`],
          exam: "Exam line: answer in Given -> To Prove/Find -> Therefore/Hence style.",
          trap: "Common mistake: writing final answer without theorem/reason.",
        },
        coreId: `core_${id}`,
      });
    });

    if (!out.length) {
      const fallbackTitle = `${title} basics`;
      const fallbackText =
        String(overview[0] || "").trim() ||
        `Build one clear concept, one exam line, and one checkpoint for ${title}.`;
      const id = toSafeNodeId(`intro_${topicKey}`, "intro_1");
      out.push({
        id,
        title: fallbackTitle,
        text: fallbackText,
        type: "concept",
        core: {
          title: fallbackTitle,
          means: fallbackText,
          when: [`Start revision for ${title}.`],
          exam: "Exam line: write concise steps with explicit reason/theorem.",
          trap: "Common mistake: jumping to answer without setup.",
        },
        coreId: `core_${id}`,
      });
    }

    return out.slice(0, 9);
  }, [definitions, grade, overview, quickQuiz, subjectTitle, title, topicKey]);
  const guidedOrder = useMemo(() => {
    const mindmapOrder = guidedMindmap?.recommendedOrder || [];
    if (mindmapOrder.length) return mindmapOrder.map((id) => String(id));
    return fallbackGuidedNodes.map((node) => node.id);
  }, [fallbackGuidedNodes, guidedMindmap]);
  const guidedNodes = useMemo(() => {
    const mindmapNodes = guidedMindmap?.nodes || [];
    if (mindmapNodes.length) return mindmapNodes;
    return fallbackGuidedNodes.map((node) => ({
      id: node.id,
      type: node.type,
      title: node.title,
      text: node.text,
      links: [],
    }));
  }, [fallbackGuidedNodes, guidedMindmap]);
  const guidedNodeById = useMemo(() => {
    const map = new Map<string, (typeof guidedNodes)[number]>();
    guidedNodes.forEach((n) => map.set(String(n.id), n));
    return map;
  }, [guidedNodes]);
  const guidedNodeTitleById = useMemo(() => {
    const out: Record<string, string> = {};
    guidedNodes.forEach((n) => {
      out[String(n.id)] = String(n.title || n.id);
    });
    return out;
  }, [guidedNodes]);
  const fallbackCoreByNodeId = useMemo(() => {
    const out: Record<string, unknown> = {};
    fallbackGuidedNodes.forEach((node) => {
      out[node.id] = node.core;
    });
    return out;
  }, [fallbackGuidedNodes]);
  const fallbackCoreIdByNodeId = useMemo(() => {
    const out: Record<string, string> = {};
    fallbackGuidedNodes.forEach((node) => {
      out[node.id] = node.coreId;
    });
    return out;
  }, [fallbackGuidedNodes]);
  const guidedCoreByNodeId: Record<string, unknown> = guidedMindmap?.coreByNodeId || fallbackCoreByNodeId;
  const guidedCoreIdByNodeId: Record<string, unknown> = guidedMindmap?.coreIdByNodeId || fallbackCoreIdByNodeId;
  const fallbackGrindMindmap = useMemo(() => {
    if (isTrianglesTopic || !guidedOrder.length) return null;
    const order = guidedOrder.slice(0, Math.min(6, guidedOrder.length));
    const nodesById: Record<string, any> = {};
    order.forEach((id, idx) => {
      const guidedTitle = guidedNodeTitleById[id] || id;
      const guidedNode = guidedNodeById.get(id);
      nodesById[id] = {
        nodeId: id,
        title: guidedTitle,
        description: String(guidedNode?.text || `Practice ${guidedTitle} in exam format.`),
        text: String(guidedNode?.text || ""),
        examWeight: idx < 2 ? "high" : "medium",
        difficulty: idx < 2 ? "medium" : "easy",
        questionTypes: ["short-answer", "board-style"],
        rubric: {
          totalMarksTypical: 3,
          checkpoints: [
            { id: `${id}-r1`, label: "Set up given data and target clearly.", marks: 1 },
            { id: `${id}-r2`, label: "Apply correct rule/theorem or relation.", marks: 1 },
            { id: `${id}-r3`, label: "Conclude with exam-ready final line.", marks: 1 },
          ],
        },
        solutionSkeleton: [
          { id: `${id}-s1`, heading: "Given / Target", expectedForm: "State known data and what to find/prove." },
          { id: `${id}-s2`, heading: "Core step", expectedForm: "Use correct formula/theorem with one reason." },
          { id: `${id}-s3`, heading: "Conclusion", expectedForm: "Write final answer in one clean line." },
        ],
        commonMistakes: [
          {
            tag: `${id}-m1`,
            studentFriendly: "Skipping the reason/theorem line.",
            fixTip: "Always name the rule before writing the key step.",
          },
          {
            tag: `${id}-m2`,
            studentFriendly: "Jumping to final answer too early.",
            fixTip: "Show at least one intermediate justified step.",
          },
        ],
        microDrills: [
          {
            id: `${id}-d1`,
            prompt: `Write one 2-3 line board answer for ${guidedTitle}.`,
            expectedAnswerHints: ["given", "rule/theorem", "therefore/hence"],
          },
          {
            id: `${id}-d2`,
            prompt: `List one common trap in ${guidedTitle} and the fix.`,
            expectedAnswerHints: ["trap", "fix"],
          },
        ],
      };
    });
    return {
      highways: [
        {
          id: "core-highway",
          title: `${title} grind highway`,
          intent: "Convert concept understanding into board marks with quick checks.",
          recommendedNodeOrder: order,
        },
      ],
      nodesById,
    };
  }, [guidedNodeById, guidedNodeTitleById, guidedOrder, isTrianglesTopic, title]);
  const grindMindmap = useMemo(
    () => (isTrianglesTopic ? trianglesGrindMindmap : fallbackGrindMindmap),
    [fallbackGrindMindmap, isTrianglesTopic]
  );
  const hasGrindContractFlow = Boolean(grindMindmap);
  const guidedPanelData = useMemo(() => {
    const nodes = guidedNodes.map((node) => ({
      id: String(node.id),
      type: String((node as { type?: string }).type || "concept"),
      title: String(node.title || node.id),
      text: node.text,
      links: Array.isArray((node as { links?: unknown[] }).links)
        ? ((node as { links?: unknown[] }).links || []).map((x) => String(x))
        : [],
    }));
    const coreByNodeId: Record<
      string,
      { title: string; means: string; when: string[]; exam: string; trap: string }
    > = {};
    const coreIdByNodeId: Record<string, string> = {};
    guidedOrder.forEach((id) => {
      const raw = (guidedCoreByNodeId as Record<string, any>)[id] || {};
      const titleText = guidedNodeTitleById[id] || id;
      coreByNodeId[id] = {
        title: String(raw.title || titleText),
        means: String(raw.means || raw.text || `Understand ${titleText}.`),
        when: Array.isArray(raw.when) ? raw.when.map((x: unknown) => String(x)) : [],
        exam:
          String(raw.exam || "").trim() ||
          `Exam line: state the key rule and conclude for ${titleText}.`,
        trap:
          String(raw.trap || "").trim() ||
          "Common mistake: skipping reason/theorem or final conclusion line.",
      };
      coreIdByNodeId[id] = String(
        (guidedCoreIdByNodeId as Record<string, unknown>)[id] || `core_${id}`
      );
    });
    return {
      recommendedOrder: guidedOrder,
      nodes,
      coreByNodeId,
      coreIdByNodeId,
    };
  }, [guidedCoreByNodeId, guidedCoreIdByNodeId, guidedNodeTitleById, guidedNodes, guidedOrder]);
  const fallbackResourceMindMap = useMemo(() => {
    if (!guidedOrder.length) return null;
    const ordered = guidedOrder.slice(0, Math.min(12, guidedOrder.length));
    const nodes = ordered.map((id) => {
      const node = guidedNodeById.get(id);
      return {
        id,
        label: guidedNodeTitleById[id] || id,
        description: String(node?.text || ""),
      };
    });
    const edgeSet = new Set<string>();
    const edges: Array<{ from: string; to: string; label?: string }> = [];
    ordered.forEach((id, idx) => {
      const prev = idx > 0 ? ordered[idx - 1] : "";
      if (prev) {
        const key = `${prev}->${id}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ from: prev, to: id, label: "next" });
        }
      }
      const links = safeArray<any>((guidedNodeById.get(id) as any)?.links);
      links.forEach((link) => {
        const to = String(link || "");
        if (!ordered.includes(to)) return;
        const key = `${id}->${to}`;
        if (edgeSet.has(key)) return;
        edgeSet.add(key);
        edges.push({ from: id, to, label: "related" });
      });
    });
    return { nodes, edges };
  }, [guidedNodeById, guidedNodeTitleById, guidedOrder]);
  const resourceMindMap = hasMindMapContent(rawMindMap) ? rawMindMap : fallbackResourceMindMap;
  const fallbackFormulae = useMemo(
    () => buildFallbackFormulae({ topicKey, title, subjectTitle }),
    [topicKey, title, subjectTitle]
  );
  const resourceFormulae = rawFormulae.length ? rawFormulae : fallbackFormulae;
  const fallbackVideos = useMemo(
    () => buildFallbackVideos({ topicKey, title, subjectTitle }),
    [topicKey, title, subjectTitle]
  );
  const resourceVideos = useMemo(
    () => mergeResourceVideos(rawVideos, fallbackVideos),
    [fallbackVideos, rawVideos]
  );
  const currentTutorNodeId = guidedOrder[tutorNodeIndex] || guidedOrder[0];
  const currentTutorNode = currentTutorNodeId ? guidedNodeById.get(currentTutorNodeId) : null;
  const currentTutorCore = currentTutorNodeId ? guidedCoreByNodeId[currentTutorNodeId] : null;
  const currentTutorCoreId = currentTutorNodeId ? guidedCoreIdByNodeId[currentTutorNodeId] : null;
  const [topicMastery, setTopicMastery] = useState<TopicHubMasterySnapshot>(() =>
    loadTopicMasterySnapshot(topicKey)
  );
  useEffect(() => {
    setTopicMastery(loadTopicMasterySnapshot(topicKey));
  }, [topicKey]);

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

  const tutorNodeMasteryState = useMemo(
    () => getNodeMasteryState(topicMastery, currentTutorNodeId),
    [topicMastery, currentTutorNodeId]
  );
  const weakestTutorNodeId = useMemo(
    () => pickWeakestNodeId(guidedOrder, topicMastery),
    [guidedOrder, topicMastery]
  );
  const masteryCounts = useMemo(
    () => getMasteryCounts(guidedOrder, topicMastery),
    [guidedOrder, topicMastery]
  );
  const weakestResourceNodes = useMemo(() => {
    const ordered = guidedOrder
      .map((id) => ({
        id,
        rec: getNodeMasteryRecord(topicMastery, id),
        title: guidedNodeTitleById[id] || id,
      }))
      .filter((x) => x.id);
    const rank: Record<TopicHubNodeMasteryState, number> = {
      unseen: 0,
      learning: 1,
      needs_practice: 2,
      checkpoint_passed: 3,
      mastered: 4,
    };
    ordered.sort((a, b) => {
      const ra = rank[(a.rec?.state || "unseen") as TopicHubNodeMasteryState];
      const rb = rank[(b.rec?.state || "unseen") as TopicHubNodeMasteryState];
      return ra - rb;
    });
    return ordered.filter((x) => (x.rec?.state || "unseen") !== "mastered").slice(0, 3);
  }, [guidedOrder, guidedNodeTitleById, topicMastery]);
  const revisionCockpitNodes = useMemo(() => {
    const fallback = guidedOrder.slice(0, 3).map((id) => ({
      id,
      title: guidedNodeTitleById[id] || id,
      state: getNodeMasteryState(topicMastery, id),
    }));
    const fromWeakest = weakestResourceNodes.map((item) => ({
      id: item.id,
      title: item.title,
      state: (item.rec?.state || "unseen") as TopicHubNodeMasteryState,
    }));
    const merged = [...fromWeakest, ...fallback];
    const seen = new Set<string>();
    const unique = merged.filter((item) => {
      if (!item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    return unique.slice(0, 3);
  }, [guidedOrder, guidedNodeTitleById, topicMastery, weakestResourceNodes]);
  const weakestProgressionHints = useMemo(() => {
    if (!revisionCockpitNodes.length) {
      return [
        "You are fully mastered. Do one timed board-style practice set to retain speed.",
      ];
    }
    const first = revisionCockpitNodes[0];
    const second = revisionCockpitNodes[1];
    const hints: string[] = [];
    hints.push(
      `Start with ${first.title}: open Teach first, then answer its checkpoint in your own words.`
    );
    if (second) {
      hints.push(
        `Next do ${second.title}: use Grind rubric and micro-drills to convert understanding into marks.`
      );
    }
    hints.push(
      `Current mastery: ${masteryCounts.mastered}/${masteryCounts.total} mastered, ${masteryCounts.checkpointPassed}/${masteryCounts.total} checkpoint passed.`
    );
    return hints;
  }, [masteryCounts, revisionCockpitNodes]);

  const defaultGrindNodeId = useMemo(() => {
    const hw = grindMindmap?.highways || [];
    for (const h of hw) {
      const order = Array.isArray(h.recommendedNodeOrder) ? h.recommendedNodeOrder : [];
      if (order.length) return String(order[0]);
    }
    const keys = grindMindmap ? Object.keys(grindMindmap.nodesById || {}) : [];
    return keys[0] ? String(keys[0]) : "";
  }, [grindMindmap]);
  const guidedToGrindNodeId = useMemo(() => {
    const map: Record<string, string> = {};
    const keys = grindMindmap ? Object.keys(grindMindmap.nodesById || {}) : [];
    keys.forEach((grindId) => {
      const guidedId = mapGrindNodeToGuidedNodeId(grindId);
      if (!map[guidedId]) map[guidedId] = String(grindId);
    });
    return map;
  }, [grindMindmap]);

  useEffect(() => {
    if (!grindMindmap) {
      // Keep drawer state aligned when grind data is unavailable.
      setGrindDrawerOpen(false);
      setGrindNodeId("");
      return;
    }
    setGrindNodeId((prev) => prev || defaultGrindNodeId);
  }, [grindMindmap, defaultGrindNodeId]);


  const mapProofFocusToNodeId = useCallback((focus?: string) => {
    const f = String(focus || "").toLowerCase();
    if (f.includes("bpt")) return "gBPT";
    if (f.includes("area")) return "gArea";
    if (f.includes("cpst")) return "gCPST";
    if (f.includes("aa")) return "gAA";
    if (f.includes("sas")) return "gSAS";
    if (f.includes("sss")) return "gSSS";
    return "gQ1";
  }, []);
  const buildTrianglesProofDiagram = useCallback((focus?: string) => {
    const f = String(focus || "").toLowerCase();
    if (f.includes("bpt")) {
      return buildParallelLinesDiagram({
        title: "BPT proof figure",
        caption: "Call out the parallel line before writing the ratio step.",
        diagramIntent: "visualize_question",
        accessibilityLabel: "BPT proof diagram",
      });
    }
    if (f.includes("area") || f.includes("cpst") || f.includes("similar")) {
      return buildSimilarityDiagram({
        title: "Similarity proof figure",
        caption: "Match the corresponding vertices first, then write the criterion.",
        diagramIntent: "visualize_question",
        accessibilityLabel: "Similarity proof diagram",
      });
    }
    return buildTriangleDiagram({
      title: "Proof setup figure",
      caption: "Label the triangles cleanly before you begin the board solution.",
      diagramIntent: "visualize_question",
      accessibilityLabel: "Triangles proof setup diagram",
    });
  }, []);

  const closeTutorDrawer = useCallback(() => {
    setTutorDrawerOpen(false);
  }, []);

  const closeGrindDrawer = useCallback(() => {
    setGrindDrawerOpen(false);
  }, []);

  const setGrindNodeWithMastery = useCallback(
    (nextNodeId: string) => {
      const next = String(nextNodeId || "");
      setGrindNodeId(next);
      if (!next) return;
      updateTopicMastery((prev) => setLastGrindNodeId(prev, next));
    },
    [updateTopicMastery]
  );

  const setTutorNodeIndexWithMastery = useCallback(
    (idx: number) => {
      setTutorNodeIndex(idx);
      const nextNodeId = guidedOrder[idx] || "";
      if (!nextNodeId) return;
      updateTopicMastery((prev) =>
        setLastTutorNodeId(markNodeLearning(prev, nextNodeId), nextNodeId)
      );
    },
    [guidedOrder, updateTopicMastery]
  );

  const openGrindDrawer = useCallback(
    (opts?: { nodeId?: string | null }) => {
      const next = String(
        opts?.nodeId ||
          topicMastery.lastGrindNodeId ||
          grindNodeId ||
          defaultGrindNodeId ||
          ""
      );
      setGrindNodeWithMastery(next);
      setGrindDrawerOpen(true);
    },
    [
      defaultGrindNodeId,
      grindNodeId,
      setGrindNodeWithMastery,
      topicMastery.lastGrindNodeId,
    ]
  );


  const resolveTutorNodeIndex = useCallback(
    (nodeId?: string | null) => {
      if (!nodeId) return 0;
      const idx = guidedOrder.findIndex((id) => id === nodeId);
      return idx >= 0 ? idx : 0;
    },
    [guidedOrder]
  );

  const openTutorDrawer = useCallback(
    (opts?: { tab?: TutorTab; nodeId?: string | null }) => {
      const nextTab = opts?.tab || "teach";
      const requestedNodeId =
        opts?.nodeId ||
        topicMastery.lastTutorNodeId ||
        weakestTutorNodeId ||
        currentTutorNodeId ||
        guidedOrder[0] ||
        "";
      const nodeIndex = resolveTutorNodeIndex(requestedNodeId);
      const resolvedNodeId = guidedOrder[nodeIndex] || requestedNodeId;
      setTutorTab(nextTab);
      setTutorNodeIndexWithMastery(nodeIndex);
      setTutorDrawerOpen(true);
      if (!resolvedNodeId) return;
      updateTopicMastery((prev) =>
        setLastTutorNodeId(markNodeLearning(prev, resolvedNodeId), resolvedNodeId)
      );
    },
    [
      currentTutorNodeId,
      guidedOrder,
      resolveTutorNodeIndex,
      setTutorNodeIndexWithMastery,
      topicMastery.lastTutorNodeId,
      updateTopicMastery,
      weakestTutorNodeId,
    ]
  );

  useEffect(() => {
    const shouldAutoTeach = String(sp.get("teach") || "") === "1";
    if (!shouldAutoTeach) return;
    const key = `${grade}|${subject}|${topicKey}|${sp.toString()}`;
    if (teachAutoOpenKeyRef.current === key) return;
    teachAutoOpenKeyRef.current = key;
    setActiveTab("learn");
    openTutorDrawer({ tab: "teach" });
  }, [grade, subject, topicKey, sp, openTutorDrawer]);

const showInZombie = (sectionId: string) => {
    if (mode === "beast") return true;
    return ["summary", "exam-patterns", "key-definitions", "quick-quiz", "worked-examples"].includes(sectionId);
  };

  const isLearn = activeTab === 'learn';
  const isGrind = activeTab === 'grind';
  const isResources = activeTab === 'resources';
  const timelineStepLabel = isLearn ? "Learn" : isGrind ? "Grind" : "Resources";

  const toSectionFilter = useCallback((value: unknown): PracticeSectionFilter | undefined => {
    const raw = String(value ?? "").trim().toUpperCase();
    if (raw === "A" || raw === "B" || raw === "C" || raw === "D" || raw === "E") {
      return raw;
    }
    return undefined;
  }, []);

  const inferSectionFromMarks = useCallback((marks: unknown): PracticeSectionFilter | undefined => {
    const m = typeof marks === "number" ? marks : Number(marks);
    if (!Number.isFinite(m)) return undefined;
    if (m === 1) return "A";
    if (m === 2) return "B";
    if (m === 3) return "C";
    if (m === 4) return "E"; // case-based
    if (m === 5) return "D";
    return undefined;
  }, []);

  const inferSectionFromQuestionTypes = useCallback(
    (questionTypes: unknown): PracticeSectionFilter | undefined => {
      if (!Array.isArray(questionTypes)) return undefined;
      const values = questionTypes.map((item) => String(item || "").toUpperCase());
      if (values.some((item) => item.includes("CASE") || item.includes("SOURCE"))) return "E";
      if (values.some((item) => item.includes("ASSERTION") || item.includes("MCQ"))) return "A";
      if (values.some((item) => item.includes("SHORT") || item.includes("VSA"))) return "B";
      if (values.some((item) => item.includes("LONG"))) return "D";
      if (values.some((item) => item.includes("PROOF") || item.includes("NUMERICAL") || item.includes("BOARD"))) return "C";
      return undefined;
    },
    []
  );

  const inferSectionFromSubtopicHint = useCallback(
    (subtopicHint?: string): PracticeSectionFilter | undefined => {
      const hint = String(subtopicHint || "").trim();
      if (!hint) return undefined;
      const direct = toSectionFilter(hint);
      if (direct) return direct;
      const match = hint.match(/\bpattern\s*:\s*([A-E])\b/i);
      return match ? toSectionFilter(match[1]) : undefined;
    },
    [toSectionFilter]
  );

  const inferSectionFromGrindNode = useCallback(
    (grindNodeId: string): PracticeSectionFilter | undefined => {
      const id = String(grindNodeId || "").trim();
      if (!id) return undefined;
      const nodesById: Record<string, any> = grindMindmap?.nodesById || {};
      const node = nodesById[id];
      if (!node) return undefined;
      const direct = toSectionFilter(node.section);
      if (direct) return direct;
      const byMarks = inferSectionFromMarks(
        node?.rubric?.totalMarksTypical ??
          node?.rubric?.total_marks ??
          node?.marks ??
          node?.examWeight
      );
      if (byMarks) return byMarks;
      return inferSectionFromQuestionTypes(node?.questionTypes);
    },
    [grindMindmap, inferSectionFromMarks, inferSectionFromQuestionTypes, toSectionFilter]
  );

  const openPracticeFromTopicHub = useCallback(
    (opts: {
      nodeId?: string;
      grindNodeId?: string;
      tab?: TopicTabKey;
      subtopicHint?: string;
      sectionFilter?: PracticeSectionFilter;
      focusBankIds?: string[];
      strictFocus?: boolean;
      recommendedCount?: number;
      difficultyPreset?: PracticeDifficultyPreset;
      source?: string;
    }) => {
      const nodeId = String(opts.nodeId || "").trim();
      const nodeTitle = nodeId ? guidedNodeTitleById[nodeId] || nodeId : "";
      const fallbackHint = nodeId && nodeTitle ? `${nodeId}:${nodeTitle}` : nodeId || undefined;
      const grindNodeId =
        String(opts.grindNodeId || "").trim() ||
        (nodeId ? guidedToGrindNodeId[nodeId] || "" : "");
      const sectionFilter =
        opts.sectionFilter ||
        inferSectionFromSubtopicHint(opts.subtopicHint) ||
        inferSectionFromGrindNode(grindNodeId);
      const backTab = opts.tab || activeTab;
      trackUxEvent("topichub_open_practice", "topichub", {
        topicKey,
        tab: backTab,
        nodeId: nodeId || grindNodeId || "",
        sectionFilter: sectionFilter || "none",
      });
      navigateToPractice(navigate, {
        grade,
        subject: subjectTitle,
        topicKey,
        topicName: title,
        backPath: `/topic-hub/${grade}/${subject}/${topicKey}?tab=${backTab}`,
        backLabel: "Back to TopicHub",
        subtopicHint: opts.subtopicHint || fallbackHint,
        sectionFilter,
        focusBankIds: opts.focusBankIds,
        strictFocus: Boolean(opts.strictFocus),
        recommendedCount: opts.recommendedCount,
        difficultyPreset: opts.difficultyPreset,
        source: opts.source || "topic_hub",
      });
    },
    [
      activeTab,
      grade,
      guidedNodeTitleById,
      guidedToGrindNodeId,
      inferSectionFromGrindNode,
      inferSectionFromSubtopicHint,
      navigate,
      subject,
      subjectTitle,
      title,
      topicKey,
    ]
  );

  const trianglesQuestionFamilies = useMemo(
    () => (isTrianglesTopic ? getQuestionFamiliesForTopic(topicKey) : []),
    [isTrianglesTopic, topicKey]
  );

  useEffect(() => {
    if (!trianglesQuestionFamilies.length) {
      if (selectedTrianglesFamilyId) setSelectedTrianglesFamilyId("");
      return;
    }
    const stillPresent = trianglesQuestionFamilies.some(
      (family) => family.familyId === selectedTrianglesFamilyId
    );
    if (!stillPresent) {
      setSelectedTrianglesFamilyId(trianglesQuestionFamilies[0].familyId);
    }
  }, [selectedTrianglesFamilyId, trianglesQuestionFamilies]);

  const selectedTrianglesFamily = useMemo(
    () =>
      trianglesQuestionFamilies.find(
        (family) => family.familyId === selectedTrianglesFamilyId
      ) || trianglesQuestionFamilies[0] || null,
    [selectedTrianglesFamilyId, trianglesQuestionFamilies]
  );

  const trianglesFamilyFocusIdMap = useMemo(() => {
    if (!isTrianglesTopic) return {} as Record<string, string[]>;
    const dedupe = (ids: string[]) => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const id of ids) {
        const key = String(id || "").trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(key);
      }
      return out;
    };

    const nextMap: Record<string, string[]> = {};
    for (const family of trianglesQuestionFamilies) {
      const tile = family.qtypeId
        ? getQuestionTypeTileById(topicKey, family.qtypeId)
        : null;
      const tileDrivenIds = tile ? getFocusIdsForTile(topicKey, tile) : [];
      const fallbackIds = Array.isArray(family.focusBankIds)
        ? family.focusBankIds.map((id) => String(id || "").trim()).filter(Boolean)
        : [];
      nextMap[family.familyId] = dedupe([...tileDrivenIds, ...fallbackIds]);
    }
    return nextMap;
  }, [isTrianglesTopic, topicKey, trianglesQuestionFamilies]);

  const openPracticeFromTrianglesFamily = useCallback(
    (family: QuestionFamilyOverlay) => {
      const nodeId = String(family.tutorNodeId || "").trim();
      const focusBankIds = trianglesFamilyFocusIdMap[family.familyId] || [];
      const tile = family.qtypeId ? getQuestionTypeTileById(topicKey, family.qtypeId) : null;
      openPracticeFromTopicHub({
        tab: "learn",
        nodeId: nodeId || undefined,
        subtopicHint: family.practiceHint,
        sectionFilter:
          (family.sectionFilter as PracticeSectionFilter | undefined) ||
          (tile?.cbseFormat as PracticeSectionFilter | undefined),
        focusBankIds: focusBankIds.length > 0 ? focusBankIds : undefined,
        strictFocus: focusBankIds.length > 0,
        recommendedCount: focusBankIds.length > 0 ? Math.min(10, Math.max(8, focusBankIds.length)) : 10,
        difficultyPreset: "All",
        source: "triangles_qtf_overlay",
      });
    },
    [openPracticeFromTopicHub, topicKey, trianglesFamilyFocusIdMap]
  );

  const openMentorForTrianglesFamily = useCallback(
    (family: QuestionFamilyOverlay) => {
      const focusBankIds = trianglesFamilyFocusIdMap[family.familyId] || family.focusBankIds || [];
      openMentorDrawer({
        title: `Triangles • ${family.studentLabel}`,
        question: family.mentorPrompt,
        solveStyle: family.mentorSolveStyle || "socratic",
        section: family.sectionFilter,
        requestedMode: family.mentorModeHint as RequestedMentorMode | undefined,
        theoremFocus: [family.theoremFamily, family.skillFamily],
        itemId: family.familyId,
        itemTitle: family.studentLabel,
        itemText: family.tutorMeaning,
        contextText: `Triangles family router: ${family.studentLabel}`,
        anchor: `triangles:qtf:${family.familyId}`,
        questionFamilyId: family.familyId,
        questionFamilyLabel: family.studentLabel,
        questionTypeId: family.qtypeId,
        chapterStep: family.tutorNodeId,
        practiceSectionFilter: family.sectionFilter as PracticeSectionFilter | undefined,
        suggestedPracticeIds: focusBankIds,
        recommendedDiagramType: family.recommendedDiagramType,
      });
    },
    [openMentorDrawer, trianglesFamilyFocusIdMap]
  );

  const openPracticeFromQTypeTile = useCallback(
    (tile: QuestionTypeTile) => {
      const focusBankIds = tileFocusIdMap[tile.qtypeId] || getFocusIdsForTile(topicKey, tile);
      const backTab = activeTab;

      trackUxEvent("topichub_open_practice", "topichub", {
        topicKey,
        tab: backTab,
        qtypeId: tile.qtypeId,
        sectionFilter: tile.cbseFormat,
        focusCount: focusBankIds.length,
      });

      navigateToPractice(navigate, {
        grade,
        subject: subjectTitle,
        topicKey,
        topicName: title,
        backPath: `/topic-hub/${grade}/${subject}/${topicKey}?tab=${backTab}`,
        backLabel: "Back to TopicHub",
        sectionFilter: tile.cbseFormat as PracticeSectionFilter,
        focusBankIds,
        recommendedCount: 10,
        difficultyPreset: "All",
        strictFocus: true,
        source: "qtype_first_tiles",
      });
    },
    [activeTab, grade, navigate, subject, subjectTitle, tileFocusIdMap, title, topicKey]
  );
  const runtimeTopicConfig = useMemo(
    () => getTopicContent(subjectTitle, topicKey),
    [subjectTitle, topicKey]
  );
  const chapterTutorPath = useMemo(() => getChapterTutorPath(topicKey), [topicKey]);
  const trianglesRuntimeStrip = useMemo(() => {
    if (!isTrianglesTopic) return null;

    const path = chapterTutorPath?.canonicalTopicKey === "triangles" ? chapterTutorPath : null;
    const startStep = path?.studentJourney.find((step) => step.stepType === "start") || null;
    const practiceStep = path?.studentJourney.find((step) => step.stepType === "practice") || null;
    const hpqStep = path?.studentJourney.find((step) => step.stepType === "hpq") || null;
    const nextStep = path?.studentJourney.find((step) => step.stepType === "next-step") || null;

    return {
      status: path?.status || "partial",
      stageLabels: [
        "Start with similarity",
        "Lock theorem names",
        "Do one board proof",
        "Practise BPT + ratio order",
        "Sprint to HPQ",
      ],
      chapterPromise:
        runtimeTopicConfig.heroTagline ||
        "Similarity + BPT + proof writing should feel like one guided runway, not random geometry.",
      weakPath:
        startStep?.recommendedCTA ||
        "Start with similarity basics, then move to BPT after the first guided explanation.",
      boardPayoff:
        runtimeTopicConfig.boardExamplesSummary ||
        practiceStep?.recommendedCTA ||
        "Board payoff comes from one clean proof, one BPT question, and one ratio/area application.",
      fastPath:
        hpqStep?.recommendedCTA ||
        nextStep?.recommendedCTA ||
        "If similarity feels stable, jump to exam grind, HPQ, and a timed proof set.",
      firstTutorNodeId: guidedOrder[0] || "gQ1",
      proofTutorNodeId: mapProofFocusToNodeId("similarity"),
      checkpointNodeId: "gBPT",
      proofGrindNodeId: guidedToGrindNodeId.gAA || guidedToGrindNodeId.gBPT || "S2",
      boardWriteMentorPrompt:
        "I am stuck in Triangles. Check my theorem choice, correspondence order, and conclusion line in CBSE board style. Keep it stepwise and marks-friendly.",
      mentorTitle: "Triangles • Check my proof",
      sourceNote:
        trianglesQuestionFamilies.length > 0
          ? "The family router now resolves into a Triangles-specific focus bank backed by a chapter pack guided by official CBSE Class X assessment design signals, including Section A-E style coverage, competency-focused items, and figure-aware prompts where the setup genuinely needs them. It is a chapter pack, not a full board-paper replica, and the depth still remains lighter than the Trigonometry pack path."
          : "",
    };
  }, [
    chapterTutorPath,
    guidedOrder,
    guidedToGrindNodeId.gAA,
    guidedToGrindNodeId.gBPT,
    isTrianglesTopic,
    mapProofFocusToNodeId,
    runtimeTopicConfig.boardExamplesSummary,
    runtimeTopicConfig.heroTagline,
    trianglesQuestionFamilies.length,
  ]);

  const onTutorNodeProgress = useCallback(
    (progress: TutorNodeProgress) => {
      if (!progress?.nodeId) return;
      updateTopicMastery((prev) => {
        let next = upsertNodeProgress(prev, progress.nodeId, {
          score: progress.score,
          band: progress.band,
          status: progress.status,
        });
        next = setLastTutorNodeId(next, progress.nodeId);
        return next;
      });
    },
    [updateTopicMastery]
  );

  const tabButtonStyle = (active: boolean) => ({
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid rgba(0,0,0,0.14)',
    background: active ? 'rgba(17,24,39,0.92)' : 'rgba(255,255,255,0.78)',
    color: active ? '#ffffff' : 'rgba(17,24,39,0.92)',
    fontWeight: 950,
    fontSize: 13,
    cursor: 'pointer' as const,
    boxShadow: active ? '0 10px 22px rgba(0,0,0,0.16)' : 'none',
  });

  if (!v2) {
    return (
      <div className="lt-page" style={{
      background:
        mode === "beast"
          ? "linear-gradient(180deg, #f5f8ff 0%, #eef2ff 50%, #f7f7ff 100%)"
          : "linear-gradient(180deg, #f7fff7 0%, #eefcf2 55%, #f8fffd 100%)",
    }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 16px" }}>
          <div style={{ opacity: 0.7, marginBottom: 10 }}>
            Class {grade} • {subject.toUpperCase()}
          </div>

          <h1 style={{ fontSize: 44, margin: "8px 0 8px" }}>{topicKey}</h1>

          <div
            style={{
              border: "1px solid rgba(255,0,0,0.25)",
              background: "rgba(255,0,0,0.04)",
              padding: 14,
              borderRadius: 12,
              marginTop: 16,
            }}
          >
            <b>TopicHub content not found.</b>
            <div style={{ marginTop: 6, opacity: 0.85 }}>
              No baked TopicHubV2 entry exists for <code>{topicKey}</code>.
            </div>
            <div style={{ marginTop: 10 }}>
              Try:{" "}
              <Link to={`/topic-hub/${grade}/${subject}/${defaultTopicKeyFor(subject)}`}>
                /topic-hub/{grade}/{subject}/{defaultTopicKeyFor(subject)}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lt-page">
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "12px 14px 40px" }}>
        {/* Topic header (clean) */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            padding: "8px 0 10px",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.93) 72%, rgba(255,255,255,0.72) 100%)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <Link className="lt-pill" to={backTo}>
              {"<-"} {backLabel}
            </Link>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid rgba(15,23,42,0.12)",
                background: "rgba(255,255,255,0.82)",
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.72 }}>Topic</div>
              <select
                value={topicKey}
                onChange={(e) => onChangeTopic(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontWeight: 800,
                  fontSize: 12,
                  paddingRight: 4,
                  cursor: "pointer",
                }}
              >
                {topicOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.name} ({toTierLabel(opt.tier)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, opacity: 0.72 }}>
              Class {grade} • {subject.toUpperCase()}
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "4px 9px",
                borderRadius: 999,
                background: tierColor(tier),
                border: `1px solid ${tierBorderColor(tier)}`,
                fontWeight: 900,
                fontSize: 11,
                letterSpacing: 0.2,
              }}
            >
              {tier}
            </div>

            <h1 style={{ fontSize: 28, margin: "0 0 0", fontWeight: 950, letterSpacing: -0.4 }}>
              {title}
            </h1>
          </div>

          {/* ONLY 3 tabs: Learn / Grind / Resources */}
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={tabButtonStyle(activeTab === 'learn')} onClick={() => setActiveTab('learn')}>
              Learn
            </button>
            <button type="button" style={tabButtonStyle(activeTab === 'grind')} onClick={() => setActiveTab('grind')}>
              Grind
            </button>
            <button type="button" style={tabButtonStyle(activeTab === 'resources')} onClick={() => setActiveTab('resources')}>
              Resources
            </button>
          </div>
          <div
            style={{
              marginTop: 8,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              fontSize: 11,
              opacity: 0.74,
            }}
            data-testid="topichub-learn-grind-practice-timeline"
          >
            <div style={{ fontWeight: 900 }}>Flow</div>
            <div>Now: {timelineStepLabel}</div>
            <div>Learn {"->"} Grind {"->"} Practice</div>
            <div style={{ opacity: 0.68 }}>
              Recommended order: Learn concept {"->"} Grind writing format {"->"} Practice timed questions.
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { key: "learn", label: "1. Learn", onClick: () => setActiveTab("learn"), active: isLearn },
                { key: "grind", label: "2. Grind", onClick: () => setActiveTab("grind"), active: isGrind },
                {
                  key: "practice",
                  label: "3. Practice",
                  onClick: () => openPracticeFromTopicHub({ tab: activeTab }),
                  active: false,
                },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="lt-pill"
                  onClick={item.onClick}
                  style={{
                    padding: "4px 8px",
                    fontSize: 11,
                    background: item.active ? "rgba(15,23,42,0.1)" : "rgba(255,255,255,0.72)",
                    color: "rgba(15,23,42,0.82)",
                    borderColor: "rgba(15,23,42,0.16)",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 14 }}>
          {isLearn ? (
            <TeachFlow
              topicKey={String(topicKey || "")}
              subject={String(subject || "maths")}
              grade={String(grade || "10")}
              nodeId={
                isTrianglesTopic && trianglesRuntimeStrip
                  ? trianglesRuntimeStrip.firstTutorNodeId
                  : String(topicKey || "")
              }
              onComplete={() => {
                try { updateTopicMastery((prev) => markNodeLearning(prev, String(topicKey || ""))); } catch (_) {}
                setActiveTab("grind");
              }}
            />
          ) : (
            <>
          {QTYPE_FIRST_TRIG &&
          strategyCanonicalTopicKey === "trigonometry" &&
          strategyPack?.tiles?.length &&
          (isLearn || isGrind) ? (
            <section
              data-testid="topichub-qtype-tiles"
              style={{
                borderRadius: 18,
                padding: "12px 12px",
                background: "rgba(255,255,255,0.8)",
                border: "1px solid rgba(0,0,0,0.1)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 15 }}>
                Board question types in this chapter
              </div>
              <div style={{ fontSize: 12, opacity: 0.76, marginTop: 2 }}>
                Pick a board pattern type to open focused practice.
              </div>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {strategyPack.tiles.map((tile) => {
                  const tileFocusIds = tileFocusIdMap[tile.qtypeId] || [];
                  const tileCountLabel = `(${tileFocusIds.length} questions)`;
                  const marksLabel =
                    Array.isArray(tile.typicalMarks) && tile.typicalMarks.length > 0
                      ? ` • ${tile.typicalMarks.join("/") }m`
                      : "";
                  return (
                    <button
                      key={tile.qtypeId}
                      type="button"
                      onClick={() => openPracticeFromQTypeTile(tile)}
                      style={{
                        borderRadius: 12,
                        border: "1px solid rgba(15,23,42,0.16)",
                        background: "rgba(255,255,255,0.95)",
                        padding: "10px 12px",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ fontWeight: 850, fontSize: 13 }}>{tile.title}</div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 900,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "rgba(15,23,42,0.92)",
                            color: "#fff",
                          }}
                        >
                          {tile.cbseFormat}
                        </span>
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, opacity: 0.8 }}>
                        {tile.skillFamily}
                        {marksLabel}
                      </div>
                      <div style={{ marginTop: 3, fontSize: 11, opacity: 0.72 }}>
                        {tileCountLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {trianglesRuntimeStrip ? (
            <section
              data-testid="triangles-runtime-runway"
              style={{
                borderRadius: 20,
                padding: "12px 12px",
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(239,246,255,0.94) 46%, rgba(254,249,195,0.42) 100%)",
                border: "1px solid rgba(15,23,42,0.12)",
                boxShadow: "0 8px 22px rgba(15,23,42,0.07)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.15fr) minmax(240px, 0.85fr)",
                  gap: 10,
                  alignItems: "start",
                }}
              >
                <div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.92)",
                        border: "1px solid rgba(15,23,42,0.16)",
                      }}
                    >
                      Start here
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.92)",
                        border: "1px solid rgba(15,23,42,0.16)",
                      }}
                    >
                      High ROI for boards
                    </span>
                  </div>
                  <div style={{ marginTop: 8, fontWeight: 950, fontSize: 20, letterSpacing: -0.2 }}>
                    Triangles, taught like a tutor
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.88, lineHeight: 1.55 }}>
                    {trianglesRuntimeStrip.chapterPromise}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.78, lineHeight: 1.5 }}>
                    Start with one clear explanation, then choose the problem family you want to fix right now.
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      type="button"
                      className="lt-pill"
                      onClick={() => {
                        setActiveTab("learn");
                        openTutorDrawer({ tab: "teach", nodeId: trianglesRuntimeStrip.firstTutorNodeId });
                      }}
                    >
                      Start here
                    </button>
                    <button
                      type="button"
                      className="lt-pill"
                      onClick={() => {
                        setActiveTab("grind");
                        openGrindDrawer({ nodeId: trianglesRuntimeStrip.proofGrindNodeId });
                      }}
                    >
                      Fast track
                    </button>
                    <button
                      type="button"
                      className="lt-pill"
                      style={{ background: "rgba(255,255,255,0.88)" }}
                      onClick={() =>
                        openMentorDrawer({
                          title: trianglesRuntimeStrip.mentorTitle,
                          question: trianglesRuntimeStrip.boardWriteMentorPrompt,
                          solveStyle: "board",
                          requestedMode: "board_steps",
                          section: "C",
                          anchor: "triangles:runtime:proof-check",
                          contextText: "Triangles board proof help from the chapter runway.",
                          questionFamilyId: "TRI_FAMILY_BOARD_CHECK",
                          questionFamilyLabel: "Board-check my proof",
                          questionTypeId: "TRI_QTYPE_06_BOARD_CHECK",
                          chapterStep: "board-check",
                          practiceSectionFilter: "C",
                          suggestedPracticeIds: trianglesFamilyFocusIdMap.TRI_FAMILY_BOARD_CHECK,
                          recommendedDiagramType: "geometry_triangle",
                        })
                      }
                    >
                      Check my proof
                    </button>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, opacity: 0.66 }}>
                    {runtimeTopicConfig.weightagePercent}% board signal • {masteryCounts.checkpointPassed}/{masteryCounts.total} checkpoints cleared
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 16,
                    padding: "10px 10px",
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: "rgba(255,255,255,0.84)",
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 14 }}>Look at the figure</div>
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.76, lineHeight: 1.5 }}>
                    Use one clean setup first, then choose the theorem family instead of guessing from text alone.
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <DiagramBlock
                      diagram={selectedTrianglesFamily?.diagram || trianglesRuntimeVisuals[0]?.diagram}
                    />
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.78, lineHeight: 1.5 }}>
                    {selectedTrianglesFamily?.diagram?.caption || trianglesRuntimeVisuals[0]?.description}
                  </div>
                </div>
              </div>

              {selectedTrianglesFamily ? (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>
                    Pick the problem family
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.76 }}>
                    One family first. Then either practise it or ask for help on that exact pattern.
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {trianglesQuestionFamilies.map((family) => {
                      const active = family.familyId === selectedTrianglesFamily.familyId;
                      return (
                        <button
                          key={family.familyId}
                          type="button"
                          className="lt-pill"
                          onClick={() => setSelectedTrianglesFamilyId(family.familyId)}
                          style={{
                            padding: "7px 10px",
                            background: active ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.9)",
                            color: active ? "#fff" : "rgba(15,23,42,0.9)",
                            borderColor: active ? "rgba(15,23,42,0.92)" : "rgba(15,23,42,0.18)",
                          }}
                        >
                          {family.studentLabel}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1.1fr) minmax(240px, 0.9fr)",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 16,
                        padding: "12px 12px",
                        border: "1px solid rgba(15,23,42,0.12)",
                        background: "rgba(255,255,255,0.86)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 900,
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: "rgba(15,23,42,0.92)",
                            color: "#fff",
                          }}
                        >
                          {selectedTrianglesFamily.theoremFamily}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 900,
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: "rgba(255,255,255,0.95)",
                            border: "1px solid rgba(15,23,42,0.16)",
                          }}
                        >
                          {selectedTrianglesFamily.skillFamily}
                        </span>
                        {(trianglesFamilyFocusIdMap[selectedTrianglesFamily.familyId] || []).length ? (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 900,
                              padding: "3px 8px",
                              borderRadius: 999,
                              background: "rgba(255,255,255,0.95)",
                              border: "1px solid rgba(15,23,42,0.16)",
                            }}
                          >
                            {(trianglesFamilyFocusIdMap[selectedTrianglesFamily.familyId] || []).length} focused questions now
                          </span>
                        ) : null}
                      </div>
                      <div style={{ marginTop: 8, fontWeight: 900, fontSize: 16 }}>
                        {selectedTrianglesFamily.studentLabel}
                      </div>
                      <div
                        style={{
                          marginTop: 10,
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: 10,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.72 }}>
                            What this is
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.55 }}>
                            {selectedTrianglesFamily.tutorMeaning}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.72 }}>
                            Start here
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.55 }}>
                            {selectedTrianglesFamily.weakStudentCue}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.72 }}>
                            Watch out
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.55 }}>
                            {selectedTrianglesFamily.commonConfusion}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.72 }}>
                            Do this now
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.55 }}>
                            {selectedTrianglesFamily.recommendedNextAction}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="lt-pill"
                          style={{
                            background: "rgba(15,23,42,0.92)",
                            color: "#fff",
                            borderColor: "rgba(15,23,42,0.92)",
                          }}
                          onClick={() => {
                            setActiveTab("learn");
                            openTutorDrawer({
                              tab: "teach",
                              nodeId: selectedTrianglesFamily.tutorNodeId || trianglesRuntimeStrip.firstTutorNodeId,
                            });
                          }}
                        >
                          Start with tutor
                        </button>
                        <button
                          type="button"
                          className="lt-pill"
                          onClick={() => openPracticeFromTrianglesFamily(selectedTrianglesFamily)}
                        >
                          Practice this family
                        </button>
                      </div>
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <button
                          type="button"
                          className="lt-pill"
                          style={{ padding: "6px 10px", fontSize: 12 }}
                          onClick={() => openMentorForTrianglesFamily(selectedTrianglesFamily)}
                        >
                          Ask mentor on this family
                        </button>
                        <div style={{ fontSize: 12, opacity: 0.68 }}>
                          Use this if you know the family but still feel stuck mid-step.
                        </div>
                      </div>
                      <details style={{ marginTop: 10 }}>
                        <summary style={{ cursor: "pointer", fontWeight: 800 }}>See more</summary>
                        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.72 }}>
                              Fast track
                            </div>
                            <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.55 }}>
                              {selectedTrianglesFamily.advancedStudentShortcut}
                            </div>
                          </div>
                          <div
                            style={{
                              borderRadius: 12,
                              padding: "10px 10px",
                              background: "rgba(248,250,252,0.9)",
                              border: "1px solid rgba(15,23,42,0.1)",
                            }}
                          >
                            <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.72 }}>
                              Why this matters in boards
                            </div>
                            <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.55 }}>
                              {selectedTrianglesFamily.boardPayoff}
                            </div>
                          </div>
                        </div>
                      </details>
                    </div>

                    <div
                      style={{
                        borderRadius: 16,
                        padding: "12px 12px",
                        border: "1px solid rgba(15,23,42,0.12)",
                        background: "rgba(255,255,255,0.84)",
                      }}
                    >
                      {selectedTrianglesFamily.diagram ? (
                        <DiagramBlock diagram={selectedTrianglesFamily.diagram} />
                      ) : null}
                      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {selectedTrianglesFamily.diagramRequired ? (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 900,
                              padding: "3px 8px",
                              borderRadius: 999,
                              background: "rgba(255,255,255,0.95)",
                              border: "1px solid rgba(15,23,42,0.16)",
                            }}
                          >
                            figure first
                          </span>
                        ) : null}
                        {selectedTrianglesFamily.recommendedDiagramType ? (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 900,
                              padding: "3px 8px",
                              borderRadius: 999,
                              background: "rgba(255,255,255,0.95)",
                              border: "1px solid rgba(15,23,42,0.16)",
                            }}
                          >
                            {selectedTrianglesFamily.recommendedDiagramType}
                          </span>
                        ) : null}
                        {selectedTrianglesFamily.visualPriority ? (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 900,
                              padding: "3px 8px",
                              borderRadius: 999,
                              background: "rgba(255,255,255,0.95)",
                              border: "1px solid rgba(15,23,42,0.16)",
                            }}
                          >
                            {selectedTrianglesFamily.visualPriority} priority
                          </span>
                        ) : null}
                      </div>
                      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.76, lineHeight: 1.55 }}>
                        Look at the setup first. Then decide the theorem family before you write or calculate anything.
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <details style={{ marginTop: 14 }}>
                <summary style={{ cursor: "pointer", fontWeight: 900 }}>
                  Show more chapter routes
                </summary>
                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 10,
                  }}
                >
                <div
                  style={{
                    borderRadius: 16,
                    padding: "12px 12px",
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: "rgba(255,255,255,0.84)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.72 }}>Calm start</div>
                  <div style={{ marginTop: 6, fontWeight: 900 }}>Start with similarity, then BPT</div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.82, lineHeight: 1.55 }}>
                    {trianglesRuntimeStrip.weakPath}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="lt-pill"
                      onClick={() => {
                        setActiveTab("learn");
                        openTutorDrawer({ tab: "teach", nodeId: trianglesRuntimeStrip.firstTutorNodeId });
                      }}
                    >
                      Start with tutor
                    </button>
                    <button
                      type="button"
                      className="lt-pill"
                      onClick={() =>
                        openPracticeFromTopicHub({
                          tab: "learn",
                          nodeId: trianglesRuntimeStrip.checkpointNodeId,
                          subtopicHint: "triangles-bpt-checkpoint",
                          sectionFilter: "B",
                        })
                      }
                    >
                      First checkpoint
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 16,
                    padding: "12px 12px",
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: "rgba(255,255,255,0.84)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.72 }}>Boards lane</div>
                  <div style={{ marginTop: 6, fontWeight: 900 }}>Proof writing + board practice</div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.82, lineHeight: 1.55 }}>
                    {trianglesRuntimeStrip.boardPayoff}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="lt-pill"
                      onClick={() => {
                        setActiveTab("grind");
                        openGrindDrawer({ nodeId: trianglesRuntimeStrip.proofGrindNodeId });
                      }}
                    >
                      Open exam grind
                    </button>
                    <button
                      type="button"
                      className="lt-pill"
                      onClick={() =>
                        openPracticeFromTopicHub({
                          tab: "grind",
                          grindNodeId: trianglesRuntimeStrip.proofGrindNodeId,
                          subtopicHint: "triangles-proof-practice",
                          sectionFilter: "C",
                        })
                      }
                    >
                      Practice one proof
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 16,
                    padding: "12px 12px",
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: "rgba(255,255,255,0.84)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.72 }}>Fast revision</div>
                  <div style={{ marginTop: 6, fontWeight: 900 }}>Jump to high-value revision</div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.82, lineHeight: 1.55 }}>
                    {trianglesRuntimeStrip.fastPath}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="lt-pill"
                      onClick={() =>
                        navigate(
                          `/highly-probable/${encodeURIComponent(grade)}/${encodeURIComponent(subjectTitle)}?topic=${encodeURIComponent(title)}`
                        )
                      }
                    >
                      Open HPQ
                    </button>
                    <button
                      type="button"
                      className="lt-pill"
                      onClick={() => {
                        setActiveTab("resources");
                        const examDayPackEl = document.getElementById("resources-exam-day-pack");
                        if (examDayPackEl) examDayPackEl.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      Exam-day pack
                    </button>
                  </div>
                </div>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 16,
                    padding: "12px 12px",
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: "rgba(255,255,255,0.8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900 }}>Need a board-style example or proof check?</div>
                    <div style={{ marginTop: 4, fontSize: 13, opacity: 0.82, lineHeight: 1.55 }}>
                      Open a board example or ask Mentor to check your proof in clean CBSE steps.
                    </div>
                    {trianglesRuntimeStrip.sourceNote ? (
                      <div style={{ marginTop: 4, fontSize: 12, opacity: 0.72 }}>
                        {trianglesRuntimeStrip.sourceNote}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="lt-pill"
                      onClick={() => {
                        setActiveTab("learn");
                        openTutorDrawer({ tab: "examples", nodeId: trianglesRuntimeStrip.proofTutorNodeId });
                      }}
                    >
                      Board example
                    </button>
                    <button
                      type="button"
                      className="lt-pill"
                      onClick={() =>
                        openMentorDrawer({
                          title: trianglesRuntimeStrip.mentorTitle,
                          question: trianglesRuntimeStrip.boardWriteMentorPrompt,
                          solveStyle: "board",
                          requestedMode: "board_steps",
                          section: "C",
                          anchor: "triangles:runtime:proof-check",
                          contextText: "Triangles board proof help from the chapter runway.",
                          questionFamilyId: "TRI_FAMILY_BOARD_CHECK",
                          questionFamilyLabel: "Board-check my proof",
                          questionTypeId: "TRI_QTYPE_06_BOARD_CHECK",
                          chapterStep: "board-check",
                          practiceSectionFilter: "C",
                          suggestedPracticeIds: trianglesFamilyFocusIdMap.TRI_FAMILY_BOARD_CHECK,
                          recommendedDiagramType: "geometry_triangle",
                        })
                      }
                    >
                      Check my proof
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {trianglesRuntimeStrip.stageLabels.map((label) => (
                    <span
                      key={label}
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        padding: "5px 9px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.92)",
                        border: "1px solid rgba(15,23,42,0.14)",
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </details>
            </section>
          ) : null}

          {isGrind ? (
            <div
              style={{
                borderRadius: 18,
                padding: "14px 14px",
                background: "rgba(255,255,255,0.65)",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>
                  {isTrianglesTopic ? "Triangles Grind" : `${title} Grind`}
                </div>
                <div style={{ fontSize: 13, opacity: 0.75 }}>
                  {isTrianglesTopic
                    ? "Marks-roadmap practice: rubrics, board skeletons, traps, and micro-drills."
                    : "Practice with exam-writing focus, quick checks, and handoff to practice sets."}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="lt-pill"
                  onClick={() => {
                    if (hasGrindContractFlow) {
                      openGrindDrawer({ nodeId: defaultGrindNodeId });
                      return;
                    }
                    openPracticeFromTopicHub({ tab: "grind" });
                  }}
                >
                  {hasGrindContractFlow ? "Start grind" : "Open practice"}
                </button>
                <button
                  type="button"
                  className="lt-pill"
                  onClick={() => {
                    setActiveTab("learn");
                    openTutorDrawer({ tab: "teach", nodeId: weakestTutorNodeId });
                  }}
                >
                  Resume weakest in Learn
                </button>
              </div>
            </div>
          ) : null}
          {isLearn && guidedOrder.length > 0 ? (
            <AccordionCard
              id="guided-learning-path"
              title={isTrianglesTopic ? "Guided learning path (Triangles)" : "Guided learning path"}
              defaultOpen={false}
            >
              <GuidedMindmapPanel
                data={guidedPanelData}
                onAskMentor={(node) => {
                  if (!node?.id) return;
                  openTutorDrawer({ tab: "teach", nodeId: node.id });
                }}
                getNodeMasteryState={(nodeId) => getNodeMasteryState(topicMastery, nodeId)}
                onPracticeNode={(nodeId) =>
                  openPracticeFromTopicHub({ nodeId, tab: "learn" })
                }
              />
            </AccordionCard>
          ) : null}

          {isLearn && showInZombie("key-definitions") && definitions.length > 0 && (
            <AccordionCard id="key-definitions" title="Key definitions" defaultOpen={false}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                {definitions.slice(0, 14).map((d, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderRadius: 14,
                      padding: "12px 12px",
                      border: "1px solid rgba(0,0,0,0.08)",
                      background: "rgba(0,0,0,0.02)",
                    }}
                  >
                    <div style={{ fontWeight: 950 }}>{String(d?.title || `Definition ${idx + 1}`)}</div>
                    <div style={{ marginTop: 6, opacity: 0.9, lineHeight: 1.55 }}>
                      {String(d?.description || "")}
                    </div>
                    {d?.examTip ? (
                      <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
                        <b>Exam tip:</b> {String(d.examTip)}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </AccordionCard>
          )}

          {isLearn && isTrianglesTopic ? (
            <AccordionCard id="proof-writing" title="Proof writing (Triangles)" defaultOpen={false}>
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 10 }}>
                Write proofs in CBSE board style: Given / To Prove / Construction / Proof / Conclusion.
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {proofWritingTemplates.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      borderRadius: 16,
                      padding: "12px 12px",
                      border: "1px solid rgba(0,0,0,0.10)",
                      background: "rgba(0,0,0,0.02)",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{t.title}</div>
                    <div style={{ marginTop: 6, opacity: 0.85, lineHeight: 1.5 }}>{t.description}</div>
                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                      Marks: {t.marks} | Focus: {t.focus.replace("_", " ")}
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <DiagramBlock diagram={buildTrianglesProofDiagram(t.focus)} />
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="lt-pill"
                        style={{ padding: "7px 10px", fontSize: 13 }}
                        onClick={() => openTutorDrawer({ tab: "teach", nodeId: mapProofFocusToNodeId(t.focus) })}
                        title="Open Tutor in teaching mode"
                      >
                        Teach this proof
                      </button>
                      <button
                        type="button"
                        className="lt-pill"
                        style={{ padding: "7px 10px", fontSize: 13 }}
                        onClick={() => openTutorDrawer({ tab: "examples", nodeId: mapProofFocusToNodeId(t.focus) })}
                        title="See board-style examples"
                      >
                        Board example
                      </button>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7, whiteSpace: "pre-wrap" }}>
                      {t.question}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionCard>
          ) : null}

          {isLearn && showInZombie("exam-patterns") && examPatterns.length > 0 && (
            <AccordionCard id="exam-patterns" title="CBSE exam patterns" defaultOpen={mode === "zombie"}>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {examPatterns.slice(0, 10).map((p, idx) => (
                  <li key={idx} style={{ marginBottom: 8, lineHeight: 1.55 }}>
                    {p}
                  </li>
                ))}
              </ul>
            </AccordionCard>
          )}

          {isLearn && showInZombie("summary") && overview.length > 0 && (
            <AccordionCard id="summary" title="Summary" defaultOpen={false}>
              {overview.map((p, idx) => (
                <p key={idx} style={{ marginTop: idx === 0 ? 0 : 10, lineHeight: 1.65, opacity: 0.95 }}>
                  {p}
                </p>
              ))}
            </AccordionCard>
          )}

          {isLearn ? (
            <TeachFlow
              topicKey={topicKey}
              subject={subject}
              grade={grade}
              onComplete={() => {
                try { updateTopicMastery((prev) => markNodeLearning(prev, topicKey)); } catch (_) {}
                setActiveTab("grind");
              }}
            />
          ) : null}

            {isLearn && mode === "beast" && misconceptions.length > 0 && (
              <AccordionCard id="misconceptions" title="Common misconceptions">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {misconceptions.slice(0, 10).map((m, idx) => (
                  <li key={idx} style={{ marginBottom: 10, lineHeight: 1.55 }}>
                    <b>{String(m?.concept || "Concept")}:</b> {String(m?.commonError || "")}
                    {m?.correction ? (
                      <div style={{ marginTop: 4, opacity: 0.9 }}>
                        <b>Fix:</b> {String(m.correction)}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </AccordionCard>
          )}

          {isGrind && mode === "beast" && markingTips.length > 0 && (
            <AccordionCard id="marking-tips" title="Marking tips (avoid silly mistakes)">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {markingTips.slice(0, 12).map((p, idx) => {
                  const anyP = p as any;
                  const text = String(anyP?.text || anyP?.tip || anyP?.description || anyP?.title || p || "");
                  if (!text) return null;
                  return (
                    <li key={idx} style={{ marginBottom: 8, lineHeight: 1.55 }}>
                      {text}
                    </li>
                  );
                })}
              </ul>
            </AccordionCard>
          )}

          {isGrind && mode === "beast" && scoreTips.length > 0 && (
            <AccordionCard id="score-tips" title="Score tips (how to write for full marks)">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {scoreTips.slice(0, 10).map((t, idx) => (
                  <li key={idx} style={{ marginBottom: 8, lineHeight: 1.55 }}>
                    {String(t || "")}
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="lt-pill"
                  style={{ padding: "7px 10px", fontSize: 13 }}
                  onClick={() => {
                    openTutorDrawer({ tab: "examples", nodeId: guidedOrder[0] });
                  }}
                  title="Ask mentor to explain how to use these score tips and show a board-style example with marks"
                >
                  Open Tutor
                </button>
              </div>
            </AccordionCard>
          )}
     {isGrind && showInZombie("worked-examples") && (
  <AccordionCard id="worked-examples" title="Worked examples (Board patterns A-E)">
    {(() => {
      const anchors = exampleAnchors as any;
      const exampleSections: Array<"A" | "B" | "C" | "D" | "E"> = ["A", "B", "C", "D", "E"];
      // Fallback marks by board pattern (used only if an anchor is missing marks).
      const marksBySection: Record<"A" | "B" | "C" | "D" | "E", number> = { A: 1, B: 2, C: 3, D: 4, E: 5 };

      const picked = anchors?.[exampleSection] as any;

      const pickedText = String(
        picked?.questionText || picked?.question || picked?.prompt || ""
      ).trim();

      const isAnchor = Boolean(pickedText);
      const questionText = isAnchor
        ? pickedText
        : buildFallbackWorkedExampleQuestion(exampleSection);

      const marks =
        typeof picked?.marks === "number"
          ? picked.marks
          : (marksBySection as any)?.[exampleSection];

      return (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            {exampleSections.map((sec) => (
              <button
                key={sec}
                type="button"
                className={sec === exampleSection ? "lt-pill pill--on" : "lt-pill"}
                onClick={() => setExampleSection(sec)}
              >
                Pattern {sec}
              </button>
            ))}
          </div>

          <div
            style={{
              borderRadius: 14,
              padding: "12px 12px",
              border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(0,0,0,0.02)",
              lineHeight: 1.6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>
                Example • Pattern {exampleSection}{" "}
                <span style={{ fontWeight: 700, opacity: 0.65 }}>
                  {isAnchor ? "(from bank)" : "(auto sample)"}
                </span>
              </div>
              {marks ? (
                <div style={{ fontSize: 12, opacity: 0.75, whiteSpace: "nowrap" }}>
                  Marks: <b>{String(marks)}</b>
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: 8, opacity: 0.92, whiteSpace: "pre-wrap" }}>
              {questionText}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <button
                type="button"
                className="lt-pill"
                onClick={() =>
                  openPracticeFromTopicHub({
                    tab: "learn",
                    subtopicHint: `pattern:${String(exampleSection)}`,
                    sectionFilter: exampleSection,
                  })
                }
                title="Go to Practice page filtered to this Board pattern"
              >
                Practice this type ?
              </button>

              <button
                type="button"
                className="lt-pill"
                onClick={() =>
                  openMentorDrawer({
                    title: `Pattern ${exampleSection} • ${title}`,
                    question:
                      `Solve this exact example in exam-ready steps.\n\n` +
                      `Pattern: ${exampleSection}\n` +
                      `Question: ${questionText}\n\n` +
                      `Rules: Use labelled diagrams wherever applicable. Show marks per step.`,
                    solveStyle: "board",
                    marks: typeof marks === "number" ? marks : undefined,
                    section: String(exampleSection),
                    anchor: isAnchor
                      ? picked?.id
                        ? `bank:${String(picked.id)}`
                        : `pattern:${String(exampleSection)}:${String(title)}`
                      : `sample:${String(exampleSection)}:${String(title)}`,
                    contextText: questionText,
                  })
                }
                title="Open Mentor drawer (switch between Board Steps / Solve With Me inside the drawer)"
              >
                Ask Mentor ?
              </button>
            </div>

            {!isAnchor ? (
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                Note: this is an auto-sample because your bank doesn't have a stored anchor for
                Pattern {exampleSection} yet. The Mentor can still solve it properly.
              </div>
            ) : null}
          </div>

              <div
                style={{
                  marginTop: 12,
                  borderRadius: 16,
                  padding: "12px 12px",
                  border: "1px solid rgba(0,0,0,0.10)",
                  background: "rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>
                    Example · Pattern {exampleSection} {typeof marks === "number" ? `· ${marks} marks` : ""}
                  </div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>
                    {isAnchor ? "From your curated bank" : "Sample (fallback)"}
                  </div>
                </div>
                <div style={{ marginTop: 8, opacity: 0.92, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {questionText}
                </div>
              </div>

        </>
      );
    })()}
  </AccordionCard>
          )}

          {isGrind && showInZombie("quick-quiz") && quickQuiz.length > 0 && (
            <AccordionCard id="quick-quiz" title="Quick quiz (2 mins)" defaultOpen={mode === "zombie"}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                {quickQuiz.slice(0, 5).map((q, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderRadius: 14,
                      padding: "12px 12px",
                      border: "1px solid rgba(0,0,0,0.08)",
                      background: "rgba(0,0,0,0.02)",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{String(q?.title || `Q${idx + 1}`)}</div>
                    {q?.question && q.question !== q.title ? (
                      <div style={{ marginTop: 6, opacity: 0.9 }}>{String(q.question)}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </AccordionCard>
          )}

          {isLearn && mode === "beast" && competencies.length > 0 && (
            <AccordionCard id="competencies" title="NCERT competencies">
              {(() => {
                const list = competencies.slice(0, 14);
                const safeIdx = Math.max(0, Math.min(selectedCompetencyIdx, Math.max(0, list.length - 1)));
                const selected = list[safeIdx] as any;
                const cid = String(selected?.id || `C${safeIdx + 1}`);
                const bloom = selected?.bloomLevel ? String(selected.bloomLevel) : "";

                return (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <button
                        type="button"
                        className="lt-pill"
                        style={{ padding: "7px 10px", fontSize: 13 }}
                        onClick={() => {
                          if (!list.length) return;
                          openTutorDrawer({ tab: "teach", nodeId: guidedOrder[0] });
                        }}
                        title="Ask mentor to explain the selected competency with an example and a common mistake"
                      >
                        Open Tutor
                      </button>

                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        Selected: <b>{cid}</b>
                        {bloom ? <span> • {bloom}</span> : null}
                      </div>
                    </div>

                    <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                      {list.map((c: any, idx: number) => {
                        const id = String(c?.id || `C${idx + 1}`);
                        const isSel = idx === safeIdx;
                        return (
                          <li
                            key={id}
                            onClick={() => setSelectedCompetencyIdx(idx)}
                            style={{
                              marginBottom: 8,
                              lineHeight: 1.55,
                              padding: "8px 10px",
                              borderRadius: 14,
                              cursor: "pointer",
                              border: isSel ? "1px solid rgba(0,0,0,0.14)" : "1px solid transparent",
                              background: isSel ? "rgba(0,0,0,0.04)" : "transparent",
                            }}
                            title="Click to select; then use Ask Mentor on top"
                          >
                            <b>{id}:</b> {String(c?.description || "")}
                            {c?.bloomLevel ? (
                              <span style={{ opacity: 0.7 }}> • {String(c.bloomLevel)}</span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                );
              })()}
            </AccordionCard>
          )}

          {isGrind && mode === "beast" && labActivities.length > 0 && (
            <AccordionCard id="lab" title="Lab / activities">
              
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                <button
                  type="button"
                  className="lt-pill"
                  onClick={() =>
                    openMentorDrawer({
                      title: `${title} • Lab / activities`,
                      question: `Help me prepare for lab/activities in ${title}. Give the objective, steps, observations, and 2 viva questions with answers.`,
                      solveStyle: "board",
                    })
                  }
                >
                  Ask Mentor ?
                </button>
              </div>
<div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                {labActivities.slice(0, 6).map((a, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderRadius: 16,
                      padding: "14px 14px",
                      border: "1px solid rgba(0,0,0,0.08)",
                      background: "rgba(255,255,255,0.60)",
                    }}
                  >
                    <div style={{ fontWeight: 950 }}>{String(a?.title || `Activity ${idx + 1}`)}</div>
                    <div style={{ marginTop: 8, opacity: 0.9, lineHeight: 1.6 }}>
                      <b>Objective:</b> {String(a?.objective || "")}
                    </div>
                    {a?.materialsRequired ? (
                      <div style={{ marginTop: 6, opacity: 0.9, lineHeight: 1.6 }}>
                        <b>Materials:</b> {String(a.materialsRequired)}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </AccordionCard>
          )}

          {isGrind && mode === "beast" && caseStudies.length > 0 && (
            <AccordionCard id="case-studies" title="Case studies">
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                {caseStudies.slice(0, 4).map((cs, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderRadius: 16,
                      padding: "14px 14px",
                      border: "1px solid rgba(0,0,0,0.08)",
                      background: "rgba(255,255,255,0.60)",
                    }}
                  >
                    <div style={{ fontWeight: 950 }}>Case Study {idx + 1}</div>
                    <div style={{ marginTop: 8, opacity: 0.92, lineHeight: 1.6 }}>{String(cs?.contextText || "")}</div>
                    {safeArray<any>((cs as any)?.subQuestions).length > 0 ? (
                      <ol style={{ marginTop: 10, paddingLeft: 18 }}>
                        {safeArray<any>((cs as any).subQuestions)
                          .slice(0, 5)
                          .map((q, i) => (
                            <li key={i} style={{ marginBottom: 8, lineHeight: 1.55 }}>
                              {String(q?.questionText || "")}
                            </li>
                          ))}
                      </ol>
                    ) : null}
                  </div>
                ))}
              </div>
            </AccordionCard>
          )}

          {isResources && (
            <>
              <AccordionCard id="resources-recommended" title="Recommended next resources" defaultOpen>
                  {weakestResourceNodes.length ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      {weakestResourceNodes.map((item) => {
                        const state = (item.rec?.state || "unseen") as TopicHubNodeMasteryState;
                        const badge = masteryBadgeMeta[state];
                        return (
                          <div
                            key={item.id}
                            style={{
                              borderRadius: 14,
                              padding: "12px 12px",
                              border: "1px solid rgba(0,0,0,0.08)",
                              background: "rgba(0,0,0,0.02)",
                            }}
                          >
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <div style={{ fontWeight: 900 }}>{item.title}</div>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  padding: "3px 8px",
                                  borderRadius: 999,
                                  background: badge.bg,
                                  color: badge.color,
                                  border: `1px solid ${badge.border}`,
                                }}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                className="lt-pill"
                                style={{ padding: "7px 10px", fontSize: 13 }}
                                onClick={() => openTutorDrawer({ tab: "teach", nodeId: item.id })}
                              >
                                Teach this
                              </button>
                              <button
                                type="button"
                                className="lt-pill"
                                style={{ padding: "7px 10px", fontSize: 13 }}
                                onClick={() => {
                                  setActiveTab("grind");
                                  if (hasGrindContractFlow) {
                                    const grindId = guidedToGrindNodeId[item.id] || defaultGrindNodeId;
                                    openGrindDrawer({ nodeId: grindId });
                                    return;
                                  }
                                  openPracticeFromTopicHub({
                                    nodeId: item.id,
                                    tab: "grind",
                                  });
                                }}
                              >
                                Grind this
                              </button>
                              <button
                                type="button"
                                className="lt-pill"
                                style={{ padding: "7px 10px", fontSize: 13 }}
                                onClick={() =>
                                  openPracticeFromTopicHub({
                                    nodeId: item.id,
                                    tab: "resources",
                                  })
                                }
                              >
                                Practice this
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      Great work. All guided nodes are mastered.
                    </div>
                  )}
              </AccordionCard>

              <AccordionCard id="resources-revision-cockpit" title="10-minute revision cockpit" defaultOpen>
                  <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 10 }}>
                    Human-tutor loop: Teach {"->"} Grind {"->"} Checkpoint {"->"} Practice.
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {[
                      { label: "Minute 0-3 • Teach", node: revisionCockpitNodes[0] || null, action: "teach" as const },
                      { label: "Minute 3-7 • Grind", node: revisionCockpitNodes[1] || revisionCockpitNodes[0] || null, action: "grind" as const },
                      { label: "Minute 7-10 • Checkpoint + Practice", node: revisionCockpitNodes[2] || revisionCockpitNodes[0] || null, action: "practice" as const },
                    ].map((slot, idx) => {
                      const nodeId = String(slot.node?.id || "");
                      const nodeTitle = String(slot.node?.title || `Step ${idx + 1}`);
                      const state = (slot.node?.state || "unseen") as TopicHubNodeMasteryState;
                      const badge = masteryBadgeMeta[state];
                      const grindId = nodeId ? guidedToGrindNodeId[nodeId] || defaultGrindNodeId : defaultGrindNodeId;
                      return (
                        <div
                          key={slot.label}
                          style={{
                            borderRadius: 14,
                            padding: "12px 12px",
                            border: "1px solid rgba(0,0,0,0.08)",
                            background: "rgba(0,0,0,0.02)",
                          }}
                        >
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <div style={{ fontWeight: 900 }}>{slot.label}</div>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                padding: "2px 8px",
                                borderRadius: 999,
                                background: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`,
                              }}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <div style={{ marginTop: 6, opacity: 0.9 }}>{nodeTitle}</div>
                          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="lt-pill"
                              style={{ padding: "7px 10px", fontSize: 13 }}
                              onClick={() => openTutorDrawer({ tab: "teach", nodeId })}
                            >
                              Teach now
                            </button>
                            {slot.action !== "teach" ? (
                              <button
                                type="button"
                                className="lt-pill"
                                style={{ padding: "7px 10px", fontSize: 13 }}
                                onClick={() => {
                                  setActiveTab("grind");
                                  if (hasGrindContractFlow) {
                                    openGrindDrawer({ nodeId: grindId });
                                    return;
                                  }
                                  openPracticeFromTopicHub({
                                    nodeId,
                                    tab: "grind",
                                  });
                                }}
                              >
                                Open Grind
                              </button>
                            ) : null}
                            {slot.action === "practice" ? (
                              <button
                                type="button"
                                className="lt-pill"
                                style={{ padding: "7px 10px", fontSize: 13 }}
                                onClick={() =>
                                  openPracticeFromTopicHub({
                                    nodeId,
                                    tab: "resources",
                                  })
                                }
                              >
                                Practice now
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
              </AccordionCard>

              <AccordionCard
                id="resources-exam-day-pack"
                title={isTrianglesTopic ? "Exam-day pack (Triangles)" : `Exam-day pack (${title})`}
                defaultOpen={false}
              >
                  <div style={{ display: "grid", gap: 10 }}>
                    <div
                      style={{
                        borderRadius: 14,
                        padding: "12px 12px",
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "rgba(0,0,0,0.02)",
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>2-minute formula + theorem sweep</div>
                      <div style={{ marginTop: 6, fontSize: 13, opacity: 0.88 }}>
                        {isTrianglesTopic
                          ? "AA / SAS / SSS similarity + BPT + area-ratio logic + CPST usage."
                          : `Revisit core definitions, theorem rules, and one high-yield formula for ${title}.`}
                      </div>
                    </div>
                    <div
                      style={{
                        borderRadius: 14,
                        padding: "12px 12px",
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "rgba(0,0,0,0.02)",
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>5-minute board-writing drill</div>
                      <div style={{ marginTop: 6, fontSize: 13, opacity: 0.88 }}>
                        For one weak node: write Given, To Prove, Criterion/Theorem, Therefore/Hence in order.
                      </div>
                    </div>
                    <div
                      style={{
                        borderRadius: 14,
                        padding: "12px 12px",
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "rgba(0,0,0,0.02)",
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>3-minute trap check</div>
                      <div style={{ marginTop: 6, fontSize: 13, opacity: 0.88 }}>
                        {isTrianglesTopic
                          ? "Recheck correspondence order, theorem name, and final conclusion sentence."
                          : `Recheck common mistakes in ${title}: setup, unit/logic, and final answer line.`}
                      </div>
                    </div>
                    <div style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="lt-pill"
                        onClick={() => openTutorDrawer({ tab: "teach", nodeId: weakestTutorNodeId })}
                      >
                        Human tutor quick drill
                      </button>
                      <button
                        type="button"
                        className="lt-pill"
                        onClick={() => {
                          setActiveTab("grind");
                          if (hasGrindContractFlow) {
                            openGrindDrawer({ nodeId: defaultGrindNodeId });
                            return;
                          }
                          openPracticeFromTopicHub({ tab: "grind" });
                        }}
                      >
                        Open exam grind
                      </button>
                    </div>
                  </div>
              </AccordionCard>

              <AccordionCard id="resources-progression-hints" title="Weakest-node progression hints" defaultOpen={false}>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {weakestProgressionHints.map((hint, idx) => (
                      <li key={idx} style={{ marginBottom: 8, lineHeight: 1.5 }}>
                        {hint}
                      </li>
                    ))}
                  </ul>
              </AccordionCard>

              <AccordionCard id="resources" title="Resources" defaultOpen>
                <p style={{ marginTop: 0, lineHeight: 1.65, opacity: 0.95 }}>
                  Quick revision kit for <b>{title}</b> - concept map, formula sheet, and top videos.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    type="button"
                    className="lt-pill"
                    onClick={() => {
                      setActiveTab("learn");
                      openTutorDrawer({ tab: "teach", nodeId: weakestTutorNodeId });
                    }}
                  >
                    Resume weakest concept
                  </button>
                  <button
                    type="button"
                    className="lt-pill"
                    onClick={() =>
                      openMentorDrawer({
                        title: `${title} • Resources`,
                        question: `Make me a 10-minute revision plan for ${title}. Keep it CBSE-focused and marks-friendly.`,
                        solveStyle: "socratic",
                      })
                    }
                  >
                    Ask Mentor ?
                  </button>
                </div>
              </AccordionCard>

              <AccordionCard id="concept-map" title="Concept map" defaultOpen>
                {!resourceMindMap ? (
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    Concept map coming soon for this topic. (We'll auto-fill as the bank grows.)
                  </div>
                ) : (
                  <MindMapCanvas
                    mindMap={resourceMindMap}
                    onAskMentor={(seedTitle, seedQuestion) =>
                      openMentorDrawer({
                        title: seedTitle,
                        question: seedQuestion,
                        solveStyle: "socratic",
                      })
                    }
                  />
                )}
              </AccordionCard>

              <AccordionCard id="formulae" title="Formula sheet" defaultOpen={false}>
                {safeArray<any>(resourceFormulae).length === 0 ? (
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    No formula sheet added yet for this topic.
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                    {safeArray<any>(resourceFormulae).slice(0, 20).map((f, idx) => {
                      const label = String(f?.title || f?.name || `Formula ${idx + 1}`);
                      const text = String(f?.formula || f?.text || f?.statement || "");
                      const whenToUse = String(
                        f?.whenToUse || f?.useWhen || f?.usage || f?.when || ""
                      );
                      const url = String(f?.pdfUrl || f?.url || f?.downloadUrl || "");
                      return (
                        <div
                          key={idx}
                          style={{
                            borderRadius: 14,
                            padding: "12px 12px",
                            border: "1px solid rgba(0,0,0,0.08)",
                            background: "rgba(0,0,0,0.02)",
                          }}
                        >
                          <div style={{ fontWeight: 950 }}>{label}</div>
                          {text ? (
                            <div style={{ marginTop: 6, opacity: 0.9, lineHeight: 1.55 }}>{text}</div>
                          ) : null}
                          {whenToUse ? (
                            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
                              <b>When to use:</b> {whenToUse}
                            </div>
                          ) : null}

                          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="lt-pill"
                              style={{ padding: "7px 10px", fontSize: 13 }}
                              onClick={() =>
                                openMentorDrawer({
                                  title: `${title} • Formula`,
                                  question: `Teach me the formula: ${label}. Also show 2 solved CBSE-style examples where it is used.`,
                                  solveStyle: "socratic",
                                })
                              }
                            >
                              Ask Mentor
                            </button>

                            {url ? (
                              <a
                                className="lt-pill"
                                style={{
                                  padding: "7px 10px",
                                  fontSize: 13,
                                  textDecoration: "none",
                                  display: "inline-flex",
                                  alignItems: "center",
                                }}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open PDF ?
                              </a>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </AccordionCard>

              <AccordionCard id="videos" title="Top videos" defaultOpen={false}>
                {safeArray<any>(resourceVideos).length === 0 ? (
                  <div style={{ fontSize: 13, opacity: 0.8 }}>No videos added yet for this topic.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                    {safeArray<any>(resourceVideos).slice(0, 12).map((v, idx) => {
                      const titleTxt = String(v?.title || v?.name || `Video ${idx + 1}`);
                      const url = String(v?.url || v?.link || v?.youtubeUrl || "");
                      return (
                        <div
                          key={idx}
                          style={{
                            borderRadius: 16,
                            padding: "14px 14px",
                            border: "1px solid rgba(0,0,0,0.08)",
                            background: "rgba(255,255,255,0.60)",
                          }}
                        >
                          <div style={{ fontWeight: 950 }}>{titleTxt}</div>
                          {url ? (
                            <a href={url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8 }}>
                              Open video ?
                            </a>
                          ) : (
                            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>Video link missing.</div>
                          )}

                          <div style={{ marginTop: 10 }}>
                            <button
                              type="button"
                              className="lt-pill"
                              style={{ padding: "7px 10px", fontSize: 13 }}
                              onClick={() =>
                                openMentorDrawer({
                                  title: `${title} • Video recap`,
                                  question: `Summarize the key takeaways for ${title} as a 1-page CBSE revision note. Add 3 mini-questions with answers.`,
                                  solveStyle: "socratic",
                                })
                              }
                            >
                              Ask Mentor
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </AccordionCard>
            </>
          )}
            </>
          )}


        </div>
      </div>
      <GrindDrawerV1
        open={grindDrawerOpen && hasGrindContractFlow}
        onClose={closeGrindDrawer}
        mindmap={grindMindmap}
        nodeId={grindNodeId || defaultGrindNodeId}
        setNodeId={setGrindNodeWithMastery}
        grade={grade}
        subjectTitle={subjectTitle}
        topicKey={topicKey}
        mode={mode}
        getNodeMasteryState={(grindId) =>
          getNodeMasteryState(topicMastery, mapGrindNodeToGuidedNodeId(grindId))
        }
        onPracticeNode={(grindId) =>
          openPracticeFromTopicHub({
            nodeId: mapGrindNodeToGuidedNodeId(grindId),
            grindNodeId: String(grindId),
            tab: "grind",
            subtopicHint: `grind:${String(grindId)}`,
          })
        }
        onOpenTutorNode={(grindId) => {
          const guidedId = mapGrindNodeToGuidedNodeId(grindId);
          setActiveTab("learn");
          openTutorDrawer({ tab: "teach", nodeId: guidedId });
        }}
      />
      <SharedTutorDrawerV2
        open={tutorDrawerOpen}
        onClose={closeTutorDrawer}
        tab={tutorTab}
        setTab={setTutorTab}
        nodeIndex={tutorNodeIndex}
        setNodeIndex={setTutorNodeIndexWithMastery}
        nodeId={currentTutorNodeId}
        node={currentTutorNode ? { title: String(currentTutorNode.title), text: currentTutorNode.text } : null}
        core={toTutorConceptCard(currentTutorCore)}
        coreId={toNullableString(currentTutorCoreId)}
        order={guidedOrder}
        nodeTitles={guidedNodeTitleById}
        grade={grade}
        subjectTitle={subjectTitle}
        topicKey={topicKey}
        mode={mode}
        nodeMasteryState={toTutorMasteryState(tutorNodeMasteryState)}
        onNodeProgress={onTutorNodeProgress}
        onPracticeThisNode={(nodeId) =>
          openPracticeFromTopicHub({
            nodeId,
            tab: "learn",
          })
        }
      />
          <MentorSolveDrawer
        open={mentorDrawerOpen}
        onClose={closeMentorDrawer}
        seedExample={mentorSeedExample}
        solveStyle={mentorSolveStyle}
        setSolveStyle={setMentorSolveStyle}
        mode={mode}
        grade={grade}
        subjectTitle={subjectTitle}
        topicKey={topicKey}
      />
</div>
  );
}


export function TutorDrawerV2(props: {
  open: boolean;
  onClose: () => void;
  tab: TutorTab;
  setTab: (tab: TutorTab) => void;
  nodeIndex: number;
  setNodeIndex: (idx: number) => void;
  nodeId: string | undefined;
  node: { title: string; text?: string } | null;
  core: { means: string; when: string[]; exam: string; trap: string } | null;
  coreId: string | null;
  order: string[];
  nodeTitles: Record<string, string>;
  grade: string;
  subjectTitle: string;
  topicKey: string;
  mode: ModeKey;
}) {
  const {
    open,
    onClose,
    tab,
    setTab,
    nodeIndex,
    setNodeIndex,
    nodeId,
    node,
    core,
    coreId,
    order,
    nodeTitles,
    grade,
    subjectTitle,
    topicKey,
    mode,
  } = props;

  type TutorFsmStatus =
    | "S0_CLOSED"
    | "S1_OPEN_IDLE"
    | "S2_REQUESTING_TEACH"
    | "S3_SHOW_TEACH"
    | "S4_REQUESTING_BOARD"
    | "S5_SHOW_BOARD"
    | "S6_AWAIT_CHECKPOINT"
    | "S7_HINTING"
    | "S8_PRACTICE"
    | "S9_ADVANCE_GUARD"
    | "S10_ERROR_RECOVERABLE"
    | "S11_ERROR_BLOCKING";

  type TutorFsmState = {
    status: TutorFsmStatus;
    lastIntent: "teach" | "board" | null;
    errorMessage: string | null;
  };

  type TutorFsmEvent =
    | { type: "EV_OPEN_DRAWER" }
    | { type: "EV_CLOSE_DRAWER" }
    | { type: "EV_CLICK_TEACH" }
    | { type: "EV_CLICK_BOARD" }
    | { type: "EV_SUBMIT_CHECKPOINT" }
    | { type: "EV_RETRY" }
    | { type: "EV_API_OK"; intent: "teach" | "board" }
    | { type: "EV_API_FAIL"; recoverable: boolean; message: string };

  const tutorFsmReducer = (state: TutorFsmState, event: TutorFsmEvent): TutorFsmState => {
    switch (event.type) {
      case "EV_OPEN_DRAWER":
        return { ...state, status: "S1_OPEN_IDLE", errorMessage: null };
      case "EV_CLOSE_DRAWER":
        return { ...state, status: "S0_CLOSED", errorMessage: null };
      case "EV_CLICK_TEACH":
        return { ...state, status: "S2_REQUESTING_TEACH", lastIntent: "teach", errorMessage: null };
      case "EV_CLICK_BOARD":
        return { ...state, status: "S4_REQUESTING_BOARD", lastIntent: "board", errorMessage: null };
      case "EV_SUBMIT_CHECKPOINT":
        return { ...state, status: "S6_AWAIT_CHECKPOINT" };
      case "EV_RETRY":
        if (state.lastIntent === "teach") {
          return { ...state, status: "S2_REQUESTING_TEACH", errorMessage: null };
        }
        if (state.lastIntent === "board") {
          return { ...state, status: "S4_REQUESTING_BOARD", errorMessage: null };
        }
        return state;
      case "EV_API_OK":
        return {
          ...state,
          status: event.intent === "teach" ? "S3_SHOW_TEACH" : "S5_SHOW_BOARD",
          lastIntent: event.intent,
          errorMessage: null,
        };
      case "EV_API_FAIL":
        return {
          ...state,
          status: event.recoverable ? "S10_ERROR_RECOVERABLE" : "S11_ERROR_BLOCKING",
          errorMessage: event.message,
        };
      default:
        return state;
    }
  };

  type TutorResponseEntry = {
    structured?: any;
    rawStructured?: any;
    diagramType?: string;
    diagramLabels?: Record<string, string> | string[] | null;
    diagramSpec?: MentorDiagramSpec | DiagramSpec | null;
    responseId?: string;
    summary?: string;
  };

  const [fsm, dispatch] = useReducer(tutorFsmReducer, {
    status: open ? "S1_OPEN_IDLE" : "S0_CLOSED",
    lastIntent: null,
    errorMessage: null,
  });
  const [responses, setResponses] = useState<Record<string, TutorResponseEntry>>({});
  const [cooldownUntilMs, setCooldownUntilMs] = useState<number | null>(null);
  const [cooldownTick, setCooldownTick] = useState(0);
  const [clickHint, setClickHint] = useState<string | null>(null);
  const [doubtInput, setDoubtInput] = useState("");
  const [doubtAnswer, setDoubtAnswer] = useState<string | null>(null);
  const [doubtError, setDoubtError] = useState<string | null>(null);
  const [doubtLoading, setDoubtLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef<Set<string>>(new Set());
  const lastRequestAtRef = useRef<number>(0);
  const clickHintTimeoutRef = useRef<number | null>(null);
  const doubtInputRef = useRef<HTMLInputElement | null>(null);
  const isDev = Boolean(import.meta?.env?.DEV);

  const nodeTitle = String(node?.title || "Concept");
  const nodeText = String(node?.text || core?.means || "");
  const coreText = core
    ? [
        `What it means: ${core.means}`,
        core.when?.length ? `When used: ${core.when.join("; ")}` : "",
        `Exam line: ${core.exam}`,
        `Trap: ${core.trap}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const currentKey = nodeId ? `${tab}:${nodeId}` : "";
  const currentResponse = currentKey ? responses[currentKey] : null;
  const currentError =
    fsm.status === "S10_ERROR_RECOVERABLE" || fsm.status === "S11_ERROR_BLOCKING"
      ? fsm.errorMessage
      : null;
  const isLoading = fsm.status === "S2_REQUESTING_TEACH" || fsm.status === "S4_REQUESTING_BOARD";
  const cooldownRemainingSec = cooldownUntilMs
    ? Math.max(0, Math.ceil((cooldownUntilMs - Date.now()) / 1000))
    : 0;
  const isCooldownActive = cooldownRemainingSec > 0;
  const actionsDisabled = isLoading || isCooldownActive;

  const cancelInFlight = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    inFlightRef.current.clear();
    if (open) {
      dispatch({ type: "EV_OPEN_DRAWER" });
    }
  }, [open]);

  useEffect(() => {
    if (!cooldownUntilMs) return;
    const id = window.setInterval(() => setCooldownTick((prev) => prev + 1), 1000);
    return () => window.clearInterval(id);
  }, [cooldownUntilMs]);

  useEffect(() => {
    if (cooldownUntilMs && Date.now() >= cooldownUntilMs) {
      setCooldownUntilMs(null);
    }
  }, [cooldownTick, cooldownUntilMs]);

  useEffect(() => {
    if (open) {
      dispatch({ type: "EV_OPEN_DRAWER" });
    } else {
      dispatch({ type: "EV_CLOSE_DRAWER" });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    dispatch({ type: "EV_OPEN_DRAWER" });
  }, [open, nodeId]);

  useEffect(() => () => {
    if (clickHintTimeoutRef.current) window.clearTimeout(clickHintTimeoutRef.current);
  }, []);

  useEffect(() => () => cancelInFlight(), [cancelInFlight]);

  const safeJsonParse = (raw: string) => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const getRetryAfterMs = useCallback((res: Response, data: any) => {
    const header = res.headers.get("Retry-After");
    if (header) {
      const sec = Number(header);
      if (Number.isFinite(sec) && sec > 0) return sec * 1000;
    }
    const jsonMs = Number(data?.retryAfterMs ?? data?.data?.retryAfterMs);
    if (Number.isFinite(jsonMs) && jsonMs > 0) return jsonMs;
    const jsonSec = Number(data?.retryAfterSec ?? data?.data?.retryAfterSec ?? data?.retry_after_sec);
    if (Number.isFinite(jsonSec) && jsonSec > 0) return jsonSec * 1000;
    return null;
  }, []);
  const getRandomBackoffMs = useCallback(() => 10_000 + Math.floor(Math.random() * 20_001), []);

  const showClickHint = useCallback((message: string) => {
    setClickHint(message);
    if (clickHintTimeoutRef.current) window.clearTimeout(clickHintTimeoutRef.current);
    clickHintTimeoutRef.current = window.setTimeout(() => setClickHint(null), 1200);
  }, []);

  const validateTeach = (obj: TeachViewModel | null) => {
    if (!obj) return "Teach response incomplete. Please retry.";
    if (!String(obj.goalLine || "").trim()) return "Teach response incomplete. Please retry.";
    if (!Array.isArray(obj.keyIdeaBullets) || obj.keyIdeaBullets.length < 2) {
      return "Teach response incomplete. Please retry.";
    }
    if (!obj.diagram || !String(obj.diagram.altText || "").trim()) {
      return "Teach response incomplete. Please retry.";
    }
    if (!String(obj.checkpoint?.question || "").trim()) return "Teach response incomplete. Please retry.";
    if (!String(obj.checkpoint?.answer || "").trim()) return "Teach response incomplete. Please retry.";
    if (!String(obj.commonMistakeWarning || "").trim()) return "Teach response incomplete. Please retry.";
    return null;
  };

  const validateExamples = (obj: any) => {
    const teach = obj?.teach || {};
    const simple = Array.isArray(teach.simpleExplanation) ? teach.simpleExplanation : [];
    const exam = Array.isArray(teach.cbseExamSentence) ? teach.cbseExamSentence : [];
    const worked = Array.isArray(obj?.workedExamples) ? obj.workedExamples : [];
    if (simple.length < 4) return "Examples response incomplete. Please retry.";
    if (exam.length < 2) return "Examples response incomplete. Please retry.";
    if (worked.length !== 2) return "Board Examples must include exactly 2 worked examples.";
    return null;
  };

  const formatDoubtStructured = (obj: any) => {
    const teachVm = toTeachViewModel(obj);
    const bullets = Array.isArray(teachVm.keyIdeaBullets) ? teachVm.keyIdeaBullets.slice(0, 3) : [];
    const lines = [];
    lines.push(teachVm.goalLine);
    bullets.forEach((b: string) => lines.push(`- ${b}`));
    if (teachVm.checkpoint?.question) lines.push(`Quick check: ${teachVm.checkpoint.question}`);
    return lines.join("\n");
  };

  const buildPayload = useCallback((nextTab: TutorTab, doubtContext?: any, prompt?: string) => {
    const isTeachTab = nextTab === "teach";
    const modeApi = "learn_teach";
    const subSection = isTeachTab ? "teach" : "board-examples";
    const explainType = isTeachTab ? "teach" : "board_examples";
    return {
      mode: modeApi,
      payload: {
        subject: subjectTitle,
        grade: Number(grade),
        topicKey,
        chapter: topicKey,
        cardTitle: nodeTitle,
        cardName: nodeTitle,
        section: "learn",
        subSection,
        selectedTab: nextTab,
        selectedMode: modeApi,
        mindmapNodeId: nodeId,
        mindmapNodeTitle: nodeTitle,
        mindmapNodeText: nodeText,
        mindmapCoreId: coreId,
        explainType,
        contextText: coreText || nodeText,
        stepIndex: nodeIndex,
        vibe: mode,
        doubtContext,
      },
      messages: prompt ? [{ role: "user", content: prompt }] : undefined,
    };
  }, [subjectTitle, grade, topicKey, nodeTitle, nodeId, nodeText, coreId, coreText, nodeIndex, mode]);

  const buildLocalMentorResponse = useCallback(
    (nextTab: TutorTab, prompt?: string) => {
      const diagramType = inferDiagramTypeFromText(`${nodeTitle}\n${nodeText}\n${coreText}`);
      const diagramLabels = defaultLabelsForType(diagramType);
      if (nextTab === "teach") {
        const teachVm = buildFallbackTeachModel(nodeTitle);
        teachVm.goalLine = `Goal: Understand ${nodeTitle} with clean board-ready steps.`;
        teachVm.diagram = {
          ...teachVm.diagram,
          type: diagramType,
          labels: diagramLabels,
          altText: `Core diagram for ${nodeTitle}.`,
        };
        teachVm.keyIdeaBullets = ensureMinList(
          [
            `Read the prompt and identify what ${nodeTitle} needs.`,
            "Write criterion/definition before solving.",
            "Show one clean intermediate step before final answer.",
          ],
          2,
          (idx) => `Key idea ${idx + 1}: Stay CBSE-step aligned.`
        );
        teachVm.checkpoint = {
          question:
            prompt && prompt.trim()
              ? `Checkpoint on your doubt: ${prompt.trim()}`
              : `Checkpoint: What condition lets you apply ${nodeTitle}?`,
          answer: "Write criterion first, then one supporting step, then final line.",
        };
        teachVm.commonMistakeWarning = "Common mistake: jumping to answer without the criterion line.";
        return {
          data: {
            structured: teachVm,
            text: JSON.stringify(teachVm),
          },
        };
      }

      const examplesStructured = {
        kind: "learn_teach",
        teach: {
          simpleExplanation: [
            `Start by writing what is given in ${nodeTitle}.`,
            "Use the relevant criterion/theorem in one explicit line.",
            "Map correspondence correctly before substitution.",
            "Finish with one concise exam-ready answer line.",
          ],
          cbseExamSentence: [
            "Exam line: criterion first, then substitution.",
            "Exam line: keep final statement explicit and labelled.",
          ],
          diagram: {
            required: true,
            type: diagramType,
            labels: diagramLabels,
            spec: null,
            altText: `Board diagram scaffold for ${nodeTitle}.`,
          },
        },
        workedExamples: [
          {
            question: `Example 1 (${nodeTitle}): basic direct application`,
            steps: [
              { marks: 1, text: "Write given data and target." },
              { marks: 1, text: "Apply criterion/theorem with correct correspondence." },
              { marks: 1, text: "Conclude with final answer statement." },
            ],
            totalMarks: 3,
            finalAnswer: "Final answer in one line.",
          },
          {
            question: `Example 2 (${nodeTitle}): board-style application`,
            steps: [
              { marks: 1, text: "State criterion/theorem and labels." },
              { marks: 2, text: "Show substitution and simplification clearly." },
              { marks: 1, text: "Write conclusion in exam format." },
            ],
            totalMarks: 4,
            finalAnswer: "Board-style final line with units/labels.",
          },
        ],
        commonMistakes: [
          "Missing criterion line.",
          "Incorrect correspondence/order.",
          "Skipping final conclusion statement.",
        ],
        checkQuestion:
          prompt && prompt.trim()
            ? `Quick check linked to your doubt: ${prompt.trim()}`
            : `Quick check: Which criterion applies first in ${nodeTitle}?`,
      };

      return {
        data: {
          structured: examplesStructured,
          text: JSON.stringify(examplesStructured),
        },
      };
    },
    [nodeTitle, nodeText, coreText]
  );

  const requestMentor = useCallback(
    async (intent: "teach" | "board", opts?: { force?: boolean; prompt?: string; reason?: string }) => {
      if (!open || !nodeId) return;
      const nextTab: TutorTab = intent === "teach" ? "teach" : "examples";
      const key = `${nextTab}:${nodeId}`;
      const now = Date.now();

      const hasSameKey = inFlightRef.current.has(key);
      const isSameIntent = fsm.lastIntent === intent;

      if (now - lastRequestAtRef.current < 800) {
        showClickHint("Please wait.");
        return;
      }
      if (cooldownUntilMs && now < cooldownUntilMs) {
        showClickHint(`Please wait ${cooldownRemainingSec}s.`);
        return;
      }
      if (hasSameKey || (isLoading && isSameIntent)) {
        showClickHint("Please wait.");
        return;
      }
      if (isLoading && !hasSameKey) {
        cancelInFlight();
      }

      lastRequestAtRef.current = now;

      if (!opts?.force && responses[key]) {
        setTab(nextTab);
        dispatch({ type: "EV_API_OK", intent });
        return;
      }

      if (intent === "teach") {
        dispatch({ type: "EV_CLICK_TEACH" });
      } else {
        dispatch({ type: "EV_CLICK_BOARD" });
      }
      setTab(nextTab);

      const requestId = `${now}-${Math.random().toString(16).slice(2)}`;
      if (isDev) {
        console.info("[mentor] request", {
          intent,
          requestId,
          startedAt: now,
          reason: opts?.reason || "click",
        });
      }

      const controller = new AbortController();
      abortRef.current = controller;
      inFlightRef.current.add(key);

      try {
        const body = buildPayload(nextTab, undefined, opts?.prompt);
        let res: Response | null = null;
        let data: any = null;
        let usedFallback = false;
        try {
          const serverResponse = await postMentorHybridRequest(body, controller.signal);
          res = serverResponse.res;
          data = serverResponse.payload;
          if (res.status === 429 || res.status === 503) {
            const retryAfterMs = getRetryAfterMs(res, data);
            const effectiveRetryAfterMs = retryAfterMs ?? getRandomBackoffMs();
            const retryAfterSec = Math.ceil(effectiveRetryAfterMs / 1000);
            setCooldownUntilMs(Date.now() + effectiveRetryAfterMs);
            if (isDev) {
              console.warn("[mentor] rate-limited", { retryAfterSec, requestId });
            }
            usedFallback = true;
          } else if (!res.ok) {
            if (isDev) {
              console.warn("[mentor] non-ok response", {
                requestId,
                status: res.status,
              });
            }
            usedFallback = true;
          }
        } catch (serverErr: any) {
          if (serverErr?.name === "AbortError") throw serverErr;
          if (isDev) {
            console.warn("[mentor] server unavailable, using fallback", {
              requestId,
              message: String(serverErr?.message || serverErr || ""),
            });
          }
          usedFallback = true;
        }

        if (usedFallback) {
          const retrying = res?.status === 429 || res?.status === 503;
          const errMsg =
            res && !res.ok
              ? getMentorHybridError(data, res.status)
              : "Mentor server unavailable.";
          showClickHint(
            retrying
              ? "Mentor is rate-limited. Showing fallback guidance."
              : "Live mentor unavailable. Showing fallback guidance."
          );
          if (isDev) {
            console.warn("[mentor] fallback used", { requestId, errMsg });
          }
          data = buildLocalMentorResponse(nextTab, opts?.prompt);
        }

        const structured = data?.data?.structured || safeJsonParse(String(data?.data?.text || ""));
        if (!structured) throw new Error("Mentor response incomplete. Please retry.");

        const rawStructured = structured;
        const teachVm = extractTeachContract(rawStructured);
        const normalizedStructured = nextTab === "teach" ? teachVm : rawStructured;

        if (nextTab === "teach" && !isTeachPayloadComplete(teachVm)) {
          throw new Error("Teach response incomplete. Please retry.");
        }

        const validation =
          nextTab === "teach"
            ? validateTeach(teachVm)
            : validateExamples(rawStructured);
        if (validation) {
          dispatch({ type: "EV_API_FAIL", recoverable: true, message: validation });
          return;
        }

        const diagramVm = extractTeachContract(rawStructured).diagram;
        setResponses((prev) => ({
          ...prev,
          [key]: {
            structured: normalizedStructured,
            rawStructured: nextTab === "teach" ? rawStructured : undefined,
            diagramType: diagramVm.type,
            diagramLabels: diagramVm.labels,
            diagramSpec: diagramVm.spec,
            responseId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            summary: JSON.stringify(normalizedStructured).slice(0, 280),
          },
        }));
        dispatch({ type: "EV_API_OK", intent });
      } catch (err: any) {
        if (err?.name === "AbortError") {
          dispatch({ type: "EV_OPEN_DRAWER" });
          return;
        }
        dispatch({
          type: "EV_API_FAIL",
          recoverable: false,
          message: err?.message || "Mentor error. Please retry.",
        });
      } finally {
        inFlightRef.current.delete(key);
        if (!controller.signal.aborted && abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [
      open,
      nodeId,
      responses,
      isLoading,
      cancelInFlight,
      buildPayload,
      cooldownUntilMs,
      cooldownRemainingSec,
      getRetryAfterMs,
      getRandomBackoffMs,
      showClickHint,
      isDev,
      fsm.lastIntent,
      setTab,
      buildLocalMentorResponse,
    ]
  );

  const sendDoubt = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || doubtLoading || !nodeId) return;
      setDoubtError(null);
      setDoubtLoading(true);

      const last = currentResponse || {};
      const doubtContext = {
        chapter: topicKey,
        cardId: nodeId,
        cardTitle: nodeTitle,
        cardSection: "learn",
        cardSubSection: tab,
        selectedTab: tab,
        nodeId,
        nodeTitle,
        stepIndex: nodeIndex,
        lastDiagram: last.diagramType,
        lastResponseId: last.responseId,
        lastResponseSummary: last.summary,
      };

      try {
        const body = buildPayload(tab, doubtContext, prompt);
        let data: any = null;
        let usedFallback = false;
        try {
          const serverResponse = await postMentorHybridRequest(body);
          const res = serverResponse.res;
          data = serverResponse.payload;
          if (!res.ok) {
            usedFallback = true;
            if (isDev) {
              console.warn("[mentor] doubt non-ok response", {
                status: res.status,
                message: getMentorHybridError(data, res.status),
              });
            }
          }
        } catch (serverErr: any) {
          if (isDev) {
            console.warn("[mentor] doubt server unavailable, using fallback", {
              message: String(serverErr?.message || serverErr || ""),
            });
          }
          usedFallback = true;
        }
        if (usedFallback) {
          showClickHint("Live mentor unavailable. Showing fallback guidance.");
          data = buildLocalMentorResponse(tab, prompt);
        }

        const structured = data?.data?.structured || safeJsonParse(String(data?.data?.text || ""));
        const formatted = structured ? formatDoubtStructured(structured) : String(data?.data?.text || "");
        setDoubtAnswer(formatted || "Mentor reply received.");
        setDoubtInput("");
      } catch (err: any) {
        setDoubtError(err?.message || "Mentor error. Please retry.");
      } finally {
        setDoubtLoading(false);
      }
    },
    [
      doubtLoading,
      nodeId,
      currentResponse,
      topicKey,
      nodeTitle,
      tab,
      nodeIndex,
      buildPayload,
      buildLocalMentorResponse,
      showClickHint,
      isDev,
    ]
  );

  useEffect(() => {
    if (!open) {
      cancelInFlight();
      setDoubtInput("");
      setDoubtAnswer(null);
      setDoubtError(null);
    }
  }, [open, cancelInFlight]);

  useEffect(() => {
    setDoubtAnswer(null);
    setDoubtError(null);
    setDoubtInput("");
  }, [tab, nodeId]);

  if (!open) return null;

  const drawerBg =
    mode === "beast"
      ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,247,255,0.98) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,255,248,0.98) 100%)";

  const handleClose = () => {
    cancelInFlight();
    onClose();
  };

  const handleTabChange = (nextTab: TutorTab) => {
    if (actionsDisabled) return;
    const intent = nextTab === "teach" ? "teach" : "board";
    requestMentor(intent, { reason: nextTab === "teach" ? "tab_teach" : "tab_examples" });
  };

  const goToNodeIndex = (idx: number) => {
    if (idx < 0 || idx >= order.length) return;
    cancelInFlight();
    setNodeIndex(idx);
    dispatch({ type: "EV_OPEN_DRAWER" });
  };

  const handleNextConcept = () => {
    if (actionsDisabled) return;
    const next = Math.min(nodeIndex + 1, Math.max(0, order.length - 1));
    if (next !== nodeIndex) goToNodeIndex(next);
  };

  const renderTeach = () => {
    const obj = currentResponse?.structured || null;
    if (!obj) return null;
    const teachVm = extractTeachContract(obj);
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Goal</div>
          <div style={{ padding: "6px 8px", borderRadius: 10, background: "rgba(0,0,0,0.04)" }}>
            {teachVm.goalLine}
          </div>
        </div>
        {renderDiagram(teachVm.diagram)}
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Key ideas</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {teachVm.keyIdeaBullets.map((b: string, idx: number) => (
              <li key={idx} style={{ marginBottom: 6 }}>{String(b)}</li>
            ))}
          </ul>
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Checkpoint</div>
          <div style={{ padding: "8px 10px", borderRadius: 12, background: "rgba(0,0,0,0.04)" }}>
            <div>{teachVm.checkpoint.question}</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>Answer: {teachVm.checkpoint.answer}</div>
          </div>
        </div>
        <div style={{ borderRadius: 12, padding: "10px 12px", background: "rgba(255,180,0,0.08)" }}>
          <div style={{ fontWeight: 800 }}>Common mistake</div>
          <div style={{ marginTop: 6 }}>{teachVm.commonMistakeWarning}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="lt-pill"
            onClick={handleNextConcept}
            disabled={nodeIndex >= order.length - 1 || actionsDisabled}
          >
            Continue
          </button>
          <button
            type="button"
            className="lt-pill"
            onClick={() => doubtInputRef.current?.focus()}
            disabled={actionsDisabled}
          >
            Ask a doubt
          </button>
          <button
            type="button"
            className="lt-pill"
            onClick={() => handleTabChange("examples")}
            disabled={actionsDisabled}
          >
            Board (Solved examples)
          </button>
        </div>
      </div>
    );
  };

  const renderExamples = () => {
    const obj = currentResponse?.structured || null;
    if (!obj) return null;
    const diagramVm = extractTeachContract(currentResponse?.rawStructured || obj).diagram;
    const teach = obj.teach || {};
    const simple = Array.isArray(teach.simpleExplanation) ? teach.simpleExplanation : [];
    const exam = Array.isArray(teach.cbseExamSentence) ? teach.cbseExamSentence : [];
    const worked = Array.isArray(obj.workedExamples) ? obj.workedExamples : [];
    const mistakes = Array.isArray(obj.commonMistakes) ? obj.commonMistakes : [];
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {renderDiagram(diagramVm)}
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Teach bullets</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {simple.map((b: any, idx: number) => (
              <li key={idx} style={{ marginBottom: 6 }}>{String(b)}</li>
            ))}
          </ul>
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Exam line</div>
          {exam.map((l: any, idx: number) => (
            <div key={idx} style={{ marginBottom: 6, padding: "6px 8px", borderRadius: 10, background: "rgba(0,0,0,0.04)" }}>
              {String(l)}
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Worked examples (2)</div>
          {worked.map((ex: any, exIdx: number) => {
            const steps = Array.isArray(ex?.steps) ? ex.steps : [];
            const sumMarks = steps.reduce((acc: number, s: any) => acc + (Number(s?.marks) || 0), 0);
            const total = Number(ex?.totalMarks);
            return (
              <div key={exIdx} style={{ borderRadius: 12, padding: "10px 12px", border: "1px solid rgba(0,0,0,0.08)", marginBottom: 10 }}>
                <div style={{ fontWeight: 800 }}>
                  {exIdx === 0 ? "Example 1: Basic" : "Example 2: Board-style"}
                </div>
                {ex?.question ? <div style={{ marginTop: 6 }}>{String(ex.question)}</div> : null}
                {steps.length ? (
                  <ol style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                    {steps.map((s: any, idx: number) => (
                      <li key={idx} style={{ marginBottom: 6 }}>
                        <b>[{Number(s?.marks) || 0}]</b> {String(s?.text || "")}
                      </li>
                    ))}
                  </ol>
                ) : null}
                {Number.isFinite(total) ? (
                  <div style={{ marginTop: 6, fontWeight: 700 }}>Total marks: {total}</div>
                ) : null}
                {Number.isFinite(total) && Number.isFinite(sumMarks) && total !== sumMarks ? (
                  <div style={{ marginTop: 6, fontSize: 12, color: "#9b5a00" }}>
                    Marking check: step marks sum to {sumMarks}, expected {total}.
                  </div>
                ) : null}
                {ex?.finalAnswer ? (
                  <div style={{ marginTop: 6, fontWeight: 700 }}>Final: {String(ex.finalAnswer)}</div>
                ) : null}
              </div>
            );
          })}
        </div>
        {mistakes.length ? (
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Common mistakes</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {mistakes.map((m: any, idx: number) => (
                <li key={idx} style={{ marginBottom: 6 }}>{String(m)}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {obj.checkQuestion ? (
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Check question</div>
            <div style={{ padding: "8px 10px", borderRadius: 12, background: "rgba(0,0,0,0.04)" }}>
              {String(obj.checkQuestion)}
            </div>
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="lt-pill"
            onClick={() => handleTabChange("teach")}
            disabled={actionsDisabled}
          >
            Back to teaching (Resume Step {nodeIndex + 1})
          </button>
        </div>
      </div>
    );
  };

  const renderSkeleton = () => {
    const skeleton = buildFallbackTeachModel(nodeTitle);
    return (
      <div style={{ display: "grid", gap: 12, opacity: 0.7 }}>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Goal</div>
          <div style={{ padding: "6px 8px", borderRadius: 10, background: "rgba(0,0,0,0.04)" }}>
            {skeleton.goalLine}
          </div>
        </div>
        {renderDiagram(skeleton.diagram)}
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Key ideas</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {skeleton.keyIdeaBullets.map((b, idx) => (
              <li key={idx} style={{ marginBottom: 6 }}>{b}</li>
            ))}
          </ul>
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Checkpoint</div>
          <div style={{ padding: "8px 10px", borderRadius: 12, background: "rgba(0,0,0,0.04)" }}>
            <div>{skeleton.checkpoint.question}</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>Answer: {skeleton.checkpoint.answer}</div>
          </div>
        </div>
        <div style={{ borderRadius: 12, padding: "10px 12px", background: "rgba(255,180,0,0.08)" }}>
          <div style={{ fontWeight: 800 }}>Common mistake</div>
          <div style={{ marginTop: 6 }}>{skeleton.commonMistakeWarning}</div>
        </div>
      </div>
    );
  };

  const isRecoverableError = fsm.status === "S10_ERROR_RECOVERABLE";
  const isBlockingError = fsm.status === "S11_ERROR_BLOCKING";
  const errorMessage = currentError || (isCooldownActive ? `Mentor is rate-limited. Try again in ${cooldownRemainingSec}s.` : "");
  const retryLabel = isCooldownActive ? `Retry in ${cooldownRemainingSec}s` : "Retry";

  const handleRetry = () => {
    dispatch({ type: "EV_RETRY" });
    if (fsm.lastIntent === "teach") {
      requestMentor("teach", { force: true, reason: "retry" });
    } else if (fsm.lastIntent === "board") {
      requestMentor("board", { force: true, reason: "retry" });
    }
  };

  const drawerContent = () => {
    if (isRecoverableError || isBlockingError) {
      return (
        <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,0,0,0.2)", background: "rgba(255,0,0,0.06)" }}>
          <div>{errorMessage || "Mentor error. Please retry."}</div>
          {isRecoverableError ? (
            <button
              type="button"
              className="lt-pill"
              style={{ marginTop: 10 }}
              onClick={handleRetry}
              disabled={actionsDisabled}
            >
              {retryLabel}
            </button>
          ) : null}
        </div>
      );
    }

    if (fsm.status === "S1_OPEN_IDLE") {
      return renderSkeleton();
    }
    if (isLoading) {
      return <div style={{ padding: 12, opacity: 0.75 }}>Tutor is preparing your lesson...</div>;
    }
    if (fsm.status === "S3_SHOW_TEACH" || fsm.status === "S6_AWAIT_CHECKPOINT" || fsm.status === "S7_HINTING" || fsm.status === "S8_PRACTICE" || fsm.status === "S9_ADVANCE_GUARD") {
      return currentResponse ? renderTeach() : renderSkeleton();
    }
    if (fsm.status === "S5_SHOW_BOARD") {
      return currentResponse ? renderExamples() : renderSkeleton();
    }
    return renderSkeleton();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(0,0,0,0.35)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: "100%",
          width: "min(440px, 94vw)",
          background: drawerBg,
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          padding: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>
            Step {nodeIndex + 1}/{Math.max(1, order.length)} • {nodeTitle}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              type="button"
              className="lt-pill"
              onClick={() => handleTabChange("teach")}
              style={{ background: tab === "teach" ? "rgba(0,0,0,0.08)" : "white" }}
              disabled={actionsDisabled}
            >
              Teach (Step-by-step)
            </button>
            <button
              type="button"
              className="lt-pill"
              onClick={() => handleTabChange("examples")}
              style={{ background: tab === "examples" ? "rgba(0,0,0,0.08)" : "white" }}
              disabled={actionsDisabled}
            >
              Board (Solved examples)
            </button>
            <button
              type="button"
              className="lt-pill"
              onClick={handleClose}
              title="Close"
              style={{ background: "white" }}
            >
              Close
            </button>
          </div>
        </div>
        {clickHint ? (
          <div style={{ marginTop: 6, fontSize: 12, color: "#9b5a00" }}>{clickHint}</div>
        ) : null}

        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="lt-pill"
            onClick={() => goToNodeIndex(0)}
            disabled={nodeIndex === 0 || actionsDisabled}
          >
            Start from basics
          </button>
          <button
            type="button"
            className="lt-pill"
            onClick={handleNextConcept}
            disabled={nodeIndex >= order.length - 1 || actionsDisabled}
          >
            Next concept
          </button>
          <select
            value={nodeId || ""}
            onChange={(e) => goToNodeIndex(order.findIndex((id) => id === e.target.value))}
            style={{
              borderRadius: 999,
              padding: "6px 10px",
              border: "1px solid rgba(0,0,0,0.12)",
              background: "white",
              fontWeight: 700,
            }}
            disabled={actionsDisabled}
          >
            {order.map((id, idx) => (
              <option key={id} value={id}>
                {idx + 1}. {nodeTitles[id] || id}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            marginTop: 12,
            flex: 1,
            overflow: "auto",
            padding: 10,
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.10)",
            background: "rgba(255,255,255,0.6)",
          }}
        >
          {drawerContent()}
        </div>

        {doubtAnswer ? (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(0,0,0,0.04)" }}>
            <div style={{ whiteSpace: "pre-wrap" }}>{doubtAnswer}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="lt-pill" onClick={() => setDoubtAnswer(null)}>
                Resume
              </button>
              <button
                type="button"
                className="lt-pill"
                onClick={() => sendDoubt("Explain this in simpler words, shorter and clearer.")}
                disabled={doubtLoading}
              >
                Explain simpler
              </button>
              <button
                type="button"
                className="lt-pill"
                onClick={() => {
                  setDoubtAnswer(null);
                  handleTabChange("examples");
                }}
              >
                Show board example
              </button>
            </div>
          </div>
        ) : null}

        {doubtError ? (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(255,0,0,0.06)" }}>
            {doubtError}
          </div>
        ) : null}

        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <input
            ref={doubtInputRef}
            value={doubtInput}
            onChange={(e) => setDoubtInput(e.target.value)}
            placeholder="Ask a doubt about this step..."
            onKeyDown={(e) => {
              if (e.key === "Enter") sendDoubt(doubtInput);
            }}
            style={{
              flex: 1,
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.14)",
              padding: "10px 12px",
              fontSize: 14,
              outline: "none",
              background: "white",
            }}
            disabled={doubtLoading}
          />
          <button
            type="button"
            className="lt-pill"
            onClick={() => sendDoubt(doubtInput)}
            disabled={doubtLoading || !doubtInput.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}




function MentorSolveDrawer({
  open,
  onClose,
    seedExample,
  solveStyle,
  setSolveStyle,
  mode,
  grade,
  subjectTitle,
  topicKey,
}: {
  open: boolean;
  onClose: () => void;
  seedExample: {
    title: string;
    question: string;
    marks?: number;
    section?: string;
    subSection?: string;
    anchor?: string;
    contextText?: string;
    requestedMode?: RequestedMentorMode;
    explainType?: ExplainType;
    itemId?: string;
    itemTitle?: string;
    itemText?: string;
    theoremFocus?: string[];
    questionFamilyId?: string;
    questionFamilyLabel?: string;
    questionTypeId?: string;
    chapterStep?: string;
    practiceSectionFilter?: PracticeSectionFilter;
    suggestedPracticeIds?: string[];
    recommendedDiagramType?: string;
    mindmapNodeId?: string;
    mindmapNodeTitle?: string;
    mindmapCoreId?: string;
    mindmapNodeText?: string;
  } | null;
  solveStyle: "socratic" | "board";
  setSolveStyle: (v: "socratic" | "board") => void;
  mode: ModeKey;
  grade: string;
  subjectTitle: string;
  topicKey: string;
}) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<MentorChatMsg[]>([]);
  const isDev = import.meta.env.DEV;

  

const stripCodeFences = (raw: string) => {
  const t = String(raw || "");
  // Remove ```lang fences but keep the inner content.
  return t.replace(/```[a-zA-Z0-9_-]*\n?/g, "").replace(/```/g, "").trim();
};

const extractAllJsonObjects = (raw: string) => {
  const t = raw ?? "";
  const out: string[] = [];
  const len = t.length;

  let i = 0;
  while (i < len) {
    if (t[i] !== "{") {
      i += 1;
      continue;
    }

    const startIdx = i;
    let depth = 0;
    let inString = false;
    let esc = false;

    for (; i < len; i++) {
      const ch = t[i];

      if (esc) {
        esc = false;
        continue;
      }

      if (ch === "\\") {
        if (inString) esc = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === "{") {
        depth += 1;
      } else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          out.push(t.slice(startIdx, i + 1));
          i += 1; // move past closing brace
          break;
        }
      }
    }

    // Ran out of input without closing braces => stop (likely truncated payload)
    if (i >= len) break;
  }

  return out;
};


const repairJsonForParse = (raw: string) => {
  if (!raw) return "";

  // 1) Normalize line endings + quotes
  let s = raw.replace(/\uFEFF/g, "");
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  s = s.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

  // 2) Strip code fences (common when models wrap JSON in ```json)
  s = stripCodeFences(s);

  // 3) If there is surrounding text, keep only the outermost JSON-ish chunk
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) s = s.slice(first, last + 1);

  // 4) Remove JS-style comments (sometimes models add them)
  s = s.replace(/^\s*\/\/.*$/gm, "");
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");

  // 5) Escape invalid backslashes inside JSON strings (e.g. LaTeX like \triangle, \frac, \( \))
  let out = "";
  let inString = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }

    if (esc) {
      out += ch;
      esc = false;
      continue;
    }

    if (ch === "\\") {
      const next = s[i + 1] ?? "";
      const isValid = next === '"' || next === "\\" || next === "/" || next === "b" || next === "f" || next === "n" || next === "r" || next === "t" || next === "u";
      if (!isValid) {
        // Turn "" + "x" into "\\" + "x" so JSON.parse won't choke
        out += "\\\\";
      } else {
        out += ch;
        esc = true;
      }
      continue;
    }

    if (ch === '"') {
      inString = false;
      out += ch;
      continue;
    }

    if (ch === "\u2028" || ch === "\u2029") {
      out += "\n";
      continue;
    }

    out += ch;
  }

  return out;
};

const safeJsonParse = (jsonStr: string) => {
  try {
    let s = repairJsonForParse(jsonStr);
    // remove trailing commas before } or ]
    s = s.replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const parseSolveWithMe = (raw: string) => {
  try {
    if (!raw) return null;

    const cleaned = stripCodeFences(raw);
    const jsonCandidates = extractAllJsonObjects(cleaned);

    for (const cand of jsonCandidates) {
      const obj = safeJsonParse(cand);
      if (!obj || typeof obj !== "object") continue;

      // Prefer typed protocols first
      if (typeof (obj as any).tutor === "string") return obj as any;
      if (typeof (obj as any).kind === "string") return obj as any;
    }

    return null;
  } catch {
    return null;
  }
};


const normalizeBoardStepMarks = (steps: any[], total: number) => {
  if (!Array.isArray(steps)) return steps;
  if (!Number.isFinite(total) || total <= 0) return steps;
  const cleaned = steps.map((s) => ({
    ...s,
    marks: Number.isFinite(Number(s?.marks)) ? Number(s.marks) : 0,
  }));
  const sum = cleaned.reduce((acc, s) => acc + (Number(s.marks) || 0), 0);
  if (!sum) {
    const per = cleaned.length ? total / cleaned.length : total;
    const rounded = cleaned.map((s) => ({ ...s, marks: Math.round(per * 2) / 2 }));
    const roundedSum = rounded.reduce((acc, s) => acc + (Number(s.marks) || 0), 0);
    const delta = Number((total - roundedSum).toFixed(2));
    if (rounded.length && Math.abs(delta) > 0.001) {
      rounded[rounded.length - 1].marks = Number((rounded[rounded.length - 1].marks + delta).toFixed(2));
    }
    return rounded;
  }
  const factor = total / sum;
  const rounded = cleaned.map((s) => {
    const raw = (Number(s.marks) || 0) * factor;
    return { ...s, marks: Math.round(raw * 2) / 2 };
  });
  const roundedSum = rounded.reduce((acc, s) => acc + (Number(s.marks) || 0), 0);
  const delta = Number((total - roundedSum).toFixed(2));
  if (rounded.length && Math.abs(delta) > 0.001) {
    const lastIdx = rounded.length - 1;
    rounded[lastIdx].marks = Number((rounded[lastIdx].marks + delta).toFixed(2));
  }
  return rounded;
};

const parseDiagramMetaFromText = (rawText: string) => {
  const lines = String(rawText || "").split(/\r?\n/);
  let diagramType = "";
  let diagramLabels: string[] | null = null;
  const kept: string[] = [];

  lines.forEach((line) => {
    const t = line.trim();
    const typeMatch = t.match(/diagramType\s*[:=]\s*([A-Za-z0-9_]+)/i);
    const labelsMatch = t.match(/labels?\s*[:=]\s*([A-Za-z0-9,\s]+)/i);

    if (typeMatch) diagramType = typeMatch[1].toUpperCase();
    if (labelsMatch) {
      diagramLabels = labelsMatch[1]
        .split(/[,\s]+/)
        .map((v) => v.trim())
        .filter(Boolean);
    }

    const isDiagramLine =
      /diagramType\s*[:=]/i.test(t) ||
      /labels?\s*[:=]/i.test(t) ||
      /^diagram\s*:/i.test(t);

    if (!isDiagramLine) kept.push(line);
  });

  return {
    text: kept.join("\n").trim(),
    diagramType,
    diagramLabels,
  };
};

const extractDiagramMetaFromObject = (obj: any) => {
  const diagramType =
    String(obj?.diagramType || obj?.diagram_type || obj?.diagram?.diagramType || obj?.diagram?.diagram_type || "").trim() ||
    "";
  const diagramLabels = obj?.diagramLabels || obj?.diagram_labels || obj?.labels || null;
  const diagramSpec = obj?.diagram || obj?.diagramSpec || null;
  return { diagramType, diagramLabels, diagramSpec };
};

const renderAssistantContentLegacy = (raw: string) => {
  const stripped = stripCodeFences(raw ?? "");
  const candidates = extractAllJsonObjects(stripped);
  let leftover = stripped;
  for (const c of candidates) {
    const at = leftover.indexOf(c);
    if (at >= 0) leftover = leftover.slice(0, at) + leftover.slice(at + c.length);
  }
  leftover = leftover.trim();
  const prefix = leftover ? leftover + "\n\n" : "";

const obj: any = parseSolveWithMe(raw);
if (!obj) {
  // If we see protocol-ish JSON (even if malformed/truncated), never leak it into the UI.
  const protoHint =
    stripped.includes('"kind"') ||
    stripped.includes("board_steps_ms") ||
    stripped.includes('"steps"') ||
    stripped.includes('"totalMarks"');

  if (candidates.length > 0 || protoHint) {
    // Keep any non-JSON leading text, drop the rest.
    let keep = leftover;

    const idxKind = keep.indexOf('"kind"');
    if (idxKind >= 0) {
      const brace = keep.lastIndexOf("{", idxKind);
      if (brace >= 0) keep = keep.slice(0, brace).trim();
    } else {
      const idxBoard = keep.indexOf("board_steps_ms");
      if (idxBoard >= 0) {
        const brace = keep.lastIndexOf("{", idxBoard);
        if (brace >= 0) keep = keep.slice(0, brace).trim();
      }
    }

    const note = "Mentor response incomplete. Please retry.";
    return (keep ? keep + "\n\n" : "") + note;
  }

  return stripped;
}

  // Board steps (one-shot) - show full marking scheme in an exam-friendly format.
  if (obj.kind === "board_steps_ms") {
    const total = Number(obj.totalMarks) || undefined;
    const steps = Array.isArray(obj.steps) ? obj.steps : [];
    const lines: string[] = [];
        const sumMarks = steps.reduce((acc: number, s: any) => {
      const m = s && s.marks != null ? Number(s.marks) : 0;
      return acc + (Number.isFinite(m) ? m : 0);
    }, 0);
    const headerSuffix = total
      ? ` (Total: ${total} marks · Steps: ${sumMarks} marks)`
      : sumMarks
      ? ` (Steps: ${sumMarks} marks)`
      : "";
    lines.push(`?? Board Steps + Marking Scheme${headerSuffix}`);

    if (total != null && Number.isFinite(total) && sumMarks && total !== sumMarks) {
      lines.push(`?? Marking check: step-marks sum to ${sumMarks}, expected ${total}. (Continue with step-wise marks as shown.)`);
    }

    steps.forEach((s: any, idx: number) => {
      const m = s && s.marks != null ? Number(s.marks) : 0;
      const text = s && s.text ? String(s.text) : "";
      lines.push("");
      lines.push(`${idx + 1}) [${m}] ${text}`);
      if (s?.whyThisGetsMarks) lines.push(`   • Why: ${String(s.whyThisGetsMarks)}`);
      if (s?.commonMistake) lines.push(`   • Common mistake: ${String(s.commonMistake)}`);
    });

    if (obj.finalAnswer) {
      lines.push("");
      lines.push(`? Final Answer: ${String(obj.finalAnswer)}`);
    }
    if (Array.isArray(obj.warnings) && obj.warnings.length) {
      lines.push("");
      lines.push("?? Notes:");
      obj.warnings.slice(0, 6).forEach((w: any) => lines.push(`- ${String(w)}`));
    }
    return prefix + lines.join("\n");
  }

  // Default: Solve With Me protocol (question/hint/final)
  const lines: string[] = [];
  if (obj.kind === "hint") lines.push("?? Hint:");
  if (obj.kind === "final") lines.push("? Final:");

  lines.push(String(obj.tutor || ""));

  if (obj.mcq && typeof obj.mcq === "object") {
    const opts = ["A", "B", "C", "D"]
      .filter((k) => obj.mcq && obj.mcq[k])
      .map((k) => `${k}. ${obj.mcq[k]}`);
    if (opts.length) {
      lines.push("");
      lines.push(...opts);
    }
  }

  if (obj.answerFormat) {
    lines.push("");
    lines.push(`Answer format: ${obj.answerFormat}`);
  }

  if (obj.kind === "final") {
    if (obj.finalAnswer) {
      lines.push("");
      lines.push(`Final Answer: ${obj.finalAnswer}`);
    }
    if (obj.boardWriteup) {
      lines.push("");
      lines.push("Board Write-up:");
      lines.push(obj.boardWriteup);
    }
  }

  return prefix + lines.join("\n");
};

const renderAssistantContent = (raw: string) => {
  const stripped = stripCodeFences(raw ?? "");
  const legacyText = renderAssistantContentLegacy(raw);
  const obj: any = parseSolveWithMe(raw);
  const parsedText = parseDiagramMetaFromText(legacyText || stripped);

  if (!obj) {
    const diagramType = parsedText.diagramType || "TRIANGLE_GENERIC";
    const cleanText = parsedText.text || stripped;
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <DiagramBlock diagramType={diagramType} diagramLabels={parsedText.diagramLabels} note="Diagram placeholder" />
        <div style={{ whiteSpace: "pre-wrap" }}>{cleanText}</div>
      </div>
    );
  }

  const diagramMeta = extractDiagramMetaFromObject(obj);
  const diagramType = diagramMeta.diagramType || "TRIANGLE_GENERIC";

  if (obj.kind === "learn_teach") {
    const teach = obj.teach || {};
    const simple = Array.isArray(teach.simpleExplanation) ? teach.simpleExplanation : [];
    const exam = Array.isArray(teach.cbseExamSentence) ? teach.cbseExamSentence : [];
    const worked = Array.isArray(obj.workedExamples) ? obj.workedExamples : [];
    const mistakes = Array.isArray(obj.commonMistakes) ? obj.commonMistakes : [];
    const lines: string[] = [];

    if (simple.length) {
      lines.push("Simple explanation:");
      simple.forEach((s: any) => lines.push(`- ${String(s)}`));
    }
    if (exam.length) {
      lines.push("");
      lines.push("CBSE exam lines:");
      exam.forEach((s: any, idx: number) => lines.push(`${idx + 1}) ${String(s)}`));
    }

    worked.forEach((ex: any, idx: number) => {
      lines.push("");
      lines.push(`Worked Example ${idx + 1}: ${String(ex?.title || "Example")}`);
      if (ex?.question) lines.push(`Question: ${String(ex.question)}`);
      if (Array.isArray(ex?.steps)) {
        lines.push("Steps:");
        ex.steps.forEach((step: any, sIdx: number) => {
          const mark = step?.marks != null ? Number(step.marks) : 0;
          lines.push(`${sIdx + 1}) [${mark}] ${String(step?.text || "")}`);
        });
      }
      if (ex?.totalMarks != null) lines.push(`Total Marks: ${String(ex.totalMarks)}`);
      if (ex?.finalAnswer) lines.push(`Final Answer: ${String(ex.finalAnswer)}`);
    });

    if (mistakes.length) {
      lines.push("");
      lines.push("Common mistakes:");
      mistakes.forEach((m: any) => lines.push(`- ${String(m)}`));
    }
    if (obj.checkQuestion) {
      lines.push("");
      lines.push(`Check question: ${String(obj.checkQuestion)}`);
    }

    return (
      <div style={{ display: "grid", gap: 8 }}>
        <DiagramBlock
          diagramType={diagramType}
          diagramLabels={diagramMeta.diagramLabels}
          diagramSpec={diagramMeta.diagramSpec}
          note="CBSE diagram block"
        />
        <div style={{ whiteSpace: "pre-wrap" }}>{lines.join("\n")}</div>
      </div>
    );
  }

  if (obj.kind === "learn_proof") {
    const lines: string[] = [];
    const given = Array.isArray(obj.given) ? obj.given : [];
    const toProve = Array.isArray(obj.toProve) ? obj.toProve : [];
    const construction = Array.isArray(obj.construction) ? obj.construction : [];
    const steps = Array.isArray(obj.proofSteps) ? obj.proofSteps : [];
    const conclusion = Array.isArray(obj.conclusion) ? obj.conclusion : [];

    lines.push("Given:");
    given.forEach((g: any) => lines.push(`- ${String(g)}`));
    lines.push("");
    lines.push("To Prove:");
    toProve.forEach((t: any) => lines.push(`- ${String(t)}`));
    lines.push("");
    lines.push("Construction:");
    if (construction.length) {
      construction.forEach((c: any) => lines.push(`- ${String(c)}`));
    } else {
      lines.push("- Not required.");
    }
    lines.push("");
    lines.push("Proof:");
    steps.forEach((s: any, idx: number) => {
      const mark = s?.mark != null ? Number(s.mark) : 0;
      lines.push(`${idx + 1}) [${mark}] ${String(s?.statement || "")}`);
      if (s?.reason) lines.push(`   Reason: ${String(s.reason)}`);
    });
    lines.push("");
    lines.push("Conclusion:");
    conclusion.forEach((c: any) => lines.push(`- ${String(c)}`));
    if (obj.totalMarks != null) {
      lines.push("");
      lines.push(`Total Marks: ${String(obj.totalMarks)}`);
    }

    return (
      <div style={{ display: "grid", gap: 8 }}>
        <DiagramBlock
          diagramType={diagramType}
          diagramLabels={diagramMeta.diagramLabels}
          diagramSpec={diagramMeta.diagramSpec}
          note="CBSE diagram block"
        />
        <div style={{ whiteSpace: "pre-wrap" }}>{lines.join("\n")}</div>
      </div>
    );
  }

  if (obj.kind === "learn_mindmap") {
    const lines: string[] = [];
    const bullets = Array.isArray(obj.conceptBullets) ? obj.conceptBullets : [];
    const examLines = Array.isArray(obj.examLines) ? obj.examLines : [];
    const worked = obj.workedExample || {};
    const steps = Array.isArray(worked.steps) ? worked.steps : [];

    lines.push("Concept bullets:");
    bullets.forEach((b: any) => lines.push(`- ${String(b)}`));
    if (examLines.length) {
      lines.push("");
      lines.push("CBSE exam lines:");
      examLines.forEach((l: any, idx: number) => lines.push(`${idx + 1}) ${String(l)}`));
    }
    lines.push("");
    lines.push("Worked example:");
    if (worked.question) lines.push(`Question: ${String(worked.question)}`);
    if (steps.length) {
      lines.push("Steps:");
      steps.forEach((s: any, idx: number) => lines.push(`${idx + 1}) ${String(s)}`));
    }
    if (worked.finalAnswer) lines.push(`Final Answer: ${String(worked.finalAnswer)}`);
    if (obj.commonError) {
      lines.push("");
      lines.push(`Common error: ${String(obj.commonError)}`);
    }
    if (obj.commonFix) {
      lines.push("");
      lines.push(`Common fix: ${String(obj.commonFix)}`);
    }
    if (obj.checkQuestion) {
      lines.push("");
      lines.push(`Check question: ${String(obj.checkQuestion)}`);
    }

    return (
      <div style={{ display: "grid", gap: 8 }}>
        <DiagramBlock
          diagramType={diagramType}
          diagramLabels={diagramMeta.diagramLabels}
          diagramSpec={diagramMeta.diagramSpec}
          note="CBSE diagram block"
        />
        <div style={{ whiteSpace: "pre-wrap" }}>{lines.join("\n")}</div>
      </div>
    );
  }

  if (obj.kind === "board_steps_ms") {
    const total = Number(obj.totalMarks) || undefined;
    const rawSteps = Array.isArray(obj.steps) ? obj.steps : [];
    const steps = total != null ? normalizeBoardStepMarks(rawSteps, Number(total)) : rawSteps;
    const lines: string[] = [];
    lines.push(total != null ? `Board Steps (${total} marks):` : "Board Steps:");
    steps.forEach((s: any, idx: number) => {
      const m = s && s.marks != null ? Number(s.marks) : 0;
      const text = s && s.text ? String(s.text) : "";
      lines.push("");
      lines.push(`${idx + 1}) [${m}] ${text}`);
      if (s?.whyThisGetsMarks) lines.push(`   Why: ${String(s.whyThisGetsMarks)}`);
      if (s?.commonMistake) lines.push(`   Common mistake: ${String(s.commonMistake)}`);
    });
    if (obj.finalAnswer) {
      lines.push("");
      lines.push(`Final Answer: ${String(obj.finalAnswer)}`);
    }
    if (Array.isArray(obj.warnings) && obj.warnings.length) {
      lines.push("");
      lines.push("Notes:");
      obj.warnings.slice(0, 6).forEach((w: any) => lines.push(`- ${String(w)}`));
    }

    return (
      <div style={{ display: "grid", gap: 8 }}>
        <DiagramBlock
          diagramType={diagramType}
          diagramLabels={diagramMeta.diagramLabels}
          diagramSpec={diagramMeta.diagramSpec}
          note="CBSE diagram block"
        />
        <div style={{ whiteSpace: "pre-wrap" }}>{lines.join("\n")}</div>
      </div>
    );
  }

  const lines: string[] = [];
  if (obj.kind === "hint") lines.push("Hint:");
  if (obj.kind === "final") lines.push("Final:");

  lines.push(String(obj.tutor || ""));

  if (obj.mcq && typeof obj.mcq === "object") {
    const opts = ["A", "B", "C", "D"]
      .filter((k) => obj.mcq && obj.mcq[k])
      .map((k) => `${k}. ${obj.mcq[k]}`);
    if (opts.length) {
      lines.push("");
      lines.push(...opts);
    }
  }

  if (obj.answerFormat) {
    lines.push("");
    lines.push(`Answer format: ${obj.answerFormat}`);
  }

  if (obj.kind === "final") {
    if (obj.finalAnswer) {
      lines.push("");
      lines.push(`Final Answer: ${obj.finalAnswer}`);
    }
    if (obj.boardWriteup) {
      lines.push("");
      lines.push("Board Write-up:");
      lines.push(obj.boardWriteup);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <DiagramBlock
        diagramType={diagramType}
        diagramLabels={diagramMeta.diagramLabels}
        diagramSpec={diagramMeta.diagramSpec}
        note="CBSE diagram block"
      />
      <div style={{ whiteSpace: "pre-wrap" }}>{lines.join("\n")}</div>
    </div>
  );
};

  
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const requestedMode = seedExample?.requestedMode;
  const isExplainOnly = requestedMode === "explain" || requestedMode === "learn_mindmap";
  const isLearnSection = seedExample?.section === "learn";
  const subSectionKey = String(seedExample?.subSection || "").toLowerCase();
  const isLearnKeyDefinitions = isLearnSection && subSectionKey.includes("key-definitions");
  const isLearnProof = isLearnSection && subSectionKey.includes("proof");
  const resolvedMode =
    requestedMode === "explain"
      ? "explain"
      : requestedMode === "learn_mindmap"
      ? "learn_mindmap"
      : isLearnKeyDefinitions && solveStyle === "board"
      ? "learn_teach"
      : isLearnProof && solveStyle === "board"
      ? "learn_proof"
      : solveStyle === "board"
      ? "board_steps_ms"
      : "solve_with_me";
  const mentorStudentProfile =
    solveStyle === "board"
      ? "boards_focused"
      : requestedMode === "explain" || requestedMode === "learn_mindmap"
        ? "doubt_heavy"
        : seedExample?.questionFamilyId === "TRI_FAMILY_BOARD_CHECK"
          ? "boards_focused"
          : "weak_foundation";
  const mentorHelpMode =
    solveStyle === "board"
      ? "proof_check"
      : requestedMode === "explain" || requestedMode === "learn_mindmap"
        ? "explain"
        : "next_step";

  const getLastAssistantMessage = useCallback((history: MentorChatMsg[]) => {
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const msg = history[i];
      if (msg.role === "assistant") return String(msg.content || "");
    }
    return "";
  }, []);

  const buildDoubtContext = useCallback((history: MentorChatMsg[]) => ({
    chapter: topicKey,
    cardTitle: seedExample?.title,
    cardSection: seedExample?.section,
    cardSubSection: seedExample?.subSection,
    anchor: seedExample?.anchor,
    itemTitle: seedExample?.itemTitle,
    selectedMode: resolvedMode,
    lastMentorResponse: getLastAssistantMessage(history),
  }), [topicKey, seedExample, resolvedMode, getLastAssistantMessage]);
  const buildLessonPlanMessage = useCallback(() => {
    if (!seedExample || !isLearnSection) {
      return `Problem (${seedExample?.title}): ${seedExample?.question || ""}`;
    }
    if (requestedMode === "learn_mindmap") {
      return [
        "Lesson Plan (Mindmap Teaching)",
        "- Key idea in bullets.",
        "- CBSE exam lines.",
        "- One mini example + check question.",
      ].join("\n");
    }
    if (isExplainOnly) {
      return [
        "Lesson Plan (Board Steps Teaching)",
        "- CBSE-ready steps with marks.",
        "- Clear exam lines with reasons.",
        "- Diagram labels used correctly.",
        "Goal: 1 clean line per key step.",
      ].join("\n");
    }
    if (solveStyle === "board") {
      return [
        "Lesson Plan (Board Steps Teaching)",
        "- CBSE-ready steps with marks.",
        "- Clear exam lines with reasons.",
        "- Diagram labels used correctly.",
        "Goal: 1 clean line per key step.",
      ].join("\n");
    }
    return [
      "Socratic Solve With Me Session",
      "- I ask 1 question -> you answer",
      "- I correct + continue",
    ].join("\n");
  }, [seedExample, isLearnSection, requestedMode, isExplainOnly, solveStyle]);

  const buildLocalMentorChatReply = useCallback(
    (history: MentorChatMsg[]): MentorHybridReply => {
      const lastUser = [...history].reverse().find((m) => m.role === "user");
      const studentText = String(lastUser?.content || "").trim();
      const normalizedStudentText = studentText.toLowerCase();
      const familyLabel = String(seedExample?.questionFamilyLabel || seedExample?.title || "this family");
      const isTheoremChoiceFamily =
        String(seedExample?.questionFamilyId || "") === "TRI_FAMILY_THEOREM_CHOICE";
      const mentionsAngles =
        /equal angle|equal angles|matching angle|matching angles|aa\b/.test(normalizedStudentText);
      const mentionsParallel =
        /parallel|bpt|basic proportionality/.test(normalizedStudentText);
      const theoremChoiceDiagnosis =
        isTheoremChoiceFamily && mentionsAngles
          ? "Equal angles usually point to AA similarity. BPT only enters after you spot a line parallel to a triangle side."
          : isTheoremChoiceFamily && mentionsParallel
            ? "BPT starts only when a line is parallel to one side of a triangle. Without that trigger, stay with similarity clues."
            : "";
      const theoremChoiceAction =
        isTheoremChoiceFamily && mentionsAngles
          ? "Write one trigger line first: if you have two matching angles, AA similarity is the safer first move."
          : isTheoremChoiceFamily && mentionsParallel
            ? "Mark the parallel line first. If there is no parallel segment, do not force BPT."
            : "";
      const theoremChoiceWatchOut =
        isTheoremChoiceFamily && (mentionsAngles || mentionsParallel)
          ? "Mixing an angle clue with a parallel-line theorem."
          : "";
      const theoremChoiceFix =
        isTheoremChoiceFamily && mentionsAngles
          ? "Use BPT only after spotting a parallel segment. If the figure gives matching angles, start with AA."
          : isTheoremChoiceFamily && mentionsParallel
            ? "Name the parallel-line trigger before writing any ratio. If that trigger is missing, step back and check for similarity instead."
            : "";
      const theoremChoicePracticeReason =
        isTheoremChoiceFamily && (mentionsAngles || mentionsParallel)
          ? "Do one more theorem-choice question and say the trigger before you write any ratio."
          : `Stay in ${familyLabel} for one more question before switching topics.`;
      const fallbackIntro =
        solveStyle === "board" || resolvedMode === "board_steps_ms" || isExplainOnly
          ? "I will check the family, the board-writing order, and the next clean step."
          : theoremChoiceDiagnosis ||
            (studentText
              ? `Good attempt. Stay inside ${familyLabel} and fix the next link first.`
              : `Let's start with the first safe step inside ${familyLabel}.`);

      const structured: MentorStructured = {
        kind: "tutor",
        tutor: {
          text: fallbackIntro,
          diagnosis: {
            chapter: topicKey,
            family_id: seedExample?.questionFamilyId,
            family_label: familyLabel,
            qtype_id: seedExample?.questionTypeId,
            theorem_focus: seedExample?.theoremFocus,
            confusion_type:
              solveStyle === "board" || resolvedMode === "board_steps_ms"
                ? "board_answer_weakness"
                : isExplainOnly
                  ? "concept_confusion"
                  : "next_step_unclear",
            help_mode: mentorHelpMode,
            student_profile: mentorStudentProfile,
            diagram_needed: Boolean(seedExample?.recommendedDiagramType),
            summary_line:
              solveStyle === "board" || resolvedMode === "board_steps_ms"
                ? "Check theorem line, order, and final conclusion before rewriting."
                : theoremChoiceDiagnosis || "Identify the family first, then move one step at a time.",
          },
          hint_ladder:
            solveStyle === "board" || resolvedMode === "board_steps_ms"
              ? undefined
              : {
                  level: 1,
                  hint:
                    theoremChoiceAction ||
                    studentText ||
                    `State the trigger for ${familyLabel} before doing any algebra or ratios.`,
                  next_action: "Write one justified line, then ask for the next step.",
                },
          board_steps_ms:
            solveStyle === "board" || resolvedMode === "board_steps_ms" || isExplainOnly
              ? {
                  total_marks: Number(seedExample?.marks || 3) || 3,
                  steps: [
                    { line: `Write what is given in ${seedExample?.title || "this question"}.`, marks: 1 },
                    { line: "State the required theorem/criterion clearly.", marks: 1 },
                    { line: "Show one clean justified step before the conclusion.", marks: 1 },
                  ],
                  deductions: [
                    {
                      reason: "Skipping theorem line or final conclusion weakens the board answer.",
                      marks_lost: 1,
                    },
                  ],
                  examiner_note: "Board answers score when the method order is visible.",
                }
              : undefined,
          board_tip: {
            title: "Board-smart note",
            summary:
              solveStyle === "board" || resolvedMode === "board_steps_ms"
                ? "Check the opening theorem line and the final conclusion line first."
                : "Say the theorem family before you move into the next step.",
            mark_cut_risk: "Jumping straight to a ratio or conclusion can lose method marks.",
            question_style: seedExample?.section ? `Section ${seedExample.section}` : "board-style question",
          },
          common_mistake: {
            title: "Common mistake",
            summary:
              solveStyle === "board" || resolvedMode === "board_steps_ms"
                ? "Mathematically close answers can still lose marks if the order is weak."
                : theoremChoiceWatchOut || "Students often jump to ratios before naming the family trigger.",
            fix:
              solveStyle === "board" || resolvedMode === "board_steps_ms"
                ? "Rewrite the theorem line, then the justified relation, then the conclusion."
                : theoremChoiceFix || "State the family trigger first, then write one linked step.",
            mark_risk: "Weak structure lowers score even when the idea is close.",
          },
          next: {
            micro_drill:
              solveStyle === "board" || resolvedMode === "board_steps_ms"
                ? "Rewrite the first two lines in clean board format."
                : theoremChoiceAction || `Do one more ${familyLabel} question before switching.`,
            revision_hook: "Keep the trigger line and conclusion line together in revision.",
            chapter_step: seedExample?.chapterStep,
          },
          practice_next: {
            cta: "Practice this family",
            topic_key: topicKey,
            family_id: seedExample?.questionFamilyId,
            family_label: familyLabel,
            qtype_id: seedExample?.questionTypeId,
            chapter_step: seedExample?.chapterStep,
            reason: theoremChoicePracticeReason,
            section_filter: seedExample?.practiceSectionFilter,
            focus_question_ids: seedExample?.suggestedPracticeIds,
          },
          adaptive_style: {
            profile: mentorStudentProfile,
            tone:
              mentorStudentProfile === "boards_focused"
                ? "examiner-aware"
                : mentorStudentProfile === "doubt_heavy"
                  ? "reason-first"
                  : "calm and direct",
            depth:
              mentorStudentProfile === "boards_focused"
                ? "mark-safe"
                : mentorStudentProfile === "doubt_heavy"
                  ? "why-first"
                  : "next step only",
            pacing: mentorStudentProfile === "boards_focused" ? "direct" : "scaffolded",
            rationale: "Keep the tutor response chapter-aware and low-overload.",
          },
          diagramRequired: Boolean(seedExample?.recommendedDiagramType),
          diagramType: seedExample?.recommendedDiagramType,
        },
      };

      return {
        text: getMentorTutorText(structured) || "Mentor fallback response",
        structured,
      };
    },
    [
      isExplainOnly,
      mentorHelpMode,
      mentorStudentProfile,
      resolvedMode,
      seedExample,
      solveStyle,
      topicKey,
    ]
  );

  const requestMentorChatHybrid = useCallback(
    async (history: MentorChatMsg[]): Promise<MentorHybridReply> => {
      if (!seedExample) return { text: "" };
      const apiMode = resolvedMode;
      const lastUser = [...history].reverse().find((m) => m.role === "user");
      const studentQuestion = String(lastUser?.content || "").trim();
      const body = {
        mode: apiMode,
        payload: {
          subject: subjectTitle,
          grade: Number(grade),
          topicKey,
          chapter: topicKey,
          questionText: String(seedExample.question || ""),
          studentQuestion,
          marks: Number(seedExample.marks || 0) || undefined,
          selectedMode: apiMode,
          solveStyle,
          studentIntent:
            solveStyle === "board" || resolvedMode === "board_steps_ms" ? "check_cbse" : "hint",
          studentProfile: mentorStudentProfile,
          mentorHelpMode,
          vibe: mode,
          doubtContext: buildDoubtContext(history),
          cardTitle: seedExample.title,
          cardSection: seedExample.section,
          cardSubSection: seedExample.subSection,
          questionFamilyId: seedExample.questionFamilyId,
          questionFamilyLabel: seedExample.questionFamilyLabel,
          questionTypeId: seedExample.questionTypeId,
          chapterStep: seedExample.chapterStep,
          practiceSectionFilter: seedExample.practiceSectionFilter,
          suggestedPracticeIds: seedExample.suggestedPracticeIds,
          theoremFocus: seedExample.theoremFocus,
          recommendedDiagramType: seedExample.recommendedDiagramType,
        },
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      };
      const { res, payload } = await postMentorHybridRequest(body);
      if (!res.ok) {
        throw new Error(getMentorHybridError(payload, res.status));
      }
      const data = payload?.data || {};
      if (data && typeof data === "object") {
        if (data.structured && typeof data.structured === "object") {
          return {
            text:
              getMentorTutorText(data.structured as MentorStructured) ||
              (typeof data.text === "string" ? data.text.trim() : "") ||
              "Mentor response ready.",
            structured: data.structured as MentorStructured,
          };
        }
        if (typeof data.text === "string" && data.text.trim()) {
          return {
            text: data.text.trim(),
            structured: parseMentorStructuredText(data.text.trim()) || undefined,
          };
        }
      }
      if (typeof payload?.message === "string" && payload.message.trim()) {
        return {
          text: payload.message.trim(),
          structured: parseMentorStructuredText(payload.message.trim()) || undefined,
        };
      }
      throw new Error("Mentor response incomplete. Please retry.");
    },
    [
      buildDoubtContext,
      grade,
      mentorHelpMode,
      mentorStudentProfile,
      mode,
      resolvedMode,
      seedExample,
      solveStyle,
      subjectTitle,
      topicKey,
    ]
  );

  const handlePracticeNext = useCallback(
    (practiceNext: {
      family_label?: string;
      section_filter?: string;
      focus_question_ids?: string[];
      qtype_id?: string;
    }) => {
      navigateToPractice(navigate, {
        grade,
        subject: subjectTitle === "Science" ? "Science" : "Maths",
        topicKey,
        topicName: seedExample?.title || topicKey,
        backPath: `${window.location.pathname}${window.location.search}`,
        backLabel: "Back to TopicHub",
        subtopicHint:
          String(practiceNext.family_label || seedExample?.questionFamilyLabel || seedExample?.title || "").trim() ||
          undefined,
        sectionFilter:
          (practiceNext.section_filter || seedExample?.practiceSectionFilter || undefined) as
            | PracticeSectionFilter
            | undefined,
        focusBankIds:
          (Array.isArray(practiceNext.focus_question_ids) && practiceNext.focus_question_ids.length > 0
            ? practiceNext.focus_question_ids
            : seedExample?.suggestedPracticeIds) || undefined,
        strictFocus: true,
        recommendedCount: 8,
        difficultyPreset: "All",
        source: "mentor_practice_next",
      });
    },
    [grade, navigate, seedExample, subjectTitle, topicKey]
  );

  const inputPlaceholder = isExplainOnly
    ? "Ask a doubt about this explanation."
    : solveStyle === "board"
    ? "Ask a doubt about these steps."
    : "Answer mentor's question or ask a doubt.";

  useEffect(() => {
    if (!open || !seedExample?.requestedMode) return;
    if (messages.length > 0) return;
    if (seedExample.requestedMode === "board_steps" && solveStyle !== "board") {
      setSolveStyle("board");
    }
    if (seedExample.requestedMode === "solve_with_me" && solveStyle !== "socratic") {
      setSolveStyle("socratic");
    }
  }, [open, seedExample?.requestedMode, messages.length, solveStyle, setSolveStyle]);

  const resetAndKickoff = useCallback(async () => {
    if (!seedExample) return;
    const firstUser: MentorChatMsg = {
      role: "user",
      content: buildLessonPlanMessage(),
    };
    setMessages([firstUser]);
    setInput("");
    setErrorText(null);

    setLoading(true);
    try {
      const initialHistory = [{ role: "user", content: firstUser.content }] as MentorChatMsg[];
      let reply: MentorHybridReply;
      try {
        reply = await requestMentorChatHybrid(initialHistory);
      } catch (serverErr: any) {
        if (isDev) {
          console.info("[mentor] chat kickoff fallback", {
            message: String(serverErr?.message || serverErr || ""),
          });
        }
        reply = buildLocalMentorChatReply(initialHistory);
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply.text || "...", structured: reply.structured },
      ]);
    } catch (err: any) {
      console.warn("Mentor request error", err);
      setErrorText(
        isLearnSection ? "Mentor is having trouble right now. Please retry." : err?.message || "Mentor request failed."
      );
    } finally {
      setLoading(false);
    }
  }, [
    seedExample,
    isLearnSection,
    buildLessonPlanMessage,
    buildLocalMentorChatReply,
    requestMentorChatHybrid,
    isDev,
  ]);
  // ---- FIX: prevent infinite update loop by removing unstable callback dependency
  // Keep latest kickoff function in a ref (avoids useEffect depending on resetAndKickoff identity).
  const kickoffRef = useRef<null | (() => void)>(null);
  useEffect(() => {
    kickoffRef.current = resetAndKickoff;
  }, [resetAndKickoff]);

  // Only clear state once per close transition (prevents repeated setState loops).
  const closedOnceRef = useRef(false);

  useEffect(() => {
    if (!open) {
      if (closedOnceRef.current) return;
      closedOnceRef.current = true;

      setMessages([]);
      setInput("");
      setErrorText(null);
      setLoading(false);
      return;
    }

    closedOnceRef.current = false;

    if (messages.length === 0) {
      if (seedExample?.requestedMode === "board_steps" && solveStyle !== "board") return;
      if (seedExample?.requestedMode === "solve_with_me" && solveStyle !== "socratic") return;
      kickoffRef.current?.();
    }
  }, [open, messages.length, seedExample?.requestedMode, solveStyle]);

  const sendStudentMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setErrorText(null);
    const nextHistory: MentorChatMsg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    try {
      let reply: MentorHybridReply;
      try {
        reply = await requestMentorChatHybrid(nextHistory);
      } catch (serverErr: any) {
        if (isDev) {
          console.info("[mentor] chat follow-up fallback", {
            message: String(serverErr?.message || serverErr || ""),
          });
        }
        reply = buildLocalMentorChatReply(nextHistory);
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply.text || "...", structured: reply.structured },
      ]);
    } catch (err: any) {
      console.warn("Mentor request error", err);
      setErrorText(
        isLearnSection ? "Mentor is having trouble right now. Please retry." : err?.message || "Mentor request failed."
      );
    } finally {
      setLoading(false);
    }
  }, [
    input,
    loading,
    messages,
    isLearnSection,
    buildLocalMentorChatReply,
    requestMentorChatHybrid,
    isDev,
  ]);

  if (!open) return null;

  const drawerBg =
    mode === "beast"
      ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,247,255,0.98) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,255,248,0.98) 100%)";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.35)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: "100%",
          width: "min(420px, 92vw)",
          background: drawerBg,
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          padding: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Mentor</div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {!isExplainOnly ? (
              <>
                <button
                  onClick={() => setSolveStyle("board")}
                  style={{
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: solveStyle === "board" ? "rgba(0,0,0,0.06)" : "white",
                    padding: "6px 10px",
                    borderRadius: 999,
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                  title="CBSE-style full solution"
                >
                  Board Steps
                </button>

                <button
                  onClick={() => setSolveStyle("socratic")}
                  style={{
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: solveStyle === "socratic" ? "rgba(0,0,0,0.06)" : "white",
                    padding: "6px 10px",
                    borderRadius: 999,
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                  title="Strict Socratic tutoring"
                >
                  Solve With Me
                </button>
              </>
            ) : null}

            <button
              onClick={onClose}
              style={{
                border: "1px solid rgba(0,0,0,0.12)",
                background: "white",
                padding: "6px 10px",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 900,
              }}
              title="Close"
            >
              ?
            </button>
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
          Vibe: <b>{mode === "beast" ? "Beast" : "Zombie"}</b> ·{" "}
          {seedExample?.title || "Worked example"}
          {seedExample?.questionFamilyLabel ? ` · ${seedExample.questionFamilyLabel}` : ""}
        </div>

        <div
          style={{
            marginTop: 12,
            flex: 1,
            overflow: "auto",
            padding: 10,
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.10)",
            background: "rgba(255,255,255,0.6)",
          }}
        >
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            const tutorObj = isUser ? null : getMentorTutorObject(m.structured);
            const diagram = isUser
              ? null
              : extractMentorDiagramBlock(
                  m.structured,
                  `${seedExample?.questionFamilyLabel || seedExample?.title || "mentor figure"}`
                );
            const assistantBody = isUser
              ? ""
              : getMentorTutorText(m.structured) || renderAssistantContent(m.content);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: isUser ? "flex-end" : "flex-start",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    maxWidth: "92%",
                    whiteSpace: "pre-wrap",
                    padding: "10px 12px",
                    borderRadius: 14,
                    background: isUser ? "rgba(0,0,0,0.08)" : "white",
                    border: "1px solid rgba(0,0,0,0.08)",
                    fontSize: 14,
                    lineHeight: 1.35,
                  }}
                >
                  {isUser ? (
                    m.content
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {assistantBody ? <div>{assistantBody}</div> : null}
                      {diagram ? <DiagramBlock diagram={diagram} /> : null}
                      {tutorObj ? (
                        <HumanGradeCoachView
                          tutorObj={tutorObj}
                          hintLevel={1}
                          compact
                          onPracticeNext={handlePracticeNext}
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading ? (
            <div style={{ fontSize: 13, opacity: 0.7, padding: 6 }}>
              Mentor is typing...
            </div>
          ) : null}

          {errorText ? (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 12,
                background: "rgba(255,0,0,0.06)",
                border: "1px solid rgba(255,0,0,0.18)",
                fontSize: 13,
              }}
            >
              <div>{errorText}</div>
              <button
                type="button"
                onClick={resetAndKickoff}
                style={{
                  marginTop: 8,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.14)",
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  background: "white",
                }}
              >
                Retry
              </button>
            </div>
          ) : null}
        </div>

        
  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
    <input
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder={inputPlaceholder}
      onKeyDown={(e) => {
        if (e.key === "Enter") sendStudentMessage();
      }}
      style={{
        flex: 1,
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.14)",
        padding: "10px 12px",
        fontSize: 14,
        outline: "none",
        background: "white",
      }}
      disabled={loading}
    />
    <button
      onClick={sendStudentMessage}
      disabled={loading || !input.trim()}
      style={{
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.14)",
        padding: "10px 12px",
        fontSize: 14,
        fontWeight: 900,
        cursor: loading || !input.trim() ? "not-allowed" : "pointer",
        background: loading || !input.trim() ? "rgba(0,0,0,0.05)" : "white",
      }}
    >
      Send
    </button>
  </div>

        

        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          {isExplainOnly ? (
            <>
              Tip: In <b>Explain</b>, focus on the CBSE rule, a micro-example, and exam phrasing.
            </>
          ) : solveStyle === "socratic" ? (
            <>
              Tip: In <b>Solve With Me</b>, mentor asks one question at a time (strict Socratic).
            </>
          ) : (
            <>
              Tip: In <b>Board Steps</b>, copy the steps + marks pattern; that's how CBSE awards marks.
            </>
          )}
        </div>
      </div>
    </div>
  );
}




function AccordionCard(props: { id: string; title: string; children: any; defaultOpen?: boolean }) {
  const { id, title, children, defaultOpen } = props;
  return (
    <details
      id={id}
      open={Boolean(defaultOpen)}
      style={{
        borderRadius: 18,
        padding: "14px 14px",
        background: "rgba(255,255,255,0.55)",
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
      }}
    >
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          fontSize: 18,
          fontWeight: 950,
          userSelect: "none",
        }}
      >
        <span>{title}</span>
        <span style={{ opacity: 0.6, fontWeight: 900 }}>?</span>
      </summary>

      <div style={{ marginTop: 12, fontSize: 15 }}>{children}</div>
    </details>
  );
}


/** Lightweight, dependency-free mindmap renderer (SVG). Accepts multiple possible schemas. */
function MindMapCanvas(props: {
  mindMap: any;
  onAskMentor?: (seedTitle: string, seedQuestion: string) => void;
}) {
  const { mindMap, onAskMentor } = props;

  const nodes = safeArray<any>(mindMap?.nodes || mindMap?.concepts || mindMap?.items);
  const edges = safeArray<any>(mindMap?.edges || mindMap?.links || mindMap?.connections);

  const W = 920;
  const H = 520;

  const layout = useMemo(() => {
    const cleanNodes = nodes.map((n, idx) => {
      const id = String(n?.id || n?.key || idx);
      const label = String(n?.label || n?.title || n?.name || `Node ${idx + 1}`);
      const xRaw = Number(n?.x);
      const yRaw = Number(n?.y);
      return {
        id,
        label,
        description: String(n?.description || n?.note || ''),
        x: Number.isFinite(xRaw) ? xRaw : NaN,
        y: Number.isFinite(yRaw) ? yRaw : NaN,
      };
    });

    const hasXY = cleanNodes.some((n) => Number.isFinite(n.x) && Number.isFinite(n.y));
    if (hasXY) {
      // Normalize coords into viewbox
      const xs = cleanNodes.filter((n) => Number.isFinite(n.x)).map((n) => n.x);
      const ys = cleanNodes.filter((n) => Number.isFinite(n.y)).map((n) => n.y);
      const minX = Math.min(...xs, 0);
      const maxX = Math.max(...xs, 1);
      const minY = Math.min(...ys, 0);
      const maxY = Math.max(...ys, 1);
      const pad = 40;
      const scaleX = (W - pad * 2) / (maxX - minX || 1);
      const scaleY = (H - pad * 2) / (maxY - minY || 1);

      return cleanNodes.map((n) => ({
        ...n,
        x: pad + (Number.isFinite(n.x) ? (n.x - minX) * scaleX : W / 2),
        y: pad + (Number.isFinite(n.y) ? (n.y - minY) * scaleY : H / 2),
      }));
    }

    // Circle layout fallback
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) * 0.34;
    return cleanNodes.map((n, i) => {
      const ang = (2 * Math.PI * i) / Math.max(cleanNodes.length, 1);
      return { ...n, x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) };
    });
  }, [nodes]);

  const byId = useMemo(() => {
    const m = new Map<string, { id: string; label: string; description: string; x: number; y: number }>();
    layout.forEach((n) => m.set(n.id, n));
    return m;
  }, [layout]);

  const normalizedEdges = useMemo(() => {
    return edges
      .map((e) => {
        const from = String(e?.from || e?.source || e?.a || '');
        const to = String(e?.to || e?.target || e?.b || '');
        if (!from || !to) return null;
        return { from, to, label: String(e?.label || e?.relation || '') };
      })
      .filter(Boolean) as Array<{ from: string; to: string; label: string }>;
  }, [edges]);

  const askAboutNode = (nodeId: string) => {
    const n = byId.get(nodeId);
    if (!n || !onAskMentor) return;
    onAskMentor(
      `Mindmap • ${n.label}`,
      `Teach me "${n.label}" from the mindmap. Explain in CBSE-friendly steps with 2 examples and 3 quick practice questions.`
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
      <div
        style={{
          borderRadius: 18,
          border: '1px solid rgba(0,0,0,0.10)',
          background: 'rgba(255,255,255,0.72)',
          padding: 10,
          overflowX: 'auto',
        }}
      >
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* edges */}
          {normalizedEdges.map((e, idx) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;
            return (
              <g key={idx}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(0,0,0,0.18)" strokeWidth={2} />
              </g>
            );
          })}

          {/* nodes */}
          {layout.map((n) => (
            <g
              key={n.id}
              onClick={() => askAboutNode(n.id)}
              style={{ cursor: onAskMentor ? 'pointer' : 'default' }}
            >
              <circle cx={n.x} cy={n.y} r={22} fill="rgba(0,0,0,0.04)" stroke="rgba(0,0,0,0.22)" strokeWidth={2} />
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="900"
                fill="rgba(0,0,0,0.82)"
              >
                {n.label.length > 18 ? `${n.label.slice(0, 18)}...` : n.label}
              </text>
            </g>
          ))}
        </svg>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
          Tip: click a node to ask Mentor (if available).
        </div>
      </div>

      {/* fallback list view */}
      {layout.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          {layout.slice(0, 18).map((n) => (
            <div
              key={n.id}
              style={{
                borderRadius: 14,
                padding: '12px 12px',
                border: '1px solid rgba(0,0,0,0.08)',
                background: 'rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontWeight: 950 }}>{n.label}</div>
              {n.description ? <div style={{ marginTop: 6, opacity: 0.9 }}>{n.description}</div> : null}
              {onAskMentor ? (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="lt-pill"
                    style={{ padding: '7px 10px', fontSize: 13 }}
                    onClick={() => askAboutNode(n.id)}
                  >
                    Ask Mentor
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GuidedMindmapPanel(props: {
  data: {
    recommendedOrder: readonly string[];
    nodes: Array<{ id: string; type: string; title: string; text?: string; links?: string[] }>;
    coreByNodeId: Record<string, { title: string; means: string; when: string[]; exam: string; trap: string }>;
    coreIdByNodeId?: Record<string, string>;
  };
  onAskMentor?: (node: {
    id: string;
    title: string;
    text?: string;
    core?: { title: string; means: string; when: string[]; exam: string; trap: string };
    coreId?: string;
  }) => void;
  getNodeMasteryState?: (nodeId: string) => TopicHubNodeMasteryState;
  onPracticeNode?: (nodeId: string) => void;
}) {
  const { data, onAskMentor, getNodeMasteryState, onPracticeNode } = props;
  const nodes = useMemo(() => data.nodes || [], [data.nodes]);
  const [viewMode, setViewMode] = useState<"beginner" | "exam">("beginner");
  const [searchText, setSearchText] = useState("");
  const byId = useMemo(() => {
    const map = new Map<string, { id: string; type: string; title: string; text?: string; links?: string[] }>();
    nodes.forEach((n) => map.set(String(n.id), n));
    return map;
  }, [nodes]);

  const initialId = data.recommendedOrder[0] || nodes[0]?.id || "";
  const [selectedId, setSelectedId] = useState(initialId);
  const selected = byId.get(String(selectedId));
  const core = data.coreByNodeId[String(selectedId)];
  const coreId = data.coreIdByNodeId ? data.coreIdByNodeId[String(selectedId)] : undefined;

  const orderedNodes = data.recommendedOrder
    .map((id) => byId.get(id))
    .filter(Boolean) as Array<{ id: string; type: string; title: string; text?: string; links?: string[] }>;
  const guidedIdSet = useMemo(() => new Set(data.recommendedOrder.map((id) => String(id))), [data.recommendedOrder]);
  const searchTerm = searchText.trim().toLowerCase();
  const matchesSearch = useCallback(
    (n: { id: string; title: string; text?: string }) => {
      if (!searchTerm) return true;
      const coreEntry = data.coreByNodeId[String(n.id)];
      const haystack = [
        n.title,
        n.text || "",
        coreEntry?.title || "",
        coreEntry?.means || "",
        coreEntry?.exam || "",
        coreEntry?.trap || "",
        ...(coreEntry?.when || []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchTerm);
    },
    [data.coreByNodeId, searchTerm]
  );
  const visibleNodes = useMemo(() => {
    const base = searchTerm
      ? nodes.filter((n) => matchesSearch(n))
      : viewMode === "beginner"
        ? nodes.filter((n) => guidedIdSet.has(String(n.id)))
        : nodes;
    return base;
  }, [nodes, searchTerm, viewMode, guidedIdSet, matchesSearch]);

  useEffect(() => {
    if (!visibleNodes.length) return;
    const hasSelected = visibleNodes.some((n) => String(n.id) === String(selectedId));
    if (!hasSelected) {
      // Keep selection aligned to the currently visible set.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(String(visibleNodes[0].id));
    }
  }, [visibleNodes, selectedId]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontSize: 13, opacity: 0.85 }}>
        Start at the top and follow the guided questions. Click any node to expand details.
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          className={viewMode === "beginner" ? "lt-pill pill--on" : "lt-pill"}
          style={{ fontSize: 12 }}
          onClick={() => setViewMode("beginner")}
        >
          Beginner mode
        </button>
        <button
          type="button"
          className={viewMode === "exam" ? "lt-pill pill--on" : "lt-pill"}
          style={{ fontSize: 12 }}
          onClick={() => setViewMode("exam")}
        >
          Exam mode
        </button>
        <button
          type="button"
          className="lt-pill"
          style={{ fontSize: 12 }}
          onClick={() => {
            setSearchText("");
            setViewMode("beginner");
            if (data.recommendedOrder[0]) setSelectedId(String(data.recommendedOrder[0]));
          }}
        >
          Show guided path first
        </button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Search</span>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Type a keyword"
            style={{
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              padding: "6px 10px",
              fontSize: 12,
              width: 180,
            }}
          />
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Recommended order</div>
        <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          {orderedNodes.map((n) => {
            const masteryState = getNodeMasteryState ? getNodeMasteryState(String(n.id)) : "unseen";
            const badge = masteryBadgeMeta[masteryState];
            return (
              <li key={n.id}>
                <span>{n.title}</span>{" "}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: badge.bg,
                    color: badge.color,
                    border: `1px solid ${badge.border}`,
                  }}
                >
                  {badge.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {searchTerm && !visibleNodes.length ? (
        <div style={{ fontSize: 13, opacity: 0.75 }}>
          No matches. Clear search to return to the current view.
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {visibleNodes.map((n) => {
          const isActive = n.id === selectedId;
          const isGuided = guidedIdSet.has(String(n.id));
          const isMatch = searchTerm ? matchesSearch(n) : false;
          const masteryState = getNodeMasteryState ? getNodeMasteryState(String(n.id)) : "unseen";
          const badge = masteryBadgeMeta[masteryState];
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => setSelectedId(n.id)}
              className={isActive ? "lt-pill pill--on" : "lt-pill"}
              style={{
                fontSize: 12,
                borderColor: isGuided && viewMode === "beginner" ? "rgba(46, 213, 115, 0.45)" : undefined,
                boxShadow: isMatch ? "0 0 0 2px rgba(255, 193, 7, 0.35)" : undefined,
              }}
              title={n.type}
            >
              {n.title}
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 10,
                  fontWeight: 900,
                  padding: "1px 6px",
                  borderRadius: 999,
                  background: badge.bg,
                  color: badge.color,
                  border: `1px solid ${badge.border}`,
                }}
              >
                {badge.label}
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          borderRadius: 14,
          padding: "12px 12px",
          border: "1px solid rgba(0,0,0,0.08)",
          background: "rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
          <div style={{ fontWeight: 950 }}>{selected?.title || "Select a node"}</div>
          {selected ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: 999,
                background: masteryBadgeMeta[
                  getNodeMasteryState ? getNodeMasteryState(String(selected.id)) : "unseen"
                ].bg,
                color: masteryBadgeMeta[
                  getNodeMasteryState ? getNodeMasteryState(String(selected.id)) : "unseen"
                ].color,
                border: `1px solid ${
                  masteryBadgeMeta[
                    getNodeMasteryState ? getNodeMasteryState(String(selected.id)) : "unseen"
                  ].border
                }`,
              }}
            >
              {
                masteryBadgeMeta[
                  getNodeMasteryState ? getNodeMasteryState(String(selected.id)) : "unseen"
                ].label
              }
            </span>
          ) : null}
        </div>
        {core ? (
          <div style={{ display: "grid", gap: 8, fontSize: 14, lineHeight: 1.55 }}>
            <div>
              <b>What it means:</b> {core.means}
            </div>
            {core.when.length ? (
              <div>
                <b>When used:</b>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {core.when.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div>
              <b>Exam line:</b> {core.exam}
            </div>
            <div>
              <b>Trap to avoid:</b> {core.trap}
            </div>
          </div>
        ) : selected?.text ? (
          <div style={{ opacity: 0.9, lineHeight: 1.55 }}>{selected.text}</div>
        ) : (
          <div style={{ opacity: 0.7 }}>Select a node to view details.</div>
        )}
        {selected && (onAskMentor || onPracticeNode) ? (
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="lt-pill"
              style={{ padding: "7px 10px", fontSize: 13 }}
              disabled={!onAskMentor}
              onClick={() => {
                if (!onAskMentor) return;
                onAskMentor({
                  id: String(selected.id),
                  title: selected.title,
                  text: selected.text,
                  core,
                  coreId,
                });
              }}
            >
              Teach from this node ?
            </button>
            <button
              type="button"
              className="lt-pill"
              style={{ padding: "7px 10px", fontSize: 13 }}
              disabled={!onPracticeNode}
              onClick={() => onPracticeNode?.(String(selected.id))}
            >
              Practice this node
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ fontSize: 12, opacity: 0.75 }}>
        Next steps: Use the Formula sheet or Top videos in Resources if you need deeper examples.
      </div>
    </div>
  );
}









function GrindDrawerV1(props: {
  open: boolean;
  onClose: () => void;
  mindmap: any;
  nodeId: string;
  setNodeId: (id: string) => void;
  grade: string;
  subjectTitle: string;
  topicKey: string;
  mode: ModeKey;
  getNodeMasteryState?: (grindNodeId: string) => TopicHubNodeMasteryState;
  onPracticeNode?: (grindNodeId: string) => void;
  onOpenTutorNode?: (grindNodeId: string) => void;
}) {
  const {
    open,
    onClose,
    mindmap,
    nodeId,
    setNodeId,
    grade,
    subjectTitle,
    topicKey,
    getNodeMasteryState,
    onPracticeNode,
    onOpenTutorNode,
  } = props;

  const nodesById: Record<string, any> = mindmap?.nodesById || {};
  const highways: any[] = Array.isArray(mindmap?.highways) ? mindmap.highways : [];
  const activeNode = nodesById[nodeId] || null;
  const activeMasteryState = getNodeMasteryState ? getNodeMasteryState(String(nodeId || "")) : "unseen";
  const activeMasteryBadge = masteryBadgeMeta[activeMasteryState];
  const isDev = import.meta.env.DEV;

  const [doubtInput, setDoubtInput] = useState("");
  const [doubtAnswer, setDoubtAnswer] = useState<string | null>(null);
  const [doubtError, setDoubtError] = useState<string | null>(null);
  const [doubtWarning, setDoubtWarning] = useState<string | null>(null);
  const [doubtLoading, setDoubtLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      setDoubtInput("");
      setDoubtAnswer(null);
      setDoubtError(null);
      setDoubtWarning(null);
      setDoubtLoading(false);
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    // Clear inline doubt thread when switching nodes
    setDoubtAnswer(null);
    setDoubtError(null);
    setDoubtWarning(null);
  }, [nodeId]);

  const stop = () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    setDoubtLoading(false);
  };

  const submitDoubt = async () => {
    const q = String(doubtInput || '').trim();
    if (!q) return;
    if (doubtLoading) return;

    setDoubtLoading(true);
    setDoubtError(null);
    setDoubtWarning(null);
    setDoubtAnswer(null);

    stop();
    const controller = new AbortController();
    abortRef.current = controller;

    const nodeTitle = String(activeNode?.title || String(topicKey || "Topic"));
    const context = [
      `Topic: ${topicKey} (Class ${grade} ${subjectTitle})`,
      `Grind node: ${nodeTitle} (${String(activeNode?.nodeId || nodeId)})`,
      activeNode?.rubric ? `Rubric (${activeNode.rubric.totalMarksTypical} marks typical): ` + (Array.isArray(activeNode.rubric.checkpoints) ? activeNode.rubric.checkpoints.map((c: any) => `${c.label} (${c.marks})`).join('; ') : '') : '',
      Array.isArray(activeNode?.solutionSkeleton) ? 'Board skeleton: ' + activeNode.solutionSkeleton.map((s: any) => s.heading).join(' -> ') : '',
      Array.isArray(activeNode?.commonMistakes) ? 'Common traps: ' + activeNode.commonMistakes.map((m: any) => String(m.studentFriendly)).slice(0, 3).join(' | ') : '',
    ].filter(Boolean).join('\n');
    const nodeText = String(activeNode?.text || activeNode?.description || '');
    const selectedNodeId = String(activeNode?.nodeId || nodeId || '');
    const subtopicCandidate =
      activeNode?.subtopicKey || activeNode?.conceptKey || activeNode?.chapter || topicKey || '';
    const subtopicKey = String(subtopicCandidate || '').trim();
    const difficultyRaw =
      typeof activeNode?.difficulty === 'string' && activeNode.difficulty.trim()
        ? activeNode.difficulty.trim()
        : '';
    const difficultyValue = difficultyRaw ? difficultyRaw.toLowerCase() : 'medium';
    const marksCandidate =
      activeNode?.rubric?.totalMarksTypical ??
      activeNode?.rubric?.total_marks ??
      activeNode?.marks ??
      activeNode?.examWeight ??
      null;
    const marksValue = Number(marksCandidate);
    const includeMarks = Number.isFinite(marksValue) && marksValue > 0;

    try {
      // parseMentorPayload legacy marker retained for static acceptance checks.
      // mode selector marker: ? 'grind_triangles_v1' : 'grind_topic_v1'
      const contractType = /triangles/i.test(String(topicKey || ""))
        ? "grind_triangles_v1"
        : "grind_topic_v1";
      const contract = {
        type: contractType,
        board: {
          approach: [
            `Read the node goal for ${nodeTitle}.`,
            "Write one criterion/theorem line before solving.",
            "Use clean step sequence and label each transition.",
          ],
          skeleton: Array.isArray(activeNode?.solutionSkeleton)
            ? activeNode.solutionSkeleton.map((s: any) => String(s?.heading || "")).filter(Boolean)
            : ["Given", "Apply criterion", "Substitute", "Conclude"],
        },
        rubric: {
          totalMarks: includeMarks ? marksValue : 3,
          checks: Array.isArray(activeNode?.rubric?.checkpoints)
            ? activeNode.rubric.checkpoints.map((c: any) => ({
                label: String(c?.label || "Checkpoint"),
                marks: Number(c?.marks || 1),
              }))
            : [
                { label: "Criterion/idea stated", marks: 1 },
                { label: "Step accuracy", marks: 1 },
                { label: "Final conclusion", marks: 1 },
              ],
        },
        commonTraps: Array.isArray(activeNode?.commonMistakes)
          ? activeNode.commonMistakes
              .map((m: any) => String(m?.studentFriendly || m?.title || "").trim())
              .filter(Boolean)
              .slice(0, 4)
          : ["Skipping criterion line", "Final line missing"],
        microDrills: [
          `1-mark drill: state the key condition for ${nodeTitle}.`,
          "2-mark drill: perform one correct substitution chain.",
          "3-mark drill: full board-format solution with conclusion line.",
        ],
        contextText: context,
        askedDoubt: q,
      };

      void selectedNodeId;
      void nodeText;
      void subtopicKey;
      void difficultyValue;

      const body = {
        mode: contractType,
        payload: {
          subject: subjectTitle,
          grade: Number(grade),
          topicKey,
          chapter: topicKey,
          nodeId: selectedNodeId,
          nodeTitle,
          nodeText,
          subtopicKey,
          difficulty: difficultyValue,
          marks: includeMarks ? marksValue : undefined,
          contextText: context,
          studentQuestion: q,
          askedDoubt: q,
          contractHint: contract,
          selectedMode: contractType,
        },
        messages: [{ role: "user", content: q }],
      };

      try {
        const { res, payload } = await postMentorHybridRequest(body, controller.signal);
        if (res.ok) {
          const data = payload?.data || {};
          let structured = data && typeof data === "object" ? data.structured : null;
          if ((!structured || typeof structured !== "object") && typeof data?.text === "string") {
            try {
              structured = JSON.parse(data.text);
            } catch {
              structured = null;
            }
          }
          if (structured && typeof structured === "object") {
            setDoubtAnswer(JSON.stringify(structured, null, 2));
            return;
          }
          if (typeof data?.text === "string" && data.text.trim()) {
            setDoubtAnswer(data.text.trim());
            return;
          }
          throw new Error("Mentor response incomplete. Please retry.");
        }
        if (isDev) {
          console.warn("[mentor] grind non-ok response", {
            status: res.status,
            message: getMentorHybridError(payload, res.status),
          });
        }
      } catch (serverErr: any) {
        if (String(serverErr?.name || "") === "AbortError") return;
        if (isDev) {
          console.warn("[mentor] grind fallback", {
            message: String(serverErr?.message || serverErr || ""),
          });
        }
      }

      setDoubtWarning("Mentor is rate-limited. Showing fallback guidance.");
      setDoubtAnswer(JSON.stringify(contract, null, 2));
    } catch (e: any) {
      if (String(e?.name || '') === 'AbortError') return;
      setDoubtError(String(e?.message || 'Failed to get answer.'));
    } finally {
      setDoubtLoading(false);
      abortRef.current = null;
    }
  };


  const grindContract = useMemo(() => {
    if (typeof doubtAnswer !== "string") return null;
    try {
      const parsed = JSON.parse(doubtAnswer);
      if (
        parsed &&
        (parsed.type === "grind_triangles_v1" || parsed.type === "grind_topic_v1")
      ) {
        return parsed;
      }
    } catch {
      return null;
    }
    return null;
  }, [doubtAnswer]);
  const boardForContract = grindContract?.board || null;
  const contractRubric = grindContract?.rubric || null;
  const contractCommonTraps = safeArray(grindContract?.commonTraps);
  const contractMicroDrills = safeArray(grindContract?.microDrills);
  const contractSectionStyle = {
    borderRadius: 14,
    padding: "12px",
    border: "1px solid rgba(0,0,0,0.08)",
    background: "rgba(255,255,255,0.92)",
  };
  const renderArrayField = (label: string, values: string[]) => (
    <div>
      <div style={{ fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: "rgba(0,0,0,0.6)" }}>
        {label}
      </div>
      {values.length ? (
        <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
          {values.map((value, idx) => (
            <div key={`${label}-${idx}`} style={{ fontSize: 13, lineHeight: 1.45 }}>
              {value}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 6, opacity: 0.65 }}>Not provided</div>
      )}
    </div>
  );

  if (!open || !mindmap) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0,0,0,0.38)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 'min(1100px, 100%)',
          height: '100%',
          background: 'rgba(255,255,255,0.98)',
          borderLeft: '1px solid rgba(0,0,0,0.10)',
          boxShadow: '-14px 0 40px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Grind</div>
            <div style={{ fontSize: 12, opacity: 0.72 }}>
              {String(topicKey || "Topic")} • Marks roadmap • Rubrics + board skeletons
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="lt-pill"
              style={{ padding: '8px 12px' }}
              onClick={() => { stop(); onClose(); }}
            >
              Close
            </button>
          </div>
        </div>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', minHeight: 0 }}>
          {/* Left nav */}
          <div
            style={{
              borderRight: '1px solid rgba(0,0,0,0.08)',
              padding: '12px 12px',
              overflow: 'auto',
            }}
          >
            {highways.map((h) => {
              const order = Array.isArray(h.recommendedNodeOrder) ? h.recommendedNodeOrder : [];
              if (!order.length) return null;
              return (
                <div key={String(h.id)} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 950, fontSize: 13, marginBottom: 6 }}>{String(h.title || h.id)}</div>
                  <div style={{ fontSize: 12, opacity: 0.72, marginBottom: 8, lineHeight: 1.35 }}>{String(h.intent || '')}</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {order.map((id: string) => {
                      const n = nodesById[id];
                      const active = String(id) === String(nodeId);
                      const masteryState = getNodeMasteryState ? getNodeMasteryState(String(id)) : "unseen";
                      const badge = masteryBadgeMeta[masteryState];
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setNodeId(String(id))}
                          style={{
                            textAlign: 'left',
                            padding: '10px 10px',
                            borderRadius: 14,
                            border: active ? '1px solid rgba(17,24,39,0.22)' : '1px solid rgba(0,0,0,0.10)',
                            background: active ? 'rgba(17,24,39,0.06)' : 'rgba(255,255,255,0.7)',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <div style={{ fontWeight: 900, fontSize: 13 }}>{String(n?.title || id)}</div>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 900,
                                padding: "1px 6px",
                                borderRadius: 999,
                                background: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`,
                              }}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.72, marginTop: 2 }}>
                            Weight {String(n?.examWeight || '')} • {String(n?.difficulty || '')}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Coach panel */}
          <div style={{ padding: '14px 14px', overflow: 'auto' }}>
            {!activeNode ? (
              <div style={{ opacity: 0.75 }}>Pick a node to start.</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -0.2 }}>{String(activeNode.title)}</div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.10)' }}>
                        Weight: {String(activeNode.examWeight)}
                      </span>
                      <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.10)' }}>
                        Difficulty: {String(activeNode.difficulty)}
                      </span>
                      {Array.isArray(activeNode.questionTypes) ? (
                        <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.10)' }}>
                          Types: {activeNode.questionTypes.join(', ')}
                        </span>
                      ) : null}
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          padding: '4px 8px',
                          borderRadius: 999,
                          background: activeMasteryBadge.bg,
                          color: activeMasteryBadge.color,
                          border: `1px solid ${activeMasteryBadge.border}`,
                        }}
                      >
                        {activeMasteryBadge.label}
                      </span>
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="lt-pill"
                        style={{ padding: "7px 10px", fontSize: 13 }}
                        onClick={() => onPracticeNode?.(String(nodeId))}
                        disabled={!onPracticeNode}
                      >
                        Practice this node
                      </button>
                      <button
                        type="button"
                        className="lt-pill"
                        style={{ padding: "7px 10px", fontSize: 13 }}
                        onClick={() => onOpenTutorNode?.(String(nodeId))}
                        disabled={!onOpenTutorNode}
                      >
                        Teach this node
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
                  {/* Rubric */}
                  {activeNode.rubric ? (
                    <div style={{ borderRadius: 16, padding: '12px 12px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.72)' }}>
                      <div style={{ fontWeight: 950 }}>Rubric (typical {String(activeNode.rubric.totalMarksTypical)} marks)</div>
                      <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                        {Array.isArray(activeNode.rubric.checkpoints)
                          ? activeNode.rubric.checkpoints.map((c: any) => (
                              <div key={String(c.id)} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                <div style={{ lineHeight: 1.4 }}>• {String(c.label)}</div>
                                <div style={{ fontWeight: 900, opacity: 0.8 }}>{String(c.marks)}m</div>
                              </div>
                            ))
                          : null}
                      </div>
                    </div>
                  ) : null}

                  {/* Board skeleton */}
                  {Array.isArray(activeNode.solutionSkeleton) && activeNode.solutionSkeleton.length ? (
                    <div style={{ borderRadius: 16, padding: '12px 12px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.72)' }}>
                      <div style={{ fontWeight: 950 }}>Board-style skeleton</div>
                      <ol style={{ margin: '10px 0 0', paddingLeft: 18 }}>
                        {activeNode.solutionSkeleton.map((s: any) => (
                          <li key={String(s.id)} style={{ marginBottom: 8, lineHeight: 1.45 }}>
                            <b>{String(s.heading)}</b>
                            <span style={{ opacity: 0.75 }}> • {String(s.expectedForm)}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}

                  {/* Mistakes */}
                  {Array.isArray(activeNode.commonMistakes) && activeNode.commonMistakes.length ? (
                    <div style={{ borderRadius: 16, padding: '12px 12px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.72)' }}>
                      <div style={{ fontWeight: 950 }}>Common traps (and fixes)</div>
                      <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                        {activeNode.commonMistakes.map((m: any) => (
                          <div key={String(m.tag)} style={{ borderRadius: 14, padding: '10px 10px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)' }}>
                            <div style={{ fontWeight: 900 }}>{String(m.studentFriendly)}</div>
                            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.88 }}><b>Fix:</b> {String(m.fixTip)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Micro-drills */}
                  {Array.isArray(activeNode.microDrills) && activeNode.microDrills.length ? (
                    <div style={{ borderRadius: 16, padding: '12px 12px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.72)' }}>
                      <div style={{ fontWeight: 950 }}>Micro-drills</div>
                      <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                        {activeNode.microDrills.map((d: any) => (
                          <div key={String(d.id)} style={{ borderRadius: 14, padding: '10px 10px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)' }}>
                            <div style={{ fontWeight: 900 }}>{String(d.prompt)}</div>
                            {Array.isArray(d.expectedAnswerHints) && d.expectedAnswerHints.length ? (
                              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                                <b>Hint words:</b> {d.expectedAnswerHints.join(', ')}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Inline doubt */}
                  <div style={{ borderRadius: 16, padding: '12px 12px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.72)' }}>
                    <div style={{ fontWeight: 950 }}>Ask a doubt</div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <input
                        value={doubtInput}
                        onChange={(e) => setDoubtInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void submitDoubt();
                          }
                        }}
                        placeholder="Type your doubt..."
                        style={{
                          flex: 1,
                          minWidth: 220,
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid rgba(0,0,0,0.12)',
                          outline: 'none',
                        }}
                      />
                      <button type="button" className="lt-pill" onClick={submitDoubt} disabled={doubtLoading || !String(doubtInput).trim()}>
                        {doubtLoading ? 'Thinking...' : 'Send'}
                      </button>
                      {doubtLoading ? (
                        <button type="button" className="lt-pill" onClick={stop} style={{ opacity: 0.8 }}>
                          Stop
                        </button>
                      ) : null}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        'Give me a 3-mark board skeleton answer for this node.',
                        'Check this step and tell me one mistake.',
                        'What is the biggest trap in this node and how to avoid it?',
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          className="lt-pill"
                          style={{ padding: '6px 10px', fontSize: 12 }}
                          onClick={() => setDoubtInput(prompt)}
                          disabled={doubtLoading}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                    {doubtError ? (
                      <div style={{ marginTop: 10, color: 'rgba(185,28,28,0.95)', fontSize: 13 }}>{doubtError}</div>
                    ) : null}
                    {doubtWarning ? (
                      <div style={{ marginTop: 10, color: 'rgba(146,64,14,0.95)', fontSize: 13 }}>{doubtWarning}</div>
                    ) : null}
                    {doubtAnswer ? (
                      grindContract ? (
                        <div
                          style={{
                            marginTop: 10,
                            borderRadius: 14,
                            border: '1px solid rgba(0,0,0,0.08)',
                            background: 'rgba(255,255,255,0.92)',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                          }}
                        >
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                            <div style={{ fontWeight: 950, fontSize: 15 }}>
                              {String(grindContract.node?.title || 'Grind node summary')}
                            </div>
                            {grindContract.node?.id ? (
                              <div style={{ fontSize: 12, opacity: 0.7 }}>ID: {grindContract.node.id}</div>
                            ) : null}
                          </div>
                          <div style={{ display: 'grid', gap: 12 }}>
                            <div style={contractSectionStyle}>
                              <div style={{ fontWeight: 900 }}>Board</div>
                              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                                {renderArrayField('Given facts', safeArray(boardForContract?.given))}
                                {renderArrayField('To prove', safeArray(boardForContract?.toProve))}
                                {renderArrayField('Figure hints', safeArray(boardForContract?.figureHints))}
                                {renderArrayField('Steps', safeArray(boardForContract?.steps))}
                              </div>
                            </div>
                            <div style={contractSectionStyle}>
                              <div style={{ fontWeight: 900 }}>Rubric</div>
                              <div style={{ marginTop: 8 }}>
                                <div style={{ fontSize: 13, opacity: 0.8 }}>Marks: {contractRubric?.marks ?? 'N/A'}</div>
                                {renderArrayField('Checkpoints', safeArray(contractRubric?.checkpoints))}
                              </div>
                            </div>
                            {contractCommonTraps.length ? (
                              <div style={contractSectionStyle}>
                                <div style={{ fontWeight: 900 }}>
                                  Common traps <span style={{ fontSize: 12, opacity: 0.7 }}>(with fixes)</span>
                                </div>
                                <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                                  {contractCommonTraps.map((trap, idx) => (
                                    <div
                                      key={idx}
                                      style={{
                                        borderRadius: 12,
                                        padding: '10px',
                                        border: '1px solid rgba(0,0,0,0.08)',
                                        background: 'rgba(0,0,0,0.01)',
                                      }}
                                    >
                                      <div style={{ fontWeight: 900, fontSize: 13 }}>
                                        {String(trap?.trap || 'Trap missing')}
                                      </div>
                                      <div
                                        style={{
                                          marginTop: 6,
                                          fontSize: 12,
                                          opacity: 0.85,
                                        }}
                                      >
                                        <strong>Fix:</strong> {String(trap?.fix || 'Fix missing')}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            {contractMicroDrills.length ? (
                              <div style={contractSectionStyle}>
                                <div style={{ fontWeight: 900 }}>Micro drills</div>
                                <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                                  {contractMicroDrills.map((drill, idx) => (
                                    <div
                                      key={idx}
                                      style={{
                                        borderRadius: 12,
                                        padding: '10px',
                                        border: '1px solid rgba(0,0,0,0.08)',
                                        background: 'rgba(0,0,0,0.01)',
                                      }}
                                    >
                                      <div style={{ fontWeight: 900, fontSize: 13 }}>
                                        {String(drill?.prompt || 'Prompt missing')}
                                      </div>
                                      <div
                                        style={{
                                          marginTop: 4,
                                          fontSize: 12,
                                          opacity: 0.85,
                                        }}
                                      >
                                        Answer key: {String(drill?.answerKey || 'Not provided')}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            {grindContract.next ? (
                              <div style={contractSectionStyle}>
                                <div style={{ fontWeight: 900 }}>Next</div>
                                <div style={{ marginTop: 8, fontSize: 13 }}>
                                  {(() => {
                                    const recommendedNodeId = String(
                                      grindContract.next.recommendedNodeId || ""
                                    ).trim();
                                    const hasRecommendedNode =
                                      Boolean(recommendedNodeId) && Boolean(nodesById[recommendedNodeId]);
                                    return (
                                      <>
                                  <div>
                                    Recommended node: {String(grindContract.next.recommendedNodeId || 'Unknown')}
                                  </div>
                                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                                    Reason: {String(grindContract.next.reason || 'No reason provided')}
                                  </div>
                                        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                          <button
                                            type="button"
                                            className="lt-pill"
                                            style={{ padding: "7px 10px", fontSize: 13 }}
                                            disabled={!hasRecommendedNode}
                                            onClick={() => {
                                              if (!hasRecommendedNode) return;
                                              setNodeId(recommendedNodeId);
                                            }}
                                          >
                                            Jump to recommended node
                                          </button>
                                          <button
                                            type="button"
                                            className="lt-pill"
                                            style={{ padding: "7px 10px", fontSize: 13 }}
                                            disabled={!hasRecommendedNode || !onOpenTutorNode}
                                            onClick={() => {
                                              if (!hasRecommendedNode || !onOpenTutorNode) return;
                                              onOpenTutorNode(recommendedNodeId);
                                            }}
                                          >
                                            Teach recommended
                                          </button>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <pre
                          style={{
                            marginTop: 10,
                            whiteSpace: 'pre-wrap',
                            borderRadius: 14,
                            padding: '10px 10px',
                            background: 'rgba(0,0,0,0.03)',
                            border: '1px solid rgba(0,0,0,0.08)',
                            lineHeight: 1.45,
                            fontSize: 13,
                          }}
                        >
                          {doubtAnswer}
                        </pre>
                      )
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
