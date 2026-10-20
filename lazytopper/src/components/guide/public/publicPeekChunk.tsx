/**
 * GUIDE-PUBLIC-1 — everything the public peek DRAWS, in its own lazily loaded chunk (Vite emits
 * `assets/publicPeekChunk-<hash>.js` + CSS). Reached ONLY through the dynamic import in
 * ./PublicPeek.tsx, after the trigger fired for a guide-arm visitor.
 *
 * Byte (the RIG-2 rig, pose "peek") rises from the BOTTOM-LEFT edge — the WhatsApp button owns
 * bottom-right — waves once and says one line. Tapping him or his bubble opens a small panel
 * (not a modal; Esc closes it) with at most three options, every one a real route. His × closes
 * the peek for this tab. Fixed-position and portalled to <body>: nothing in the page's flow
 * moves (no layout shift), and a transformed ancestor cannot trap `position: fixed`.
 */
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import BlobCharacter from "../BlobCharacter";
import { prefersReducedMotion } from "../rig";
import { trackOnboardingEvent } from "../../../analytics/analytics";
import { START_HERE_AVAILABILITY } from "../../startHere/startHereAvailability.generated";
import { startHerePracticePath, startHereSetSize } from "../../startHere/startHereModel";
import {
  PUBLIC_PEEK_COPY,
  focusAfterClose,
  importantPath,
  loginThen,
  peekLine,
  peekOptions,
  type GuidePublicPage,
  type PeekChapter,
  type PeekOption,
} from "./publicPeekModel";
import "./publicPeek.css";

export interface PublicPeekViewProps {
  page: GuidePublicPage;
  chapter: PeekChapter;
  signedIn: boolean;
  /** PREVIEW-1: the admin preview is on — no guide_public_* event leaves the device. */
  quiet: boolean;
  /** The × closed the peek (it never returns in this tab). */
  onClosed: () => void;
}

/** How long the one wave lasts (the host's CSS animation; 0 under reduced motion). */
export const PEEK_WAVE_MS = 1300;

/** The chapter can host a Start-here set of five MCQs (the precomputed map; no bank download). */
export function quickOfferedFor(chapter: PeekChapter): boolean {
  const bySubject = START_HERE_AVAILABILITY[chapter.subject] as Record<string, { mcq: number } | undefined>;
  return (bySubject[chapter.slug]?.mcq ?? 0) >= startHereSetSize("mcq");
}

/** The Start-here launch for this chapter (its exact-set Quick Practice URL), or null. */
async function quickPracticePath(chapter: PeekChapter, returnTo: string): Promise<string | null> {
  // The bank is reached HERE, on the tap, and nowhere earlier (Start-here's own rule, D3).
  const bank = await import("../../startHere/startHereBank");
  const ids = await bank.pickStartHereSet({ subject: chapter.subject, chapter: chapter.slug, qtype: "mcq", rotation: Date.now() });
  if (ids.length < startHereSetSize("mcq")) return null;
  return startHerePracticePath({ subject: chapter.subject, chapter: chapter.slug, ids, qtype: "mcq", returnTo });
}

/** F2 — below the desktop breakpoint (1024px, the app's useIsDesktop) the panel is cramped. */
const NARROW_QUERY = "(max-width: 1023.98px)";

function useNarrow(): boolean {
  const read = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(NARROW_QUERY).matches;
  const [narrow, setNarrow] = useState(read);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(NARROW_QUERY);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return narrow;
}

/** Hidden while a modal / dialog / scroll-locked overlay is open (the WhatsApp button's rule). */
function useOverlayOpen(): boolean {
  const read = () =>
    typeof document !== "undefined" && !!document.body &&
    (document.body.style.overflow === "hidden" || document.querySelector('[aria-modal="true"], dialog[open]') !== null);
  const [open, setOpen] = useState(read);
  useEffect(() => {
    if (typeof MutationObserver === "undefined") return;
    const check = () => setOpen(read());
    const tree = new MutationObserver(check);
    tree.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-modal", "open"] });
    // The scroll-lock is an inline style on <body> itself.
    const body = new MutationObserver(check);
    body.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    return () => {
      tree.disconnect();
      body.disconnect();
    };
  }, []);
  return open;
}

export function PublicPeekView({ page, chapter, signedIn, quiet, onClosed }: PublicPeekViewProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const panelId = useId();
  const headId = useId();
  const [open, setOpen] = useState(false);
  const [waving, setWaving] = useState(() => !prefersReducedMotion());
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const bubbleRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const hidden = useOverlayOpen();
  const narrow = useNarrow();
  // F2: on a phone the panel takes the bubble's place (Byte and × stay).
  const showBubble = !(open && narrow);
  const options = peekOptions({ chapter, signedIn, quickOffered: quickOfferedFor(chapter) });

  // He waves ONCE as he arrives, then rests on the edge.
  useEffect(() => {
    if (!waving) return;
    const t = setTimeout(() => setWaving(false), PEEK_WAVE_MS);
    return () => clearTimeout(t);
  }, [waving]);

  // F1: the panel opens with focus on its first option.
  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLButtonElement>(".lt-pp__opt")?.focus();
  }, [open]);

  // Esc closes the panel (not Byte). Focus returns to the bubble that opened it — or, on a phone,
  // where the bubble was hidden while the panel was open (F2), to the ×.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      (narrow ? closeRef.current : bubbleRef.current)?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, narrow]);

  const close = () => {
    if (!quiet) trackOnboardingEvent("guide_public_dismissed", { page });
    onClosed();
    // F1: focus never falls to <body> — the page's own heading (or <main>) takes it.
    focusAfterClose(page);
  };

  const pick = async (o: PeekOption) => {
    if (busy) return;
    if (!quiet) trackOnboardingEvent("guide_public_option", { option: o.id, page });
    if (o.action.kind === "route") {
      navigate(o.action.path);
      return;
    }
    setBusy(true);
    setFailed(false);
    if (o.action.kind === "important") {
      // F5: chapter-scoped only when the HPQ page will actually match this chapter; if the
      // check cannot run, the subject-level page (always a real route) rather than a guess.
      let target = importantPath({ slug: null, subject: chapter.subject });
      try {
        const { importantTargetFor } = await import("./importantTarget");
        target = importantTargetFor(chapter);
      } catch {
        /* keep the subject-level link */
      }
      navigate(target);
      return;
    }
    try {
      const path = await quickPracticePath(chapter, pathname);
      if (!path) throw new Error("no set");
      navigate(signedIn ? path : loginThen(path));
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  if (typeof document === "undefined" || hidden) return null;
  const line = peekLine(page, chapter);
  return createPortal(
    <div className={open ? "lt-pp is-open" : "lt-pp"} data-testid="public-peek" data-page={page}>
      {/* F1: the row (Byte, his line, ×) comes FIRST in the DOM and the panel AFTER it, so the
          reading / tab order is opener → options; .lt-pp's column-reverse keeps the panel drawn
          above Byte. */}
      <div className="lt-pp__row" data-testid="public-peek-row">
        <BlobCharacter
          kind="byte"
          pose="peek"
          className={waving ? "lt-pp__byte is-wave" : "lt-pp__byte"}
          onTap={() => setOpen((v) => !v)}
        />
        {showBubble ? (
          <button
            ref={bubbleRef}
            type="button"
            className="lt-pp__bub"
            aria-expanded={open}
            aria-controls={open ? panelId : undefined}
            data-testid="public-peek-line"
            onClick={() => setOpen((v) => !v)}
          >
            {line}
          </button>
        ) : null}
        <button
          ref={closeRef}
          type="button"
          className="lt-pp__x"
          aria-label={PUBLIC_PEEK_COPY.close}
          data-testid="public-peek-close"
          onClick={close}
        >
          ✕
        </button>
      </div>
      {open ? (
        <section
          ref={panelRef}
          className="lt-pp__panel"
          id={panelId}
          role="group"
          aria-labelledby={headId}
          data-testid="public-peek-panel"
        >
          {quiet ? (
            <span className="lt-pp__admin" data-testid="guide-admin-preview">
              {PUBLIC_PEEK_COPY.adminPreview}
            </span>
          ) : null}
          <h2 className="lt-pp__vh" id={headId}>
            {PUBLIC_PEEK_COPY.panelHeading}
          </h2>
          <ul className="lt-pp__opts">
            {options.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className="lt-pp__opt"
                  data-testid={`public-peek-opt-${o.id}`}
                  disabled={busy}
                  onClick={() => void pick(o)}
                >
                  <b>{o.title}</b>
                  <span>{o.sub}</span>
                </button>
              </li>
            ))}
          </ul>
          {failed ? (
            <p className="lt-pp__fail" role="alert">
              {PUBLIC_PEEK_COPY.quickFailed}
            </p>
          ) : null}
        </section>
      ) : null}
      {quiet && !open ? (
        <span className="lt-pp__admin" data-testid="guide-admin-preview">
          {PUBLIC_PEEK_COPY.adminPreview}
        </span>
      ) : null}
    </div>,
    document.body,
  );
}
