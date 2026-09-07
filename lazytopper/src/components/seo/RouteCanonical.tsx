import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { appBasename, canonicalFor } from "../../config/canonicalUrl";

/**
 * ROUTE CANONICAL — writes this page's own address into the document head.
 *
 * ★ MOUNTED ONCE, NOT PER ROUTE, DELIBERATELY. `/topic-hub` is registered
 * TWICE in App.tsx with identical paths; React Router breaks an exact tie by
 * declaration order, so the SECOND registration never renders. A head
 * component mounted into that route element would be dead code that no test
 * would catch, because both registrations produce the same URL. Reading
 * `useLocation()` from a single mount sidesteps the whole class: the resolver
 * sees the pathname, never the route table.
 *
 * ★ ONE COMPUTED STRING FEEDS BOTH TAGS. `head.guard.test.ts` asserts that
 * `og:url` is BYTE-identical to the canonical. That holds here by
 * CONSTRUCTION — there is one `url` and both writes take it — rather than by
 * two code paths that happen to agree today.
 *
 * ⚠ THE `index.html` LITERALS STAY. They are the correct default for the root
 * page, and they are what a crawler that never runs the script sees. This
 * component OVERRIDES them per route; it does not replace them. Deleting them
 * would fail the guard that reads that file from disk, and a page with no
 * canonical at all is worse than one with a wrong one.
 */
export default function RouteCanonical({ basename }: { basename?: string }): null {
  const { pathname } = useLocation();

  useEffect(() => {
    // ONE string. Both tags below are written from this and nothing else.
    const url = canonicalFor(pathname, basename ?? appBasename());

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", url);

    let meta = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("property", "og:url");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", url);
  }, [pathname, basename]);

  return null;
}
