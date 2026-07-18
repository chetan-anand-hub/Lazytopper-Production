// src/pages/QrAnswerUploadPage.tsx
//
// The phone half of the QR answer handoff: route /u/:token
//
// ONE JOB: open -> camera/gallery -> send -> "head back to your laptop." No shell,
// no navigation, no chrome, nothing to explore. The student is mid-flow on their
// laptop; this page exists for about fifteen seconds.
//
// NO LOGIN HERE, DELIBERATELY. The phone is a different device where the student
// almost certainly isn't signed in, and a login wall mid-flow is exactly the
// friction this feature removes. Authorisation is the token alone
// (token-as-capability): 256-bit random, 5-minute TTL, single-use, WRITE-ONLY, and
// scoped to one pending slot. Holding this URL lets you put ONE image into ONE
// slot — it can never read the student's work back. See server/services/qrUploadChannel.cjs.
//
// The route is registered in App.tsx and "/u" is in BARE_FULLSCREEN_PREFIXES, so
// the global navbar, DesktopShell and mobile BottomNav are all suppressed.
//
// Honest states throughout: checking / ready / sending / sent / expired / failed.
// Never a fake success.

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  peekQrSlot,
  prepareQrImage,
  sendQrImage,
  type QrHandoffMode,
} from "../services/qrUploadService";
import { MAX_UPLOAD_PDF_BYTES, formatUploadLimit } from "../services/uploadLimits";

type Phase = "checking" | "ready" | "sending" | "sent" | "expired" | "used" | "unavailable" | "failed";

/**
 * THE WORDS FOLLOW THE HOST SURFACE — carried here on the slot, because this page is
 * reached by token alone and cannot otherwise know which surface minted it.
 *
 * This is where getting it wrong actually costs a student marks: for a Chapter Test or
 * Full Mock the paper is MULTI-PAGE, one photo is ONE page, and "Take a photo" sends
 * them away believing a 20-question mock is submitted. So in "document" mode the PDF
 * leads, and the one-photo-is-one-page consequence is stated outright rather than
 * implied.
 */
const COPY: Record<QrHandoffMode, { head: string; lead: string; cta: string; hint: string }> = {
  document: {
    head: "Send your answers",
    lead: "Pick the PDF of your answers — or photograph them. It goes straight to your laptop, with no need to email it to yourself.",
    cta: "Choose PDF or photo",
    hint: `You can send ONE file. For a full paper, send a single PDF with every page — one photo sends only one page. PDF up to ${formatUploadLimit(MAX_UPLOAD_PDF_BYTES)}.`,
  },
  photo: {
    head: "Send your answer",
    lead: "Photograph your written answer. It goes straight to your laptop — no need to email it to yourself.",
    cta: "Take a photo",
    hint: "Fit the whole page in the frame, with the writing in focus.",
  },
  // The C&I QUESTION-side handoff: a saved or screenshotted QUESTION paper. Same file
  // types as "document" (PDF or photo), question-voice words. The one-photo-is-one-page
  // warning still applies — a question paper can be multi-page too — so the hint is kept.
  question: {
    head: "Send the question paper",
    lead: "Pick the PDF of the question paper — or photograph it. It goes straight to your laptop, with no need to email it to yourself.",
    cta: "Choose PDF or photo",
    hint: `You can send ONE file. For a full paper, send a single PDF with every page — one photo sends only one page. PDF up to ${formatUploadLimit(MAX_UPLOAD_PDF_BYTES)}.`,
  },
};

export default function QrAnswerUploadPage() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>("checking");
  const [mode, setMode] = useState<QrHandoffMode>("document");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check the code is still alive BEFORE the student photographs several MB only
  // to be told it expired.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setPhase("expired");
        return;
      }
      const { state, mode: slotMode } = await peekQrSlot(token);
      if (cancelled) return;
      setMode(slotMode);
      if (state === "pending") setPhase("ready");
      else if (state === "used") setPhase("used");
      else if (state === "unavailable") setPhase("unavailable");
      else setPhase("expired");
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Let the same file be re-picked after a failure.
      e.target.value = "";
      if (!file || !token) return;

      setError(null);
      setPhase("sending");

      let payload;
      try {
        // Required, not cosmetic: a full-res phone photo (2-8MB) exceeds the 3MB cap,
        // so IMAGES are downscaled to fit. A PDF cannot be downscaled — there is no
        // canvas for it — so it passes through untouched and an over-limit one is
        // refused HERE, on the phone, while the student can still act on it.
        payload = await prepareQrImage(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read that file.");
        setPhase("failed");
        return;
      }

      const result = await sendQrImage(token, payload);
      if (result.ok) {
        setPhase("sent");
        return;
      }
      if (result.reason === "used") setPhase("used");
      else if (result.reason === "expired") setPhase("expired");
      else if (result.reason === "unavailable") setPhase("unavailable");
      else {
        setError(result.error || "That photo could not be sent.");
        setPhase("failed");
      }
    },
    [token],
  );

  const pick = useCallback(() => fileInputRef.current?.click(), []);

  return (
    <div className="lt-qru">
      <style>{QRU_CSS}</style>
      <div className="lt-qru__card">
        <p className="lt-qru__brand">LazyTopper</p>

        {phase === "checking" && <p className="lt-qru__note">Checking your code…</p>}

        {(phase === "ready" || phase === "failed") && (
          <>
            <h1 className="lt-qru__h">{COPY[mode].head}</h1>
            <p className="lt-qru__d">{COPY[mode].lead}</p>
            {phase === "failed" && error && <p className="lt-qru__err">{error}</p>}
            <button type="button" className="lt-qru__cta" onClick={pick}>
              {phase === "failed" ? "Try again" : COPY[mode].cta}
            </button>
            <p className="lt-qru__hint">{COPY[mode].hint}</p>
            {/* DO NOT "SIMPLIFY" THIS INPUT.
             *
             *  `accept` is deliberately BROAD: this one picker is how a student sends a
             *  camera shot, an existing gallery image, OR a PDF from Files / a scanner
             *  app. Narrowing it to images would silently remove the only way to send a
             *  multi-page paper.
             *
             *  `capture` does NOT restrict the picker — it only asks the browser to
             *  DEFAULT to the camera. That default is right for a single handwritten
             *  answer ("photo") and wrong for a whole paper ("document"), where the
             *  student needs Files to be a first-class choice rather than something to
             *  hunt for behind the camera. So it is omitted in document mode — on
             *  purpose, not by oversight. */}
            <input
              ref={fileInputRef}
              className="lt-qru__file"
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              {...(mode === "photo" ? { capture: "environment" as const } : {})}
              onChange={handleFile}
            />
          </>
        )}

        {phase === "sending" && (
          <>
            <h1 className="lt-qru__h">Sending…</h1>
            <p className="lt-qru__d">Hang on a moment — don't close this page.</p>
          </>
        )}

        {phase === "sent" && (
          <>
            <p className="lt-qru__tick" aria-hidden="true">✓</p>
            <h1 className="lt-qru__h">Sent</h1>
            <p className="lt-qru__d">
              Head back to your laptop —{" "}
              {mode === "question"
                ? "your question paper"
                : mode === "document"
                  ? "your file"
                  : "your answer"}{" "}
              is there.
            </p>
            <p className="lt-qru__hint">You can close this page.</p>
          </>
        )}

        {phase === "used" && (
          <>
            <h1 className="lt-qru__h">Already sent</h1>
            <p className="lt-qru__d">
              This code has already been used. If you need to send another answer, show a new
              code on your laptop.
            </p>
          </>
        )}

        {phase === "expired" && (
          <>
            <h1 className="lt-qru__h">That code expired</h1>
            <p className="lt-qru__d">
              Codes last 5 minutes. Show a new one on your laptop and scan it again.
            </p>
          </>
        )}

        {phase === "unavailable" && (
          <>
            <h1 className="lt-qru__h">Not available right now</h1>
            <p className="lt-qru__d">
              Phone upload isn't working at the moment. You can still upload your answer
              directly on your laptop.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const QRU_CSS = `
.lt-qru {
  --qru-fg: #15233a;
  --qru-muted: #64748b;
  --qru-line: #e2e8f0;
  --qru-green: hsl(152, 55%, 45%);
  --qru-green-d: hsl(152, 55%, 38%);
  --qru-fb: "Inter", system-ui, sans-serif;
  --qru-fd: "Fraunces", Georgia, serif;
  font-family: var(--qru-fb);
  min-height: 100vh;
  min-height: 100dvh;
  background: #f8fafc;
  display: flex; align-items: center; justify-content: center;
  padding: 20px 16px;
  box-sizing: border-box;
}

.lt-qru__card {
  width: 100%; max-width: 420px;
  background: #fff; border: 1px solid var(--qru-line); border-radius: 16px;
  padding: 28px 22px; text-align: center;
}

.lt-qru__brand {
  font-family: var(--qru-fd); font-weight: 600; font-size: 13px;
  color: var(--qru-green); letter-spacing: 0.02em; margin: 0 0 18px;
}
.lt-qru__h {
  font-family: var(--qru-fd); font-weight: 600; font-size: 22px;
  color: var(--qru-fg); margin: 0 0 8px; line-height: 1.25;
}
.lt-qru__d { font-size: 14px; color: var(--qru-muted); line-height: 1.55; margin: 0 0 20px; }
.lt-qru__hint { font-size: 12px; color: var(--qru-muted); line-height: 1.5; margin: 12px 0 0; }
.lt-qru__note { font-size: 14px; color: var(--qru-muted); margin: 8px 0; }
.lt-qru__err {
  font-size: 13px; color: #b91c1c; line-height: 1.5; margin: 0 0 14px;
  background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 12px;
}
.lt-qru__tick { font-size: 40px; color: var(--qru-green); margin: 0 0 6px; line-height: 1; }

/* Big, one-handed, thumb-reachable — this surface exists only for a phone. */
.lt-qru__cta {
  width: 100%; min-height: 56px;
  background: var(--qru-green); color: #fff; border: 0; border-radius: 12px;
  font-family: var(--qru-fb); font-size: 16px; font-weight: 700; cursor: pointer;
  padding: 16px 20px;
}
.lt-qru__cta:active { background: var(--qru-green-d); }

.lt-qru__file { display: none; }
`;
