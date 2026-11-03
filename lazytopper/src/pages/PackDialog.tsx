import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { PACK_CHAPTER_SLUGS, packPriceLabel, subjectLabel, subjectOfChapter, type PackSku, type PackSubject } from "../services/packs";
import { BUNDLE_CHAPTERS, BUNDLE_MOCKS, packChapterLabel } from "../lib/packs/packLabels";
import { packManifest, packSummaryRows } from "../lib/packs/packManifest";
import PackSampleLink from "../components/packs/PackSampleLink";
import "./packsDialog.css";

/**
 * PackDialog - the pop-up a pack tile opens (PACKS-UX-1, approved mock-up v3). LAZY: PacksPage imports it with `import()` on the
 * first tile tap, so neither it nor its images are part of the first paint.
 *
 * A bottom sheet on a phone (< 640px) and a centred dialog on desktop. Slides, in the owner's order: 1 What you get, 2 the PDF
 * cover, 3 a question page, 4 an answer-key page. Under the slides: the chapter picker (Chapter) or the Maths/Science toggle
 * (Mock, Subject), then the ONE buy button, which the page passes in so it stays wired to the existing buy flow.
 *
 * a11y: role="dialog" + aria-modal, focus moves in and is trapped, Esc and the close button close it, the page behind does not
 * scroll, focus returns to the tile, and on a phone the Back button closes it (one history entry, only when it is pushed).
 */

export interface PackDialogProps {
  sku: PackSku;
  chapter: string;
  subject: PackSubject;
  onChapter: (slug: string) => void;
  onSubject: (s: PackSubject) => void;
  /** Exact question count for what the pop-up shows (chapter / subject / bundle), or null while unknown. */
  questions: number | null;
  /** The buy button (and its status notes), owned by the page. */
  buy: ReactNode;
  onClose: () => void;
  /** Slide to open on (0..3), applied once on mount. Default 0. */
  initialSlide?: number;
  /** PAY-PHONE-1 (C) - the buy area already shows the free sample next to "Pay" (after a closed checkout): don't repeat it. */
  sampleInBuy?: boolean;
  /** PACKS-TILE-BUY-1 - opened from "Choose chapter & buy": focus the chapter picker (Buy sits right under it). */
  focusPicker?: boolean;
  /** PRICING-B-1 - list only this subject's chapters in the picker (null / absent: all 26, as before). Presentation only. */
  pickerSubject?: PackSubject | null;
}

const TITLES: Record<PackSku, { name: string; line: string }> = {
  pack_chapter: { name: "Chapter Pack", line: "Important questions for one chapter, with CBSE step-marking key" },
  pack_mock: { name: "Mock Pack", line: "8 board-pattern mock papers for 2027, with step-marking keys" },
  pack_subject: { name: "Subject Pack", line: "Every chapter of Maths or Science — chapter-wise question bank 2026-27" },
  pack_bundle: { name: "Maths + Science Bundle", line: `Maths + Science: all ${BUNDLE_CHAPTERS} chapters + ${BUNDLE_MOCKS} mocks — the whole year at one price` },
  pack_cbq: { name: "CBQ Pack", line: "About half your 2027 paper is competency-based. Curated CBQs, chapter-wise and topic-wise — MCQ, assertion-reason, short, case study and long answer, Sections A to E." },
};

const IMG_BASE = "/packs";
const SLIDES: ReadonlyArray<{ file: string; alt: string; num: string; bold: string; rest: string }> = [
  { file: "pack-cover", alt: "The PDF cover page with the buyer's name", num: "2", bold: "Your cover", rest: ", your name on every page" },
  { file: "pack-questions", alt: "A question page in board order", num: "3", bold: "Questions", rest: ", board order, A to E" },
  { file: "pack-answer-key", alt: "An answer-key page with worked solutions", num: "4", bold: "Answer key", rest: " with worked solutions" },
];
const SLIDE_COUNT = SLIDES.length + 1;

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

export default function PackDialog(props: PackDialogProps) {
  const { sku, chapter, subject, onChapter, onSubject, questions, buy, onClose, initialSlide, sampleInBuy = false, focusPicker = false, pickerSubject = null } = props;
  const pickerSlugs = pickerSubject ? PACK_CHAPTER_SLUGS.filter((slug) => subjectOfChapter(slug) === pickerSubject) : PACK_CHAPTER_SLUGS;
  const pickerRef = useRef<HTMLSelectElement | null>(null);
  useEffect(() => {
    if (!focusPicker || sku !== "pack_chapter") return undefined;
    // After the dialog's own mount focus (a later effect) has run.
    const t = window.setTimeout(() => pickerRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [focusPicker, sku]);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const startSlide = Math.max(0, Math.min(SLIDE_COUNT - 1, Number.isInteger(initialSlide) ? (initialSlide as number) : 0));
  const [slide, setSlide] = useState(startSlide);
  const pushed = useRef(false);
  const closedRef = useRef(false);

  const finish = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  }, [onClose]);

  // Close: if we pushed a history entry (phone), go back one step and let popstate finish; otherwise finish now.
  const requestClose = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      try {
        window.history.back();
      } catch {
        finish();
      }
      // popstate normally calls finish; this is the safety net if it never fires.
      window.setTimeout(finish, 400);
    } else {
      finish();
    }
  }, [finish]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    document.documentElement.classList.add("lt-pkd-lock");
    let phone = false;
    try {
      phone = window.matchMedia("(max-width: 639px)").matches;
    } catch {
      phone = false;
    }
    if (phone) {
      try {
        if (!window.history.state?.ltPackDialog) window.history.pushState({ ...(window.history.state ?? {}), ltPackDialog: true }, "");
        pushed.current = true;
      } catch {
        pushed.current = false;
      }
    }
    const onPop = () => {
      pushed.current = false;
      finish();
    };
    window.addEventListener("popstate", onPop);
    dialogRef.current?.focus();
    return () => {
      const stillPushed = pushed.current;
      window.removeEventListener("popstate", onPop);
      // The page closed the dialog itself (e.g. after a payment) while its history entry is live: drop the entry, unless the
      // dialog was only re-mounted (React StrictMode in development).
      if (stillPushed) {
        window.setTimeout(() => {
          if (!document.querySelector('[data-testid="pack-dialog"]') && window.history.state?.ltPackDialog) {
            try {
              window.history.back();
            } catch {
              /* nothing to undo */
            }
          }
        }, 0);
      }
      document.documentElement.classList.remove("lt-pkd-lock");
      if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus();
    };
  }, [finish]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      requestClose();
      return;
    }
    if (e.key !== "Tab") return;
    const root = dialogRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null || n === document.activeElement);
    if (nodes.length === 0) {
      e.preventDefault();
      root.focus();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === root)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // Once after mount: put the track on the requested slide (scroll-snap on a phone, the same on desktop).
  useEffect(() => {
    if (startSlide === 0) return;
    const track = trackRef.current;
    const target = Array.from(track?.querySelectorAll<HTMLElement>(".lt-pkd__slide") ?? [])[startSlide];
    if (!track || !target) return;
    track.scrollTo?.({ left: target.offsetLeft - track.offsetLeft, behavior: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function slideEls(): HTMLElement[] {
    return Array.from(trackRef.current?.querySelectorAll<HTMLElement>(".lt-pkd__slide") ?? []);
  }
  function goTo(i: number) {
    const track = trackRef.current;
    const els = slideEls();
    const target = els[Math.max(0, Math.min(els.length - 1, i))];
    if (!track || !target) return;
    track.scrollTo?.({ left: target.offsetLeft - track.offsetLeft, behavior: "smooth" });
    setSlide(Math.max(0, Math.min(els.length - 1, i)));
  }
  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    const els = slideEls();
    const x = track.scrollLeft + track.offsetLeft;
    let best = 0;
    let bestD = Infinity;
    els.forEach((el, i) => {
      const d = Math.abs(el.offsetLeft - x);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setSlide(best);
  }
  function onTrackKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(slide + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(slide - 1);
    }
  }

  const t = sku === "pack_cbq" ? { ...TITLES[sku], name: `${subjectLabel(subject)} CBQ Pack` } : TITLES[sku];
  const rows = packSummaryRows(sku, sku === "pack_chapter" ? chapter : subject, questions);
  const manifest = packManifest(sku, sku === "pack_chapter" ? chapter : subject);
  const chapterGroups = manifest.groups.filter((g) => g.chapter);

  return (
    <div className="lt-pkd" onMouseDown={(e) => e.target === e.currentTarget && requestClose()}>
      <div
        className="lt-pkd__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={dialogRef}
        onKeyDown={onKeyDown}
        data-testid="pack-dialog"
      >
        <span className="lt-pkd__grab" aria-hidden="true" />
        <div className="lt-pkd__head">
          <div>
            <h2 id={titleId} className="lt-pkd__title">
              {t.name}
              <span className="lt-pkd__price"> · {packPriceLabel(sku)}</span>
            </h2>
            <p className="lt-pkd__line">{t.line}</p>
          </div>
          <button type="button" className="lt-pkd__x" aria-label="Close" onClick={requestClose} data-testid="pack-dialog-close">
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="lt-pkd__stage">
          <button type="button" className="lt-pkd__nav" aria-label="Previous" onClick={() => goTo(slide - 1)} disabled={slide === 0}>
            <span aria-hidden="true">‹</span>
          </button>
          <div
            className="lt-pkd__track"
            ref={trackRef}
            onScroll={onScroll}
            onKeyDown={onTrackKey}
            tabIndex={0}
            role="group"
            aria-roledescription="carousel"
            aria-label="Inside the pack. Swipe or use the arrow keys."
            data-testid="pack-slides"
          >
            <section className="lt-pkd__slide lt-pkd__slide--list" aria-label="1 of 4: What you get">
              <h3 className="lt-pkd__h3"><span className="lt-pkd__num">1 · </span>What you get</h3>
              <ul className="lt-pkd__rows">
                {rows.map((r) => (
                  <li key={r.label}>
                    <span>{r.label}</span>
                    <b>{r.value}</b>
                  </li>
                ))}
              </ul>
              {chapterGroups.length > 1 && (
                <details className="lt-pkd__chapters">
                  <summary>Chapters included ({chapterGroups.length})</summary>
                  <ul>
                    {chapterGroups.map((g) => (
                      <li key={g.chapter}>{g.heading}</li>
                    ))}
                  </ul>
                  <p>Each chapter: question sheets A to E, 2 chapter tests and a worksheet, all with keys.</p>
                </details>
              )}
            </section>
            {SLIDES.map((s, i) => (
              <figure key={s.file} className="lt-pkd__slide lt-pkd__fig" aria-label={`${i + 2} of 4`}>
                <img
                  src={`${IMG_BASE}/${s.file}-480.webp`}
                  srcSet={`${IMG_BASE}/${s.file}-480.webp 480w, ${IMG_BASE}/${s.file}-827.webp 827w`}
                  sizes="270px"
                  width={827}
                  height={1170}
                  alt={s.alt}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
                <figcaption>
                  <b><span className="lt-pkd__num">{s.num} · </span>{s.bold}</b>
                  {s.rest}
                </figcaption>
              </figure>
            ))}
          </div>
          <button type="button" className="lt-pkd__nav" aria-label="Next" onClick={() => goTo(slide + 1)} disabled={slide === SLIDE_COUNT - 1}>
            <span aria-hidden="true">›</span>
          </button>
        </div>
        <div className="lt-pkd__dots" aria-hidden="true">
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <span key={i} className={i === slide ? "is-on" : undefined} />
          ))}
        </div>
        <p className="lt-pkd__sr" role="status">{`Slide ${slide + 1} of ${SLIDE_COUNT}`}</p>

        <div className="lt-pkd__foot">
          <div className="lt-pkd__pick">
            {sku === "pack_chapter" && (
              <label className="lt-pkd__label">
                Pick your chapter
                <select ref={pickerRef} className="lt-pkd__select" value={chapter} onChange={(e) => onChapter(e.target.value)} data-testid="pack-chapter-select">
                  <option value="">Choose a chapter…</option>
                  {pickerSlugs.map((slug) => (
                    <option key={slug} value={slug}>{`${packChapterLabel(slug)} · ${subjectLabel(subjectOfChapter(slug) ?? "maths")}`}</option>
                  ))}
                </select>
              </label>
            )}
            {(sku === "pack_mock" || sku === "pack_subject") && (
              <div className="lt-pkd__seg" role="radiogroup" aria-label="Subject">
                {(["maths", "science"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={subject === s}
                    className={subject === s ? "is-on" : undefined}
                    onClick={() => onSubject(s)}
                  >
                    {subjectLabel(s)}
                  </button>
                ))}
              </div>
            )}
            {sku === "pack_bundle" && <p className="lt-pkd__plain">Both subjects, everything included.</p>}
            {sku === "pack_cbq" && <p className="lt-pkd__plain" data-testid="pack-cbq-tutor-line">Includes 3 tutor questions</p>}
          </div>
          <div className="lt-pkd__buy">
            {buy}
            {/* PACK-SAMPLE-1: secondary to Buy; follows the chosen chapter / subject (the bundle has one sample). */}
            {!sampleInBuy && (
              <div className="lt-pkd__sample">
                <PackSampleLink sku={sku} target={sku === "pack_chapter" ? chapter : subject} surface="packs_dialog" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

