import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { AuthProvider } from "./context/AuthContext";
import { ProfileProvider } from "./context/ProfileContext";
import { SmartLearningProvider } from "./engine/smartLearningStore";
import { VibeProvider } from "./context/vibeModeContext";
import { ThemeProvider } from "./context/ThemeContext";

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

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <AuthProvider>
        <ProfileProvider>
          <SmartLearningProvider>
            <VibeProvider>
              <ThemeProvider>
                <App />
              </ThemeProvider>
            </VibeProvider>
          </SmartLearningProvider>
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
