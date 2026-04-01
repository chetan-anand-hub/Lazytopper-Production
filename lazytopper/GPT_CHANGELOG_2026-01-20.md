# GPT_CHANGELOG_2026-01-20

Files changed:
- src/pages/TopicHub.tsx: wired Learn-tab mentor requests with diagram rendering, fixed Board Steps vs Solve With Me routing, added doubt-context chat flow.
- src/components/DiagramBlock.tsx: new reusable SVG diagram block keyed by diagramType.
- server/index.cjs: enforced diagram metadata in Learn/Triangles prompts, strengthened mindmap/proof templates, normalized marking totals, and injected doubt context.
- src/types/mentor.ts: added diagramType/diagramLabels to structured mentor responses.

Why:
- Learn tab mentor responses needed mandatory diagrams, correct mode routing, consistent marks, and richer mindmap/proof outputs.
- Students needed real-time doubt clarification with context carried to the mentor.

Before/After behavior:
- Before: Board Steps could start Solve With Me, diagrams were missing or only described, mindmap/proof outputs were generic, and step marks could mismatch totals.
- After: Board Steps stays in board_steps_ms, every Learn response renders a diagram block, mindmap/proof outputs follow CBSE structure with diagram metadata, and step marks are normalized to the total.

Migration notes:
- No data migrations required.
- Backend now accepts optional payload.doubtContext and may return diagramType/diagramLabels in mentor JSON.

---

Learn DoD Run2 + Security updates:
- Added Learn-mode structured schemas with multi-pass repair + seed fallback to avoid student-facing schema errors.
- Made Learn mentor headers mode-specific (Lesson Plan) and added explicit card context in mentor payloads.
- Expanded deterministic triangle diagrams and added a zoom toggle.
- Hardened secret handling: updated `.gitignore`, placeholder-only `server/.env.example`, and added security notes.
