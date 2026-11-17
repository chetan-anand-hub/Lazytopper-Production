/**
 * SEO-MCQ-1 - the inbound links to the free-MCQ pages from the product's public pages (/cbse/class-10 and the per-chapter table of
 * /question-bank-class-10). Not in any nav. VITE_FREE_MCQ_PAGES_DISABLED=1 renders nothing (today's pages).
 */
import { Link } from "react-router-dom";
import { FREE_MCQ_HUB_PATH } from "./freeMcqPages";

export const FREE_MCQ_LINK_LABEL = "Preview the free MCQ banks";

export function isFreeMcqPagesKilled(): boolean {
  try {
    return /^(1|true|on|yes)$/i.test(String(import.meta.env.VITE_FREE_MCQ_PAGES_DISABLED ?? "").trim());
  } catch {
    return false;
  }
}

export default function FreeMcqLink({ className }: { className?: string }) {
  if (isFreeMcqPagesKilled()) return null;
  return (
    <p className={className ?? "lt-mcq-inbound"} data-testid="free-mcq-link">
      <Link to={FREE_MCQ_HUB_PATH}>{FREE_MCQ_LINK_LABEL} &rarr;</Link>
    </p>
  );
}
