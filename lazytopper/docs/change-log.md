## A1.5 — Topic→Mentor Contract + Context-Aware Visual Spec
- Added `src/contracts/topicMentorContract.ts` defining the Topic→Mentor schema, including visual policy and diagram specs.
- Added `src/contracts/sampleMentorRequests.ts` with validated examples for Maths and Science.
- Added `docs/rulebook.md` to enforce contract/visual rules and export path.
- Created A1.5 contract reports and exports for downstream integration (system prompts + renderer).

### A1.5 Details
- Contract defines identity keys, context anchors, visual policy, and visual spec unions.
- Sample requests cover triangles, trig graphs, straight lines, ray diagrams, circuits, and bio diagrams.
- Designed for server prompting + renderer integration without UI changes.
