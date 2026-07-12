/**
 * NcertPageModal — opens the cited NCERT textbook page as an overlay popup.
 *
 * A note's source lines cite "Ch 9, p.144"; the page ref is a clickable button
 * (see <CiteLine> in Note.tsx) that opens this modal. It builds the Firebase
 * Storage URL for the page-aligned chapter PDF and embeds the page. Nothing is
 * hosted yet, so the modal is HONEST TODAY: on any load failure it shows a
 * "coming soon" placeholder, never a broken frame — and it auto-activates (zero
 * deploy) the moment the PDFs land in Storage.
 *
 * Overlay grammar mirrors the proven ResultsScorecard / ConceptTeachDrawer
 * pattern (dim backdrop + centered card on desktop → full-height sheet on
 * mobile; ✕ / Escape / dim-click all close; body-scroll-lock while open),
 * class-driven via one scoped <style> block (no inline style objects).
 */
import { useEffect, useRef, useState } from "react";
import type { NoteSubject } from "./noteSpec.types";
import { ncertPdfPage } from "./ncertPdfOffsets";

/** What a clicked NCERT page-ref carries into the modal. */
export interface NcertPageRef {
  subject: NoteSubject;
  chapter: number;
  page: number;
}

const SUBJECT_LABEL: Record<NoteSubject, string> = {
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  maths: "Maths",
};

/**
 * Build the Firebase Storage download URL for a PER-CHAPTER NCERT PDF.
 *
 * PER-CHAPTER PAGING: the uploaded PDFs are one file per chapter
 * (`ncert/{subject}/ch{chapter}.pdf`), so the file's internal page 1 is the
 * chapter's FIRST page — NOT textbook page N. The note keeps CITING the printed
 * textbook page (`ncert_page`, shown to the student unchanged); only the PDF
 * `#page=` fragment is translated into a page WITHIN the chapter file via the
 * empirically-derived per-chapter offset (see `ncertPdfOffsets.ts`).
 *
 * Returns null when no Storage bucket is configured (→ honest fallback). See
 * [FU-NOTES-NCERT-PDF-HOSTING]: a separate infra PR uploads the 26 Class-10
 * chapter PDFs (public-read + CORS so this URL is fetch-probeable); once they
 * land, this URL resolves and the modal lights up with zero code change.
 */
export function buildNcertPdfUrl(ref: NcertPageRef): string | null {
  const bucket = String(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "").trim();
  if (!bucket) return null;
  const objectPath = `ncert/${ref.subject}/ch${ref.chapter}.pdf`;
  const pdfPage = ncertPdfPage(ref.subject, ref.chapter, ref.page);
  return (
    `https://firebasestorage.googleapis.com/v0/b/${bucket}` +
    `/o/${encodeURIComponent(objectPath)}?alt=media#page=${pdfPage}`
  );
}

interface NcertPageModalProps {
  pageRef: NcertPageRef | null;
  onClose: () => void;
}

export default function NcertPageModal({ pageRef, onClose }: NcertPageModalProps) {
  const [status, setStatus] = useState<"probing" | "ready" | "unavailable">("probing");
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Move focus into the dialog on open and restore it to the trigger (the "p.N"
  // cite button) on close. (Full Tab focus-trap is a deferred a11y follow-up —
  // see [FU-NOTE-MODAL-FOCUS-TRAP].)
  useEffect(() => {
    if (!pageRef) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      prevFocus?.focus?.();
    };
  }, [pageRef]);

  // Esc closes. Capture-phase + stopImmediatePropagation so that when this popup
  // is open ON TOP of NoteModal, one Escape closes only THIS (the topmost) — not
  // also the note modal beneath it (whose own Escape listener is bubble-phase).
  useEffect(() => {
    if (!pageRef) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [pageRef, onClose]);

  // Body-scroll-lock while open. Capture+restore the previous value so this
  // nests correctly inside NoteModal (which has already locked the body).
  useEffect(() => {
    if (!pageRef) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [pageRef]);

  const url = pageRef ? buildNcertPdfUrl(pageRef) : null;

  // Probe the PDF before embedding, so a 404 / missing bucket / no-CORS never
  // renders a broken frame. Today nothing is uploaded → the probe fails → the
  // honest "coming soon" fallback. When the infra PR adds the PDFs (public-read
  // + CORS), the probe succeeds and the page embeds — no code change needed.
  useEffect(() => {
    if (!pageRef) return;
    if (!url) {
      setStatus("unavailable");
      return;
    }
    setStatus("probing");
    let cancelled = false;
    fetch(url, { method: "HEAD" })
      .then((r) => {
        if (!cancelled) setStatus(r.ok ? "ready" : "unavailable");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [pageRef, url]);

  if (!pageRef) return null;

  const subjectLabel = SUBJECT_LABEL[pageRef.subject];

  return (
    <div
      className="lt-ncert__dim"
      role="dialog"
      aria-modal="true"
      aria-label={`NCERT ${subjectLabel} Chapter ${pageRef.chapter}, page ${pageRef.page}`}
      onClick={onClose}
    >
      <style>{NCERT_CSS}</style>
      <div className="lt-ncert__card" onClick={(e) => e.stopPropagation()}>
        <div className="lt-ncert__head">
          <div>
            <div className="lt-ncert__title">
              NCERT · {subjectLabel} · Chapter {pageRef.chapter}
            </div>
            <div className="lt-ncert__sub">Page {pageRef.page}</div>
          </div>
          <button ref={closeRef} type="button" className="lt-ncert__x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="lt-ncert__body">
          {status === "ready" && url ? (
            <iframe
              className="lt-ncert__frame"
              src={url}
              title={`NCERT ${subjectLabel} chapter ${pageRef.chapter}, page ${pageRef.page}`}
            />
          ) : status === "probing" ? (
            <div className="lt-ncert__pending">
              <span className="lt-ncert__pending-ic" aria-hidden="true">◫</span>
              <div className="lt-ncert__pending-d">Loading the NCERT page…</div>
            </div>
          ) : (
            <div className="lt-ncert__pending">
              <span className="lt-ncert__pending-ic" aria-hidden="true">◫</span>
              <div className="lt-ncert__pending-t">NCERT page view — coming soon</div>
              <p className="lt-ncert__pending-d">
                The NCERT page image isn&rsquo;t available yet. This note already cites{" "}
                <b>
                  {subjectLabel} Chapter {pageRef.chapter}, page {pageRef.page}
                </b>{" "}
                — the page will open here the moment the source PDFs are added.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const NCERT_CSS = `
.lt-ncert__dim {
  position: fixed; inset: 0; z-index: 2100;
  background: rgba(15, 36, 68, 0.55);
  display: flex; align-items: center; justify-content: center; padding: 24px;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  animation: lt-ncert-fade 0.18s ease;
}
@keyframes lt-ncert-fade { from { opacity: 0; } to { opacity: 1; } }
.lt-ncert__card {
  background: #fff; border-radius: 18px; width: 100%; max-width: 860px;
  height: min(88vh, 1000px); display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 30px 80px rgba(15, 36, 68, 0.5);
}
.lt-ncert__head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 16px 22px; border-bottom: 1px solid #e7ebf0; flex-shrink: 0;
}
.lt-ncert__title { font-weight: 700; font-size: 15px; color: #0f2444; }
.lt-ncert__sub { font-size: 12px; color: #8b94a3; margin-top: 3px; }
.lt-ncert__x {
  background: #f6f8fa; border: 1px solid #e7ebf0; border-radius: 999px;
  width: 30px; height: 30px; font-size: 14px; color: #566173; cursor: pointer; flex-shrink: 0;
}
.lt-ncert__x:hover { background: #eef1f5; }
.lt-ncert__body { flex: 1; min-height: 0; display: flex; background: #f6f8fa; }
.lt-ncert__frame { width: 100%; height: 100%; border: none; background: #fff; }
.lt-ncert__pending {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; text-align: center; padding: 32px 28px; color: #566173;
}
.lt-ncert__pending-ic { font-size: 34px; opacity: 0.35; }
.lt-ncert__pending-t { font-weight: 700; font-size: 16px; color: #0f2444; }
.lt-ncert__pending-d { font-size: 13.5px; color: #566173; line-height: 1.6; max-width: 420px; margin: 0; }
.lt-ncert__pending-d b { color: #0f2444; }

@media (max-width: 640px) {
  .lt-ncert__dim { align-items: stretch; padding: 0; }
  .lt-ncert__card { max-width: 100%; height: 100%; border-radius: 0; }
}
`;
