// src/components/upload/PageTray.tsx
//
// SEVERAL PAGES, ONE UPLOAD — and the one place every photo upload is handled
// (UPLOAD-2, owner rulings R1–R8).
//
// `usePageTray` is the shared upload step every grading surface mounts:
//
//   photo  -> decode once -> crop step (optional: "Use whole photo" is one tap)
//          -> preparePhoto (upright, rotate, crop, 2,000 px, JPEG ladder)
//          -> the ONE guard (`checkUploadFile`) on what will actually be sent
//   photos -> each a page in the tray; 2+ pages are assembled ON THE DEVICE into ONE
//             PDF (assemblePagesPdf — jspdf loads only then)
//   PDF    -> the hard wall, exactly as before (a PDF cannot be compressed)
//
// So a phone photo never meets a size error (R2), and the host's request body is
// unchanged: it still receives ONE `{ imageBase64, imageMimeType }` (R5).
//
// ★ THE TRAY OUTLIVES A NETWORK DROP. It lives in the host's state, not in the request:
// a grade that fails leaves every page where it was, so nothing is re-photographed.
//
// ★ HONEST DEGRADE. If this device cannot decode a photo at all (no canvas, an exotic
// file), a single photo falls back to the pre-UPLOAD-2 path — the original file through
// the same guard — rather than dead-ending the student on a crop screen with no image.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PhotoCropStep, { type PhotoCropSelection } from "./PhotoCropStep";
import {
  PHOTO_UNREADABLE_MESSAGE,
  decodePhoto,
  preparePhoto,
  preparedToFile,
  renderPhotoThumb,
  type CropFraction,
  type DecodedPhoto,
  type PhotoRotation,
  type PreparedPhoto,
  type PreparePhotoOptions,
} from "../../services/preparePhoto";
import type { AssembledPdf, PdfPageInput } from "../../services/assemblePagesPdf";
import {
  MAX_UPLOAD_PAGES,
  TOO_MANY_PAGES_MESSAGE,
  type UploadCheck,
} from "../../services/uploadLimits";

/** What the host receives — the same tuple its file input always produced. */
export interface TrayPayload {
  imageBase64: string;
  imageMimeType: "image/jpeg" | "image/png" | "application/pdf";
  /** A label for the host's "file chosen" line. */
  name: string;
  /** Photos in the tray (0 when a PDF or a fallback original was sent as-is). */
  pageCount: number;
}

export interface TrayPage {
  id: string;
  file: File;
  crop?: CropFraction;
  rotation: PhotoRotation;
  prepared: PreparedPhoto;
  thumbUrl: string;
}

interface CropSession {
  photo: DecodedPhoto;
  editingId: string | null;
  initialCrop?: CropFraction;
  initialRotation: PhotoRotation;
}

export interface UsePageTrayOptions {
  /** The ONE guard, run on what will actually be sent (a compressed photo, an
   *  assembled PDF, or a picked PDF). Hosts pass `checkUploadFile(file, subject)`. */
  check: (file: File) => UploadCheck;
  /** The upload is ready (or gone: null). */
  onPayload: (payload: TrayPayload | null) => void;
  /** A refusal the student must read (null clears it). */
  onError: (message: string | null) => void;
  /** Offer "Add another page" (R6). Off where a path cannot take a PDF. */
  allowMultiPage?: boolean;
  // ── test seams (jsdom has no canvas) ──
  decode?: (file: File) => Promise<DecodedPhoto>;
  prepare?: (photo: DecodedPhoto, opts: PreparePhotoOptions) => Promise<PreparedPhoto>;
  thumb?: (photo: DecodedPhoto, opts: { crop?: CropFraction; rotation?: PhotoRotation }) => string;
  assemble?: (pages: PdfPageInput[]) => Promise<AssembledPdf>;
  renderPreview?: (photo: DecodedPhoto, rotation: PhotoRotation) => { url: string };
}

export interface PageTrayApi {
  pages: TrayPage[];
  cropSession: CropSession | null;
  /** Decoding / preparing / assembling. */
  busy: boolean;
  /** The 9th-page line, or an assembly refusal / "Preparing your pages…". */
  notice: string | null;
  allowMultiPage: boolean;
  /** Feed picked / pasted / dropped files in (one or many, in selection order).
   *  `replace`: the host's MAIN picker ("choose a different file") starts over; the
   *  tray's own "Add another page" appends. */
  addFiles: (files: FileList | File[] | null | undefined, opts?: { replace?: boolean }) => void;
  /** Before opening a picker for one more page: false (and the 9th-page line) when full. */
  canAddPage: () => boolean;
  confirmCrop: (selection: PhotoCropSelection) => void;
  cancelCrop: () => void;
  recrop: (id: string) => void;
  remove: (id: string) => void;
  move: (id: string, delta: -1 | 1) => void;
  clear: () => void;
  renderPreview?: (photo: DecodedPhoto, rotation: PhotoRotation) => { url: string };
}

const isImage = (f: File) => f.type === "image/jpeg" || f.type === "image/png";
const isPdf = (f: File) => f.type === "application/pdf";

async function readFileBase64(file: File): Promise<string> {
  // FileReader rather than file.arrayBuffer(): it is what every host used before this
  // lane, so the fallback path stays byte-for-byte the old one.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = () => reject(new Error("We couldn't read that file — please try another."));
    reader.readAsDataURL(file);
  });
}

async function defaultAssemble(pages: PdfPageInput[]): Promise<AssembledPdf> {
  // The module (and with it jspdf) is fetched only when a SECOND page exists.
  const { assemblePagesPdf } = await import("../../services/assemblePagesPdf");
  return assemblePagesPdf(pages);
}

let pageSeq = 0;
const nextPageId = () => `page-${Date.now().toString(36)}-${(pageSeq += 1)}`;

export function usePageTray(options: UsePageTrayOptions): PageTrayApi {
  const allowMultiPage = options.allowMultiPage !== false;
  const optsRef = useRef(options);
  optsRef.current = options;

  const [pages, setPages] = useState<TrayPage[]>([]);
  const pagesRef = useRef<TrayPage[]>([]);
  pagesRef.current = pages;
  const [cropSession, setCropSession] = useState<CropSession | null>(null);
  const sessionRef = useRef<CropSession | null>(null);
  sessionRef.current = cropSession;
  const [working, setBusy] = useState(false);
  const [assembling, setAssembling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [assemblyNote, setAssemblyNote] = useState<string | null>(null);
  const hadPagesRef = useRef(false);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sessionRef.current?.photo.release();
    };
  }, []);

  const decode = useCallback((f: File) => (optsRef.current.decode ?? decodePhoto)(f), []);
  const prepare = useCallback(
    (p: DecodedPhoto, o: PreparePhotoOptions) => (optsRef.current.prepare ?? preparePhoto)(p, o),
    [],
  );
  const thumb = useCallback(
    (p: DecodedPhoto, o: { crop?: CropFraction; rotation?: PhotoRotation }) => {
      try {
        return (optsRef.current.thumb ?? renderPhotoThumb)(p, o);
      } catch {
        return "";
      }
    },
    [],
  );

  /** Send a file through the guard UNCHANGED — a PDF, or the honest-degrade original. */
  const sendAsIs = useCallback(async (file: File) => {
    const check = optsRef.current.check(file);
    if (!check.ok) {
      optsRef.current.onError(check.message);
      return;
    }
    try {
      const b64 = await readFileBase64(file);
      if (!mountedRef.current) return;
      optsRef.current.onError(null);
      optsRef.current.onPayload({
        imageBase64: b64,
        imageMimeType: check.mimeType,
        name: file.name,
        pageCount: 0,
      });
    } catch (err) {
      optsRef.current.onError(err instanceof Error ? err.message : "We couldn't read that file — please try another.");
    }
  }, []);

  const openCrop = useCallback(
    async (file: File, editing: TrayPage | null) => {
      setBusy(true);
      try {
        const photo = await decode(file);
        if (!mountedRef.current) {
          photo.release();
          return;
        }
        sessionRef.current?.photo.release();
        setCropSession({
          photo,
          editingId: editing?.id ?? null,
          initialCrop: editing?.crop,
          initialRotation: editing?.rotation ?? 0,
        });
      } catch {
        // The crop step is a convenience, never a gate.
        if (editing || pagesRef.current.length > 0) {
          optsRef.current.onError(PHOTO_UNREADABLE_MESSAGE);
        } else {
          await sendAsIs(file);
        }
      } finally {
        if (mountedRef.current) setBusy(false);
      }
    },
    [decode, sendAsIs],
  );

  /** Several photos at once (a desktop multi-select): each becomes a whole-photo page,
   *  in selection order. Each stays re-croppable from the tray. */
  const addWholePages = useCallback(
    async (files: File[]) => {
      setBusy(true);
      const added: TrayPage[] = [];
      let failed = 0;
      try {
        for (const file of files) {
          let photo: DecodedPhoto | null = null;
          try {
            photo = await decode(file);
            const prepared = await prepare(photo, {});
            added.push({ id: nextPageId(), file, rotation: 0, prepared, thumbUrl: thumb(photo, {}) });
          } catch {
            failed += 1;
          } finally {
            photo?.release();
          }
        }
      } finally {
        if (mountedRef.current) {
          setBusy(false);
          if (added.length) setPages((prev) => [...prev, ...added].slice(0, MAX_UPLOAD_PAGES));
          if (failed) optsRef.current.onError(PHOTO_UNREADABLE_MESSAGE);
        }
      }
    },
    [decode, prepare, thumb],
  );

  const addFiles = useCallback(
    (list: FileList | File[] | null | undefined, addOpts?: { replace?: boolean }) => {
      const files = list ? Array.from(list) : [];
      if (files.length === 0) return;
      optsRef.current.onError(null);
      setNotice(null);
      if (addOpts?.replace && pagesRef.current.length > 0) {
        // A fresh choice from the host's own picker replaces the pages, exactly as
        // "choose a different file" always replaced the file.
        pagesRef.current = [];
        setPages([]);
      }

      const pdfs = files.filter(isPdf);
      const images = files.filter(isImage);
      if (pdfs.length === 0 && images.length === 0) {
        // A wrong type: the guard owns the words.
        const check = optsRef.current.check(files[0]);
        optsRef.current.onError(check.ok ? null : check.message);
        return;
      }
      if (pdfs.length > 0) {
        if (pdfs.length > 1 || images.length > 0 || pagesRef.current.length > 0) {
          optsRef.current.onError("Send a PDF on its own — or use photos for every page, not both.");
          return;
        }
        void sendAsIs(pdfs[0]);
        return;
      }

      if (!allowMultiPage) {
        // One photo per upload here: a new pick replaces the old one.
        setPages([]);
        void openCrop(images[0], null);
        return;
      }
      const room = MAX_UPLOAD_PAGES - pagesRef.current.length;
      if (room <= 0) {
        setNotice(TOO_MANY_PAGES_MESSAGE);
        return;
      }
      const take = images.slice(0, room);
      if (images.length > room) setNotice(TOO_MANY_PAGES_MESSAGE);
      if (take.length === 1) void openCrop(take[0], null);
      else void addWholePages(take);
    },
    [allowMultiPage, openCrop, addWholePages, sendAsIs],
  );

  const confirmCrop = useCallback(
    (selection: PhotoCropSelection) => {
      const session = sessionRef.current;
      if (!session) return;
      setBusy(true);
      void (async () => {
        try {
          const prepared = await prepare(session.photo, selection);
          const thumbUrl = thumb(session.photo, selection);
          if (!mountedRef.current) return;
          const page: TrayPage = {
            id: session.editingId ?? nextPageId(),
            file: session.photo.file,
            crop: selection.crop,
            rotation: selection.rotation,
            prepared,
            thumbUrl,
          };
          setPages((prev) =>
            session.editingId
              ? prev.map((p) => (p.id === session.editingId ? page : p))
              : [...prev, page].slice(0, MAX_UPLOAD_PAGES),
          );
          session.photo.release();
          setCropSession(null);
        } catch (err) {
          if (!mountedRef.current) return;
          optsRef.current.onError(err instanceof Error ? err.message : PHOTO_UNREADABLE_MESSAGE);
          session.photo.release();
          setCropSession(null);
        } finally {
          if (mountedRef.current) setBusy(false);
        }
      })();
    },
    [prepare, thumb],
  );

  const cancelCrop = useCallback(() => {
    sessionRef.current?.photo.release();
    setCropSession(null);
  }, []);

  const recrop = useCallback(
    (id: string) => {
      const page = pagesRef.current.find((p) => p.id === id);
      if (page) void openCrop(page.file, page);
    },
    [openCrop],
  );

  const canAddPage = useCallback(() => {
    if (pagesRef.current.length >= MAX_UPLOAD_PAGES) {
      setNotice(TOO_MANY_PAGES_MESSAGE);
      return false;
    }
    return true;
  }, []);

  const remove = useCallback((id: string) => {
    setNotice(null);
    setPages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const move = useCallback((id: string, delta: -1 | 1) => {
    setPages((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    sessionRef.current?.photo.release();
    setCropSession(null);
    setNotice(null);
    hadPagesRef.current = false;
    generationRef.current += 1;
    setPages([]);
  }, []);

  // ── The pages -> ONE payload ──
  useEffect(() => {
    const generation = (generationRef.current += 1);
    const o = optsRef.current;
    // Any assembly still in flight is for an older set of pages: it is dropped.
    setAssembling(false);
    setAssemblyNote(null);
    if (pages.length === 0) {
      if (hadPagesRef.current) {
        hadPagesRef.current = false;
        o.onPayload(null);
      }
      return;
    }
    hadPagesRef.current = true;

    if (pages.length === 1) {
      // One page goes as today's single compressed photo (R6) — no PDF, no jspdf.
      const p = pages[0];
      const check = o.check(preparedToFile(p.prepared, p.file.name));
      if (!check.ok) {
        o.onError(check.message);
        o.onPayload(null);
        return;
      }
      o.onPayload({
        imageBase64: p.prepared.base64,
        imageMimeType: check.mimeType,
        name: p.file.name,
        pageCount: 1,
      });
      return;
    }

    // 2+ pages: nothing is gradeable until the PDF exists — never a stale fewer-page one.
    o.onPayload(null);
    setAssembling(true);
    setAssemblyNote("Preparing your pages…");
    void (async () => {
      try {
        const pdf = await (o.assemble ?? defaultAssemble)(
          pages.map((p) => ({
            base64: p.prepared.base64,
            mimeType: p.prepared.mimeType,
            width: p.prepared.width,
            height: p.prepared.height,
          })),
        );
        if (!mountedRef.current || generation !== generationRef.current) return;
        const name = `${pages.length} pages (one PDF)`;
        const check = optsRef.current.check(preparedToFile({ base64: pdf.base64, mimeType: "application/pdf" }, name));
        if (!check.ok) {
          setAssemblyNote(check.message);
          return;
        }
        setAssemblyNote(null);
        optsRef.current.onPayload({
          imageBase64: pdf.base64,
          imageMimeType: "application/pdf",
          name,
          pageCount: pages.length,
        });
      } catch (err) {
        if (!mountedRef.current || generation !== generationRef.current) return;
        setAssemblyNote(err instanceof Error ? err.message : "We couldn't put your pages together. Try again.");
      } finally {
        if (mountedRef.current && generation === generationRef.current) setAssembling(false);
      }
    })();
  }, [pages]);

  return {
    pages,
    cropSession,
    busy: working || assembling,
    notice: notice ?? assemblyNote,
    allowMultiPage,
    addFiles,
    canAddPage,
    confirmCrop,
    cancelCrop,
    recrop,
    remove,
    move,
    clear,
    renderPreview: options.renderPreview,
  };
}

// ── The tray UI ─────────────────────────────────────────────────────────────────

export interface PageTrayProps {
  tray: PageTrayApi;
  disabled?: boolean;
  /** Render the crop step inline (the QR page, which is already one full-screen card)
   *  instead of in a modal over the host page. */
  inlineCrop?: boolean;
}

/**
 * The crop step (in a modal over the host, or inline) plus the page strip. Renders
 * nothing at all until the student has picked a photo, so a host with no tray in use
 * looks exactly as it did.
 */
export default function PageTray({ tray, disabled = false, inlineCrop = false }: PageTrayProps) {
  const addInputRef = useRef<HTMLInputElement>(null);
  const { pages, cropSession, busy, notice, allowMultiPage } = tray;

  const cropStep = cropSession ? (
    <PhotoCropStep
      // A fresh step per photo — never carry one photo's crop onto the next.
      key={`${cropSession.editingId ?? "new"}-${cropSession.photo.file.name}-${pages.length}`}
      photo={cropSession.photo}
      initialCrop={cropSession.initialCrop}
      initialRotation={cropSession.initialRotation}
      title={cropSession.editingId ? "Adjust this page" : "Choose what to send"}
      pageLabel={
        allowMultiPage
          ? `Page ${
              cropSession.editingId
                ? pages.findIndex((p) => p.id === cropSession.editingId) + 1
                : pages.length + 1
            }`
          : undefined
      }
      busy={busy}
      onConfirm={tray.confirmCrop}
      onCancel={tray.cancelCrop}
      renderPreview={tray.renderPreview}
    />
  ) : null;

  const onAdd = () => {
    if (tray.canAddPage()) addInputRef.current?.click();
  };

  return (
    <>
      <style>{PT_CSS}</style>
      {cropStep &&
        (inlineCrop || typeof document === "undefined"
          ? cropStep
          : createPortal(
              <div className="lt-pt__modal" role="dialog" aria-modal="true" aria-label="Crop your photo">
                <div className="lt-pt__sheet">{cropStep}</div>
              </div>,
              document.body,
            ))}

      {busy && !cropSession && pages.length === 0 && (
        <p className="lt-pt__status" role="status">Preparing your photo…</p>
      )}

      {pages.length > 0 && (
        <div className="lt-pt" data-testid="page-tray">
          <div className="lt-pt__head">
            <span className="lt-pt__title">
              {pages.length === 1 ? "1 page" : `${pages.length} pages`}
              <span className="lt-pt__sub">
                {pages.length === 1 ? " · sent as a photo" : " · sent together as one PDF"}
              </span>
            </span>
          </div>
          <ol className="lt-pt__strip" aria-label="Your pages">
            {pages.map((p, i) => (
              <li key={p.id} className="lt-pt__item" data-testid="page-tray-item">
                <button
                  type="button"
                  className="lt-pt__thumb"
                  onClick={() => tray.recrop(p.id)}
                  disabled={disabled || busy}
                  aria-label={`Page ${i + 1} — tap to crop or rotate`}
                >
                  {p.thumbUrl ? <img src={p.thumbUrl} alt="" /> : <span className="lt-pt__ph">Page {i + 1}</span>}
                  <span className="lt-pt__num">{i + 1}</span>
                </button>
                <button
                  type="button"
                  className="lt-pt__del"
                  onClick={() => tray.remove(p.id)}
                  disabled={disabled || busy}
                  aria-label={`Remove page ${i + 1}`}
                >
                  ✕
                </button>
                {pages.length > 1 && (
                  <div className="lt-pt__order">
                    <button
                      type="button"
                      onClick={() => tray.move(p.id, -1)}
                      disabled={disabled || busy || i === 0}
                      aria-label={`Move page ${i + 1} earlier`}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => tray.move(p.id, 1)}
                      disabled={disabled || busy || i === pages.length - 1}
                      aria-label={`Move page ${i + 1} later`}
                    >
                      ›
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
          {allowMultiPage && (
            <button
              type="button"
              className="lt-pt__add"
              onClick={onAdd}
              disabled={disabled || busy}
              data-testid="page-tray-add"
            >
              + Add another page
            </button>
          )}
          {notice && (
            <p className="lt-pt__status" role="status">
              {notice}
            </p>
          )}
          {/* Its own input, without `capture`: on a phone each tap offers the camera OR
           *  the gallery; on a desktop several images can be picked at once. */}
          <input
            ref={addInputRef}
            className="lt-pt__file"
            type="file"
            accept="image/jpeg,image/png"
            multiple
            onChange={(e) => {
              const picked = e.target.files ? Array.from(e.target.files) : [];
              e.target.value = "";
              tray.addFiles(picked);
            }}
          />
        </div>
      )}
    </>
  );
}

const PT_CSS = `
.lt-pt {
  --pt-fg: #15233a; --pt-muted: #64748b; --pt-line: #e2e8f0;
  --pt-green: hsl(152, 55%, 45%); --pt-green-d: hsl(152, 55%, 38%);
  font-family: "Inter", system-ui, sans-serif; color: var(--pt-fg);
  margin-top: 10px; min-width: 0; text-align: left;
}
.lt-pt__head { display: flex; align-items: baseline; justify-content: space-between; margin: 0 0 6px; }
.lt-pt__title { font-size: 13px; font-weight: 700; }
.lt-pt__sub { font-weight: 500; color: var(--pt-muted); }
/* Scrolls sideways on a phone; never widens the page. */
.lt-pt__strip {
  list-style: none; margin: 0; padding: 4px 2px 8px;
  display: flex; gap: 10px; overflow-x: auto; overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch; scroll-snap-type: x proximity;
}
.lt-pt__item { position: relative; flex: 0 0 auto; width: 92px; scroll-snap-align: start; }
.lt-pt__thumb {
  display: block; width: 92px; height: 120px; padding: 0; overflow: hidden;
  border: 1px solid var(--pt-line); border-radius: 10px; background: #f1f5f9; cursor: pointer;
  position: relative;
}
.lt-pt__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lt-pt__ph { font-size: 12px; color: var(--pt-muted); }
.lt-pt__num {
  position: absolute; left: 6px; bottom: 6px; min-width: 20px; height: 20px; padding: 0 5px;
  border-radius: 10px; background: rgba(15, 23, 42, 0.78); color: #fff;
  font-size: 11px; font-weight: 700; line-height: 20px; text-align: center;
}
/* Inside the thumbnail's corner: the strip scrolls, so anything hanging outside it is
   clipped (a half-hidden ✕ was the first screenshot's finding). */
.lt-pt__del {
  position: absolute; top: 4px; right: 4px; width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid #fff; background: #0f172a; color: #fff; font-size: 12px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; padding: 0;
}
.lt-pt__del::before { content: ""; position: absolute; inset: -6px; }
.lt-pt__order { display: flex; gap: 4px; margin-top: 6px; }
.lt-pt__order button {
  flex: 1; height: 36px; border: 1px solid var(--pt-line); border-radius: 8px; background: #fff;
  color: var(--pt-fg); font-size: 18px; line-height: 1; cursor: pointer; padding: 0;
}
.lt-pt__order button:disabled, .lt-pt__thumb:disabled, .lt-pt__del:disabled { opacity: 0.4; cursor: default; }
.lt-pt__add {
  width: 100%; min-height: 44px; margin-top: 4px; border-radius: 10px;
  border: 1px dashed var(--pt-green); background: #f0fdf4; color: var(--pt-green-d);
  font: 700 14px "Inter", system-ui, sans-serif; cursor: pointer;
}
.lt-pt__add:disabled { opacity: 0.5; cursor: default; }
.lt-pt__status { font-size: 12.5px; color: var(--pt-muted); margin: 8px 0 0; line-height: 1.45; }
.lt-pt__file { display: none; }

/* The crop modal: a full-height sheet on a phone, a centred dialog on a desktop. */
.lt-pt__modal {
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(15, 23, 42, 0.6);
  display: flex; align-items: center; justify-content: center;
  padding: 12px; box-sizing: border-box; overflow-y: auto;
}
.lt-pt__sheet {
  width: 100%; max-width: 560px; max-height: 100%; overflow-y: auto;
  background: #fff; border-radius: 16px; padding: 18px 16px 12px; box-sizing: border-box;
}
@media (max-width: 480px) {
  .lt-pt__modal { padding: 0; align-items: stretch; }
  .lt-pt__sheet { max-width: none; border-radius: 0; min-height: 100%; padding: 14px 12px 10px; }
}
`;
