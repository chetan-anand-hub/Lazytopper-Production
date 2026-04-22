import { MobileShell } from "../../components/mobile/MobileShell";

/**
 * MobileWorksheetReadyPage — /app/practice/worksheets/ready
 * Stub placeholder. Full implementation in Task #437.
 *
 * showNav={true}: BottomNav visible. Sticky CTA in full impl will sit at
 * bottom-[68px] (above nav) — enforced in Task #437.
 */
export default function MobileWorksheetReadyPage() {
  return (
    <MobileShell title="Your Worksheet" showBack showNav={true}>
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
        Worksheet Ready screen — Task #437
      </div>
    </MobileShell>
  );
}
