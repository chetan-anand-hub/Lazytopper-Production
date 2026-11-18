import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  cbseStorageBucket,
  newestImportantCircular,
  useCbseManifestStatus,
} from "../../services/cbseManifest";

/**
 * CbseBanner — the one-line CBSE news strip at the top of Home (CBSE-AUTO-1 C12).
 *
 * It shows the headline of the NEWEST circular the mirror's manifest flags
 * `important`, links to `/cbse/class-10`, and can be dismissed.
 *
 * ★ EVERY WORD IT SHOWS COMES FROM THE MIRROR'S FIXED RULE TABLE (C9). The headline
 * is one of four fixed strings, chosen by a keyword rule and only for a circular
 * dated in the last 30 days. Nothing here composes, shortens or rewords a headline.
 *
 * ★ IT RENDERS NOTHING UNLESS THERE IS SOMETHING TRUE TO SAY. No manifest (no bucket,
 * network error, timeout, malformed file), no important row, or the newest important
 * row already dismissed — all render `null`, and a `null` adds no space: DesktopHome
 * lays out with a flex gap, and MobileHome's spacing is this component's own
 * `spaced` margin, which exists only when the banner does.
 *
 * ★ DISMISSAL IS PER CIRCULAR, SO NEWER NEWS COMES BACK. The key stores the ids that
 * were dismissed; a newer important circular has a new id and shows again. Only the
 * newest important row is ever shown — dismissing it never surfaces an older one.
 * This localStorage key is dismissal state and nothing else — never premium or
 * trial state (CLAUDE.md §7).
 *
 * The link is a router `<Link>` to "/cbse/class-10"; the router's basename supplies
 * any deployment prefix, so no `/app/` is written here (CLAUDE.md §7).
 */

export const CBSE_BANNER_DISMISSED_KEY = "ltCbseBanner.dismissed.v1";

export function readDismissedIds(): string[] {
  try {
    const raw = window.localStorage.getItem(CBSE_BANNER_DISMISSED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function dismissCircular(id: string): void {
  try {
    const ids = readDismissedIds();
    if (!ids.includes(id)) ids.push(id);
    // Bounded: a student who dismisses for years should not grow this without end.
    window.localStorage.setItem(CBSE_BANNER_DISMISSED_KEY, JSON.stringify(ids.slice(-50)));
  } catch {
    // Storage unavailable — the banner is hidden for this visit only.
  }
}

/**
 * SPEED-CLS-2 — the strip arrives after the manifest fetch (~1.5 s on a phone), i.e. AFTER the
 * first paint, so it used to push everything under it down by 56-72 px (CLS 0.07 mobile / 0.03
 * desktop on /browse). Two fixes, both layout-only:
 *  1. the last result is remembered (display cache only — never premium/trial state), so a
 *     returning visitor paints the strip in the first frame, from the same mirror headline;
 *  2. a first-ever visit reserves the strip's measured height while the fetch is in flight.
 * Build/CI without a bucket reserves nothing (no fetch happens), so prerendered output is unchanged.
 */
export const CBSE_BANNER_LAST_KEY = "ltCbseBanner.last.v1";
/** Measured strip heights (px): 72 when the headline wraps (<400 px wide), else 56. */
export const CBSE_BANNER_RESERVE_PX = { narrow: 72, wide: 56 } as const;

type LastSeen = { none: true } | { id: string; headline: string };

function readLastSeen(): LastSeen | null {
  try {
    const raw = window.localStorage.getItem(CBSE_BANNER_LAST_KEY);
    if (!raw) return null;
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    if (o.none === true) return { none: true };
    if (typeof o.id === "string" && o.id && typeof o.headline === "string" && o.headline) {
      return { id: o.id, headline: o.headline };
    }
    return null;
  } catch {
    return null;
  }
}

function writeLastSeen(v: LastSeen): void {
  try {
    window.localStorage.setItem(CBSE_BANNER_LAST_KEY, JSON.stringify(v));
  } catch {
    // Storage unavailable — next visit simply reserves space instead.
  }
}

const BANNER_CSS = `
.lt-cbse-banner-reserve { min-height: ${CBSE_BANNER_RESERVE_PX.wide}px; min-width: 0; }
.lt-cbse-banner-reserve--spaced { margin-bottom: 13px; }
@media (max-width: 399.98px) { .lt-cbse-banner-reserve { min-height: ${CBSE_BANNER_RESERVE_PX.narrow}px; } }
.lt-cbse-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px 10px 14px;
  border-radius: 14px;
  background: hsl(214, 60%, 19%);
  color: #eaf2fb;
  min-width: 0;
}
.lt-cbse-banner--spaced { margin-bottom: 13px; }
.lt-cbse-banner__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: hsl(152, 55%, 45%);
  flex: 0 0 auto;
}
.lt-cbse-banner__link {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 10px;
  color: inherit;
  text-decoration: none;
  min-height: 32px;
  align-content: center;
}
.lt-cbse-banner__headline {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.3;
  color: #ffffff;
}
.lt-cbse-banner__more {
  font-size: 12.5px;
  font-weight: 600;
  color: hsl(152, 60%, 72%);
  white-space: nowrap;
}
.lt-cbse-banner__link:hover .lt-cbse-banner__more,
.lt-cbse-banner__link:focus-visible .lt-cbse-banner__more { text-decoration: underline; }
.lt-cbse-banner__link:focus-visible,
.lt-cbse-banner__close:focus-visible {
  outline: 2px solid hsl(152, 55%, 45%);
  outline-offset: 2px;
  border-radius: 6px;
}
.lt-cbse-banner__close {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #b9d0e8;
  font: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.lt-cbse-banner__close:hover { background: hsla(0, 0%, 100%, 0.08); color: #ffffff; }
`;

export default function CbseBanner({ spaced = false }: { spaced?: boolean }) {
  const { manifest, settled } = useCbseManifestStatus();
  const [dismissed, setDismissed] = useState<string[]>(() => readDismissedIds());
  const [last] = useState<LastSeen | null>(() => readLastSeen());

  const fresh = newestImportantCircular(manifest);
  useEffect(() => {
    // Remember only a SUCCESSFUL read; a failed fetch (null manifest) must not erase a good one.
    if (!settled || !manifest) return;
    writeLastSeen(fresh ? { id: fresh.id, headline: fresh.headline } : { none: true });
  }, [settled, manifest, fresh]);

  const circular: { id: string; headline: string } | null =
    fresh ?? (!settled && last && "id" in last ? last : null);

  if (!circular) {
    // First-ever visit (nothing remembered), fetch in flight, a mirror configured: hold the room.
    if (!settled && last === null && cbseStorageBucket()) {
      return (
        <>
          <style>{BANNER_CSS}</style>
          <div
            className={`lt-cbse-banner-reserve${spaced ? " lt-cbse-banner-reserve--spaced" : ""}`}
            aria-hidden="true"
            data-testid="cbse-banner-reserve"
          />
        </>
      );
    }
    return null;
  }
  if (dismissed.includes(circular.id)) return null;

  const onDismiss = () => {
    dismissCircular(circular.id);
    setDismissed((ids) => (ids.includes(circular.id) ? ids : [...ids, circular.id]));
  };

  return (
    <div
      className={`lt-cbse-banner${spaced ? " lt-cbse-banner--spaced" : ""}`}
      role="region"
      aria-label="CBSE update"
      data-testid="cbse-banner"
    >
      <style>{BANNER_CSS}</style>
      <span className="lt-cbse-banner__dot" aria-hidden="true" />
      <Link to="/cbse/class-10" className="lt-cbse-banner__link">
        <span className="lt-cbse-banner__headline">{circular.headline}</span>
        <span className="lt-cbse-banner__more">See what it means</span>
      </Link>
      <button
        type="button"
        className="lt-cbse-banner__close"
        aria-label="Dismiss this CBSE update"
        onClick={onDismiss}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
