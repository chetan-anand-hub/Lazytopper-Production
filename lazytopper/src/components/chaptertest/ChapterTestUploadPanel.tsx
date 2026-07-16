// src/components/chaptertest/ChapterTestUploadPanel.tsx
//
// The phase-2 upload step (spec §5): after submit the objective section is scored;
// here the student uploads ONE PDF (or photo) of their written Sections B–D to
// complete the score. It owns file selection + validation only; the page owns the
// grade call (gradeChapterTestUpload) + the resulting scorecard, so the shared grader
// path and the two-phase scorecard stay in the service/page. Mirrors the worksheet
// upload affordance, chapter-test-branded. Honest: "upload later" is always allowed.

import { useCallback, useRef, useState } from "react";
import QrAnswerHandoff from "../qr/QrAnswerHandoff";
import {
  MAX_UPLOAD_IMAGE_BYTES,
  MAX_UPLOAD_PDF_BYTES,
  UPLOAD_LIMIT_SENTENCE,
  formatUploadLimit,
} from "../../services/uploadLimits";

export default function ChapterTestUploadPanel({
  name,
  code,
  objective,
  grading,
  error,
  isSignedIn,
  onGrade,
  onSkip,
  eyebrow = "Chapter Test · Result",
  sectionsLabel = "Sections B–D",
}: {
  name: string;
  code: string;
  objective: { awarded: number; total: number };
  grading: boolean;
  error: string | null;
  isSignedIn: boolean;
  onGrade: (upload: { imageBase64: string; imageMimeType: string }) => void;
  onSkip: () => void;
  /** Surface wording overrides (Full Mock: "Full Mock · Result" / "Sections
   *  B–E"). Additive — defaults keep the Chapter Test byte-identical. */
  eyebrow?: string;
  sectionsLabel?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("application/pdf");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.type === "application/pdf";
    const isImage = file.type === "image/jpeg" || file.type === "image/png";
    if (!isPdf && !isImage) {
      setLocalError("Upload a PDF (recommended) or a JPG/PNG photo of your answers.");
      return;
    }
    // The limit is the REAL one (uploadLimits.ts), not the old unspendable "5 MB":
    // base64 inflates ~4/3, so a 5 MB PDF became 6.67 MB on the wire and blew the
    // backend's 5 MB body cap — the student passed this check and then died at the
    // grader. Refuse it here, honestly, while they can still act on it.
    if (file.size > (isPdf ? MAX_UPLOAD_PDF_BYTES : MAX_UPLOAD_IMAGE_BYTES)) {
      const limit = formatUploadLimit(isPdf ? MAX_UPLOAD_PDF_BYTES : MAX_UPLOAD_IMAGE_BYTES);
      setLocalError(
        `That file is ${formatUploadLimit(file.size)} — the limit is ${limit}. ` +
          `Try scanning at a lower quality, or split it into two.`,
      );
      return;
    }
    setLocalError(null);
    setFileName(file.name);
    setImageMimeType(isPdf ? "application/pdf" : file.type === "image/png" ? "image/png" : "image/jpeg");
    const reader = new FileReader();
    reader.onload = () => setImageBase64((reader.result as string).split(",")[1] ?? null);
    reader.readAsDataURL(file);
  }, []);

  const reset = useCallback(() => {
    setFileName(null);
    setImageBase64(null);
    setLocalError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div className="lt-ct__upload">
      <div className="lt-ct__uploadcard">
        <div className="lt-ct__eyebrow">{eyebrow}</div>
        <div className="lt-ct__title lt-ct__fr">{name}</div>
        <div className="lt-ct__sub">
          {code} · objective scored <b>{objective.awarded}/{objective.total}</b>. Upload your written
          answers ({sectionsLabel}) and we’ll grade them against this test’s marking scheme — with a full
          mistake breakdown.
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={handleFile}
          className="lt-ct__file"
        />

        {!imageBase64 ? (
          <button type="button" className="lt-ct__drop" onClick={() => fileInputRef.current?.click()}>
            <span className="lt-ct__dropt">Upload your written answers (one PDF)</span>
            <span className="lt-ct__dropd">
              {UPLOAD_LIMIT_SENTENCE} · label each answer with its question number
            </span>
          </button>
        ) : (
          <div className="lt-ct__filerow">
            <span className="lt-ct__filenm">{fileName}</span>
            <button type="button" className="lt-ct__filex" onClick={reset} aria-label="Remove file">
              ✕
            </button>
          </div>
        )}

        {/* Sat the test on paper? Send it straight from your phone instead of
            emailing it to yourself. Desktop-only + signed-in-only; renders nothing
            otherwise, so the upload path above is untouched when QR is unused.
            It fills the SAME state the file input fills, so the grade call below
            runs exactly as it always has. */}
        {!imageBase64 && (
          <QrAnswerHandoff
            // "document": this paper is MULTI-PAGE, so the phone must lead with the
            // PDF. Camera-first copy here would have a student photograph page 1 of a
            // whole test and believe it was submitted.
            mode="document"
            disabled={grading}
            onImageReceived={({ imageBase64: b64, imageMimeType: mime }) => {
              setLocalError(null);
              setFileName(mime === "application/pdf" ? "PDF from your phone" : "Photo from your phone");
              setImageMimeType(mime);
              setImageBase64(b64);
            }}
          />
        )}

        {imageBase64 && (
          <button
            type="button"
            className="lt-ct__grade"
            disabled={grading}
            onClick={() => onGrade({ imageBase64, imageMimeType })}
          >
            {grading ? "Grading your answers… ~30–60s" : "Grade my written answers →"}
          </button>
        )}

        {(error || localError) && (
          <div className="lt-ct__err" role="alert">
            {error || localError}
          </div>
        )}

        <p className="lt-ct__tip">
          Tip: a clear, upright scan of each page grades best. If a page is blurry we’ll tell you which
          question to re-upload — we never guess a mark.
        </p>

        <div className="lt-ct__startrow">
          <button type="button" className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm" onClick={onSkip}>
            Upload later — I’ll finish this from my history
          </button>
        </div>

        {!isSignedIn && (
          <p className="lt-ct__tip">
            You can grade signed-out, but sign in to save this test to your history and Mistake
            Intelligence.
          </p>
        )}
      </div>
    </div>
  );
}
