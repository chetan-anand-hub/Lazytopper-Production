import { useState } from "react";
import { useThemeColors } from "./dashboardUtils";

export function EmptyStateCard({ icon, title, description, ctaLabel, onAction, color = "#3b82f6" }: {
  icon: string; title: string; description: string; ctaLabel: string; onAction: () => void; color?: string;
}) {
  const tc = useThemeColors();
  return (
    <div className="glass-card" style={{ padding: 24, textAlign: "center", marginBottom: 16 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div className="font-display" style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <p style={{ fontSize: 12, color: tc.textSecondary, lineHeight: 1.6, marginBottom: 16 }}>{description}</p>
      <button onClick={onAction} style={{
        width: "100%", padding: "11px 0", borderRadius: 10,
        background: `${color}20`, border: `1px solid ${color}40`,
        color, fontWeight: 700, fontSize: 13, cursor: "pointer",
        fontFamily: "'Space Grotesk', sans-serif",
      }}>{ctaLabel}</button>
    </div>
  );
}

export function NewBadge() {
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4,
      background: "rgba(34,197,94,0.15)", color: "#22c55e", marginLeft: 8,
      textTransform: "uppercase", letterSpacing: 0.5, animation: "pulse 2s infinite",
    }}>New!</span>
  );
}

export function FirstVisitOverlay({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const tc = useThemeColors();
  const steps = [
    { icon: "🔥", title: "Start with your Daily Mix", desc: "A quick daily mix of revision, concepts, and practice tailored to you." },
    { icon: "📈", title: "Check Trends & Predictions", desc: "See what's most likely to appear in your boards — focus where it matters most." },
    { icon: "📝", title: "Take a Mock Test when ready", desc: "Full paper simulations with AI marking. Track your progress over time." },
  ];
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: tc.overlayBg, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 360, borderRadius: 20, padding: 28,
        background: tc.isDark ? "#1a1a2e" : "#fff",
        border: tc.isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{steps[step].icon}</div>
          <div className="font-display" style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{steps[step].title}</div>
          <p style={{ fontSize: 13, color: tc.textSecondary, lineHeight: 1.6, margin: 0 }}>{steps[step].desc}</p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: i === step ? "#22c55e" : (tc.isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"),
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              flex: 1, padding: "12px 0", borderRadius: 12,
              border: tc.isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
              background: "transparent", color: tc.textSecondary,
              fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}>Back</button>
          )}
          <button onClick={() => {
            if (step < steps.length - 1) setStep(s => s + 1);
            else onDismiss();
          }} style={{
            flex: 1, padding: "12px 0", borderRadius: 12, border: "none",
            background: "#22c55e", color: "#000",
            fontWeight: 800, fontSize: 14, cursor: "pointer",
            fontFamily: "'Space Grotesk', sans-serif",
            boxShadow: "0 0 20px rgba(34,197,94,0.3)",
          }}>{step < steps.length - 1 ? "Next" : "Let's Go!"}</button>
        </div>

        <button onClick={onDismiss} style={{
          display: "block", width: "100%", marginTop: 12, padding: 8,
          background: "none", border: "none",
          color: tc.textMuted, fontSize: 12, cursor: "pointer",
        }}>Skip intro</button>
      </div>
    </div>
  );
}
