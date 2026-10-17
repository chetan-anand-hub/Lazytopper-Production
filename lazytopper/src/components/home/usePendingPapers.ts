import { useEffect, useMemo, useState } from "react";
import type { AuthUser } from "../../context/AuthContext";
import { trackOnboardingEvent, type PendingPlacement, type PendingUploadSurface } from "../../analytics/analytics";
import {
  loadPendingPapers,
  pendingPapersUid,
  readPendingPapersLocal,
  type PendingPaper,
  type PendingPaperSurface,
} from "./pendingPapers";

/**
 * HOME-PENDING-1 — the ONE hook the Home strip and the header bell share. Both read through
 * `loadPendingPapers`, whose cloud hydration is memoised per tab, so mounting the strip AND the
 * bell costs no extra network read: the device copy first (no network, no flash), then the
 * hydrated list.
 */
export function usePendingPapers(user: Pick<AuthUser, "uid" | "isLocalSession"> | null | undefined): {
  uid: string | null;
  papers: PendingPaper[];
} {
  const uid = pendingPapersUid(user);
  const isLocalSession = user?.isLocalSession;
  // The device copy for THIS uid, derived (no state): it is what shows until the hydrated list
  // for the same uid arrives.
  const local = useMemo(() => readPendingPapersLocal(uid), [uid]);
  // The hydrated list is stored WITH the uid it belongs to, so after an account switch the
  // previous account's papers can never show for a frame under the new uid.
  const [loaded, setLoaded] = useState<{ uid: string; papers: PendingPaper[] } | null>(null);
  useEffect(() => {
    if (!uid) return;
    let live = true;
    void loadPendingPapers({ uid, isLocalSession })
      .then((list) => {
        if (live) setLoaded({ uid, papers: list });
      })
      .catch(() => {
        /* the device list stays */
      });
    return () => {
      live = false;
    };
  }, [uid, isLocalSession]);
  const papers = !uid ? [] : loaded && loaded.uid === uid ? loaded.papers : local;
  return { uid, papers };
}

const SHOWN_KEY = "lazytopper.pendingCardShown.";
const shownThisTab = new Set<string>();

/** `pending_card_shown` at most once per tab per placement (sessionStorage survives a reload). */
export function trackPendingShown(placement: PendingPlacement, count: number): void {
  if (shownThisTab.has(placement)) return;
  shownThisTab.add(placement);
  try {
    if (window.sessionStorage.getItem(SHOWN_KEY + placement) === "1") return;
    window.sessionStorage.setItem(SHOWN_KEY + placement, "1");
  } catch {
    /* storage blocked: the in-memory set still limits it to this page load */
  }
  trackOnboardingEvent("pending_card_shown", { count, placement });
}

/** Test seam: forget this page load's "shown". */
export function __resetPendingShownForTests(): void {
  shownThisTab.clear();
}

const ANALYTICS_SURFACE: Record<PendingPaperSurface, PendingUploadSurface> = {
  worksheet: "worksheet",
  "chapter-test": "chapter_test",
  "full-mock": "full_mock",
  "quick-practice": "quick_practice",
};

export function trackPendingUploadTap(surface: PendingPaperSurface, placement: PendingPlacement): void {
  trackOnboardingEvent("pending_upload_tap", { surface: ANALYTICS_SURFACE[surface], placement });
}
