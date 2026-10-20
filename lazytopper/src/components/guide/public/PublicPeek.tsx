/**
 * GUIDE-PUBLIC-1 — the peek's TRIGGER, mounted by one line on each public chapter page
 * (DesktopNotesPage, DesktopTopicHubPage). It renders NOTHING until the trigger moment, so
 * the prerendered HTML of those pages is unchanged; the drawing code (Byte, the bubble, the
 * panel) is ./publicPeekChunk.tsx, reached only through the dynamic import below, so it is
 * never part of either page's chunk and only the guide arm ever downloads it.
 *
 * Sequence: mount → (split on?) → page idle → (scrolled ≥ 40 % of the article OR 20 s on the
 * page) → no modal / overlay open → who is this? → arm → `guide_public_shown` (both arms) →
 * guide arm: Byte peeks in. Once per tab per page type (publicPeekModel.ts).
 */
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { trackGuidePublicArmAssigned, trackGuidePublicShown, type GuideVariant } from "../../../analytics/analytics";
import { desktopTopicBySlug } from "../../../lib/desktop/topics";
import { guideAbActive, resolveGuideVariant } from "../guideVariant";
import {
  ARTICLE_SELECTOR,
  VisibleClock,
  articleScrollFraction,
  copyArmToIntent,
  ensurePublicArm,
  markPeekUsedInTab,
  peekTriggerReached,
  peekUsedInTab,
  previewArm,
  previewOn,
  type GuidePublicPage,
  type PeekChapter,
} from "./publicPeekModel";
import type { PublicPeekViewProps } from "./publicPeekChunk";

type Chunk = typeof import("./publicPeekChunk");
const loadChunk = (): Promise<Chunk> => import("./publicPeekChunk");
const Nothing: ComponentType<PublicPeekViewProps> = () => null;
/** The ONLY door into the peek chunk; a failed load renders nothing (never breaks the page). */
const LazyPeekView = lazy(() => loadChunk().then((m) => ({ default: m.PublicPeekView }), () => ({ default: Nothing })));

/** How often the trigger re-checks dwell time / a closed overlay once it is armed. */
const POLL_MS = 1000;

export interface PublicPeekProps {
  page: GuidePublicPage;
  /** The chapter's registry slug (lib/desktop/topics). Unknown / not Maths or Science → nothing. */
  chapterSlug: string;
}

function chapterFor(slug: string): PeekChapter | null {
  const t = slug ? desktopTopicBySlug(slug) : undefined;
  if (!t || (t.subject !== "Maths" && t.subject !== "Science")) return null;
  return { slug: t.slug, name: t.name, subject: t.subject };
}

/** A modal / dialog / scroll-locked overlay (the tutor overlay among them) is open. */
function overlayOpen(): boolean {
  if (typeof document === "undefined" || !document.body) return false;
  if (document.body.style.overflow === "hidden") return true;
  return document.querySelector('[aria-modal="true"], dialog[open]') !== null;
}

/** The signed-in, non-anonymous student's uid once Firebase has restored the session, else null. */
async function currentUid(): Promise<string | null> {
  try {
    const { authClient } = await import("../../../services/firebaseClient");
    if (!authClient) return null;
    const ready = (authClient as { authStateReady?: () => Promise<void> }).authStateReady;
    if (typeof ready === "function") {
      await Promise.race([ready.call(authClient), new Promise((r) => setTimeout(r, 3000))]);
    }
    const u = authClient.currentUser;
    if (!u || u.isAnonymous || typeof u.uid !== "string" || !u.uid) return null;
    return u.uid;
  } catch {
    return null;
  }
}

/** Wait for the page to be idle (after load, then an idle callback; a timer where there is none). */
function whenIdle(cb: () => void): () => void {
  let cancelled = false;
  let idleId: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const w = window as Window & {
    requestIdleCallback?: (fn: () => void, o?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  const afterLoad = () => {
    if (cancelled) return;
    if (typeof w.requestIdleCallback === "function") idleId = w.requestIdleCallback(() => !cancelled && cb(), { timeout: 4000 });
    else timer = setTimeout(() => !cancelled && cb(), 1200);
  };
  if (document.readyState === "complete") afterLoad();
  else window.addEventListener("load", afterLoad, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", afterLoad);
    if (idleId !== null && typeof w.cancelIdleCallback === "function") w.cancelIdleCallback(idleId);
    if (timer) clearTimeout(timer);
  };
}

interface Shown {
  arm: GuideVariant;
  signedIn: boolean;
}

export default function PublicPeek({ page, chapterSlug }: PublicPeekProps) {
  const chapter = chapterFor(chapterSlug);
  const [shown, setShown] = useState<Shown | null>(null);
  const eligible = !!chapter && guideAbActive();

  useEffect(() => {
    if (!eligible || peekUsedInTab(page)) return;
    let live = true;
    let idle = false;
    let fraction = 0;
    let firing = false;
    const visible = () => typeof document === "undefined" || document.visibilityState === "visible";
    // F3: the 20 s counts visible time only, and pauses while the tab is hidden.
    const clock = new VisibleClock(performance.now(), visible());
    const onVisibility = () => {
      clock.setVisible(visible(), performance.now());
      check();
    };
    const article = () => document.querySelector<HTMLElement>(ARTICLE_SELECTOR[page]);

    const measure = () => {
      const el = article();
      if (!el) return;
      const r = el.getBoundingClientRect();
      fraction = Math.max(fraction, articleScrollFraction({ top: r.top, height: r.height }, window.innerHeight));
    };

    const fire = async () => {
      firing = true;
      cleanup();
      const uid = await currentUid();
      if (!live || peekUsedInTab(page)) return;
      let arm: GuideVariant | null;
      let fresh = false;
      const quiet = previewOn();
      if (uid) {
        arm = resolveGuideVariant(uid); // PREVIEW-1: the previewed arm under a preview
      } else if (quiet) {
        arm = previewArm(); // PREVIEW-1: the device's own arm is neither drawn nor touched
      } else {
        const a = ensurePublicArm();
        arm = a?.arm ?? null;
        fresh = !!a?.fresh;
      }
      if (!arm) return;
      markPeekUsedInTab(page);
      if (!uid && !quiet) copyArmToIntent(arm);
      if (!quiet) {
        if (fresh) trackGuidePublicArmAssigned(arm);
        trackGuidePublicShown({ page, arm, chapter: chapter!.slug, signed_in: !!uid });
      }
      if (arm === "guide") setShown({ arm, signedIn: !!uid });
    };

    const check = () => {
      if (!live || firing) return;
      if (!visible()) return; // F3: neither trigger runs in a hidden tab
      measure();
      if (!peekTriggerReached(idle, fraction, clock.elapsed(performance.now()))) return;
      if (overlayOpen()) return; // wait: never over a modal, a dialog or the tutor overlay
      void fire();
    };

    const onScroll = () => check();
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    const poll = setInterval(check, POLL_MS);
    const stopIdle = whenIdle(() => {
      idle = true;
      check();
    });

    function cleanup() {
      document.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(poll);
      stopIdle();
    }
    return () => {
      live = false;
      cleanup();
    };
    // Armed once per page type per mount; a chapter change inside the same page keeps it armed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, page]);

  if (!shown || !chapter) return null;
  return (
    <Suspense fallback={null}>
      <LazyPeekView
        page={page}
        chapter={chapter}
        signedIn={shown.signedIn}
        quiet={previewOn()}
        onClosed={() => setShown(null)}
      />
    </Suspense>
  );
}
