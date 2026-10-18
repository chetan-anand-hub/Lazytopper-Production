/**
 * AskParents — "Ask your parents to pay" (ASK-PARENTS-PAY-1, owner ruling 18 Oct 2026).
 *
 * Most students are 15–16 and a parent decides and pays. This is a SECONDARY action under
 * the pass buttons: it never replaces or hides the student's own way to pay.
 *
 *   1. Tap "Ask your parents to pay" -> the server mints a link for THIS signed-in account.
 *   2. The student SEES the exact message (English or हिंदी) before anything is sent.
 *   3. "Send on WhatsApp" opens wa.me with the text; the STUDENT picks the contact in
 *      WhatsApp. No phone number is asked for, sent to us or stored (the same approach as
 *      the WhatsApp reminders and score sharing). "Copy message" is the fallback.
 *
 * ★ HONEST BY CONSTRUCTION. The prices are the SERVER's quote for this account (returned with
 * the link); the "N answers checked" line appears only when the student's own graded-answer
 * count for the last 30 days is above zero, and is otherwise left out — never invented.
 */
import { useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { trackAskParentTap } from "../../analytics/analytics";
import { openWhatsAppLink } from "../results/share/shareScore";
import {
  buildAskParentMessage,
  daysLeft,
  isParentPayClientEnabled,
  mintParentLink,
  parentPayUrl,
  type MintedParentLink,
  type ParentPayLang,
} from "../../services/parentPay";
import "./askParents.css";

export const ASK_PARENTS_LABEL = "Ask your parents to pay";
export const ASK_PARENTS_HINT =
  "Send Mummy or Papa a WhatsApp message with a link they can pay from on their own phone.";
export const ASK_PARENTS_PRIVACY_NOTE =
  "You choose who to send it to in WhatsApp. LazyTopper never sees or stores their number.";
export const ASK_PARENTS_LINK_FAILED = "Couldn't create a link right now. Please try again.";
export const ASK_PARENTS_WA_BLOCKED = "WhatsApp didn't open. Copy the message and send it yourself.";

export interface AskParentsViewProps {
  mint: () => Promise<MintedParentLink>;
  /** Graded answers in the last 30 days, or null while unknown / unavailable. */
  loadCheckedCount: () => Promise<number | null>;
  origin: string;
  base: string;
  now: () => number;
  openWindow: (url: string, target: string) => { opener: unknown } | null | undefined;
  copyText: (text: string) => Promise<void>;
}

type LinkState = { kind: "idle" } | { kind: "loading" } | { kind: "ready"; link: MintedParentLink } | { kind: "failed" };

export function AskParentsView({ mint, loadCheckedCount, origin, base, now, openWindow, copyText }: AskParentsViewProps) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<ParentPayLang>("en");
  const [link, setLink] = useState<LinkState>({ kind: "idle" });
  const [checked, setChecked] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const minting = useRef(false);

  async function startMint() {
    if (minting.current) return;
    minting.current = true;
    setLink({ kind: "loading" });
    try {
      const [minted, count] = await Promise.all([mint(), loadCheckedCount().catch(() => null)]);
      setChecked(count);
      setLink({ kind: "ready", link: minted });
    } catch {
      setLink({ kind: "failed" });
    } finally {
      minting.current = false;
    }
  }

  function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      trackAskParentTap("pricing", "open");
      if (link.kind === "idle" || link.kind === "failed") void startMint();
    }
  }

  const message =
    link.kind === "ready"
      ? buildAskParentMessage({
          lang,
          prices: link.link.prices,
          checkedCount: checked,
          url: parentPayUrl(link.link.token, origin, base),
          days: daysLeft(link.link.expiresAt, now()),
        })
      : null;

  function handleSend() {
    if (!message) return;
    trackAskParentTap("pricing", "whatsapp");
    setNotice(openWhatsAppLink(message, openWindow) ? null : ASK_PARENTS_WA_BLOCKED);
  }

  async function handleCopy() {
    if (!message) return;
    trackAskParentTap("pricing", "copy");
    try {
      await copyText(message);
      setNotice("Message copied.");
    } catch {
      setNotice("Couldn't copy. Press and hold the message to copy it.");
    }
  }

  return (
    <div className="lt-ask-parents" data-testid="ask-parents">
      <button type="button" className="lt-ask-parents-open" aria-expanded={open} onClick={handleOpen}>
        {ASK_PARENTS_LABEL}
      </button>
      {!open && <p className="lt-ask-parents-hint">{ASK_PARENTS_HINT}</p>}
      {open && (
        <div className="lt-ask-parents-sheet" role="region" aria-label="Message to your parents">
          <div className="lt-ask-parents-lang" role="group" aria-label="Message language">
            <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
              English
            </button>
            <button type="button" aria-pressed={lang === "hi"} lang="hi" onClick={() => setLang("hi")}>
              हिंदी
            </button>
          </div>
          {link.kind === "loading" && (
            <p className="lt-ask-parents-note" role="status">
              Preparing your link…
            </p>
          )}
          {link.kind === "failed" && (
            <>
              <p className="lt-ask-parents-note" role="alert" data-testid="ask-parents-failed">
                {ASK_PARENTS_LINK_FAILED}
              </p>
              <div className="lt-ask-parents-actions">
                <button type="button" className="lt-ask-parents-retry" onClick={() => void startMint()}>
                  Try again
                </button>
              </div>
            </>
          )}
          {message && (
            <>
              <pre className="lt-ask-parents-preview" lang={lang} data-testid="ask-parents-message">
                {message}
              </pre>
              <div className="lt-ask-parents-actions">
                <button type="button" className="lt-ask-parents-send" onClick={handleSend}>
                  Send on WhatsApp
                </button>
                <button type="button" className="lt-ask-parents-copy" onClick={() => void handleCopy()}>
                  Copy message
                </button>
              </div>
            </>
          )}
          {notice && (
            <p className="lt-ask-parents-note" role="status" data-testid="ask-parents-notice">
              {notice}
            </p>
          )}
          <p className="lt-ask-parents-note">{ASK_PARENTS_PRIVACY_NOTE}</p>
        </div>
      )}
    </div>
  );
}

/** The signed-in student's graded answers in the last 30 days — the read model Me uses. */
async function loadCheckedCountFor(uid: string): Promise<number | null> {
  const { readStudyModel } = await import("../../services/progressReadModel");
  const model = await readStudyModel(uid, { window: "month", mistakes: false, tutor: false });
  const n = Number(model.progress.activity.gradedAnswers);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function AskParentsConnected() {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (!uid || !origin) return null;
  return (
    <AskParentsView
      mint={mintParentLink}
      loadCheckedCount={() => loadCheckedCountFor(uid)}
      origin={origin}
      base={String(import.meta.env.BASE_URL || "/")}
      now={() => Date.now()}
      openWindow={(url, target) => window.open(url, target)}
      copyText={(text) => navigator.clipboard.writeText(text)}
    />
  );
}

/**
 * Mounted by PricingPage for a signed-in student who is not Premium. Renders nothing — and
 * calls no hook — while parent pay is dark.
 */
export default function AskParents() {
  if (!isParentPayClientEnabled()) return null;
  return <AskParentsConnected />;
}
