/**
 * NAV-1 - the EAGER half of the Back/Home row: which pages show NO row - Home itself ("/", "/welcome", "/browse") and
 * the focused flows (in-progress Chapter Test / Full Mock / Exam Simulation, the tutor and QR-upload full-screen
 * surfaces, sign-in, the intent screen). One regex because it ships in the entry chunk (PERF-3 budget); the full
 * route -> parent map (routeParents.ts) loads lazily with the row. routeParents.test.ts proves the two agree on every
 * route in App.tsx.
 */
const HIDDEN = /^\/(welcome|browse|exam-simulation|intent)?$|^\/(chapter-test|full-mock|topic-mock|tutor|u)\/|^\/(login|sign-up)(\/|$)/;

export function isRouteNavHidden(pathname: string): boolean {
  return HIDDEN.test(pathname);
}
