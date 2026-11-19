import { useEffect, useState } from "react";
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
