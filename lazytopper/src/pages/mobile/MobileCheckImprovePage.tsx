/**
 * MobileCheckImprovePage — /app/check-improve
 * Stub placeholder. Full implementation in Task #437.
 *
 * Guardrails (enforced in Task #437 full implementation):
 *  - Upload state and graded state are mutually exclusive view states.
 *  - If checkSolutionImage() fails, view stays in 'upload' — never transitions
 *    to a partial graded screen. Error message shown inline above CTA.
 *  - No static/fake graded result data is ever shown as final behaviour.
 */
export default function MobileCheckImprovePage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--mob-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--mob-fg-muted)",
        fontFamily: "var(--font-body)",
        fontSize: 14,
      }}
    >
      Check &amp; Improve screen — Task #437
    </div>
  );
}
