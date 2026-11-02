import type { ReactNode } from "react";
import { Link, useInRouterContext } from "react-router-dom";

/** A router Link inside the app, a plain anchor in a bare render (a few hosts and tests mount without a Router). */
export default function OfferLink({ to, className, onClick, testId, label, children }: { to: string; className: string; onClick?: () => void; testId?: string; label?: string; children: ReactNode }) {
  const inRouter = useInRouterContext();
  return inRouter ? (
    <Link className={className} to={to} onClick={onClick} data-testid={testId} aria-label={label}>
      {children}
    </Link>
  ) : (
    <a className={className} href={to} onClick={onClick} data-testid={testId} aria-label={label}>
      {children}
    </a>
  );
}
