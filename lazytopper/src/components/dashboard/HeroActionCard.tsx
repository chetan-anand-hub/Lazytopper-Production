// LEGACY-RETIRED 2026-06-08 - disconnected from product; safe to delete in clean-branch pass.
import { useThemeColors } from "./dashboardUtils";

export interface HeroAction {
  type: string;
  title: string;
  description: string;
  ctaLabel: string;
  onAction: () => void;
}

export interface HeroActionCardProps {
  heroAction: HeroAction;
}

export function HeroActionCard({ heroAction }: HeroActionCardProps) {
  const tc = useThemeColors();
  return (
    <div className="glass-accent" style={{ padding: 20, marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: tc.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Your Next Step</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 20 }}>{heroAction.type === "resume_session" ? "\u23E9" : heroAction.type === "weak_topic" ? "\u26A0\uFE0F" : "\uD83C\uDFAF"}</span>
        <span className="font-display" style={{ fontSize: 16, fontWeight: 700 }}>{heroAction.title}</span>
      </div>
      <p style={{ fontSize: 13, color: tc.textSecondary, lineHeight: 1.5, marginBottom: 14 }}>{heroAction.description}</p>
      <button onClick={heroAction.onAction} style={{
        width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
        background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 15,
        fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
        boxShadow: "0 0 24px rgba(34,197,94,0.3)",
      }}>{heroAction.ctaLabel}</button>
    </div>
  );
}
