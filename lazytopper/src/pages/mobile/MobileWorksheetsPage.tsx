import { MobileShell } from "../../components/mobile/MobileShell";

/**
 * MobileWorksheetsPage — /app/practice/worksheets
 * Stub placeholder. Full implementation in Task #437.
 */
export default function MobileWorksheetsPage() {
  return (
    <MobileShell title="Worksheets" showBack showNav={true}>
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
        Worksheets screen — Task #437
      </div>
    </MobileShell>
  );
}
