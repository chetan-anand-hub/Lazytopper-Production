import { useState } from "react";
import { boardPassFoundingPriceLine } from "../../config/pricing";
import { boardsCountdownCopy } from "./boardsCountdown";
import "./boardsCountdown.css";

/**
 * URGENCY-1 - one calm line: "Pre-boards in December. Boards in N days. Practise the real paper pattern now."
 * Live-computed in IST; hidden from 16 Feb 2027. No animation, no popup. Height is reserved (CSS min-height) so the line never shifts the page.
 * Kill switch: VITE_BOARDS_STRIP_DISABLED=1 (or revert the PR).
 */
export default function BoardsCountdownStrip({ tone = "light", testId = "boards-countdown-strip" }: { tone?: "light" | "dark"; testId?: string }) {
  const [text] = useState(() => (import.meta.env?.VITE_BOARDS_STRIP_DISABLED === "1" ? null : boardsCountdownCopy(Date.now())));
  if (!text) return null;
  // The slot keeps the strip's height. The <p> carries a clock-derived figure, so the prerender capture removes it (captureStaticBodies
  // strip rule 4) and the slot alone stays in the static file: no build-day number is frozen in, and the page does not shift on mount.
  return (
    <div className="lt-boards-slot" data-testid="boards-countdown-slot">
      <p className={tone === "dark" ? "lt-boards-strip lt-boards-strip--dark" : "lt-boards-strip"} data-testid={testId}>
        {text}
      </p>
    </div>
  );
}

/** URGENCY-1: the founding-price line for a Board Pass offer slot (the /pricing card has its own, extended in place). Null from 00:00 IST 1 Dec. */
export function FoundingPriceNote({ tone = "light", testId = "founding-price-note" }: { tone?: "light" | "dark"; testId?: string }) {
  const [text] = useState(() => boardPassFoundingPriceLine(Date.now()));
  if (!text) return null;
  return <p className={tone === "dark" ? "lt-boards-strip lt-boards-strip--note lt-boards-strip--dark" : "lt-boards-strip lt-boards-strip--note"} data-testid={testId}>{text}</p>;
}
