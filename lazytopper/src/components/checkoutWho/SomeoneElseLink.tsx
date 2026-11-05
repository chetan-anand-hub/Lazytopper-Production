/**
 * CHECKOUT-SELF-1 (owner, 4 Nov 2026) - the SECONDARY link under a signed-in student's one "Pay ₹…" button. The primary button buys for
 * the signed-in account itself, in one tap; this link opens the existing "Who will use it?" sheet (someone else / a mobile number or
 * email) unchanged. Import-free of checkout code on purpose: host chunks (PassCheckout, PacksShop) render it without pulling the sheet.
 */
import "./someoneElseLink.css";

/**
 * Short on purpose (reviewer, 5 Nov): "paying with a phone number" read as "pay with MY phone" and a student typed their own unlinked
 * number (full price, no pack credit, the pass on a different account). The sheet it opens still takes a parent's or friend's number or email.
 */
// Same words as WHO_SOMEONE_ELSE (services/checkoutWho.ts); a literal here so host chunks do not import the checkout service. A test pins them equal.
export const SOMEONE_ELSE_LINK = "Buying for someone else?";

export default function SomeoneElseLink({ onOpen, disabled = false, testId = "checkout-someone-else" }: { onOpen: () => void; disabled?: boolean; testId?: string }) {
  return (
    <button type="button" className="lt-else-link" onClick={onOpen} disabled={disabled} data-testid={testId}>
      {SOMEONE_ELSE_LINK}
    </button>
  );
}
