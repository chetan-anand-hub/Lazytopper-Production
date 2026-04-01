# Codex Review Packet Standard

This README is tracked as stable reviewer guidance.

Generated packet instances are local-only:
- `docs/project_memory/review_packets/<task-id>_review.md`
- `docs/project_memory/review_packets/<task-id>_review.json`
- older timestamped packet instances in this folder

Do not commit generated packet instances by default. Commit only stable instructions, contracts, and optional reusable templates under `docs/project_memory/review_packets/templates/`.

Task-scoped evidence bundle:
- `docs/project_memory/test_runs/<task-id>/manifest.json`
- `docs/project_memory/test_runs/<task-id>/...task-scoped proof artifacts...`
- generated local packet instance: `docs/project_memory/review_packets/<task-id>_review.md`
- generated local packet instance: `docs/project_memory/review_packets/<task-id>_review.json`
- `.project_memory/ops/out/<task-id>/...machine-readable reports...`

Required review packet sections:
- `## Task id`
- `## Reviewer entry point`
- `## Evidence bundle`
- `## Task summary`
- `## Changed files`
- `## Tests run`
- `## Pass/fail`
- `## Manual QA path`
- `## Assumptions`
- `## Known risks`
- `## Reviewer checklist`

Purpose:
- give reviewers one deterministic entry point
- bind claims to one exact task-scoped evidence bundle
- capture assumptions and residual risks before lane-wise commit/push
- keep reusable review instructions tracked while leaving task-run evidence local-only

Mandatory validation loop for future product tasks:
1. `npm run test:software-bot`
2. `npm run test:persona-gate`
3. `npm run test:persona-browser-gate`
4. `npm run test:browser:mentor` when mentor behavior is touched
5. the most relevant additional targeted browser journey if the touched surface already has one

Software-testing bot scope:
- `test:software-bot` is the technical/runtime counterpart to the persona gates.
- It is responsible for deterministic build/runtime/journey/governance correctness signals.
- It does not replace persona or pedagogy review; it complements them.
- It is honest about web-now coverage vs mobile-later structure.
- It now resolves scope guard in a lane-aware way from the current changed surface by default, with `--lane=product` or `--lane=tooling` available as explicit overrides.
- It now includes a deterministic mentor runtime smoke in product/full runs. Use `npm run test:mentor:smoke` to run that check directly.

Validation layers:
- Structural validation checks the required headings exist.
- Semantic validation checks the packet is genuinely useful and truthful. It must align with the task manifest, changed files, executed tests, manual QA file, and proof artifacts.

Manifest-driven approval:
- `manifest.json` is the primary evidence contract for V3 review.
- Gatekeeper should prefer task-scoped evidence whenever `--task-id` is provided.
- Latest-artifact fallback remains only for older tasks and should be treated as weaker evidence.
- `docs/project_memory/test_runs/**`, `docs/project_memory/strategy_reports/**`, generated packet instances in this folder, and `.project_memory/**` are generated evidence and should remain local-only unless deliberately promoted elsewhere.

When browser journeys are required:
- TopicHub, Practice, Mentor, and tutor-path changes should carry browser journey proof.
- Quality-gate or review-workflow changes should include browser journey proof plus semantic packet validation.
- Browser journey coverage now supports scenario/state variants such as new student, weak student, revision-mode student, returning student, and advanced/high-agency student.

Advanced student persona:
- `advanced_value_seeking_student` exists to ensure LazyTopper still delivers depth, sharp reasoning, and efficient navigation for strong students.
- Approval packets should mention this persona when the task affects chapter depth, routing to high-value practice, or board-readiness surfaces.

What reviewers can trust more strongly:
- task-scoped manifest + packet linkage
- browser journey JSON reports with scenario-aware evidence
- browser persona reports for student/tutor variation
- evidence-linked semantic packet validation for approval-packet truthfulness

What remains manual:
- nuanced visual polish and layout quality
- subtle pedagogy/curriculum judgment beyond deterministic signals
- whether the chosen chapter sequencing feels optimal for real students at scale
- long-tail browser/device combinations not covered by the current high-value journey set
