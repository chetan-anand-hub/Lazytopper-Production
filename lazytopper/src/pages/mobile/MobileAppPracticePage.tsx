import { MobileShell } from "../../components/mobile/MobileShell";

/**
 * MobileAppPracticePage — /app/practice
 * Stub placeholder. Full implementation in Task #437.
 */
export default function MobileAppPracticePage() {
  return (
    <MobileShell title="Practice" showNav={true}>
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
        Practice screen — Task #437
      </div>
    </MobileShell>
  );
}
