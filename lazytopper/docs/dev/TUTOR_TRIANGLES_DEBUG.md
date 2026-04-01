## Observed root cause (Triangles -> AA Similarity Teach flow)

- The TopicHub Tutor drawer auto-fired `/api/mentor` inside a `useEffect` tied to `open/tab/nodeId` without a per-key in-flight guard. During rapid state updates (and in dev with StrictMode), the effect could re-trigger before state settled, producing repeated `/api/mentor` calls for the same `tab:nodeId` key.
- The Tutor validation enforced `diagramType`/`diagramSpec` as mandatory. When the backend returned structured JSON without a diagram payload (common in stub mode or when the model omitted it), the UI surfaced **"Diagram missing. Please retry."** and blocked rendering even though the rest of the content was valid.

Net effect: duplicate mentor requests + a hard UI blocker whenever diagram metadata was missing.
