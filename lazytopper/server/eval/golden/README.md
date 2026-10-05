# Golden evaluation — the grader's standing regression test

The golden set is the GRADER-AUDIT-1 audit's examiner-verified set, committed with the scorer
that measures the grader against the owner's targets. It runs two ways:

- **In CI, with zero model calls (G1).** `goldenGate.cjs` replays the stored raw model responses
  of the committed baseline run through the CURRENT post-processing (the real route handlers)
  and scores them. The network is hard-blocked in that process. It prints one line,
  `GOLDEN: <metric=value ...> calls=0 floor=<file> verdict=PASS|FAIL`, and fails if any metric
  in `floor.json` regresses (each one named). Workflow: `.github/workflows/golden-eval.yml`.
- **Live, on demand.** `goldenLive.cjs` runs the whole set through both entry points with a real
  model and stores a new run under `runs/`; `goldenJudge.cjs` adds the LLM-judge verdicts.

None of this changes production grading. Read the numbers in the newest run's scorecard, not
here: counts and percentages written into prose go stale.

## What is here

| path | what |
|---|---|
| `data/verify/items.verified.json` | the 43 examiner-verified items (24 Maths, 19 Science), 51 answer cases, every value point cited to a CBSE marking scheme (`SOURCES.md`) — **the expectation base** |
| `data/verify/expected_flat.verified.json`, `changelog.json`, `verify-report.md` | the verifier's flat flags, change log and report |
| `data/supplement/items.supplement.json` | GS-SUP-01..03 (a departure that returns, a withdrawn law, a miscopied value) |
| `data/items.json`, `data/expected_flat.json`, `data/README.audit-S2.md`, `data/SYLLABUS_CHECK.md` | the original (pre-verification) set, its README and the 2026-27 syllabus check (banned sub-topic strings copied from `scripts/src/syllabusGuard.ts`) |
| `images/` | 10 answer photos + their app-compressed variants. **All SYNTHETIC** (rendered handwriting on a ruled page with photo degradation; `manifest.json` `synthetic: true`, each image case `synthetic: true`) |
| `owner-anomaly-01/` | the owner's own 10-question mixed paper. **REAL** (owner-supplied, 5 Oct 2026): question paper, answer sheet (3 pages), what the grader returned, the owner's key, and `case.json` (the golden case). PII-checked page by page; see `case.json` `piiCheck`. The answer pages are typed in a handwriting-style font, not photographed (`renderingNote`) |
| `probes/injection.json` + 2 images | the audit's prompt-injection probes, each with a clean twin (images SYNTHETIC) |
| `truth/targets.json` | the owner's targets as data |
| `truth/rules.json` | the truth rules as data: each rule, and whether it is checked deterministically (CI) or by the stored LLM-judge verdicts |
| `truth/repins.json` | the owner rulings (2)-(7) applied on top of the verified expectations, each guarded by its old value; plus the cases the rulings leave unsettled |
| `truth/locators.json` | the wrong-step locators (ported from the audit's S6 scorer) |
| `truth/topic_vocab.json` | the canonical topic vocabulary (`src/lib/desktop/topics.ts`) |
| `fixtures/ci_detect.audit-S3.json` | the audit's recorded detect results, used to build Check & Improve request bodies so every config grades identical requests |
| `runs/<run-id>/` | a stored run: `manifest.json`, `run<k>.jsonl` (one line per job: request digest, the RAW model text of every model call, latency and tokens, the digest of the live response), `detect.jsonl`, optional `judge.json` |
| `floor.json` | the metrics G1 must not fall below (PR-1: the committed baseline; PR-2 raises it to the acceptance bar) |
| `shapes/callsites.json`, `shapes/snapshot.json` | P15: every live client call site's request fields and the response fields it reads; G2 pins today's response shape per call site |
| `lib/` | data loader, planner (request shapes), driver (real handlers), live client, replay, network block, scorer, truth checks, shape guard, PDF writer, redactor |
| `SOURCES.md` | the marking-scheme sources (not committed: 341 MB), by file, URL, year and sha256 |

## Request shapes (P15, read at 53fe4d22)

Single entry `/api/check-solution` (`handleCheckSolution`):
- **CI-SINGLE** (also the signed-out free check, the QR answer hand-off and the Tutor overlay — identical body): `question`, `subject`, `topic` (detect's label), `marks` (the true marks: as if the student corrected the marks chip), `objective` only when detect said so, `textAnswer` or the compressed photo.
- **HPQ** (SolutionChecker): `question`, `marks`, `subject`, `topic`, `solutionSteps`, `finalAnswer`, answer.

Set entry `/api/grade-worksheet` (`handleGradeWorksheet`):
- **PARITY**: the CI-SINGLE content of 4-5 cases per request (typed batch / per-question photo uploads) — the single-vs-set probe on identical input.
- **QP-BATCH**: bank fields + `textAnswer` + `pickedOption` + photo `uploads`.
- **WS / CT / FM**: bank fields + ONE application/pdf (the photos, one per page, labelled "Qn.").
- **CI-MULTI**: detect questions, every block labelled with the session topic, `objective` always boolean, ONE document. The owner paper runs here with the TRUE printed question texts and marks (grading is measured apart from detection; detection is measured by its own jobs).

Detect `/api/detect-question`: one job per item (chapter), the owner's question paper, and the owner's ten questions one by one.

## Run it

```bash
# CI gate (zero calls)
pnpm --filter lazytopper run eval:golden
node --test server/eval/golden/golden.test.cjs server/eval/golden/shapes.test.cjs

# Live (manual; the key is loaded only into this command and never printed)
set -a; . ~/.lazytopper-eval.env; set +a; unset GEMINI_MODEL; \
  pnpm --filter lazytopper run eval:golden:live -- --config A --runs 3 --concurrency 4 --detect
set -a; . ~/.lazytopper-eval.env; set +a; unset GEMINI_MODEL; \
  pnpm --filter lazytopper run eval:golden:judge -- --run-dir server/eval/golden/runs/<run-id>
```

`--config A|B|C` = `gemini-2.5-flash` dynamic thinking (production default) / `gemini-3.1-pro-preview`
default thinking / `gemini-3.1-pro-preview` with thinkingBudget 2048 on the grading calls (B/C were
specified as `gemini-2.5-pro`, which the eval key's project is refused: "no longer available to new
users"). Every HTTP request is a line in the call ledger; a hard cap is checked before a request is
sent, and a key or billing failure (HTTP 401/402/403) stops the run.

**Provider timeout.** The harness uses the real client, so the timeout is `GEMINI_TIMEOUT_MS` from
the shell (code default 55 s). Production sets it on Railway — 80 s from 2026-10-05 — so pass the
production value explicitly in the same command as the key load
(`... unset GEMINI_MODEL; GEMINI_TIMEOUT_MS=80000 pnpm --filter lazytopper run eval:golden:live -- ...`).
Each run's `manifest.json` (`timeoutMs`) and every ledger line record the value used. The committed
PR-1 baseline ran at 55 s (the production value on the day it ran); its owner-paper diagnostic at 180 s.

Scorecard for one or more stored runs (zero calls):
`node server/eval/golden/goldenReport.cjs --run <run-dir> [--run <run-dir> ...] [--md out.md]`

## When the grader changes (PR-2, PR-3)

- A post-processing change moves replayed grades: `changed=` in the GOLDEN line counts them; the
  gate fails only if a floor metric drops.
- A prompt or call-shape change needs a NEW live run (a stored response answers the old prompt).
  Record it with `goldenLive.cjs`, judge it, point `floor.json` at it and raise the floor.
- Requests without `acceptsV2` must keep every G2 snapshot (`shapes.test.cjs`).

## Bounds of the evidence

- The stubs are the audit's: no fair-use / idempotency / entitlement middleware (the handler is
  called directly) and a solution cache that returns null (production with no `DATABASE_URL`).
- All golden photos are synthetic; owner-anomaly-01 is real but typed in a handwriting font.
  Real phone-photo reading is not established.
- The LLM judge is a different ruler from the audit's S3j judge; its verdicts are stored with
  the digest of the output judged and ignored once that output changes.
