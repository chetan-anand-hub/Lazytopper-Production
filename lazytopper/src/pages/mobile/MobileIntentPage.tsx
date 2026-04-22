import { MobileShell } from "../../components/mobile/MobileShell";

/**
 * MobileIntentPage — /app/intent
 * Stub placeholder. Full implementation in Task #437.
 *
 * showNav={false}: BottomNav is hidden on /app/intent* by App.tsx visibility gate.
 * No title shown: baseline intent screen is a full-screen hero with no header bar.
 */
export default function MobileIntentPage() {
  return (
    <MobileShell showNav={false}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          color: "var(--mob-fg-muted)",
          fontFamily: "var(--font-body)",
          fontSize: 14,
        }}
      >
        Intent screen — Task #437
      </div>
    </MobileShell>
  );
}
