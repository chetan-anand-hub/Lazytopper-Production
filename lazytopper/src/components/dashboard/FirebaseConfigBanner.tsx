// LEGACY-RETIRED 2026-06-08 - disconnected from product; safe to delete in clean-branch pass.
import { useState } from "react";
import { firebaseConfigured } from "../../services/firebaseClient";

export function FirebaseConfigBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (firebaseConfigured || dismissed) return null;

  const env = import.meta.env;
  const missing: string[] = [];
  if (!env.VITE_FIREBASE_API_KEY) missing.push("VITE_FIREBASE_API_KEY");
  if (!env.VITE_FIREBASE_AUTH_DOMAIN) missing.push("VITE_FIREBASE_AUTH_DOMAIN");
  if (!env.VITE_FIREBASE_PROJECT_ID) missing.push("VITE_FIREBASE_PROJECT_ID");
  if (!env.VITE_FIREBASE_APP_ID) missing.push("VITE_FIREBASE_APP_ID");
  if (!env.VITE_FIREBASE_MESSAGING_SENDER_ID) missing.push("VITE_FIREBASE_MESSAGING_SENDER_ID");

  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      margin: "0 -4px 16px",
      padding: "12px 14px",
      borderRadius: 12,
      background: "rgba(239,68,68,0.10)",
      border: "1px solid rgba(239,68,68,0.35)",
    }}>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        style={{
          position: "absolute", top: 8, right: 10,
          background: "none", border: "none", cursor: "pointer",
          fontSize: 16, color: "#ef4444", lineHeight: 1, padding: 2,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>☁️</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 4 }}>
            Cloud sync is off — student data won't persist across devices
          </div>
          <div style={{ fontSize: 12, color: "#fca5a5", lineHeight: 1.5, marginBottom: 6 }}>
            Firebase is not configured. Add these Replit Secrets to enable cloud backup:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {missing.map((key) => (
              <code key={key} style={{
                fontSize: 10, padding: "2px 6px", borderRadius: 4,
                background: "rgba(239,68,68,0.15)", color: "#fca5a5",
                fontFamily: "monospace",
              }}>
                {key}
              </code>
            ))}
            <code style={{
              fontSize: 10, padding: "2px 6px", borderRadius: 4,
              background: "rgba(239,68,68,0.15)", color: "#fca5a5",
              fontFamily: "monospace",
            }}>
              FIREBASE_SERVICE_ACCOUNT_KEY
            </code>
          </div>
          <div style={{ fontSize: 11, color: "#f87171", marginTop: 6 }}>
            See <strong>FIREBASE_SETUP.md</strong> at the repo root for step-by-step instructions.
          </div>
        </div>
      </div>
    </div>
  );
}
