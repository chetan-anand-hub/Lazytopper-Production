import { useEffect, useRef } from "react";
import { trackPackReadyShown } from "../../lib/packs/packAnalytics";
import { registerReadyBanner } from "./packReadyBus";
import "./packReady.css";

/**
 * PackReadyBanner - PACK-READY-1: the first thing in My packs after a pay-by-phone claim (or on arriving at #my-packs with a pack):
 * "Your <pack> is ready" and ONE tap to its files. A Board Pass row says "Your Board Pass is on" (no button; PacksShop passes it only
 * once the entitlement is confirmed). A `return` row (arrived at #my-packs, no claim in hand) is neutral: "Your latest pack: X".
 */
export interface ReadyRow {
  key: string;
  /** Owned-pack id the button opens; absent for a Board Pass row. */
  packId?: string;
  sku: string;
  title: string;
  /** `return`: no claim in hand - say "Your latest pack", never "is ready". */
  variant?: "return";
}

export default function PackReadyBanner({ rows, canOpen, onOpen, onDismiss }: { rows: ReadyRow[]; /** The owned-pack cards (and so their files) are actually on screen. */ canOpen: boolean; onOpen: (packId: string) => void; onDismiss: () => void }) {
  const sent = useRef(new Set<string>());
  useEffect(() => {
    for (const r of rows) {
      if (sent.current.has(r.key)) continue;
      sent.current.add(r.key);
      trackPackReadyShown(r.packId ? r.sku : "board_pass", r.variant === "return" ? "banner_return" : "banner");
    }
  }, [rows]);
  const up = rows.length > 0;
  useEffect(() => (up ? registerReadyBanner() : undefined), [up]);
  if (!up) return null;
  return (
    <div data-testid="pack-ready-banner">
      {rows.map((r, i) => (
        <div className="lt-ready" role="status" key={r.key} data-testid="pack-ready-row">
          <p className="lt-ready__text">{!r.packId ? "Your Board Pass is on" : r.variant === "return" ? `Your latest pack: ${r.title}` : `Your ${r.title} is ready`}</p>
          {r.packId && canOpen && (
            <button type="button" className="lt-ready__btn" onClick={() => onOpen(r.packId as string)}>
              Download files
            </button>
          )}
          {i === 0 && (
            <button type="button" className="lt-ready__close" aria-label="Dismiss" onClick={onDismiss}>
              {"×"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
