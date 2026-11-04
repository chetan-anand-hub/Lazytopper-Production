/**
 * emailCode — the browser half of EMAIL-CODE-1: "sign in with a 6-digit code from your email", right there on the screen.
 *
 *   sendEmailCode(email)              POST /api/auth/email-code/send    -> the same "sent" answer for every address
 *   signInWithEmailCode(email, code)  POST /api/auth/email-code/verify  -> a Firebase custom token for the account that
 *                                     OWNS that email (the server decides the uid) -> signInWithCustomToken
 *
 * After the sign-in, onAuthStateChanged runs the EXISTING paths unchanged (AuthContext's claim and the pay-first
 * first sign-in / trial). The email and the code are never stored, never in a URL and never in an analytics event; the
 * token is used once and dropped. Lazy-imported by EmailCodeSignIn, so none of this is in the entry chunk.
 */
import { signInWithCustomToken } from "firebase/auth";
import { authClient } from "./firebaseClient";
import { normaliseEmail } from "./checkoutWhoFlag";

export const EMAIL_CODE_SEND_ENDPOINT = "/api/auth/email-code/send";
export const EMAIL_CODE_VERIFY_ENDPOINT = "/api/auth/email-code/verify";
/** The client waits this long before offering "Send a new code" (the server allows one send per 30 s per email). */
export const RESEND_AFTER_SEC = 30;

export type EmailCodeErrorKind =
  | "invalid_email"
  | "invalid_code"
  | "code_mismatch"
  | "code_expired"
  | "too_many_tries"
  | "no_account"
  | "too_many"
  | "unavailable"
  | "failed";

export class EmailCodeError extends Error {
  readonly kind: EmailCodeErrorKind;
  readonly triesLeft?: number;
  readonly retryAfterSec?: number;
  constructor(kind: EmailCodeErrorKind, extra: { triesLeft?: number; retryAfterSec?: number } = {}) {
    super(kind);
    this.kind = kind;
    this.triesLeft = extra.triesLeft;
    this.retryAfterSec = extra.retryAfterSec;
  }
}

const KNOWN: ReadonlySet<string> = new Set(["invalid_email", "invalid_code", "code_mismatch", "code_expired", "too_many_tries", "no_account", "too_many", "unavailable"]);

async function post(url: string, body: unknown): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  } catch {
    throw new EmailCodeError("failed");
  }
  let json: Record<string, unknown> | null = null;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = null;
  }
  if (res.ok && json && json.ok === true) return json;
  const err = json && typeof json.error === "string" && KNOWN.has(json.error) ? (json.error as EmailCodeErrorKind) : "failed";
  throw new EmailCodeError(err, {
    triesLeft: json && typeof json.triesLeft === "number" ? json.triesLeft : undefined,
    retryAfterSec: json && typeof json.retryAfterSec === "number" ? json.retryAfterSec : undefined,
  });
}

/** Step 1: ask for a code. Resolves the same way whether or not the address has an account. */
export async function sendEmailCode(rawEmail: string): Promise<void> {
  const email = normaliseEmail(rawEmail);
  if (!email) throw new EmailCodeError("invalid_email");
  await post(EMAIL_CODE_SEND_ENDPOINT, { email });
}

/** Just the digits, at most 6 (a pasted "123 456" or "Code: 123456" works). */
export function cleanCode(raw: string): string {
  return String(raw || "").replace(/\D/g, "").slice(0, 6);
}

/** Step 2: the code -> signed in (a Firebase custom token for the email's own account). */
export async function signInWithEmailCode(rawEmail: string, rawCode: string): Promise<void> {
  const email = normaliseEmail(rawEmail);
  if (!email) throw new EmailCodeError("invalid_email");
  const code = cleanCode(rawCode);
  if (code.length !== 6) throw new EmailCodeError("invalid_code");
  const json = await post(EMAIL_CODE_VERIFY_ENDPOINT, { email, code });
  const token = typeof json.token === "string" ? json.token : "";
  if (!token || !authClient) throw new EmailCodeError("failed");
  await signInWithCustomToken(authClient, token);
}

/** Student-facing words for each failure. Never says whether an address has an account before the code is right. */
export function describeEmailCodeError(err: unknown): string {
  const e = err instanceof EmailCodeError ? err : null;
  switch (e?.kind) {
    case "invalid_email":
      return "Enter a full email address, like name@gmail.com.";
    case "invalid_code":
      return "Enter the 6-digit code from the email.";
    case "code_mismatch": {
      const n = e.triesLeft ?? 0;
      return `That code didn't match — ${n} ${n === 1 ? "try" : "tries"} left.`;
    }
    case "code_expired":
      return "Code expired — send a new one.";
    case "too_many_tries":
      return "Too many tries — send a new code.";
    case "no_account":
      return "No LazyTopper account uses this email yet. Sign in another way, or create an account.";
    case "too_many":
      return e.retryAfterSec && e.retryAfterSec <= 120
        ? `Please wait ${e.retryAfterSec} seconds, then try again.`
        : "Too many codes asked for. Please try again later.";
    case "unavailable":
      return "Email codes aren't available just now. Please sign in another way.";
    default:
      return "Couldn't reach LazyTopper just now. Check your internet and try again.";
  }
}
