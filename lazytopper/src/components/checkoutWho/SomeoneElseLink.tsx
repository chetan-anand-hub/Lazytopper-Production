/**
 * CHECKOUT-SELF-1 (owner, 4 Nov 2026) - the SECONDARY link under a signed-in student's one "Pay ₹…" button. The primary button buys for
 * the signed-in account itself, in one tap; this link opens the existing "Who will use it?" sheet (someone else / a mobile number or
 * email) unchanged. Import-free of checkout code on purpose: host chunks (PassCheckout, PacksShop) render it without pulling the sheet.
 */
import "./someoneElseLink.css";

/** Honest, plain: it names both things the link does. */
export const SOMEONE_ELSE_LINK = "Buying for someone else, or paying with a phone number?";

export default function SomeoneElseLink({ onOpen, disabled = false, testId = "checkout-someone-else" }: { onOpen: () => void; disabled?: boolean; testId?: string }) {
  return (
    <button type="button" className="lt-else-link" onClick={onOpen} disabled={disabled} data-testid={testId}>
      {SOMEONE_ELSE_LINK}
    </button>
  );
}
