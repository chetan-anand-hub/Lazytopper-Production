// src/ai/tutorClient.ts
// FRESH tutor client (D-TUT-12) — NOT aiClient's mentor path. Talks to the fresh
// POST /api/tutor endpoint using the same relative-/api/* pattern (Vite proxy in
// dev, same-origin in prod). Stateless request/response: the client sends the
// conversation-so-far + a compact, client-assembled context brief; the server
// returns the next tutor turn as prose. The tutor NEVER grades and writes nothing
// server-side (D-TUT-8) — persistence + round-trip are Stage 2.

const API_BASE = "/api"; // Vite dev proxy or same origin in production
import { paidJsonHeaders, SignInAgainError, REAUTH_MESSAGE } from "./paidCallHeaders";
// ALL-AI-METERING-1: pure copy + decision (no fetch, no runtime edge into aiClient).
import { limitFromAiRefusal, tutorLimitMessage } from "../components/usage/fairUseGate";
import type { PremiumWindow } from "../services/usageClient";

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
  /** True when the concept also has a curated, exact NCERT page the panel can show.
   *
   *  The wire copy of `hasNcertPage` on CatalogueFigureOption (pages/tutor/conceptVisualCatalogue.ts)
   *  — the two are mirrored types either side of the request and must stay in step.
   *
   *  ★ Plumbing only: NOTHING in the prompt reads this yet, so the model still does not know
   *  NCERT pages exist (hence its flat "I cannot open NCERT pages" even when one is curated).
   *  Teaching it to mention the page is the tutor-round-trip lane's sequenced task.
   *  ★★ `normalizeFigures` (server/routes/tutor.cjs) rebuilds each option server-side and drops
   *  anything it does not explicitly copy — this field only arrives because it whitelists it. */
  hasNcertPage?: boolean;
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
  /** The just-board-marked C&I work handed as return-turn CONTEXT (build lane — the tutor sees
   *  the graded work). Absent on every non-return turn → the prompt renders nothing. One-shot;
   *  never persisted. The server rebuilds it at the trust boundary before it reaches the prompt. */
  returnedWork?: TutorReturnedWork | null;
}

/** The minimal shape of a verified bank question passed for the demonstration (Fix 4). */
export interface TutorDemoQuestion {
  questionText: string;
  marks?: number;
  solutionSteps?: string[];
}

/**
 * The graded work the student just had board-marked in the Check & Improve overlay, handed to
 * the model as CONTEXT for the return turn so the tutor can reference the question AND (when the
 * §6.3 digest ships) which steps held up — closing "you got 4/5" into "you dropped step 4 on
 * units" (build lane — the tutor sees the graded work). ONE-SHOT + ephemeral: assembled in-memory
 * on overlay close, never persisted to the thread, never a student turn.
 *
 * - `question`  — the verbatim question text (quotable context). Absent for an image-only upload.
 * - `hasImageQuestion` — true when the question was an uploaded image and its text is NOT available
 *   (there is no image channel to the tutor model — text-only MVP). The prompt DESCRIBES it, never
 *   transcribes it.
 * - `steps` — the §6.3 per-step status digest (`{q,n,description,status}` ONLY — NO marks, NO free
 *   text), so the model can honestly say what was right, not only the fault. EVAL-GATED: populated
 *   only when `RETURNED_WORK_DIGEST_ENABLED` (tutorRoundTrip.ts) is on. The server rebuilds this at
 *   the trust boundary (normalizeReturnedWork) and renders nothing when absent.
 */
export interface TutorReturnedWork {
  question?: string;
  hasImageQuestion?: boolean;
  steps?: { q: number; n: number; description: string; status: string }[];
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
 * BUGFIX-1 (B3) - thrown when the tutor endpoint answers 402 `premium_required`.
 * The tutor's own copy of aiClient's `PremiumRequiredError` (same `name`, same
 * fields), kept here so this fresh client takes no runtime edge into aiClient.
 * Callers detect it by `name`; `message` is student-facing.
 */
export class TutorPremiumRequiredError extends Error {
  readonly feature: string;
  readonly tier: string;
  readonly trialEndedAt: string | null;

  constructor(message: string, feature: string, tier: string, trialEndedAt: string | null) {
    super(message);
    this.name = "PremiumRequiredError";
    this.feature = feature;
    this.tier = tier;
    this.trialEndedAt = trialEndedAt;
  }
}

const TUTOR_LIMIT_WINDOWS: ReadonlySet<string> = new Set(["fiveHour", "day", "week", "thirtyDay"]);

/**
 * ALL-AI-METERING-1 — thrown when the tutor endpoint answers a fair-use refusal (server
 * fairUse.cjs, only while FAIR_USE_ENFORCE_ALL_AI=1): 409 `trial_limit` or 429 `usage_limit`.
 * NOT a fault — nothing reached the model and nothing was charged. `message` IS the Tutor's
 * inline limit copy (fairUseGate.tutorLimitMessage), so the session's existing error line shows
 * it as-is — never the raw `usage_limit` code. `name` is "FairUseLimitError" so every reader of
 * that name (usageClient.readFairUseLimit) recognises it.
 */
export class TutorLimitError extends Error {
  readonly kind: "trial_limit" | "usage_limit";
  readonly resetAt: string | null;
  readonly window: PremiumWindow | null;
  readonly remaining: number | null;

  constructor(kind: "trial_limit" | "usage_limit", resetAt: string | null, window: PremiumWindow | null) {
    const limit = limitFromAiRefusal({ kind, remaining: null, resetAt, window }, "tutor");
    super(limit ? tutorLimitMessage(limit) : "You've reached your Tutor limit for now. It opens again soon.");
    this.name = "FairUseLimitError";
    this.kind = kind;
    this.resetAt = resetAt;
    this.window = window;
    this.remaining = null;
  }
}

/** ALL-AI-METERING-1: the Tutor's fair-use refusal, or null for any other failure. */
function tutorLimitFrom(status: number, details: unknown): TutorLimitError | null {
  const d = (details && typeof details === "object" ? details : {}) as { error?: unknown; resetAt?: unknown; window?: unknown };
  const resetAt = typeof d.resetAt === "string" && d.resetAt.trim() ? d.resetAt : null;
  if (status === 409 && d.error === "trial_limit") return new TutorLimitError("trial_limit", resetAt, null);
  if (status === 429 && d.error === "usage_limit") {
    const window = typeof d.window === "string" && TUTOR_LIMIT_WINDOWS.has(d.window) ? (d.window as PremiumWindow) : null;
    return new TutorLimitError("usage_limit", resetAt, window);
  }
  return null;
}

/**
 * Call the fresh tutor endpoint for the next turn. Throws a plain Error carrying the
 * server's message on a non-2xx or unparseable response (the UI surfaces it as an
 * honest, retryable error — never a fabricated reply).
 */
export async function callTutor(req: TutorRequest): Promise<TutorReply> {
  const send = (headers: Record<string, string>) =>
    fetch(TUTOR_ENDPOINT, { method: "POST", headers, body: JSON.stringify(req) });
  const isReauth = (status: number, body: string) => {
    if (status !== 401) return false;
    try {
      return (JSON.parse(body) as { error?: unknown })?.error === "reauth_required";
    } catch {
      return false;
    }
  };

  const headers = await paidJsonHeaders();
  let res = await send(headers);
  let text = await res.text();

  // AUTHGATE-FIX-1 — the server refused the token (usually: it had just expired). Force a
  // fresh one and send ONCE more, silently. Only a second refusal reaches the student.
  if (isReauth(res.status, text) && headers.Authorization) {
    let retryHeaders: Record<string, string>;
    try {
      retryHeaders = await paidJsonHeaders({ forceRefresh: true });
    } catch (err) {
      if (err instanceof Error && err.name === "SignInAgainError") throw new SignInAgainError(REAUTH_MESSAGE);
      throw err;
    }
    res = await send(retryHeaders);
    text = await res.text();
  }
  if (isReauth(res.status, text)) throw new SignInAgainError(REAUTH_MESSAGE);

  if (!res.ok) {
    let details: {
      error?: string;
      message?: string;
      feature?: string;
      tier?: string;
      trialEndedAt?: string | null;
    } = {};
    try {
      details = JSON.parse(text);
    } catch {
      /* non-JSON error body — fall through to the generic message */
    }
    // BUGFIX-1 (B3) - a Premium refusal is a TYPED branch, mirroring aiClient's
    // handleJsonResponse: the student reads the server's own copy (or plain English),
    // never the raw `premium_required` code.
    if (res.status === 402 && details?.error === "premium_required") {
      throw new TutorPremiumRequiredError(
        details.message || "The tutor is a Premium feature. You can unlock it whenever you're ready.",
        details.feature || "unknown",
        details.tier || "free",
        details.trialEndedAt || null,
      );
    }
    // ALL-AI-METERING-1: a fair-use refusal is the Tutor's limit copy, never the raw code.
    const limitError = tutorLimitFrom(res.status, details);
    if (limitError) throw limitError;
    // Every other failure: the server's student-facing `message` first, the machine
    // `error` code only when there is no message.
    throw new Error(details.message || details.error || "The tutor request failed.");
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
