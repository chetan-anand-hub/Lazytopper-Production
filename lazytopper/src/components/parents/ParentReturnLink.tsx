import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

import { PARENT_RETURN_LABEL, PARENT_RETURN_TO, shouldShowParentReturn, tabStorage } from "../../lib/parentReturn";
import "./parentReturnLink.css";

/**
 * ParentReturnLink — PARENTS-NAV-1 (owner, 20 Oct 2026): "every link of for parents page should
 * navigate back to the for parents page".
 *
 * "← Back to parents page", shown ONLY to a visitor who arrived from /for-parents: the URL carries
 * `?from=for_parents`, or this tab stored it earlier (`shouldShowParentReturn`, sessionStorage,
 * this tab only). For anyone else it renders NOTHING — so a page's prerendered HTML (captured on
 * the bare path, in a fresh tab) is unchanged by mounting it. The target is the constant
 * `PARENT_RETURN_TO` (internal), never a URL taken from the query.
 *
 * One line mounts it on each page a /for-parents link reaches. /check-improve passes its own
 * class and test id so its markup stays exactly what PARENTS-CTA-1 shipped.
 *
 * NAVIGATION ONLY: nothing here touches grading, pricing, payment or the trial.
 */
export interface ParentReturnLinkProps {
  /** Class root; the anchor gets `${className}__link`. Default `lt-parent-return`. */
  readonly className?: string;
  /** Default `parent-return`. */
  readonly testId?: string;
}

export default function ParentReturnLink({ className = "lt-parent-return", testId = "parent-return" }: ParentReturnLinkProps) {
  const { search } = useLocation();
  // Pure helper; persisting the flag is an idempotent sessionStorage write (throw-safe).
  const show = useMemo(() => shouldShowParentReturn(search, tabStorage()), [search]);
  if (!show) return null;
  return (
    <nav className={className} aria-label="Back to parents page">
      <Link className={`${className}__link`} to={PARENT_RETURN_TO} data-testid={testId}>
        {PARENT_RETURN_LABEL}
      </Link>
    </nav>
  );
}
