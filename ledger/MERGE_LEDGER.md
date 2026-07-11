# Merge Ledger (machine-generated -- do not hand-edit rows)

Every push to the trunk branch (`base/approved-thru-437`) appends one row here via
`.github/workflows/state-board.yml` + `scripts/ops/state_board.mjs`. It is the machine
record of *what merged when*, so no one has to trust a hand-copied SHA. The human
narrative stays in `CURRENT_STATE.md` and `SESSION_LOG.md`; this file is append-only
plumbing -- newest row first, directly under the marker below.

| Date (UTC) | SHA | PR | Subject | Files | Top-level dirs |
| --- | --- | --- | --- | --- | --- |
<!-- LEDGER:INSERT (newest rows are added directly below this line) -->
| 2026-07-11T10:12:05Z | `b920440` | #366 | ci(coordination): lane-overlap guard + state-board ledger + CODEOWNERS | 6 | .github, ledger, scripts |
