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
  FULL_FRAME_CROP,
  isFullFrameCrop,
  moveCropFraction,
  peekQrSlot,
  prepareQrImage,
  readQrPreviewUrl,
  resizeCropFraction,
  sendQrImage,
  type CropFraction,
  type CropHandle,
  type QrHandoffMode,
} from "../services/qrUploadService";
import { MAX_UPLOAD_PDF_BYTES, formatUploadLimit } from "../services/uploadLimits";

type Phase =
  | "checking"
  | "ready"
  | "cropping"
  | "sending"
  | "sent"
  | "expired"
  | "used"
  | "unavailable"
  | "failed";

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

  // ── THE CROP STEP ───────────────────────────────────────────────────────────────
  // A student photographs a page carrying two or three worked solutions and only one
  // of them answers the question on the laptop. Before this step the grader received
  // the whole page and had to INFER which working to mark; now the student says so
  // directly. That is a grading-accuracy fix wearing a UI hat.
  //
  // The picked file is held here, un-sent, while the student chooses. It is the only
  // reason this page now has a state between "ready" and "sending".
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropFraction>(FULL_FRAME_CROP);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: "move" | CropHandle;
    startX: number;
    startY: number;
    startRect: CropFraction;
  } | null>(null);

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

  // Everything from "we have the bytes" onwards. Unchanged from before the crop step
  // except for the optional `selection` — which is `undefined` on every path that
  // existed previously, so the skip path is the old path exactly.
  const sendPrepared = useCallback(
    async (file: File, selection?: CropFraction) => {
      if (!token) return;
      setError(null);
      setPhase("sending");

      let payload;
      try {
        // Required, not cosmetic: a full-res phone photo (2-8MB) exceeds the 3MB cap,
        // so IMAGES are downscaled to fit. A PDF cannot be downscaled — there is no
        // canvas for it — so it passes through untouched and an over-limit one is
        // refused HERE, on the phone, while the student can still act on it.
        payload = await prepareQrImage(file, selection);
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

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Let the same file be re-picked after a failure.
      e.target.value = "";
      if (!file || !token) return;

      setError(null);

      // Only an IMAGE can be cropped. A PDF has no canvas, so it goes straight out on
      // the pre-crop path — showing a student a crop box they cannot use would be a
      // dead end, not a feature.
      if (file.type === "image/jpeg" || file.type === "image/png") {
        try {
          const url = await readQrPreviewUrl(file);
          setPendingFile(file);
          setPreviewUrl(url);
          setCrop(FULL_FRAME_CROP);
          setPhase("cropping");
          return;
        } catch {
          // If the preview cannot be read we do NOT dead-end the student on a crop
          // screen with no image. Fall through and let prepareQrImage report the real
          // problem in its own words — the crop step is a convenience, never a gate.
        }
      }

      await sendPrepared(file);
    },
    [token, sendPrepared],
  );

  // ★ Q2 — THE WHOLE FRAME IS THE DEFAULT AND IT IS NOT A CROP. When the student has
  // not moved the box we pass `undefined` rather than a full-frame rectangle, so the
  // skip path runs the identical code it ran before this feature existed instead of
  // a no-op round-trip through the crop maths.
  const confirmCrop = useCallback(() => {
    const file = pendingFile;
    if (!file) return;
    const selection = isFullFrameCrop(crop) ? undefined : crop;
    setPendingFile(null);
    setPreviewUrl(null);
    void sendPrepared(file, selection);
  }, [pendingFile, crop, sendPrepared]);

  /** Reversible: back to the whole page, without re-picking the photo. */
  const resetCrop = useCallback(() => setCrop(FULL_FRAME_CROP), []);

  const pointToFraction = useCallback((clientX: number, clientY: number) => {
    const el = frameRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: (clientX - r.left) / Math.max(1, r.width),
      y: (clientY - r.top) / Math.max(1, r.height),
    };
  }, []);

  const capture = useCallback((pointerId: number) => {
    // jsdom and older mobile browsers may not implement pointer capture; losing it
    // degrades a drag that leaves the frame, which is not worth a crash.
    try {
      frameRef.current?.setPointerCapture?.(pointerId);
    } catch {
      /* no capture available — dragging still works inside the frame */
    }
  }, []);

  const startMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const p = pointToFraction(e.clientX, e.clientY);
      if (!p) return;
      dragRef.current = { mode: "move", startX: p.x, startY: p.y, startRect: crop };
      capture(e.pointerId);
    },
    [crop, pointToFraction, capture],
  );

  const startResize = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      // Without this the corner drag would also start a whole-box move underneath it.
      e.stopPropagation();
      const handle = e.currentTarget.dataset.handle as CropHandle | undefined;
      if (!handle) return;
      const p = pointToFraction(e.clientX, e.clientY);
      if (!p) return;
      dragRef.current = { mode: handle, startX: p.x, startY: p.y, startRect: crop };
      capture(e.pointerId);
    },
    [crop, pointToFraction, capture],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const p = pointToFraction(e.clientX, e.clientY);
      if (!p) return;
      if (drag.mode === "move") {
        setCrop(moveCropFraction(drag.startRect, p.x - drag.startX, p.y - drag.startY));
      } else {
        setCrop(resizeCropFraction(drag.startRect, drag.mode, p.x, p.y));
      }
    },
    [pointToFraction],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Geometry is written as CSS CUSTOM PROPERTIES rather than a JSX `style={{}}` object:
  // the rectangle is the one genuinely dynamic thing on this page, and CLAUDE.md §7
  // forbids inline style objects. This keeps every rule in the stylesheet and leaves
  // only four numbers crossing the boundary.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    el.style.setProperty("--crop-l", `${crop.left * 100}%`);
    el.style.setProperty("--crop-t", `${crop.top * 100}%`);
    el.style.setProperty("--crop-w", `${(crop.right - crop.left) * 100}%`);
    el.style.setProperty("--crop-h", `${(crop.bottom - crop.top) * 100}%`);
  }, [crop, phase]);

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

        {phase === "cropping" && previewUrl && (
          <>
            <h1 className="lt-qru__h">Choose what to send</h1>
            <p className="lt-qru__d">
              Drag the corners to just the answer you want checked — or send the whole page
              as it is.
            </p>
            <div
              ref={frameRef}
              className="lt-qru__crop"
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <img className="lt-qru__cropimg" src={previewUrl} alt="The photo you just took" />
              {/* The dim lives in its OWN clipped layer. Everything that needs clipping is
               *  in here; nothing that needs to be SEEN is. The first build put the dim and
               *  the handles inside one `overflow: hidden` box, and at the DEFAULT full-page
               *  selection that clipped all four handles away — a student opened the crop
               *  step and saw no corners to grab, which is the very complaint this feature
               *  exists to answer. Screenshots caught it; no assertion did, and none could. */}
              <div className="lt-qru__cropclip" aria-hidden="true">
                <div className="lt-qru__cropdim" />
              </div>
              <div className="lt-qru__cropbox" data-testid="qru-crop-box" onPointerDown={startMove}>
                {/* Corners only, and deliberately larger than they look: the visible dot is
                 *  small enough not to hide the handwriting underneath, while the touch
                 *  target around it is thumb-sized. See .lt-qru__grab::before. */}
                <span
                  className="lt-qru__grab lt-qru__grab--nw"
                  data-handle="nw"
                  data-testid="qru-grab-nw"
                  onPointerDown={startResize}
                />
                <span
                  className="lt-qru__grab lt-qru__grab--ne"
                  data-handle="ne"
                  data-testid="qru-grab-ne"
                  onPointerDown={startResize}
                />
                <span
                  className="lt-qru__grab lt-qru__grab--sw"
                  data-handle="sw"
                  data-testid="qru-grab-sw"
                  onPointerDown={startResize}
                />
                <span
                  className="lt-qru__grab lt-qru__grab--se"
                  data-handle="se"
                  data-testid="qru-grab-se"
                  onPointerDown={startResize}
                />
              </div>
            </div>
            {/* The button SAYS which of the two it is about to do, so a student never has
             *  to work out whether their drag counted. */}
            <button type="button" className="lt-qru__cta" onClick={confirmCrop}>
              {isFullFrameCrop(crop) ? "Send the whole page" : "Send this part"}
            </button>
            <button
              type="button"
              className="lt-qru__ghost"
              onClick={resetCrop}
              disabled={isFullFrameCrop(crop)}
            >
              Reset to the whole page
            </button>
            <p className="lt-qru__hint">
              Cropping is optional. Sending only the answer you want checked helps the
              checker mark the right working.
            </p>
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

/* Secondary action. Muted on purpose — reset must be findable without competing with
   the one button that actually sends. */
.lt-qru__ghost {
  width: 100%; min-height: 48px; margin-top: 10px;
  background: transparent; color: var(--qru-muted);
  border: 1px solid var(--qru-line); border-radius: 12px;
  font-family: var(--qru-fb); font-size: 15px; font-weight: 600; cursor: pointer;
  padding: 12px 16px;
}
.lt-qru__ghost:disabled { opacity: 0.45; cursor: default; }

/* ── CROP SURFACE ────────────────────────────────────────────────────────────────
   touch-action: none is LOAD-BEARING, not tidiness. Without it the browser claims the
   drag as a page scroll and the corners simply do not move on a real phone — the exact
   failure this feature exists to remove. */
.lt-qru__crop {
  position: relative; width: 100%; margin: 0 0 18px;
  background: #0f172a;
  touch-action: none; user-select: none; -webkit-user-select: none;
}
.lt-qru__cropimg {
  display: block; width: 100%; height: auto; pointer-events: none;
  border-radius: 12px;
}

/* THE ONLY CLIPPING LAYER. It holds the dim and nothing else, so the handles — which
   sit half outside the selection — can never be clipped by it. */
.lt-qru__cropclip {
  position: absolute; inset: 0;
  border-radius: 12px; overflow: hidden; pointer-events: none;
}
.lt-qru__cropdim {
  position: absolute;
  left: var(--crop-l, 0%); top: var(--crop-t, 0%);
  width: var(--crop-w, 100%); height: var(--crop-h, 100%);
  /* One giant spread shadow rather than four overlay divs: one element, and it can
     never leave a seam between the pieces. */
  box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.55);
}

.lt-qru__cropbox {
  position: absolute;
  left: var(--crop-l, 0%); top: var(--crop-t, 0%);
  width: var(--crop-w, 100%); height: var(--crop-h, 100%);
  border: 2px solid var(--qru-green);
  cursor: move;
}

.lt-qru__grab {
  position: absolute; width: 18px; height: 18px;
  background: #fff; border: 2px solid var(--qru-green); border-radius: 50%;
  box-sizing: border-box;
}
/* THE TOUCH TARGET, not the dot. 44px is the smallest reliably thumb-hittable target;
   the visible dot stays 18px so it does not cover the handwriting being selected. */
.lt-qru__grab::before {
  content: ""; position: absolute;
  left: 50%; top: 50%; width: 44px; height: 44px;
  transform: translate(-50%, -50%);
}
.lt-qru__grab--nw { left: -10px; top: -10px; }
.lt-qru__grab--ne { right: -10px; top: -10px; }
.lt-qru__grab--sw { left: -10px; bottom: -10px; }
.lt-qru__grab--se { right: -10px; bottom: -10px; }
`;
