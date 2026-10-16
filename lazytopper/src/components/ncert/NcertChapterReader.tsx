/**
 * NcertChapterReader — NCERT-BOOKS-1 / 1b (lane G, D211 §1/§4): "Read the chapter" on the
 * `/ncert-class-10` page. Opens OUR stored copy of the chapter (Firebase Storage,
 * `ncert/{subject}/ch{N}.pdf`, the same objects the notes' NcertPageModal reads) in an
 * on-site overlay, so the student stays on LazyTopper.
 *
 * ★ NOTHING LOADS UNTIL THE CLICK. The prerendered page carries no PDF, no pdf.js and makes no
 * PDF request; the file and the pdf.js chunk are fetched only when the button is pressed.
 *
 * ★ THE PAGES ARE DRAWN HERE, NOT BY THE BROWSER (NCERT-BOOKS-1b, owner 14 Oct). Most Android
 * browsers have no inline PDF viewer (`navigator.pdfViewerEnabled === false`), so the first
 * version's iframe had to fall back to a new tab on phones — the owner reproduced exactly that.
 * Now pdf.js (already a dependency: `services/shrinkPdf.ts`) renders each page onto a canvas
 * inside the overlay, at every width, so a phone reads the chapter in the same place a laptop
 * does. Pages render as they scroll near the viewport and are released when far away, so a
 * 30-page chapter does not hold 30 full-size canvases on a phone.
 *
 * ★ NEVER A BROKEN READER (D211 §4). Any failure (no bucket configured, 404, network, a PDF
 * pdf.js cannot open) shows the official ncert.nic.in link instead. A row whose copy is
 * missing or not the current edition (`stored: false`) never offers our copy at all: its
 * button is the official link.
 *
 * Overlay grammar copied from NcertPageModal (dim backdrop + centred card on desktop,
 * full-height sheet on mobile; ✕ / Escape / dim-click close; body scroll lock). Styles live in
 * the page's scoped stylesheet (`ncertBooks.css`); no inline style objects — canvas sizes are
 * canvas ATTRIBUTES and the CSS keeps the aspect ratio.
 */
import { useCallback, useEffect, useRef, useState } from "react";

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

/** Zoom steps the − / + buttons move between (1 = the page fits the reader's width). */
export const READER_ZOOMS = [1, 1.5, 2] as const;
type Zoom = (typeof READER_ZOOMS)[number];

/** Device pixels per CSS pixel for the canvas, capped so a 3× phone does not triple the memory. */
const MAX_DPR = 2;

// Minimal shapes of the pdf.js objects this file touches (the module is imported dynamically).
interface PdfViewport {
  width: number;
  height: number;
}
interface PdfRenderTask {
  promise: Promise<void>;
  cancel: () => void;
}
interface PdfPage {
  getViewport: (o: { scale: number }) => PdfViewport;
  render: (o: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
    canvas: HTMLCanvasElement;
  }) => PdfRenderTask;
}
interface PdfDoc {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
}

/**
 * The opened chapter plus how to free it. pdf.js 6 frees a document through its LOADING TASK
 * (`loadingTask.destroy()`); the document proxy has no `destroy` — calling it threw and took the
 * page down when the reader closed (caught in the NCERT-BOOKS-1b browser check).
 */
interface OpenedPdf {
  doc: PdfDoc;
  ratio: number;
  destroy: () => void;
}

async function openPdf(url: string): Promise<OpenedPdf> {
  // One plain GET (no Range header, so no CORS preflight); a whole chapter is 1–4 MB.
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { default: workerSrc } = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const task = pdfjs.getDocument({ data: bytes });
  const destroy = () => {
    try {
      void Promise.resolve(task.destroy()).catch(() => {});
    } catch {
      // Freeing is best-effort; never let it break closing the reader.
    }
  };
  try {
    const doc = (await task.promise) as unknown as PdfDoc;
    const first = await doc.getPage(1);
    const vp = first.getViewport({ scale: 1 });
    return { doc, ratio: vp.height / vp.width, destroy };
  } catch (e) {
    destroy();
    throw e;
  }
}

type Status = "loading" | "ready" | "unavailable";

interface ReaderProps {
  row: NcertBookChapter;
  /** NCERT-BOOKS-1b — open the reader now (the page's `?read=<code>`, from the rail picker). */
  openRequested?: boolean;
  /** Told when the reader closes (the page drops `?read=`). */
  onClosed?: () => void;
}

export default function NcertChapterReader({ row, openRequested = false, onClosed }: ReaderProps) {
  const [open, setOpen] = useState(false);
  // A request can arrive on first render or later (the picker used while already on this page).
  useEffect(() => {
    if (openRequested && row.stored) setOpen(true);
  }, [openRequested, row.stored]);
  const close = useCallback(() => {
    setOpen(false);
    onClosed?.();
  }, [onClosed]);
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
      {open && <ReaderOverlay row={row} onClose={close} />}
    </>
  );
}

function ReaderOverlay({ row, onClose }: { row: NcertBookChapter; onClose: () => void }) {
  const [status, setStatus] = useState<Status>("loading");
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [ratio, setRatio] = useState(1.414);
  const [zoom, setZoom] = useState<Zoom>(1);
  const [width, setWidth] = useState(0);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const url = ncertStoredUrl(row);
  const official = ncertOfficialUrl(row);
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
    let opened: OpenedPdf | null = null;
    openPdf(url)
      .then((o) => {
        opened = o;
        const { doc: d, ratio: r } = o;
        if (cancelled) {
          o.destroy();
          return;
        }
        setDoc(d);
        setRatio(r);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });
    return () => {
      cancelled = true;
      opened?.destroy();
    };
  }, [url]);

  // The reader's content width, measured (and re-measured on resize / rotation).
  useEffect(() => {
    if (!root) return;
    const measure = () => setWidth(root.clientWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [root]);

  const zi = READER_ZOOMS.indexOf(zoom);

  return (
    <div className="lt-nb__dim" role="dialog" aria-modal="true" aria-label={`${heading}: ${row.title}`} onClick={onClose}>
      <div className="lt-nb__card" onClick={(e) => e.stopPropagation()}>
        <div className="lt-nb__head">
          <div className="lt-nb__htext">
            <div className="lt-nb__htitle">{row.title}</div>
            <div className="lt-nb__hsub">
              {heading}
              {doc ? ` · ${doc.numPages} pages` : ""}
            </div>
          </div>
          {status === "ready" && (
            <div className="lt-nb__zoom" role="group" aria-label="Zoom">
              <button
                type="button"
                className="lt-nb__x"
                onClick={() => setZoom(READER_ZOOMS[Math.max(0, zi - 1)])}
                disabled={zi === 0}
                aria-label="Zoom out"
              >
                −
              </button>
              <button
                type="button"
                className="lt-nb__x"
                onClick={() => setZoom(READER_ZOOMS[Math.min(READER_ZOOMS.length - 1, zi + 1)])}
                disabled={zi === READER_ZOOMS.length - 1}
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
          )}
          <button ref={closeRef} type="button" className="lt-nb__x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="lt-nb__rbody" ref={setRoot}>
          {status === "loading" ? (
            <p className="lt-nb__msg">Opening the chapter…</p>
          ) : status === "ready" && doc ? (
            <div className={`lt-nb__pages lt-nb__pages--z${String(zoom).replace(".", "")}`}>
              {width > 0 &&
                Array.from({ length: doc.numPages }, (_, i) => (
                  <PageCanvas
                    key={`${i}-${zoom}-${width}`}
                    doc={doc}
                    n={i + 1}
                    cssWidth={Math.max(1, (width - 16) * zoom)}
                    ratio={ratio}
                    root={root}
                  />
                ))}
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

/**
 * One page. Before it is drawn the canvas holds the page's aspect ratio at a tiny size (CSS
 * scales it to the full width, `height: auto`), so the scroll height is right from the start
 * and nothing jumps. It is drawn when it comes within ~1.5 screens of view and shrunk back to
 * the tiny size when it leaves that band.
 */
function PageCanvas({
  doc,
  n,
  cssWidth,
  ratio,
  root,
}: {
  doc: PdfDoc;
  n: number;
  cssWidth: number;
  ratio: number;
  root: HTMLElement | null;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let task: PdfRenderTask | null = null;
    let drawn = false;
    let alive = true;

    const shrink = (r: number) => {
      canvas.width = 40;
      canvas.height = Math.max(1, Math.round(40 * r));
    };
    shrink(ratio);

    const draw = async () => {
      if (drawn) return;
      drawn = true;
      try {
        const page = await doc.getPage(n);
        if (!alive || !drawn) return;
        const base = page.getViewport({ scale: 1 });
        const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
        const viewport = page.getViewport({ scale: (cssWidth * dpr) / base.width });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        task = page.render({ canvasContext: ctx, viewport, canvas });
        await task.promise;
      } catch {
        // A cancelled or failed page stays a blank sheet of the right shape; the others still draw.
      }
    };
    const release = () => {
      if (!drawn) return;
      drawn = false;
      task?.cancel();
      task = null;
      shrink(canvas.height / Math.max(1, canvas.width));
    };

    if (typeof IntersectionObserver === "undefined") {
      void draw();
      return () => {
        alive = false;
        task?.cancel();
      };
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) void draw();
          else release();
        }
      },
      { root, rootMargin: "150% 0px" },
    );
    io.observe(canvas);
    return () => {
      alive = false;
      io.disconnect();
      task?.cancel();
    };
  }, [doc, n, cssWidth, ratio, root]);

  return <canvas ref={ref} className="lt-nb__page" aria-label={`Page ${n}`} />;
}
