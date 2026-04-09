import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/react";
import App from "./App";
import "./styles.css";
import { AuthProvider } from "./context/AuthContext";
import { ProfileProvider } from "./context/ProfileContext";
import { SmartLearningProvider } from "./engine/smartLearningStore";
import { VibeProvider } from "./context/vibeModeContext";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL || undefined;

if (!clerkPubKey) {
  console.warn("Missing VITE_CLERK_PUBLISHABLE_KEY — Clerk auth will not be available");
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter basename="/app">
      <ClerkProvider
        publishableKey={clerkPubKey || "pk_test_placeholder"}
        proxyUrl={clerkProxyUrl}
      >
        <AuthProvider>
          <ProfileProvider>
            <SmartLearningProvider>
              <VibeProvider>
                <App />
              </VibeProvider>
            </SmartLearningProvider>
          </ProfileProvider>
        </AuthProvider>
      </ClerkProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
