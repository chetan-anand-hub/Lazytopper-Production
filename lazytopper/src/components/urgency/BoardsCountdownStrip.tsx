import { useState } from "react";
import { boardPassFoundingPriceLine } from "../../config/pricing";
import { boardsCountdownParts } from "./boardsCountdown";
import { BOARDS_COUNTDOWN_CSS } from "./boardsCountdownCss";

/**
 * URGENCY-1 v2 - the boards countdown: a navy card, the day count in big amber figures on the left, the phase line and "Practise the real paper
 * pattern now." on the right. Live-computed in IST; hidden from 16 Feb 2027. The only motion is a gentle opacity pulse on the 8px dot, and only
 * under prefers-reduced-motion: no-preference. The full sentence is the aria-label. Height is reserved by the slot (CSS).
 * Kill switch: VITE_BOARDS_STRIP_DISABLED=1 (or revert the PR).
 */
export default function BoardsCountdownStrip({ testId = "boards-countdown-strip" }: { tone?: "light" | "dark"; testId?: string }) {
  const [parts] = useState(() => (import.meta.env?.VITE_BOARDS_STRIP_DISABLED === "1" ? null : boardsCountdownParts(Date.now())));
  if (!parts) return null;
  // The slot keeps the strip's height. The strip carries a clock-derived figure, so the prerender capture removes it (captureStaticBodies
  // strip rule 4) and the slot alone stays in the static file: no build-day number is frozen in, and the page does not shift on mount.
  return (
    <div className="lt-boards-slot" data-testid="boards-countdown-slot">
      <style>{BOARDS_COUNTDOWN_CSS}</style>
      <div className="lt-boards-strip" role="group" aria-label={parts.full} data-testid={testId}>
        <div className="lt-boards-strip__count" aria-hidden="true">
          <span className="lt-boards-strip__num">{parts.days}</span>
          <span className="lt-boards-strip__lbl">{parts.label}</span>
        </div>
        <div className="lt-boards-strip__txt" aria-hidden="true">
          <p className="lt-boards-strip__l1"><span className="lt-boards-strip__dot" />{parts.phase}</p>
          <p className="lt-boards-strip__l2">{parts.practise}</p>
        </div>
      </div>
    </div>
  );
}

/** URGENCY-1: the founding-price line for a Board Pass offer slot (the /pricing card has its own, extended in place). Null from 00:00 IST 1 Dec. */
export function FoundingPriceNote({ tone = "light", testId = "founding-price-note" }: { tone?: "light" | "dark"; testId?: string }) {
  const [text] = useState(() => boardPassFoundingPriceLine(Date.now()));
  if (!text) return null;
  return (
    <p className={tone === "dark" ? "lt-boards-note lt-boards-note--dark" : "lt-boards-note"} data-testid={testId}>
      <style>{BOARDS_COUNTDOWN_CSS}</style>
      {text}
    </p>
  );
}
