// src/ai/tutorClient.ts
// FRESH tutor client (D-TUT-12) — NOT aiClient's mentor path. Talks to the fresh
// POST /api/tutor endpoint using the same relative-/api/* pattern (Vite proxy in
// dev, same-origin in prod). Stateless request/response: the client sends the
// conversation-so-far + a compact, client-assembled context brief; the server
// returns the next tutor turn as prose. The tutor NEVER grades and writes nothing
// server-side (D-TUT-8) — persistence + round-trip are Stage 2.

const API_BASE = "/api"; // Vite dev proxy or same origin in production
export const TUTOR_ENDPOINT = `${API_BASE}/tutor`;

/** One conversation turn. `tutor` = the model's reply; `user` = the student. */
export interface TutorTurn {
  role: "user" | "tutor";
  content: string;
}

/**
 * Compact, HONEST context brief the client assembles from MI + progress (read-only)
 * and passes to the server to SHAPE the reply — never recited as a scorecard. When
 * there is no reliable data, `hasData` is false and every field is omitted, so the
 * server is told to stay generic and invent nothing (product "no fake data").
 */
export interface TutorBrief {
  hasData: boolean;
  topic: {
    masteryPercent?: number;
    masteryState?: string;
    trend?: "improving" | "worsening" | "stable";
    weakConcepts?: string[];
  };
  mistakes: {
    topType?: string;
    marksLostRecent?: number;
  };
}

export interface TutorRequest {
  uid: string;
  /** Canonical topic slug (resolveCanonicalSlug) — the SINGLE canonicalizer (D-TUT-14). */
  topicKey: string;
  /** Human topic label for the prompt/header, e.g. "Trigonometry". */
  topicLabel: string;
  subject: "maths" | "science" | "";
  /** Sub-topic the student opened on (per-row "Stuck?"), if any. */
  concept?: string;
  messages: TutorTurn[];
  brief?: TutorBrief | null;
  /** Output language for the explanation. Exam content stays English (Teach-Contract §5). */
  language?: string;
}

export interface TutorReply {
  reply: string;
  model?: string;
  provider?: string;
}

/**
 * Call the fresh tutor endpoint for the next turn. Throws a plain Error carrying the
 * server's message on a non-2xx or unparseable response (the UI surfaces it as an
 * honest, retryable error — never a fabricated reply).
 */
export async function callTutor(req: TutorRequest): Promise<TutorReply> {
  const res = await fetch(TUTOR_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  const text = await res.text();

  if (!res.ok) {
    let details: { error?: string; message?: string } = {};
    try {
      details = JSON.parse(text);
    } catch {
      /* non-JSON error body — fall through to the generic message */
    }
    throw new Error(details.error || details.message || "The tutor request failed.");
  }

  let parsed: TutorReply;
  try {
    parsed = JSON.parse(text) as TutorReply;
  } catch {
    throw new Error("The tutor sent a response we could not read.");
  }
  if (!parsed || typeof parsed.reply !== "string" || !parsed.reply.trim()) {
    throw new Error("The tutor sent an empty response.");
  }
  return parsed;
}
