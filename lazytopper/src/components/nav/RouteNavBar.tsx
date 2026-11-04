import { type MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { readHistoryIdx, resolveBackTarget } from "../../lib/nav/routeParents";

/**
 * RouteNavBar - NAV-1 (owner, 4 Nov 2026): a "← <parent>" Back control and a Home control at the top of every page
 * except Home itself and the focused flows (an in-progress test or mock, sign-in). Mounted once, by App.tsx, above the
 * route content (inside DesktopShell's content column at desktop width).
 *
 * Back: arrived from inside the app (router history idx > 0) -> one step back, "← Back"; otherwise -> the page's parent
 * from the ONE route map (lib/nav/routeParents.ts), "← Pricing", "← Topic Hub", ... Both controls are real links to
 * internal paths, so they work with the keyboard, with a modifier-click into a new tab, and without JS.
 *
 * Loaded LAZILY by RouteNav (the eager wrapper, which decides visibility and reserves the row's height meanwhile), so
 * the route map stays out of the entry chunk (PERF-3 budget). Styles: routeNavBar.css, imported by RouteNav.
 *
 * NAVIGATION ONLY: nothing here touches grading, pricing, payment or the trial.
 */
export default function RouteNavBar({ placement = "page" }: { placement?: "page" | "shell" } = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const target = resolveBackTarget(location.pathname, readHistoryIdx());
  if (!target) return null;

  const onBack = (e: MouseEvent<HTMLAnchorElement>) => {
    if (target.kind !== "history" || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(-1);
  };
  const backAria = target.kind === "history" ? "Back to the previous page" : `Back to ${target.label}`;

  return (
    <nav className={`lt-routenav lt-routenav--${placement}`} aria-label="Page navigation" data-testid="route-nav">
      <div className="lt-routenav__row">
        <Link
          className="lt-routenav__btn lt-routenav__btn--back"
          to={target.to}
          onClick={onBack}
          aria-label={backAria}
          data-testid="route-nav-back"
          data-back-kind={target.kind}
        >
          <span aria-hidden="true" className="lt-routenav__arrow">←</span>
          <span>{target.label}</span>
        </Link>
        {target.showHome && (
          <Link className="lt-routenav__btn" to="/" aria-label="Go to Home" data-testid="route-nav-home">
            <svg
              className="lt-routenav__icon"
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 11l9-8 9 8" />
              <path d="M5 10v10h14V10" />
            </svg>
            <span>Home</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
