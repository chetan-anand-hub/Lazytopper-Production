import { useEffect, useState, type ReactNode } from "react";
import { testSeriesFoundingClause } from "../../services/packs";

/**
 * TS-PRICE-2 - "founding price till 30 Nov, then ₹1,499 + GST", shown next to the Test Series price while the founding offer is open.
 *
 * ★ Read AFTER MOUNT and wrapped in `data-lt-clock`, exactly like the Board Pass's founding line: the prerender capture strips the node
 *   (scripts/seo/captureStaticBodies.ts rule 4), so no build-machine clock is frozen into a static file as a claim that goes false on
 *   1 Dec. Renders nothing once the offer has closed. Copy only: the server decides the charge.
 */
export function TestSeriesFoundingClause({ prefix = "", suffix = "", className, testId = "ts-founding-clause" }: {
  prefix?: string;
  suffix?: string;
  className?: string;
  testId?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => setText(testSeriesFoundingClause(Date.now())), []);
  if (!text) return null;
  return (
    <span className={className} data-lt-clock="" data-testid={testId}>
      {`${prefix}${text}${suffix}`}
    </span>
  );
}

/**
 * TS-PRICE-2 - a Test Series PRICE FIGURE that depends on the clock (999 until 00:00 IST 1 Dec 2026, 1,499 from it).
 *
 * ★ Two nested nodes, on purpose. The OUTER span (`lt-tsclk`, a reserved slot with a minimum size) stays in the static snapshot, so the
 *   page paints the same box before and after the app takes over (no layout shift). The INNER span carries `data-lt-clock` and is written
 *   only AFTER MOUNT: the prerender capture strips it (captureStaticBodies.ts rule 4), so the build machine's clock is never frozen into
 *   a static file as a price that goes false at the cut-off. Same mechanism as the Board Pass founding line.
 */
export function TsClockSlot({ children, variant = "tag", testId }: { children: ReactNode; variant?: "tag" | "amt" | "line"; testId?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  return (
    <span className={`lt-tsclk lt-tsclk--${variant}`}>
      <span data-lt-clock="" {...(testId ? { "data-testid": testId } : {})}>
        {on ? children : null}
      </span>
    </span>
  );
}
