// src/components/qr/QrAnswerHandoff.tsx
//
// "Solved it on paper? Scan to send from your phone."
//
// Kills a long-standing friction: a student practising on a laptop who wrote their
// answer on paper currently has to photograph it, WhatsApp/email it to themselves,
// save it, and upload from the laptop. Here the desktop shows a QR, the phone
// scans + shoots, and the image lands in THIS session's answer box.
//
// DELIVERY ONLY. This component hands the caller an {imageBase64, imageMimeType}
// and stops. The caller drops it into the exact state its own file input fills, and
// grades exactly as today — the grader is untouched and unaware the QR exists.
//
// DESKTOP-ONLY BY DESIGN: a QR is meaningless on a phone (the camera is already
// there), so this renders nothing below 1024px. It is also SECONDARY chrome — a
// quiet link under the existing upload/type CTAs, never competing with them. When
// unused, the surrounding surface behaves exactly as it did before.
//
// Honest states throughout: waiting / received / expired / failed. Never a fake
// success, never a silent hang.

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useIsDesktop } from "../../hooks/useIsDesktop";
import { generateQRDataUrl } from "../../services/referralService";
import {
  buildQrUploadUrl,
  mintQrSlot,
  pollQrPickup,
  type QrHandoffMode,
  type QrImagePayload,
} from "../../services/qrUploadService";

const POLL_INTERVAL_MS = 2000;

type Phase = "idle" | "starting" | "waiting" | "received" | "expired" | "failed";

/**
 * COPY FOLLOWS THE HOST SURFACE, NOT THIS COMPONENT.
 *
 * The host knows what it actually needs; this component cannot infer it. Getting it
 * wrong is not cosmetic — a Chapter Test wants ONE multi-page PDF, and "photograph
 * your answer" makes a student shoot page 1 of a 20-question mock and walk away
 * believing they are done. So `mode` is REQUIRED and has NO DEFAULT: every host must
 * decide consciously rather than silently inherit the wrong shape.
 */
const COPY: Record<QrHandoffMode, { link: string; head: string; body: string }> = {
  document: {
    link: "Send the PDF — or a photo — from your phone",
    head: "Scan with your phone camera",
    body: "Then pick the PDF of your answers — or photograph them. It lands here automatically, with no need to email it to yourself.",
  },
  photo: {
    link: "Scan to send from your phone",
    head: "Scan with your phone camera",
    body: "Photograph your written answer on your phone — it lands here automatically. No need to email it to yourself.",
  },
};

export default function QrAnswerHandoff({
  mode,
  onImageReceived,
  disabled = false,
  label = "Solved it on paper?",
}: {
  /** What the HOST needs — "document" (CT / Full Mock / Worksheet: one multi-page PDF)
   *  or "photo" (a single handwritten answer). REQUIRED ON PURPOSE: no default, so a
   *  new host cannot quietly inherit copy that misleads its students. */
  mode: QrHandoffMode;
  /** Handed the delivered image. The caller owns what happens next (it drops it
   *  into its existing answer state); this component never grades. */
  onImageReceived: (payload: QrImagePayload) => void;
  disabled?: boolean;
  label?: string;
}) {
  const isDesktop = useIsDesktop();
  const { user, getToken } = useAuth();

  const [phase, setPhase] = useState<Phase>("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Held in a ref, never in state or the DOM: the pickup token is the desktop's
  // private half of the capability and must never leave this browser.
  const pickupTokenRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Stop the poll the moment this unmounts — the interval must never outlive the
  // panel that opened it.
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      stopPolling();
    };
  }, [stopPolling]);

  const poll = useCallback(async () => {
    const pickupToken = pickupTokenRef.current;
    if (!pickupToken || cancelledRef.current) return;

    const result = await pollQrPickup(pickupToken);
    // Re-check the ref, not just the unmount flag: the student may have hit Cancel
    // (ref -> null) or started a fresh code (ref -> a different token) WHILE this
    // request was in flight. Without this, a cancelled panel would still receive an
    // image — and since a successful pickup destroys the slot server-side, that
    // image would be unrecoverable. Compare identity, then act.
    if (cancelledRef.current || pickupTokenRef.current !== pickupToken) return;

    if (result.status === "ready") {
      stopPolling();
      pickupTokenRef.current = null;
      setPhase("received");
      setQrDataUrl(null);
      onImageReceived({ imageBase64: result.imageBase64, imageMimeType: result.imageMimeType });
      return;
    }
    if (result.status === "expired") {
      stopPolling();
      pickupTokenRef.current = null;
      setQrDataUrl(null);
      setPhase("expired");
      return;
    }
    if (result.status === "unavailable") {
      stopPolling();
      pickupTokenRef.current = null;
      setQrDataUrl(null);
      setError("Phone upload isn't available right now. Please upload from this device.");
      setPhase("failed");
      return;
    }
    timerRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
  }, [onImageReceived, stopPolling]);

  const start = useCallback(async () => {
    // Retrying from expired/failed must never leave the previous poll running.
    stopPolling();
    pickupTokenRef.current = null;
    setError(null);
    setPhase("starting");

    const idToken = await getToken();
    if (!idToken) {
      setError("Please sign in again to send from your phone.");
      setPhase("failed");
      return;
    }

    const slot = await mintQrSlot(idToken, mode);
    if (cancelledRef.current) return;
    if (!slot) {
      setError("Couldn't create a phone link just now. Please upload from this device.");
      setPhase("failed");
      return;
    }

    let dataUrl: string;
    try {
      dataUrl = await generateQRDataUrl(buildQrUploadUrl(slot.uploadToken), 176);
    } catch {
      setError("Couldn't draw the QR code. Please upload from this device.");
      setPhase("failed");
      return;
    }
    if (cancelledRef.current) return;

    pickupTokenRef.current = slot.pickupToken;
    setQrDataUrl(dataUrl);
    setPhase("waiting");
    timerRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
  }, [getToken, mode, poll, stopPolling]);

  const cancel = useCallback(() => {
    stopPolling();
    pickupTokenRef.current = null;
    setQrDataUrl(null);
    setError(null);
    setPhase("idle");
  }, [stopPolling]);

  // A QR is pointless on a phone, and minting needs a signed-in student. In both
  // cases render NOTHING — the surface is exactly as it was before this existed.
  if (!isDesktop || !user) return null;

  return (
    <div className="lt-qrh">
      <style>{QRH_CSS}</style>

      {phase === "idle" && (
        <button type="button" className="lt-qrh__link" onClick={start} disabled={disabled}>
          <span className="lt-qrh__icon" aria-hidden="true">▣</span>
          {label} <span className="lt-qrh__linku">{COPY[mode].link}</span>
        </button>
      )}

      {phase === "starting" && <p className="lt-qrh__note">Creating your phone link…</p>}

      {phase === "waiting" && qrDataUrl && (
        <div className="lt-qrh__panel">
          <img className="lt-qrh__qr" src={qrDataUrl} alt="QR code to open the upload page on your phone" />
          <div className="lt-qrh__body">
            <p className="lt-qrh__h">{COPY[mode].head}</p>
            <p className="lt-qrh__d">{COPY[mode].body}</p>
            <p className="lt-qrh__wait">
              <span className="lt-qrh__dot" aria-hidden="true" />
              Waiting for your phone… <span className="lt-qrh__ttl">This code lasts 5 minutes.</span>
            </p>
            <button type="button" className="lt-qrh__cancel" onClick={cancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase === "received" && (
        <p className="lt-qrh__ok">
          <span aria-hidden="true">✓</span> Answer received from your phone.
        </p>
      )}

      {phase === "expired" && (
        <p className="lt-qrh__note">
          That code expired.{" "}
          <button type="button" className="lt-qrh__retry" onClick={start}>
            Show a new one
          </button>
        </p>
      )}

      {phase === "failed" && (
        <p className="lt-qrh__err">
          {error}{" "}
          <button type="button" className="lt-qrh__retry" onClick={start}>
            Try again
          </button>
        </p>
      )}
    </div>
  );
}

const QRH_CSS = `
.lt-qrh {
  --qrh-fg: #15233a;
  --qrh-muted: #64748b;
  --qrh-line: #e2e8f0;
  --qrh-green: hsl(152, 55%, 45%);
  --qrh-green-soft: hsl(152, 55%, 97%);
  --qrh-green-b: hsl(152, 40%, 85%);
  --qrh-fb: "Inter", system-ui, sans-serif;
  --qrh-fd: "Fraunces", Georgia, serif;
  font-family: var(--qrh-fb);
  margin-top: 10px;
}

.lt-qrh__link {
  display: inline-flex; align-items: center; gap: 7px;
  background: none; border: 0; padding: 4px 0; cursor: pointer;
  font-family: var(--qrh-fb); font-size: 12.5px; color: var(--qrh-muted);
}
.lt-qrh__link:disabled { opacity: 0.5; cursor: default; }
.lt-qrh__icon { font-size: 13px; color: var(--qrh-green); }
.lt-qrh__linku { color: var(--qrh-green); font-weight: 600; text-decoration: underline; }

.lt-qrh__panel {
  display: flex; gap: 14px; align-items: flex-start;
  border: 1px solid var(--qrh-green-b); background: var(--qrh-green-soft);
  border-radius: 12px; padding: 14px; margin-top: 8px;
}
.lt-qrh__qr {
  width: 132px; height: 132px; flex: 0 0 132px;
  border-radius: 8px; background: #fff; padding: 6px; border: 1px solid var(--qrh-line);
}
.lt-qrh__body { min-width: 0; }
.lt-qrh__h {
  font-family: var(--qrh-fd); font-weight: 600; font-size: 14.5px;
  color: var(--qrh-fg); margin: 2px 0 5px;
}
.lt-qrh__d { font-size: 12px; color: var(--qrh-muted); line-height: 1.5; margin: 0 0 9px; }

.lt-qrh__wait {
  display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
  font-size: 12px; font-weight: 600; color: var(--qrh-fg); margin: 0 0 8px;
}
.lt-qrh__ttl { font-weight: 400; color: var(--qrh-muted); }
.lt-qrh__dot {
  width: 7px; height: 7px; border-radius: 50%; background: var(--qrh-green);
  animation: lt-qrh-pulse 1.4s ease-in-out infinite;
}
@keyframes lt-qrh-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
@media (prefers-reduced-motion: reduce) { .lt-qrh__dot { animation: none; } }

.lt-qrh__cancel, .lt-qrh__retry {
  background: none; border: 0; padding: 0; cursor: pointer;
  font-family: var(--qrh-fb); font-size: 12px; color: var(--qrh-muted); text-decoration: underline;
}
.lt-qrh__retry { color: var(--qrh-green); font-weight: 600; }

.lt-qrh__note { font-size: 12.5px; color: var(--qrh-muted); margin: 6px 0 0; }
.lt-qrh__ok { font-size: 12.5px; font-weight: 600; color: var(--qrh-green); margin: 6px 0 0; }
.lt-qrh__err { font-size: 12.5px; color: #b91c1c; margin: 6px 0 0; line-height: 1.5; }
`;
