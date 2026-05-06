import type { StepSolutionResponse } from "../../ai/aiClient";

export function SolutionSourceNotice({ solution }: { solution: StepSolutionResponse }) {
  const label = solution.studentFacingLabel || "AI-generated board-style solution";
  const notice = solution.studentFacingNotice;
  return (
    <div style={{ marginBottom: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(59,130,246,0.2)", background: "rgba(59,130,246,0.06)" }}>
      <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--color-light-blue)" }}>{label}</div>
      {notice && <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 2 }}>{notice}</div>}
    </div>
  );
}
