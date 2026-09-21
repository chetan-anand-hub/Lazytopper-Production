import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageview } from "./analytics";

/**
 * ★ THIS IS THE WHOLE OF "WHICH PAGES ARE THEY USING".
 *
 * The app is a BrowserRouter SPA (main.tsx:29): the browser performs ONE document load
 * and every "page" after that is a client-side route change. A vendor's default pageview
 * snippet records that single document load and misses everything the student does
 * afterwards — which, in this product, is all of it.
 *
 * So the pageview is driven from the router instead. One mount here covers all 52 routes
 * in App.tsx — the landing, notes, topic hubs, Practice, Check & Improve, the CBSE page,
 * the signup flow and everything else — with no per-page call sites to add, forget, or
 * let drift out of sync with the route table.
 *
 * ⚠ This renders nothing and must stay that way. It sits inside the router (main.tsx),
 * alongside <App />, so `useLocation` has a context to read.
 */
export default function RouteAnalytics(): null {
  const { pathname } = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // React 19 StrictMode double-invokes effects in development, and a route can also
    // re-render for reasons that are not a navigation (a search-param change, a state
    // update upstream). Counting those would inflate every number the owner reads, so a
    // pageview is emitted only when the path actually CHANGES.
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackPageview(pathname);
  }, [pathname]);

  return null;
}
