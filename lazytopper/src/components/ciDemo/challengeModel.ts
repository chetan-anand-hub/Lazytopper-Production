/**
 * FRIEND-CHALLENGE-1 - "Challenge a friend": the pure rules (BANK-FREE, like oneMinuteStarters.ts).
 *
 * A student who got ONE real objective board question right can send a friend an image of it plus a
 * link. This file holds everything that is not drawing or I/O: the link, the copy, the id check and
 * the allow-listed model the image is drawn from.
 *
 * PRIVACY BOUNDARY (the same one SHARE-CARD-1 and the parent report keep):
 *   - the link carries the QUESTION ID and the campaign tags only - never a uid, email, score or name;
 *   - the image shows the stem and the four options exactly as the bank has them, and NO answer
 *     mark of any kind (a challenge that gives the answer away is not a challenge);
 *   - a FIRST NAME appears only when the student ticks it (default off: "A friend ..."), already
 *     cleaned by firstNameOf (never an email, a phone number or a handle).
 *
 * Display only (CLAUDE.md 4a): nothing here reads or changes a grade, a mark or a prompt.
 */

/** The query parameter the friend's link carries. */
export const CHALLENGE_PARAM = "challenge";

/** The existing ladder landing (isCiAdArrival already treats a /check-improve landing as an arrival). */
export const CHALLENGE_LANDING_PATH = "/check-improve";

const SITE = "https://www.lazytopper.com";

/** A bank id looks like `PYQ-M-QE-002` / `PYQ-S-2024-ACID-003`: letters, digits, `-`, `_`. Nothing else is ever looked up. */
const ID_SHAPE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,79}$/;

/** True when `raw` has the shape of a bank question id (it may still match no bank row). */
export function isChallengeIdShape(raw: unknown): raw is string {
  return typeof raw === "string" && ID_SHAPE.test(raw);
}

/** The `challenge` id in a location.search string, or null (absent, empty or oddly shaped). */
export function parseChallengeId(search: string | null | undefined): string | null {
  try {
    const raw = new URLSearchParams(String(search ?? "")).get(CHALLENGE_PARAM);
    return isChallengeIdShape(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** The friend's link, or null for an id that is not a bank-id shape. Carries no uid, email, name or score. */
export function challengeLink(questionId: string): string | null {
  if (!isChallengeIdShape(questionId)) return null;
  return (
    `${SITE}${CHALLENGE_LANDING_PATH}?${CHALLENGE_PARAM}=${encodeURIComponent(questionId)}` +
    `&utm_source=share&utm_medium=whatsapp&utm_campaign=friend_challenge`
  );
}

/** The channel a challenge went out by (the `friend_challenge_share` event's only datum). */
export type ChallengeChannel = "native" | "whatsapp" | "copy" | "download";

/** One resolved objective question: exactly what the bank holds. `right` stays out of the image model. */
export interface ChallengeQuestion {
  id: string;
  subject: "Maths" | "Science";
  topicKey: string;
  /** The chapter's display name, e.g. "Electricity". */
  chapter: string;
  question: string;
  options: string[];
  /** Index of the stored right option (used by the ladder and never by the image). */
  right: number;
  /** The bank's own first solution step, cleaned (ladder verdict only). */
  why: string;
}

export const CHALLENGE_COPY = {
  button: "Challenge a friend",
  title: "Challenge a friend",
  anon: "A friend",
  nameLabel: "Add my first name",
  making: "Making your challenge image...",
  failed: "Couldn't make the image just now. Try again in a moment.",
  share: "Share",
  whatsapp: "WhatsApp",
  copy: "Copy link",
  copied: "Link copied.",
  download: "Download image",
  close: "Close",
  tapAgain: "Tap once more to share.",
  whatsappHint: "WhatsApp is open with your message. Attach the saved image if you want the picture too.",
  cta: "Tap the link · answer in 1 minute",
  foot: "lazytopper.com · CBSE step marking",
  badge: "CHALLENGE",
  kicker: "CBSE BOARD QUESTION · 1 MARK",
  beat: "Can you beat them?",
  alt: "Preview of your challenge image",
} as const;

/** "<Name> got this <Chapter> question right." - first name only when given, else "A friend". */
export function challengeLead(firstName: string | null, chapter: string): string {
  const who = firstName && firstName.trim() ? firstName.trim() : CHALLENGE_COPY.anon;
  return `${who} got this ${chapter} question right.`;
}

/** The message that goes with the image and the link. */
export function challengeText(firstName: string | null, chapter: string, link: string): string {
  return `${challengeLead(firstName, chapter)} ${CHALLENGE_COPY.beat} ${link}`;
}

/** What the challenge image is drawn from: an allow-list, and the stored answer is not on it. */
export interface ChallengeCardModel {
  lead: string;
  headline: string;
  chapter: string;
  kicker: string;
  question: string;
  options: string[];
  firstName: string | null;
  link: string;
}

/** Build the image model, or null when the question cannot be shared (no valid id, not four options). */
export function buildChallengeCardModel(q: ChallengeQuestion, firstName: string | null): ChallengeCardModel | null {
  const link = challengeLink(q.id);
  if (!link || q.options.length !== 4 || !q.question.trim()) return null;
  const name = firstName && firstName.trim() ? firstName.trim() : null;
  return {
    lead: challengeLead(name, q.chapter),
    headline: CHALLENGE_COPY.beat,
    chapter: q.chapter,
    kicker: CHALLENGE_COPY.kicker,
    question: q.question,
    options: [...q.options],
    firstName: name,
    link,
  };
}

export const CHALLENGE_FILENAME = "lazytopper-challenge.png";
