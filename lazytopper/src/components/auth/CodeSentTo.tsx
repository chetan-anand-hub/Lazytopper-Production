/**
 * CodeSentTo — CODE-WHERE-1 (owner 4 Nov 2026): every "code sent" message says exactly WHERE it went, with a way back.
 *
 *   email: "We've sent a 6-digit code to ra••••@gmail.com — check your inbox (and Promotions/Spam).  Wrong email? Change it"
 *   phone: "We've sent a code by SMS to +91 98•••••210.  Wrong number? Change it"
 *   link : "We've sent a link to ra••••@gmail.com — check your inbox (and Promotions/Spam)."  (LinkEmailPanel)
 *
 * WHY: a student who typed a wrong address waits for a code that never comes, and students and parents don't know where
 * to look. "Change it" is the host's own back-to-the-input step (value kept, input focused); a new send is the normal
 * path, so nothing server-side is cancelled. Omit `onChange` where the address cannot be changed here (the thank-you
 * screen: the payment is already recorded against that address).
 *
 * The identifier is what the student typed on THIS screen and is shown only MASKED (lib/maskContact). This component
 * never puts it in a URL, storage, an analytics event or a log. Pure presentation, no side effects: safe in any chunk.
 */
import { maskEmail, maskPhone } from "../../lib/maskContact";
import "./codeSentTo.css";

export interface CodeSentToProps {
  kind: "email" | "phone";
  /** The full address / number the code was sent to (E.164 for a phone). Rendered masked only. */
  to: string;
  /** What was sent. Default "code". */
  what?: "code" | "link";
  /** "Change it": back to the input. Absent -> no link. */
  onChange?: () => void;
  changeDisabled?: boolean;
  testId?: string;
}

export function codeSentWords(kind: "email" | "phone", what: "code" | "link" = "code"): { lead: string; tail: string; change: string } {
  if (kind === "phone") return { lead: "We've sent a code by SMS to", tail: ".", change: "Wrong number? Change it" };
  return {
    lead: what === "link" ? "We've sent a link to" : "We've sent a 6-digit code to",
    tail: " — check your inbox (and Promotions/Spam).",
    change: "Wrong email? Change it",
  };
}

export default function CodeSentTo({ kind, to, what = "code", onChange, changeDisabled = false, testId = "code-sent-to" }: CodeSentToProps) {
  const masked = kind === "phone" ? maskPhone(to) : maskEmail(to);
  const words = codeSentWords(kind, what);
  return (
    <p className="lt-codesent" role="status" data-testid={testId}>
      {words.lead} <strong className="lt-codesent__to" data-testid="code-sent-to-masked">{masked || (kind === "phone" ? "your number" : "your email")}</strong>
      {words.tail}
      {onChange && (
        <>
          {" "}
          <button type="button" className="lt-codesent__change" onClick={onChange} disabled={changeDisabled} data-testid="code-sent-change">
            {words.change}
          </button>
        </>
      )}
    </p>
  );
}
