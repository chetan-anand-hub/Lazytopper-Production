// src/ai/tutorClient.ts
// FRESH tutor client (D-TUT-12) — NOT aiClient's mentor path. Talks to the fresh
// POST /api/tutor endpoint using the same relative-/api/* pattern (Vite proxy in
// dev, same-origin in prod). Stateless request/response: the client sends the
// conversation-so-far + a compact, client-assembled context brief; the server
// returns the next tutor turn as prose. The tutor NEVER grades and writes nothing
// server-side (D-TUT-8) — persistence + round-trip are Stage 2.

const API_BASE = "/api"; // Vite dev proxy or same origin in production
export const TUTOR_ENDPOINT = `${API_BASE}/tutor`;

/** One conversation turn. `tutor` = the model's reply; `user` = the student.
 *  `kind` is presentational only (Stage 2): "away-cue" = the "holding your place"
 *  line shown when the tutor routes the student out; "return-result" = the reframed
 *  graded-sheet opener injected on return. Absent/"message" = a normal turn. These
 *  are still tutor prose — never a grade the tutor computed (the numbers come from
 *  the durable sessionRecord, read at return time). */
/** A round-trip offer the model signalled on THIS turn (Fix 3). ADVISORY to the UI only —
 *  it gates which single round-trip CTA (if any) renders; it is never a grade, never
 *  persisted as anything but presentational chrome, and only meaningful on a tutor turn. */
export type TutorOffer = "practice" | "check-improve";

export interface TutorTurn {
  role: "user" | "tutor";
  content: string;
  kind?: "message" | "away-cue" | "return-result";
  /** Present on a tutor turn when the model earned a round-trip CTA (Fix 3). */
  offer?: TutorOffer;
  /** Stage 3 — the conceptKey of a curated diagram the model signalled for THIS turn's
   *  explanation panel (`[[figure:<key>]]`, server-stripped + validated). Advisory chrome:
   *  it opens the panel to a real curated asset; never a grade, never invented. */
  figure?: string;
}

/** Stage 3 — a concept in the current topic that has a curated diagram. Sent to the server
 *  so the model can signal one via its stable `key`; `label` tells the model what it shows. */
export interface TutorFigureOption {
  key: string;
  label: string;
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
  /** A real, owner-verified bank question for this concept the tutor solves on the
   *  "see how it's solved" demonstration (Fix 4). Absent → the tutor self-generates a
   *  correctness-railed simpler example. */
  demoQuestion?: TutorDemoQuestion | null;
  /** Stage 3 — the concepts in this topic that have a curated diagram (the closed set the
   *  model picks from to signal a figure). Absent/empty → the tutor signals no figure. */
  figures?: TutorFigureOption[];
}

/** The minimal shape of a verified bank question passed for the demonstration (Fix 4). */
export interface TutorDemoQuestion {
  questionText: string;
  marks?: number;
  solutionSteps?: string[];
}

export interface TutorReply {
  reply: string;
  /** The round-trip offer the model signalled this turn (Fix 3), or null/absent. */
  offer?: TutorOffer | null;
  /** Stage 3 — the curated conceptKey the model signalled for the explanation panel, or
   *  null/absent. Already validated server-side against the topic's curated set. */
  figure?: string | null;
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
  // Defensive: only a recognised offer survives (garbled → no CTA, never a crash).
  const offer = parsed.offer === "practice" || parsed.offer === "check-improve" ? parsed.offer : null;
  // Stage 3: only a non-empty string figure key survives (garbled → no panel).
  const figure = typeof parsed.figure === "string" && parsed.figure.trim() ? parsed.figure.trim() : null;
  return { ...parsed, offer, figure };
}
