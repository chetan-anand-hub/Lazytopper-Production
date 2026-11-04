import { Suspense } from "react";
import { useLocation } from "react-router-dom";

import { lazyWithRetry as lazy } from "../../lib/lazyWithRetry";
import { isRouteNavHidden } from "../../lib/nav/routeNavHidden";
import { useShellOwnsNav } from "./routeNavSlot";
import "./routeNavBar.css";

// A chunk that never loads renders nothing, never an error (the row is a convenience, not the page).
const RouteNavBar = lazy(() => import("./RouteNavBar").catch(() => ({ default: () => null })));

/**
 * RouteNav - NAV-1, the EAGER wrapper for the "← <parent>" + Home row (RouteNavBar, lazy).
 *   - hidden on Home and on focused flows (isRouteNavHidden) - nothing rendered, nothing reserved;
 *   - placement "page" (App.tsx, above the route content) steps aside while a page's own mobile header
 *     (MobileShell, placement "shell") draws the row under itself - one row per page, under the title where there is one;
 *   - while the row's chunk loads, an empty row of the SAME height holds its place, so the page never jumps.
 */
export default function RouteNav({ placement = "page" }: { placement?: "page" | "shell" } = {}) {
  const { pathname } = useLocation();
  const shellOwns = useShellOwnsNav();
  if (isRouteNavHidden(pathname)) return null;
  if (placement === "page" && shellOwns) return null;
  return (
    <Suspense
      fallback={
        <div className={`lt-routenav lt-routenav--${placement}`} aria-hidden="true">
          <div className="lt-routenav__row lt-routenav__row--ghost" />
        </div>
      }
    >
      <RouteNavBar placement={placement} />
    </Suspense>
  );
}
