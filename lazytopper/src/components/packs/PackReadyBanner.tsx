import { useEffect, useRef } from "react";
import { trackPackReadyShown } from "../../lib/packs/packAnalytics";
import "./packReady.css";

/**
 * PackReadyBanner - PACK-READY-1: the first thing in My packs after a pay-by-phone claim (or on arriving at #my-packs with a pack):
 * "Your <pack> is ready" and ONE tap to its files. A Board Pass row says "Your Board Pass is on" (no button).
 */
export interface ReadyRow {
  key: string;
  /** Owned-pack id the button opens; absent for a Board Pass row. */
  packId?: string;
  sku: string;
  title: string;
}

export default function PackReadyBanner({ rows, onOpen, onDismiss }: { rows: ReadyRow[]; onOpen: (packId: string) => void; onDismiss: () => void }) {
  const sent = useRef(new Set<string>());
  useEffect(() => {
    for (const r of rows) {
      if (sent.current.has(r.key)) continue;
      sent.current.add(r.key);
      trackPackReadyShown(r.packId ? r.sku : "board_pass", "banner");
    }
  }, [rows]);
  if (rows.length === 0) return null;
  return (
    <div data-testid="pack-ready-banner">
      {rows.map((r, i) => (
        <div className="lt-ready" role="status" key={r.key} data-testid="pack-ready-row">
          <p className="lt-ready__text">{r.packId ? `Your ${r.title} is ready` : "Your Board Pass is on"}</p>
          {r.packId && (
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
