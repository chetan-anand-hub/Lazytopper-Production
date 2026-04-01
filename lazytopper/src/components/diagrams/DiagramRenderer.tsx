import type { MentorDiagramAnchor, MentorDiagramSpec, MentorDiagramStepLink } from "../../types/mentor";
import { TriangleBasicDiagram } from "./TriangleBasicDiagram";

type Props = {
  diagramSpec?: MentorDiagramSpec | null;
  anchors?: MentorDiagramAnchor[] | null;
  diagramSteps?: MentorDiagramStepLink[] | null;
  /** Optional: current stepId to highlight (future sync with stepper). */
  activeStepId?: string | null;
};

/**
 * DiagramRenderer (UI-owned)
 * - Renders diagrams based on structured diagramSpec (NOT SVG strings).
 * - Starts with the "triangle-basic" template as the golden reference.
 * - Extensible: other templates (graphs, chemistry sketches, physics free-body) can be added later.
 */
export function DiagramRenderer({
  diagramSpec,
  anchors,
  diagramSteps,
  activeStepId,
}: Props) {
  if (!diagramSpec) return null;

  // Step highlighting is future-proofing; for now we just compute a set of anchor ids to highlight.
  const highlightIds = new Set<string>();
  const step = activeStepId
    ? (diagramSteps ?? []).find((s) => s.stepId === activeStepId)
    : undefined;
  (step?.highlightAnchorIds ?? []).forEach((id) => highlightIds.add(id));

  const templateId = (diagramSpec as any).templateId ?? (diagramSpec as any).template ?? "unknown";
  const type = (diagramSpec as any).type ?? "unknown";

  // Template router
  if (type === "triangle" && templateId === "triangle-basic") {
    return (
      <TriangleBasicDiagram
        spec={diagramSpec}
        anchors={anchors ?? []}
        highlightAnchorIds={highlightIds}
      />
    );
  }

  // Fallback (safe): show the raw spec so we never crash in UI.
  return (
    <div className="diagram-fallback">
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Diagram (unhandled template)</div>
      <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
        {JSON.stringify({ type, templateId, diagramSpec, anchors }, null, 2)}
      </pre>
    </div>
  );
}
