import { useEffect, useMemo } from "react";
import type { DailyMixItem } from "../services/dailyMixPlayback";
import { useDailyMixPlayback } from "../services/dailyMixPlayback";

export interface DailyMixPlayerProps {
  items?: DailyMixItem[];
  grade?: string;
  subject?: string;
  onExit?: () => void | Promise<void>;
  autoAdvanceMs?: number;
  className?: string;
}

export function DailyMixPlayer({
  items,
  grade,
  subject,
  onExit,
  autoAdvanceMs = 12000,
  className,
}: DailyMixPlayerProps) {
  const safeItems = useMemo(() => items ?? [], [items]);

  const {
    current,
    currentIndex,
    isPlaying,
    canPrev,
    canNext,
    play,
    pause,
    next,
    prev,
    seek,
  } = useDailyMixPlayback(safeItems);

  useEffect(() => {
    if (!isPlaying) return;
    if (!canNext) {
      pause();
      return;
    }
    const timer = window.setTimeout(() => {
      next();
    }, Math.max(3000, autoAdvanceMs));
    return () => window.clearTimeout(timer);
  }, [isPlaying, canNext, next, pause, autoAdvanceMs, currentIndex]);

  if (!safeItems.length) {
    return (
      <div className={className}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontWeight: 800 }}>Daily Focus Mix</div>
          {onExit ? (
            <button type="button" onClick={() => void onExit()}>
              Close
            </button>
          ) : null}
        </div>

        <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>
          No Daily Mix items are available yet.
        </div>
      </div>
    );
  }

  const title = current?.title ?? "Untitled";
  const description = current?.description ?? "";
  const kind = String(current?.type || "item");

  return (
    <div className={className}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 22 }}>Your Daily Focus Mix</div>
          <div style={{ marginTop: 4, opacity: 0.76, fontSize: 13 }}>
            Press Play once. The flow auto-advances item by item.
          </div>
          {(grade || subject) && (
            <div style={{ marginTop: 4, opacity: 0.7, fontSize: 12 }}>
              Class {grade || "10"} | {subject || "Maths"}
            </div>
          )}
        </div>
        {onExit ? (
          <button type="button" onClick={() => void onExit()}>
            Back
          </button>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 14,
          border: "1px solid rgba(15,23,42,0.14)",
          borderRadius: 14,
          background: "rgba(255,255,255,0.9)",
          padding: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              borderRadius: 999,
              border: "1px solid rgba(15,23,42,0.2)",
              padding: "2px 8px",
              textTransform: "uppercase",
            }}
          >
            {kind}
          </span>
          <span style={{ fontSize: 12, opacity: 0.75 }}>
            Item {currentIndex + 1} of {safeItems.length}
          </span>
        </div>
        <div style={{ marginTop: 8, fontWeight: 800, fontSize: 18 }}>{title}</div>
        {description ? <div style={{ marginTop: 6, opacity: 0.86 }}>{description}</div> : null}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={prev} disabled={!canPrev}>
          Prev
        </button>

        {isPlaying ? (
          <button type="button" onClick={pause}>
            Pause
          </button>
        ) : (
          <button type="button" onClick={play}>
            Play
          </button>
        )}

        <button type="button" onClick={next} disabled={!canNext}>
          Next
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <input
          aria-label="Daily mix position"
          type="range"
          min={0}
          max={Math.max(0, safeItems.length - 1)}
          value={currentIndex}
          onChange={(e) => seek(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}

export default DailyMixPlayer;
