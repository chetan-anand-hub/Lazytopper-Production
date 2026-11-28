/**
 * MARK-ON-PHOTO-1 (owner, 25 Nov 2026) — the student points to an answer the grader could not place.
 *
 * <MarkOnPhotoButton> sits on a whole-paper row that is "not found", "couldn't be read" or "answer to another
 * question". <MarkOnPhotoDialog> lets the student pick one of the pages they already uploaded and drag the box around
 * just that answer (the shared crop step), or pick a photo of just that answer. The host grades ONLY that question
 * from the chosen image and slots it back into the same paper (services/markOnPhoto.ts). Nothing here grades.
 *
 * Styling is class-based (a scoped <style> block, the PaperMarksEditor convention) — CLAUDE.md §7.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import PhotoCropStep, { type PhotoCropSelection } from "../upload/PhotoCropStep";
import {
  decodePhoto,
  preparePhoto,
  preparedToFile,
  type CropFraction,
  type DecodedPhoto,
  type PreparedPhoto,
} from "../../services/preparePhoto";

import { MARK_ON_PHOTO_ACTION } from "../../services/markOnPhoto";

export { MARK_ON_PHOTO_ACTION };
/** A box on a page of the paper must leave part of the page out: at most 90% of the page's area. */
export const MAX_BOX_AREA = 0.9;
export function isAnswerBox(crop: CropFraction | undefined): boolean {
  if (!crop) return false;
  return (crop.right - crop.left) * (crop.bottom - crop.top) <= MAX_BOX_AREA;
}

export const MARK_ON_PHOTO_NEED_BOX = "Drag the corners so the box holds just this answer, then tap “Use this part”.";

const CSS = `
.lt-mop-btn { margin-top: 10px; background: none; border: 1px solid hsl(152, 55%, 32%); color: hsl(152, 60%, 26%);
  border-radius: 8px; padding: 6px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
.lt-mop-btn:disabled { opacity: 0.6; cursor: default; }
.lt-mop-back { position: fixed; inset: 0; background: rgba(10, 20, 40, 0.55); z-index: 60; display: flex;
  align-items: center; justify-content: center; padding: 16px; }
/* MARK-ON-PHOTO-2: opened from a results scorecard (itself a full-screen layer), the dialog sits above it. */
.lt-mop-back--top { z-index: 1100; }
.lt-mop-card { background: #fff; border-radius: 14px; max-width: 640px; width: 100%; max-height: 92vh; overflow: auto;
  padding: 18px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25); }
.lt-mop-title { font-size: 16px; font-weight: 700; color: hsl(222, 47%, 14%); margin: 0 0 6px; }
.lt-mop-sub { font-size: 13px; color: hsl(220, 15%, 38%); margin: 0 0 12px; line-height: 1.5; }
.lt-mop-pages { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
.lt-mop-page { border: 1px solid hsl(220, 15%, 85%); border-radius: 8px; padding: 4px; background: #fff; cursor: pointer; }
.lt-mop-page img { display: block; width: 110px; height: auto; }
.lt-mop-page span { display: block; text-align: center; font-size: 11.5px; color: hsl(220, 15%, 38%); margin-top: 2px; }
.lt-mop-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 6px; }
.lt-mop-link { background: none; border: none; padding: 0; color: hsl(152, 60%, 26%); font-weight: 600; font-size: 13px; cursor: pointer; }
.lt-mop-close { background: none; border: 1px solid hsl(220, 15%, 80%); border-radius: 8px; padding: 6px 12px; font-size: 13px; cursor: pointer; }
.lt-mop-err { color: hsl(0, 65%, 42%); font-size: 12.5px; margin: 8px 0 0; }
.lt-mop-busy { color: hsl(220, 15%, 38%); font-size: 13px; margin: 8px 0 0; }
`;

export function MarkOnPhotoButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        className="lt-mop-btn"
        data-testid="mark-on-photo"
        aria-label={`${MARK_ON_PHOTO_ACTION} for ${label}`}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {MARK_ON_PHOTO_ACTION}
      </button>
    </>
  );
}

/** One page the student already uploaded: exactly the image that was sent, and its small preview. */
export interface MarkablePage {
  id: string;
  prepared: Pick<PreparedPhoto, "base64" | "mimeType">;
  thumbUrl: string;
}

export interface MarkOnPhotoDialogProps {
  /** "Q6" */
  label: string;
  pages: MarkablePage[];
  busy: boolean;
  error: string | null;
  /** A refusal the host renders in its own words (e.g. the fair-use limit panel); shown above everything else. */
  notice?: ReactNode;
  /** The chosen answer image, upload-ready. */
  onSubmit: (image: { imageBase64: string; imageMimeType: string }) => void;
  onClose: () => void;
  /** Test seams (jsdom has no canvas). */
  decode?: (file: File) => Promise<DecodedPhoto>;
  prepare?: (photo: DecodedPhoto, sel: PhotoCropSelection) => Promise<Pick<PreparedPhoto, "base64" | "mimeType">>;
  renderPreview?: (photo: DecodedPhoto, rotation: 0 | 90 | 180 | 270) => { url: string };
  /** MARK-ON-PHOTO-2: draw above a full-screen layer (the results scorecard). Absent -> exactly as before. */
  onTop?: boolean;
}

export function MarkOnPhotoDialog({
  label,
  pages,
  busy,
  error,
  notice,
  onSubmit,
  onClose,
  decode = decodePhoto,
  prepare = (photo, sel) => preparePhoto(photo, { crop: sel.crop, rotation: sel.rotation }),
  renderPreview,
  onTop,
}: MarkOnPhotoDialogProps) {
  const [photo, setPhoto] = useState<DecodedPhoto | null>(null);
  // A page of the paper holds other answers too: there the box must be drawn (never the whole page).
  const [fromPage, setFromPage] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => photo?.release(), [photo]);

  async function open(file: File, isPage: boolean) {
    setLocalError(null);
    try {
      const p = await decode(file);
      setFromPage(isPage);
      setPhoto(p);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "We couldn't open that photo — please try another.");
    }
  }

  async function confirm(sel: PhotoCropSelection) {
    if (!photo) return;
    if (fromPage && !isAnswerBox(sel.crop)) {
      setLocalError(MARK_ON_PHOTO_NEED_BOX);
      return;
    }
    setPreparing(true);
    setLocalError(null);
    try {
      const out = await prepare(photo, sel);
      onSubmit({ imageBase64: out.base64, imageMimeType: out.mimeType });
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "We couldn't prepare that photo — please try again.");
    } finally {
      setPreparing(false);
    }
  }

  const shownError = localError || error;
  return (
    <div className={onTop ? "lt-mop-back lt-mop-back--top" : "lt-mop-back"} role="dialog" aria-modal="true" aria-label={`${MARK_ON_PHOTO_ACTION} — ${label}`} data-testid="mark-on-photo-dialog">
      <style>{CSS}</style>
      <div className="lt-mop-card">
        {notice}
        {photo ? (
          <>
            <PhotoCropStep
              photo={photo}
              title={`Drag the box around your answer to ${label}`}
              busy={busy || preparing}
              onConfirm={(sel) => void confirm(sel)}
              onCancel={() => { photo.release(); setPhoto(null); setLocalError(null); }}
              requireCrop={fromPage}
              {...(renderPreview ? { renderPreview } : {})}
            />
            {busy && <p className="lt-mop-busy" role="status">Marking {label}…</p>}
            {shownError && <p className="lt-mop-err" role="alert">{shownError}</p>}
          </>
        ) : (
          <>
            <p className="lt-mop-title">Where is your answer to {label}?</p>
            <p className="lt-mop-sub">
              {pages.length > 0
                ? "Tap the page it is on, then drag the box around just that answer. Only this question is marked; the rest of your paper stays as it is."
                : "Choose a photo of just this answer. Only this question is marked; the rest of your paper stays as it is."}
            </p>
            {pages.length > 0 && (
              <div className="lt-mop-pages">
                {pages.map((p, i) => (
                  <button
                    type="button"
                    key={p.id}
                    className="lt-mop-page"
                    data-testid="mark-on-photo-page"
                    onClick={() => void open(preparedToFile(p.prepared, `page-${i + 1}.jpg`), true)}
                  >
                    <img src={p.thumbUrl} alt={`Page ${i + 1}`} />
                    <span>Page {i + 1}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="lt-mop-row">
              <button type="button" className="lt-mop-link" data-testid="mark-on-photo-pick" onClick={() => fileRef.current?.click()}>
                {pages.length > 0 ? "Or choose a photo of just this answer" : "Choose a photo"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                hidden
                data-testid="mark-on-photo-file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void open(f, false);
                }}
              />
              <button type="button" className="lt-mop-close" onClick={onClose}>Cancel</button>
            </div>
            {shownError && <p className="lt-mop-err" role="alert">{shownError}</p>}
          </>
        )}
      </div>
    </div>
  );
}
