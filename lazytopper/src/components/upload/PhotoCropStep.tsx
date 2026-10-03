// src/components/upload/PhotoCropStep.tsx
//
// THE SHARED CROP STEP (UPLOAD-2, owner rulings R3 + R4) — extracted from the QR phone
// page (QrAnswerUploadPage's crop step) so every photo upload in the product gets the
// same one: Check & Improve, "Check my answer", worksheets, Chapter Test / Full Mock
// grading and the QR page itself.
//
// ★ OPTIONAL AND SKIPPABLE. The selection starts as the WHOLE photo and the primary
// button says "Use whole photo" — one tap and the student is done. Cropping only ever
// narrows what is sent; it is never a gate.
//
// ★ UPRIGHT. The preview is drawn from the SAME decoded photo and the SAME geometry
// (`planPhotoDraw`) that the upload is encoded with, so what the student sees is what
// the grader gets — EXIF honoured (FU-QR-CROP-EXIF-ORIENTATION), plus a Rotate button
// in 90° steps for a page shot sideways (FU-QR-CROP-NO-ROTATION).
//
// Touch AND mouse: pointer events throughout, `touch-action: none` on the surface, a
// 44 px hit area around each corner dot.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FULL_FRAME_CROP,
  isFullFrameCrop,
  moveCropFraction,
  nextRotation,
  renderPhotoPreview,
  resizeCropFraction,
  type CropFraction,
  type CropHandle,
  type DecodedPhoto,
  type PhotoRotation,
} from "../../services/preparePhoto";

export interface PhotoCropSelection {
  /** Undefined when the student kept the whole photo — the skip path. */
  crop?: CropFraction;
  rotation: PhotoRotation;
}

export interface PhotoCropStepProps {
  photo: DecodedPhoto;
  initialCrop?: CropFraction;
  initialRotation?: PhotoRotation;
  /** Heading above the photo. */
  title?: string;
  /** e.g. "Page 2" — shown under the heading when the tray is in use. */
  pageLabel?: string;
  busy?: boolean;
  onConfirm: (selection: PhotoCropSelection) => void;
  onCancel: () => void;
  /** Test seam: jsdom has no canvas. */
  renderPreview?: (photo: DecodedPhoto, rotation: PhotoRotation) => { url: string };
}

/** Turn a fractional selection a quarter turn clockwise WITH the photo, so a crop the
 *  student already drew survives the Rotate button instead of being thrown away. */
export function rotateCropClockwise(c: CropFraction): CropFraction {
  return { left: 1 - c.bottom, top: c.left, right: 1 - c.top, bottom: c.right };
}

export default function PhotoCropStep({
  photo,
  initialCrop,
  initialRotation = 0,
  title = "Choose what to send",
  pageLabel,
  busy = false,
  onConfirm,
  onCancel,
  renderPreview = renderPhotoPreview,
}: PhotoCropStepProps) {
  const [rotation, setRotation] = useState<PhotoRotation>(initialRotation);
  const [crop, setCrop] = useState<CropFraction>(initialCrop ?? FULL_FRAME_CROP);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: "move" | CropHandle;
    startX: number;
    startY: number;
    startRect: CropFraction;
  } | null>(null);

  // One preview per rotation, drawn from the photo decoded once.
  const preview = useMemo(() => {
    try {
      return renderPreview(photo, rotation).url;
    } catch {
      return null;
    }
  }, [photo, rotation, renderPreview]);

  const whole = isFullFrameCrop(crop);

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
      /* dragging still works inside the frame */
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

  const rotate = useCallback(() => {
    setRotation((r) => nextRotation(r));
    setCrop((c) => rotateCropClockwise(c));
  }, []);

  // Geometry crosses into CSS as custom properties, never a JSX `style={{}}` object
  // (CLAUDE.md §7) — four numbers, every rule stays in the stylesheet.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    el.style.setProperty("--crop-l", `${crop.left * 100}%`);
    el.style.setProperty("--crop-t", `${crop.top * 100}%`);
    el.style.setProperty("--crop-w", `${(crop.right - crop.left) * 100}%`);
    el.style.setProperty("--crop-h", `${(crop.bottom - crop.top) * 100}%`);
  }, [crop, preview]);

  const confirm = useCallback(
    (keepWhole: boolean) => {
      // ★ THE WHOLE FRAME IS NOT A CROP: pass `undefined`, so the skip path runs the
      // plain whole-photo encode rather than a no-op round-trip through crop maths.
      onConfirm({ crop: keepWhole || whole ? undefined : crop, rotation });
    },
    [onConfirm, whole, crop, rotation],
  );

  return (
    <div className="lt-pcs" data-testid="photo-crop-step">
      <style>{PCS_CSS}</style>
      <h2 className="lt-pcs__h">{title}</h2>
      {pageLabel && <p className="lt-pcs__page">{pageLabel}</p>}
      <p className="lt-pcs__d">
        Drag the corners to just the answer you want checked — or use the whole photo.
      </p>

      <div className="lt-pcs__stage">
        {preview ? (
          <div
            ref={frameRef}
            className="lt-pcs__crop"
            data-testid="pcs-frame"
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <img className="lt-pcs__img" src={preview} alt="The photo you chose" draggable={false} />
            {/* The dim lives in its OWN clipped layer, so the handles — which sit half
             *  outside the selection — can never be clipped away at the full-photo
             *  default (the bug the QR page's first build shipped). */}
            <div className="lt-pcs__clip" aria-hidden="true">
              <div className="lt-pcs__dim" />
            </div>
            <div className="lt-pcs__box" data-testid="pcs-box" onPointerDown={startMove}>
              {(["nw", "ne", "sw", "se"] as const).map((h) => (
                <span
                  key={h}
                  className={`lt-pcs__grab lt-pcs__grab--${h}`}
                  data-handle={h}
                  data-testid={`pcs-grab-${h}`}
                  onPointerDown={startResize}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="lt-pcs__note">Preparing your photo…</p>
        )}
      </div>

      <div className="lt-pcs__row">
        <button type="button" className="lt-pcs__tool" onClick={rotate} disabled={busy || !preview}>
          <span aria-hidden="true">↻</span> Rotate
        </button>
        <button
          type="button"
          className="lt-pcs__tool"
          onClick={() => setCrop(FULL_FRAME_CROP)}
          disabled={busy || whole}
        >
          Reset
        </button>
      </div>

      {/* The button SAYS which of the two it will do, so a student never has to work
       *  out whether their drag counted. At the default it is the one-tap skip. */}
      <button
        type="button"
        className="lt-pcs__cta"
        onClick={() => confirm(false)}
        disabled={busy || !preview}
        data-testid="pcs-confirm"
      >
        {busy ? "Preparing…" : whole ? "Use whole photo" : "Use this part"}
      </button>
      {!whole && (
        <button
          type="button"
          className="lt-pcs__ghost"
          onClick={() => confirm(true)}
          disabled={busy}
          data-testid="pcs-use-whole"
        >
          Use whole photo
        </button>
      )}
      <button type="button" className="lt-pcs__link" onClick={onCancel} disabled={busy}>
        Cancel
      </button>
    </div>
  );
}

const PCS_CSS = `
.lt-pcs {
  --pcs-fg: #15233a;
  --pcs-muted: #64748b;
  --pcs-line: #e2e8f0;
  --pcs-green: hsl(152, 55%, 45%);
  --pcs-green-d: hsl(152, 55%, 38%);
  font-family: "Inter", system-ui, sans-serif;
  color: var(--pcs-fg);
  text-align: center;
  display: flex; flex-direction: column; align-items: stretch;
  min-width: 0;
}
.lt-pcs__h {
  font-family: "Fraunces", Georgia, serif; font-weight: 600; font-size: 20px;
  margin: 0 0 4px; line-height: 1.25;
}
.lt-pcs__page { font-size: 12px; font-weight: 700; color: var(--pcs-green-d); margin: 0 0 4px; }
.lt-pcs__d { font-size: 13px; color: var(--pcs-muted); line-height: 1.5; margin: 0 0 12px; }
.lt-pcs__note { font-size: 14px; color: var(--pcs-muted); margin: 24px 0; }

/* The stage centres the photo; the crop frame shrink-wraps the IMAGE so a fraction of
   the frame is exactly a fraction of the photo (the whole crop maths rests on this). */
.lt-pcs__stage {
  display: flex; justify-content: center; align-items: center;
  padding: 12px; margin: 0 0 12px;
  background: #0f172a; border-radius: 12px;
  min-height: 120px;
}
/* touch-action: none is LOAD-BEARING: without it the browser claims the drag as a page
   scroll and the corners do not move on a real phone. */
.lt-pcs__crop {
  position: relative; display: inline-block; max-width: 100%;
  touch-action: none; user-select: none; -webkit-user-select: none;
}
.lt-pcs__img {
  display: block; max-width: 100%; width: auto; height: auto;
  max-height: min(58vh, 620px);
  pointer-events: none;
}
.lt-pcs__clip { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.lt-pcs__dim {
  position: absolute;
  left: var(--crop-l, 0%); top: var(--crop-t, 0%);
  width: var(--crop-w, 100%); height: var(--crop-h, 100%);
  box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.55);
}
.lt-pcs__box {
  position: absolute;
  left: var(--crop-l, 0%); top: var(--crop-t, 0%);
  width: var(--crop-w, 100%); height: var(--crop-h, 100%);
  border: 2px solid var(--pcs-green); box-sizing: border-box;
  cursor: move;
}
.lt-pcs__grab {
  position: absolute; width: 20px; height: 20px;
  background: #fff; border: 2px solid var(--pcs-green); border-radius: 50%;
  box-sizing: border-box; cursor: nwse-resize;
}
.lt-pcs__grab--ne, .lt-pcs__grab--sw { cursor: nesw-resize; }
/* THE TOUCH TARGET, not the dot: 44 px is the smallest reliably thumb-hittable size. */
.lt-pcs__grab::before {
  content: ""; position: absolute;
  left: 50%; top: 50%; width: 44px; height: 44px;
  transform: translate(-50%, -50%);
}
.lt-pcs__grab--nw { left: -11px; top: -11px; }
.lt-pcs__grab--ne { right: -11px; top: -11px; }
.lt-pcs__grab--sw { left: -11px; bottom: -11px; }
.lt-pcs__grab--se { right: -11px; bottom: -11px; }

.lt-pcs__row { display: flex; gap: 8px; margin: 0 0 10px; }
.lt-pcs__tool {
  flex: 1; min-height: 44px; border-radius: 10px;
  background: #fff; color: var(--pcs-fg); border: 1px solid var(--pcs-line);
  font: 600 14px "Inter", system-ui, sans-serif; cursor: pointer;
}
.lt-pcs__tool:disabled { opacity: 0.45; cursor: default; }
.lt-pcs__cta {
  width: 100%; min-height: 52px; border: 0; border-radius: 12px;
  background: var(--pcs-green); color: #fff;
  font: 700 16px "Inter", system-ui, sans-serif; cursor: pointer;
}
.lt-pcs__cta:active { background: var(--pcs-green-d); }
.lt-pcs__cta:disabled { opacity: 0.6; cursor: default; }
.lt-pcs__ghost {
  width: 100%; min-height: 46px; margin-top: 8px; border-radius: 12px;
  background: transparent; color: var(--pcs-fg); border: 1px solid var(--pcs-line);
  font: 600 15px "Inter", system-ui, sans-serif; cursor: pointer;
}
.lt-pcs__link {
  align-self: center; margin-top: 6px; min-height: 40px; padding: 0 16px;
  background: none; border: 0; color: var(--pcs-muted);
  font: 600 14px "Inter", system-ui, sans-serif; cursor: pointer;
}
`;
