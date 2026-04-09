import { useState } from "react";
import { useNavigate } from "react-router-dom";

const DISMISS_KEY = "lazytopper.sharePrompt.dismissed";

function isDismissedRecently(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < 24 * 3600000;
  } catch { return false; }
}

function dismissPrompt(): void {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
}

interface ShareProgressPromptProps {
  triggerType: "mock" | "milestone";
  score?: number;
  subject?: string;
  milestone?: string;
}

export default function ShareProgressPrompt({ triggerType, score, subject, milestone }: ShareProgressPromptProps) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(!isDismissedRecently());

  if (!visible) return null;

  const handleDismiss = () => {
    dismissPrompt();
    setVisible(false);
  };

  const handleShare = () => {
    dismissPrompt();
    navigate("/weekly-digest");
  };

  const message = triggerType === "mock"
    ? `You scored ${score}% in ${subject || "your mock"}!`
    : milestone || "You reached a new milestone!";

  return (
    <div style={{
      padding: "14px 16px", marginBottom: 16, borderRadius: 14,
      background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(59,130,246,0.06))",
      border: "1px solid rgba(34,197,94,0.2)",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{ fontSize: 28, flexShrink: 0 }}>🎉</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{message}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Share your progress with your parents?</div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={handleShare} style={{
            padding: "6px 14px", borderRadius: 8, border: "none",
            background: "#22c55e", color: "#000", fontWeight: 700, fontSize: 11, cursor: "pointer",
          }}>Share Progress</button>
          <button onClick={handleDismiss} style={{
            padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent", color: "rgba(255,255,255,0.4)", fontWeight: 600, fontSize: 11, cursor: "pointer",
          }}>Not Now</button>
        </div>
      </div>
    </div>
  );
}
