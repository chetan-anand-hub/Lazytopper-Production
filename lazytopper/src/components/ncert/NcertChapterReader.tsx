/**
 * NcertChapterReader — NCERT-BOOKS-1 (lane G, D211 §1/§4): "Read the chapter" on the
 * `/ncert-class-10` page. Opens OUR stored copy of the chapter (Firebase Storage,
 * `ncert/{subject}/ch{N}.pdf`, the same objects the notes' NcertPageModal reads) in an
 * on-site overlay, so the student stays on LazyTopper.
 *
 * ★ NOTHING LOADS UNTIL THE CLICK. The prerendered page carries no PDF and makes no PDF
 * request; the URL is built and probed only when the button is pressed.
 *
 * ★ NEVER A BROKEN FRAME (D211 §4). Before embedding, the copy is probed with HEAD. On any
 * failure (no bucket configured, 404, network, no CORS) the overlay shows the official
 * ncert.nic.in link instead. A row whose copy is missing or not the current edition
 * (`stored: false`) never offers our copy at all: its button is the official link.
 *
 * ★ PHONES THAT CANNOT SHOW A PDF INLINE (most Android browsers report
 * `navigator.pdfViewerEnabled === false`) get the same overlay with "Open the chapter"
 * (our copy, new tab) instead of an iframe that would silently download or stay blank.
 *
 * Overlay grammar copied from NcertPageModal (dim backdrop + centred card on desktop,
 * full-height sheet on mobile; ✕ / Escape / dim-click close; body scroll lock). Styles
 * live in the page's scoped stylesheet (`ncertBooks.css`), no inline style objects.
 */
import { useEffect, useRef, useState } from "react";

import {
  ncertBookName,
  ncertCode,
  ncertOfficialUrl,
  type NcertBookChapter,
} from "../../config/ncertBooks";

/** Our stored copy of the whole chapter (no `#page=`): null when no bucket is configured. */
export function ncertStoredUrl(row: NcertBookChapter): string | null {
  const bucket = String(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "").trim();
  if (!bucket) return null;
  const objectPath = `ncert/${row.storageSubject}/ch${row.chapter}.pdf`;
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`;
}

function canShowPdfInline(): boolean {
  if (typeof navigator === "undefined") return false;
  const flag = (navigator as Navigator & { pdfViewerEnabled?: boolean }).pdfViewerEnabled;
  return flag !== false;
}

type Status = "probing" | "ready" | "unavailable";

interface ReaderProps {
  row: NcertBookChapter;
}

export default function NcertChapterReader({ row }: ReaderProps) {
  const [open, setOpen] = useState(false);
  const label = `Read the chapter`;
  const official = ncertOfficialUrl(row);

  if (!row.stored) {
    return (
      <a
        className="lt-nb__read"
        href={official}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={`nb-read-${ncertCode(row)}`}
      >
        {label}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        className="lt-nb__read"
        onClick={() => setOpen(true)}
        data-testid={`nb-read-${ncertCode(row)}`}
      >
        {label}
      </button>
      {open && <ReaderOverlay row={row} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReaderOverlay({ row, onClose }: { row: NcertBookChapter; onClose: () => void }) {
  const [status, setStatus] = useState<Status>("probing");
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const url = ncertStoredUrl(row);
  const official = ncertOfficialUrl(row);
  const inline = canShowPdfInline();
  const heading = `NCERT Class 10 ${ncertBookName(row.book)} · Chapter ${row.chapter}`;

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    if (!url) {
      setStatus("unavailable");
      return;
    }
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
  }, [url]);

  return (
    <div className="lt-nb__dim" role="dialog" aria-modal="true" aria-label={`${heading}: ${row.title}`} onClick={onClose}>
      <div className="lt-nb__card" onClick={(e) => e.stopPropagation()}>
        <div className="lt-nb__head">
          <div>
            <div className="lt-nb__htitle">{row.title}</div>
            <div className="lt-nb__hsub">{heading}</div>
          </div>
          <button ref={closeRef} type="button" className="lt-nb__x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="lt-nb__rbody">
          {status === "probing" ? (
            <p className="lt-nb__msg">Opening the chapter…</p>
          ) : status === "ready" && url && inline ? (
            <iframe className="lt-nb__frame" src={url} title={`${heading}: ${row.title}`} />
          ) : status === "ready" && url ? (
            <div className="lt-nb__msg">
              <p>This browser opens PDFs in a new tab.</p>
              <a className="lt-nb__read" href={url} target="_blank" rel="noopener noreferrer">
                Open the chapter
              </a>
            </div>
          ) : (
            <div className="lt-nb__msg">
              <p>Our copy of this chapter didn&rsquo;t load. Read it on the official NCERT site instead.</p>
              <a className="lt-nb__read" href={official} target="_blank" rel="noopener noreferrer">
                Open on ncert.nic.in
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
