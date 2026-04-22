import { MobileShell } from "../../components/mobile/MobileShell";

/**
 * MobileCheckImprovePage — /app/check-improve
 * Stub placeholder. Full implementation in Task #437.
 *
 * Grading guardrails (enforced in Task #437):
 *  - Upload view and graded view are mutually exclusive states.
 *  - On checkSolutionImage() failure: view stays in 'upload', error shown inline.
 *    View NEVER transitions to a partial graded screen on failure.
 *  - No static or fake graded result data is shown as final behaviour.
 */
export default function MobileCheckImprovePage() {
  return (
    <MobileShell title="Check & Improve" showBack showNav={true}>
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
        Check &amp; Improve screen — Task #437
      </div>
    </MobileShell>
  );
}
