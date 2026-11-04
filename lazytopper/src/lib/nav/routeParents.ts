import { matchPath } from "react-router-dom";

/**
 * NAV-1 (owner, 4 Nov 2026): "How will students know that they have to click the logo to go home? Better to give
 * navigation arrows, and we should have this child-parent navigation from every page, plus an option of going to Home."
 *
 * ONE route -> parent map. Every <Route path> in App.tsx has exactly one entry here (routeParents.test.ts reads App.tsx
 * and fails when a new route has none). An entry is one of:
 *   - home:    the page IS Home ("/" and its aliases) - no Back bar;
 *   - noBack:  a focused flow where a stray tap would lose work (an in-progress test or mock, sign-in, the bare
 *              full-screen surfaces that own their own back button) - no Back bar;
 *   - parent:  where "Back" goes when the student did not arrive from inside the app (an ad, a shared link, a fresh
 *              tab). A constant internal path, or one built from the route's own params - never a URL from the query.
 *
 * NAVIGATION ONLY: nothing here touches grading, pricing, payment or the trial.
 */
export interface RouteNavEntry {
  readonly home?: true;
  readonly noBack?: true;
  readonly parent?: string | ((params: Readonly<Record<string, string | undefined>>) => string);
}

/** Pattern -> entry. Order matters: the first pattern that matches wins, so specific paths come before params. */
export const ROUTE_PARENTS: ReadonlyArray<readonly [string, RouteNavEntry]> = [
  // Home and its aliases.
  ["/", { home: true }],
  ["/welcome", { home: true }],
  ["/browse", { home: true }],

  // Sign-in: a focused flow.
  ["/login", { noBack: true }],
  ["/login/*", { noBack: true }],
  ["/sign-up", { noBack: true }],
  ["/sign-up/*", { noBack: true }],
  ["/intent", { noBack: true }],

  // In-progress tests and mocks, and the other bare full-screen surfaces (each owns its own back button).
  ["/chapter-test/:grade/:subject/:topicKey", { noBack: true }],
  ["/full-mock/:grade/:subject", { noBack: true }],
  ["/topic-mock/:grade/:subject/:topicKey", { noBack: true }],
  ["/exam-simulation", { noBack: true }],
  ["/tutor/:grade/:subject/:topicKey", { noBack: true }],
  ["/tutor/:grade/:subject", { noBack: true }],
  ["/u/:token", { noBack: true }],

  // Buying.
  ["/pricing", { parent: "/" }],
  ["/packs", { parent: "/pricing" }],

  // Public pages.
  ["/legal/:slug", { parent: "/" }],
  ["/contact", { parent: "/" }],
  ["/for-parents", { parent: "/" }],
  ["/check-your-answer", { parent: "/" }],
  ["/cbse/class-10", { parent: "/" }],
  ["/cbq-class-10", { parent: "/" }],
  ["/cbq-class-10/:chapterSlug", { parent: "/cbq-class-10" }],
  ["/ncert-class-10", { parent: "/" }],
  ["/ncert-solutions/:chapter", { parent: "/ncert-class-10" }],
  ["/ncert-exemplar/:chapter", { parent: "/ncert-class-10" }],

  // The cockpit.
  ["/check-improve", { parent: "/" }],
  ["/exam-trends", { parent: "/" }],
  ["/me", { parent: "/" }],
  ["/profile", { parent: "/" }],
  ["/onboarding", { parent: "/" }],
  ["/teacher", { parent: "/" }],
  ["/practice-hub", { parent: "/" }],
  ["/practice/worksheets/ready", { parent: "/practice/worksheets" }],
  ["/practice/worksheets", { parent: "/practice-hub" }],
  ["/practice/:grade/:subject", { parent: "/practice-hub" }],
  ["/weak-area-practice", { parent: "/practice-hub" }],
  ["/highly-probable", { parent: "/practice-hub" }],
  ["/highly-probable/:grade/:subject", { parent: "/practice-hub" }],
  ["/mock-paper/:slug", { parent: "/practice-hub" }],
  ["/mock-builder", { parent: "/practice-hub" }],
  ["/mock-builder/:grade/:subject", { parent: "/practice-hub" }],
  ["/topic-hub", { parent: "/exam-trends" }],
  ["/topic-hub/:grade/:subject", { parent: "/exam-trends" }],
  // NAV-FIX-1: "/topic-hub/:grade/:subject" has no page of its own (it redirects to Exam Trends), and the hub's own old
  // back link went to Exam Trends — so Back goes straight there instead of through the redirect.
  ["/topic-hub/:grade/:subject/:topicKey", { parent: "/exam-trends" }],
  ["/topic-hub/:topicName", { parent: "/exam-trends" }],
  // There is no "/notes" index route: a chapter's notes belong to that chapter's Topic Hub (the page's own back link).
  ["/notes/:topicSlug", { parent: (p) => `/topic-hub/${p.topicSlug ?? ""}` }],
  ["/ai-mentor", { parent: "/" }],
  ["/ai-mentor/:grade/:subject", { parent: "/" }],
  ["/mentor", { parent: "/" }],
  ["/mentor/:grade/:subject", { parent: "/" }],

  // Admin.
  ["/admin/students", { parent: "/" }],
  ["/admin/funnel", { parent: "/admin/students" }],
  ["/admin/visual-audit", { parent: "/admin/students" }],
  ["/admin/cache-stats", { parent: "/admin/students" }],
  ["/admin/difficulty-breakdown", { parent: "/admin/students" }],
  ["/admin/question-reports", { parent: "/admin/students" }],

  // Anything else: Home.
  ["*", { parent: "/" }],
];

/** The short name of a Back target, shown as "← <name>". Unknown targets read "Back". */
export function targetLabel(path: string): string {
  if (path === "/") return "Home";
  if (path === "/pricing") return "Pricing";
  if (path === "/practice-hub") return "Practice";
  if (path === "/practice/worksheets") return "Worksheets";
  if (path === "/exam-trends") return "Exam Trends";
  if (path === "/cbq-class-10") return "CBQ";
  if (path === "/ncert-class-10") return "NCERT Books";
  if (path === "/admin/students") return "Students";
  if (path === "/me") return "Me";
  if (path.startsWith("/topic-hub/")) return "Topic Hub";
  return "Back";
}

/** An internal path only: one leading slash, no scheme, no protocol-relative "//", no backslash. */
export function isInternalNavPath(path: string): boolean {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") && !/[\r\n]/.test(path);
}

export type BackTarget =
  | { readonly kind: "history"; readonly to: string; readonly label: string; readonly showHome: true }
  | { readonly kind: "parent"; readonly to: string; readonly label: string; readonly showHome: boolean };

interface RouteMatch {
  readonly entry: RouteNavEntry;
  readonly params: Readonly<Record<string, string | undefined>>;
}

function matchRoute(pathname: string): RouteMatch {
  for (const [pattern, entry] of ROUTE_PARENTS) {
    if (pattern === "*") return { entry, params: {} };
    const m = matchPath({ path: pattern, end: true }, pathname);
    if (m) return { entry, params: m.params };
  }
  return { entry: { parent: "/" }, params: {} };
}

export function findRouteEntry(pathname: string): RouteNavEntry {
  return matchRoute(pathname).entry;
}

/**
 * Where the header's Back control goes on `pathname`, or null when the page shows no Back bar (Home, focused flows).
 *   (a) the student arrived from inside the app (react-router's history idx > 0) -> one step back, "← Back";
 *   (b) otherwise -> the page's parent from ROUTE_PARENTS, labelled with the parent's short name.
 * `to` is always an internal path (the parent), so the control is a real link even without JS.
 * When the parent IS Home, the separate Home control is dropped (it would be the same link twice).
 */
export function resolveBackTarget(pathname: string, historyIdx: number | null): BackTarget | null {
  const { entry, params } = matchRoute(pathname);
  if (entry.home || entry.noBack) return null;
  const raw = typeof entry.parent === "function" ? entry.parent(params) : entry.parent ?? "/";
  const parentPath = isInternalNavPath(raw) && !raw.includes("//") ? raw : "/";
  if (typeof historyIdx === "number" && historyIdx > 0) {
    return { kind: "history", to: parentPath, label: "Back", showHome: true };
  }
  return { kind: "parent", to: parentPath, label: targetLabel(parentPath), showHome: parentPath !== "/" };
}

/** react-router's own history index (BrowserRouter writes `{ idx }` into history.state). Null when unreadable. */
export function readHistoryIdx(): number | null {
  try {
    const idx = (window.history.state as { idx?: unknown } | null)?.idx;
    return typeof idx === "number" ? idx : null;
  } catch {
    return null;
  }
}
