/**
 * BoardPassLine - FIRST-OFFER-1. One quiet line that names the Board Pass with its real price on a
 * wall or lock that lacked it: "Board Pass ₹… · Pay once till your boards (Mar 2027)".
 * Everything comes from boardPassOffer (config/pricing.ts); no price or date is typed here. With no
 * quote it says "Board Pass · Pay once, till your boards". Class-based CSS only.
 */
import { boardPassOffer } from "./boardPassOffer";
import { predictCbseExamDate } from "../../services/cbseExamDate";

const BP_LINE_CSS = `
.lt-bpline { margin: 12px auto 0; max-width: 100%; font-size: 0.86rem; font-weight: 600; line-height: 1.4; overflow-wrap: anywhere; }
.lt-bpline--dark { color: #1a1a2e; }
`;

export default function BoardPassLine({ tone = "inherit", testId = "board-pass-line" }: { tone?: "inherit" | "dark"; testId?: string }) {
  const offer = boardPassOffer(new Date(), predictCbseExamDate("10"));
  const text = offer.priceDisplay ? `${offer.title} ${offer.priceDisplay} · ${offer.detail}` : `${offer.title} · ${offer.detail}`;
  return (
    <p className={tone === "dark" ? "lt-bpline lt-bpline--dark" : "lt-bpline"} data-testid={testId}>
      <style>{BP_LINE_CSS}</style>
      {text}
    </p>
  );
}
