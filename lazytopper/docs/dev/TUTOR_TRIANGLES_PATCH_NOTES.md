## Summary

This patch stabilizes the TopicHub Tutor flow for Triangles (AA similarity) by stopping duplicate mentor calls, guaranteeing a deterministic SVG diagram fallback, and embedding diagram intent/spec in server responses.

## Files changed

- `src/pages/TopicHub.tsx`
- `src/components/DiagramBlock.tsx`
- `src/tutor/diagram/diagramTypes.ts` (new)
- `src/tutor/diagram/diagramTemplates.ts` (new)
- `src/tutor/diagram/DiagramSvg.tsx` (new)
- `server/index.cjs`
- `docs/dev/TUTOR_TRIANGLES_DEBUG.md` (new)

## Before / After

- Before: opening Teach/Board Examples could fire multiple `/api/mentor` requests per step, and the UI blocked on **"Diagram missing"** whenever structured responses omitted diagram metadata.
- After: a per-key in-flight guard plus one-time auto-trigger prevents request spam, and missing diagram payloads are filled with deterministic AA similarity templates so the diagram always renders.

## How to extend templates

1. Add a new `DiagramSpec` variant in `src/tutor/diagram/diagramTemplates.ts`.
2. Update `getDiagramTemplate(...)` routing logic to select the new template for a topic/node/title.
3. If you want new visual tokens (stroke/labels/colors), override the theme in the returned `DiagramSpec`.
