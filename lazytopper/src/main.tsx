import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App, { extractPrerenderedRoute } from "./App";
import "./styles.css";
import { AuthProvider } from "./context/AuthContext";
import { ProfileProvider } from "./context/ProfileContext";
import { SmartLearningProvider } from "./engine/smartLearningStore";
import { VibeProvider } from "./context/vibeModeContext";
import { ThemeProvider } from "./context/ThemeContext";
import RouteAnalytics from "./analytics/RouteAnalytics";

// ★ THE DUPLICATE-ID CHECK IS NOT HERE ANY MORE — PERF-1. It ran at module scope, and
// it was the SINGLE eager import that pulled the whole question bank into the main
// bundle: 7.87 MiB shipped to every visitor, including the ones who never open a
// question. Every real consumer of the bank is already code-split behind lazy(); this
// one line undid that for all of them.
//
// ⚠ AND IT COULD NOT EVEN FAIL HERE. Its throw is guarded by `import.meta.env.DEV`
// (checkDuplicateQuestionIds.ts:64), so a production build only ever wrote to the
// student's console. It cost everyone and protected no one.
//
// It now runs in `src/data/checkDuplicateQuestionIds.test.ts`, which CI executes as a
// required gate with no exclusions — so a duplicate id fails a BUILD instead of
// whispering into a browser console. Deleting the call without that test would have
// been deleting the check.

// SEO-5 PR-2 (D3) — KEEP THE FIRST ROUTE'S PRERENDERED MARKUP. `createRoot` (no hydration —
// unchanged) discards whatever the served HTML put in #root on its first commit. Cut the route
// region out first, so the first route's Suspense fallback can show THAT instead of
// "Loading..." until the route is ready (see `withRouteSuspense` in App.tsx). Null on any
// page that was not prerendered, which then behaves exactly as before.
const rootElement = document.getElementById("root") as HTMLElement;
const prerenderedRoute = extractPrerenderedRoute(
  rootElement,
  window.location.pathname.slice(import.meta.env.BASE_URL.replace(/\/$/, '').length) || "/",
);

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      {/* Page views for a client-side router: one document load, then every "page" is a
          route change. Renders nothing; inside the router so it can read the location,
          outside every provider so it depends on none of them. Disabled automatically in
          the SEO capture — see analytics/analytics.ts. */}
      <RouteAnalytics />
      <AuthProvider>
        <ProfileProvider>
          <SmartLearningProvider>
            <VibeProvider>
              <ThemeProvider>
                <App prerenderedRoute={prerenderedRoute} />
              </ThemeProvider>
            </VibeProvider>
          </SmartLearningProvider>
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
