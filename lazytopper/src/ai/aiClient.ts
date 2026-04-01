// src/ai/aiClient.ts
// Thin client for talking to LazyTopper AI gateway (mentor + more-like-this)
// Uses relative /api/* calls so it works in dev (Vite proxy) and prod.

import type {
  MentorImageMimeType,
  MentorMode as MentorModeCore,
  MentorGatewayData,
} from "../types/mentor";

/**
 * Supported mentor modes.  In addition to the original modes (plan, solve, explain,
 * coach and mindset) we define topic‑level modes for TopicHub/Trends flows.
 *
 * - `topic_explain`: Explain a topic from basics for a Class 10 CBSE student.
 * - `topic_exam_tips`: Provide exam strategy and high‑yield tips on how to
 *   score 95+ in a given topic or unit.  These extended modes allow
 *   downstream pages (TopicHub and Trends) to route to the mentor
 *   service without overloading the regular explain/solve flows.
 */
export type MentorMode = MentorModeCore;

export interface MentorPayload {
  subject: string;              // "Maths" | "Science" | etc.
  topicKey?: string;            // e.g. "MATH-REAL-NUMBERS"
  conceptKey?: string;
  questionText?: string;        // for explain/solve modes
  studentQuestion?: string;     // for chat-style followups
  marks?: number;
  daysLeft?: number;
  hoursPerDayTotal?: number;
  targetPercent?: number;
  extraNotes?: string;
  imageBase64?: string;
  imageMimeType?: MentorImageMimeType;
  imageName?: string;
}

export interface MentorPersona {
  id: string;
  coreRules?: string[];
  description?: string;
}

export interface MentorResponse {
  mode: MentorMode;
  data: MentorGatewayData;
  meta?: {
    systemPromptUsed?: string;
    personaId?: string;
    model?: string;
  };
}

export interface MoreLikeThisSeedQuestion {
  text: string;
  marks?: number;
  difficulty?: "Easy" | "Medium" | "Hard";
  bloomSkill?: string; // "Remembering" | "Understanding" | "Applying" | ...
}

export interface MoreLikeThisRequest {
  subject: string;
  topicKey: string;
  seedQuestion: MoreLikeThisSeedQuestion;
  numVariants: number;
}

export interface MoreLikeThisVariant extends MoreLikeThisSeedQuestion {
  index: number;
}

export interface MoreLikeThisResponse {
  subject: string;
  topicKey: string;
  model?: string;
  variants: MoreLikeThisVariant[];
}

const API_BASE = "/api"; // Vite dev proxy or same origin in production
export const MENTOR_ENDPOINT = `${API_BASE}/mentor`;

async function handleJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();

  if (!res.ok) {
    let details: { error?: string; message?: string; raw?: string };
    try {
      details = JSON.parse(text);
    } catch {
      details = { raw: text };
    }
    console.error("AI API error:", res.status, details);
    throw new Error(details?.error || details?.message || "AI API request failed");
  }

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    console.error("Failed to parse AI API JSON:", text);
    throw err;
  }
}

/**
 * Call the mentor endpoint for any persona mode (plan / explain / solve / coach / mindset).
 */
export async function callMentor(
  mode: MentorMode,
  payload: MentorPayload,
  persona?: MentorPersona
): Promise<MentorResponse> {
  const res = await fetch(MENTOR_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode,
      payload,
      persona,
    }),
  });

  return handleJsonResponse<MentorResponse>(res);
}

/**
 * Generate HPQ-respecting variants for "More like this" using the backend gateway.
 */
export async function generateMoreLikeThis(
  req: MoreLikeThisRequest
): Promise<MoreLikeThisResponse> {
  const res = await fetch(`${API_BASE}/more-like-this`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });

  return handleJsonResponse<MoreLikeThisResponse>(res);
}
