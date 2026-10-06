# BANK-FIX-1 PR-2 — handover (decided, NOT applied)

**Status:** every PR-2 row decision is made and saved here. **Nothing is applied to product code.** The independent re-solve (ruling 6) has **not** run.

The owner stopped the cloud lane for cost (2026-10-06). A local controller continues from this folder. This branch carries only files under `ops/reports/bank-fix-1-pr2/` and **must never be merged**.

- **Base for PR-2:** PR-1 = #962 (`fix/bank-fix-1-pr1-wrong-answers`). Start PR-2 from #962's merged trunk, never from a stacked branch.
- **Spec:** BANK-FIX-1 (sha256 prefix `3D955A41279F`), owner rulings 1–6.
- **Audit record:** PR #960 (its CSVs are the input flags).

## What is decided

| Bucket | Count | File |
|---|---|---|
| Row fixes (bank 575 · HPQ 33 · predicted 16 · promptD 1) | 625 | `decisions/decisions2.json` → `final` |
| Patches ready for `tools/apply.py` (fixes + mechanical + source overrides) | 1,144 | `decisions/patches2.json` |
| Withholds (bank 183 · promptD 1) | 184 | `decisions/withholds2.json` |
| … of which missing figure (list for the figures task) | 73 | `decisions/figure-withholds.md` |
| … duplicates (loser of each pair; the kept row is named) | 48 | `decisions2.json` → `dup` |
| … out-of-syllabus 47 · limit 7 · garbled 6 · formative-only 2 · syllabus-excluded 1 | 63 | |
| Rows moved to **Others** (`sourceOverride: "others"`, `pyqYear` / `pyqSet` / `isPYQ` removed) | 862 | `patches2.json` (`override: true`) |
| … content changed (ruling 2) | ~513 | `decisions2.json` → `override` |
| … year not confirmable (AI-pack / authored / third-party extract rows carrying `pyqYear`) | ~372 | `decisions2.json` → `unconfirmed` |
| promptD model answers + step-mark schemes (`ok`) | 241 of 247 | `agent-outputs/promptD-answers/p01–p10.json` |
| Rejected flags (the audit was wrong; row left as is) | 92 | `final` (verdict `reject`) |
| Figure re-check: rows with a **bound** figure, re-judged by viewing the image | 63 | `agent-outputs/figure-recheck/` (keep 20 · fix 38 · withhold 5) |

### Mechanical changes inside `patches2.json` (field `why` starts with `mech:`)
- **`mech:objective-1-mark` (221 rows).** An MCQ or Assertion-Reason row tagged 2 or 3 marks / Section B or C is set to `marks: 1`, `section: "A"` (and `cbseFormat: "A"` where the row has it). Source: `mech_obj.json`.
- **`mech:ar-options` (21 rows: 18 predicted + `2026-TRI-P1-A-011/014/020`).** Option-less A-R rows get the standard four options; `answer` (and `finalAnswer`) is set to the exact option text, 1 mark, Section A.
  - The three `2026-TRI-P1` rows sit in the `triangles.pack1.ts` factory, so add `options` and a per-item `cbseFormat` to the spec there.
- **`mech:format-follows-marks` (9 rows).** `AP2-019`, `CC2-051`, `REP2-047`, `MNM2-024`, `MNM2-046` and `PL2-038` → `Short`; `CFPQ-S-CARB-017`, `CFPQ-S-LIFE-012` and `CFPQ-S-LIFE-015` → `Case-Based`.

### Not in `patches2.json` — do these by hand
1. **The trig pack1 factory (45 rows in `pr2_mech_sets.json` → `trig45`).** These are Section A "write sin A" rows with no options, served as MCQ. In `questionBanks/class10/maths/trigonometry.pack1.ts` → `makeTrigQuestion`:
   ```ts
   format: spec.cbseFormat === "A" && !spec.options ? "VSA" : FORMAT_BY_SECTION[spec.cbseFormat],
   ```
   Seven b43 fixes on pack1 rows (`C-009/010/020/025`, `D-001` → B; `D-009/010` → C) change section and marks. A factory derives marks from `cbseFormat`, so apply them as a per-item `cbseFormat` (`GroupSpec` allows it), not as `section` / `marks`.
   - `apply.py` treats only `trigonometry.pack1.ts` as a factory. Check the other `*.pack1.ts` patches with `verify.py`; a derived-field error means the factory spec needs the same mapping.
2. **The promptD stem bug — a real served defect, found by this lane.** `mapUnifiedQuestionToPractice` (`components/practice/practiceQuestionBuilder.ts:368`) reads only `questionText`, but promptD rows keep their stem in `text`. So **every promptD fallback question is served with an EMPTY stem**: a one-row run gave `{"id":"M-POLY-1",…,"questionText":"",…}`.
   - Fix: `questionText: String(question?.questionText ?? question?.text ?? "").trim()`, and pass `finalAnswer` through as well. Pin it with a test.
3. **promptD answers.**
   - Add optional `answer?`, `finalAnswer?` and `solutionSteps?` to `PracticeQuestion` in `promptDPracticePacks.ts`.
   - Write the 241 `ok` answers from `agent-outputs/promptD-answers/` into the rows, and apply each `text_fixed` there.
   - Apply b34's `M-CIR-4` fix (remove "In figure", marks 3 → 2).
4. **promptD repairs and withholds.** These rows are LazyTopper-authored, so repair them where natural:
   - `M-PLE-8`: total ₹2500 → ₹2400 (answer: 10 adult, 15 child).
   - `M-AP-9`: target sum 136 → 126 (n = 7).
   - Withhold `M-STAT-7` (skewness), `M-STAT-8` (table missing; figures list), `S-HER-14` (ABO blood groups) and `M-PLE-7` (garbled data). There is no promptD withhold mechanism yet: add a `PROMPT_D_WITHHELD_IDS` set and filter the pack `questions` arrays at module end. Ids never change.
5. **Remove the 19 `-D2` drill copies** (`promptDPracticePacks.ts` ~line 2466). Build the `trigonometry` alias pack from `seed` only (21 rows), with no "(Drill variant)" clones.
6. **The Human Eye fallback pack is unreachable** (found by this lane). `resolvePracticePackKey` returns `human_eye_and_colourful_world`, but the pack key is `human_eye_colourful_world`. Add an alias next to the trigonometry alias block.
   - The audit's `heredity_evolution` / `metals_nonmetals` and HPQ "The Human Eye & the Colourful World" flags are **false positives**: the resolver and `mergeBucketsByTopic.TOPIC_ALIASES` already map them. They were rejected.
7. **Unbind the figures of withheld or mismatched rows.** Remove these rows' entries from `data/figures/{maths,science}FigureVisuals.ts` and lower the counts in the two `*.reachability.test.ts` files with a dated comment (the convention already there):
   `APQ-M-TRI-008, CBE-S-CTRL-E-001, CBE-S-MAGN-B-005, CTRL-EXMPLR-6-SA-003, PB-M-1-TRIG-C-001, PYQ-M-2026-POLY-005, PYQ-S-2026-EYE-002, SCO-S-CTRL-013, SCO-S-EYE-007, Z3-ARC-004`
   - `CBE-S-CTRL-E-001` stays **served**: its bound figure doesn't match the question, and its fixed text is self-contained.
   - The `FND-L-QB-171` `diagramDescription` is wrong (D is measured from the normal), but students never see it. Optional fix.

### Lane policies applied (record them in the PR report)
- **Fabricated figures are withheld.** On official rows, a first-pass fix that rebuilt a missing figure from memory or from "the standard NCERT set-up" was turned into a **figure withhold**: `PYQ-S-ACID-001`, `PYQ-S-2026-ACID-001`, `PYQ-S-2026-ACID-012`, `PYQ-M-2024-CIRC-010a`, `PYQ-M-CIRC-001`, `HERED-EXMPLR-8-LA-002` and `CTRL-EXMPLR-6-SA-003`.
- **Every "missing figure" withhold was checked against the figure binder.** For a row with a bound figure, the agent viewed the image and re-judged the row. Most were un-withheld.
- **Key changes from the figure re-check**, which need the independent re-solve: `APQ-M-TRIG-013` → sec θ; `EYE-EXMPLR-10-MCQ-003` (iii) → (ii); `CBE-M-TRIG-B-001` → (6+2√3)/3.
- **Source override.** A bank row gets it only when CONTENT changed (stem, options, answer, steps, explanation). A pure re-tag (marks, section, format, chapter, subtopic) keeps its source.
- **Fixes that inferred garbled text** (the key is the only correct option either way): `PYQ-M-QE-002`, `PYQ-M-TRIG-001`, `PYQ-M-POLY-004`, `PYQ-M-2026-SAV-001`, `PYQ-M-SAV-001`. One distractor was invented, on `CBE-M-POLY-A-005`. All are in Others.
- **Withhold-only.** `REP2-046` (double fertilisation, Class 12, LazyTopper-authored) is withheld by the lane.
- **Fields the fixers changed but the lane dropped.** `pyqYear` / `pyqSet` edits are dropped (the override removes them). promptD `topicKey` "fixes" are dropped (false positives; see step 6).

## Exact next steps (local controller)
1. After #962 merges: `git worktree add <wt> -b fix/bank-fix-1-pr2-broken-tagging origin/base/approved-thru-437`.
2. In `tools/*.py`, replace the scratchpad prefix `/tmp/claude-0/-home-user-Lazytopper-Production/6630b33a-ac3b-56af-992f-ac80dde5a3d3/scratchpad/fix/` with this folder's path.
   - `meta.py` and `agg2.py` also read `a/rows.json` and `a/trends.json` from the audit scratchpad. Those are **not needed to apply**: `patches2.json` and `withholds2.json` are final.
3. **Re-check the `old` values before applying.** `old` in `patches2.json` = each row's runtime value at PR-1 head `cbd0b41e`. Rows touched by #961 or by #962's rebase can drift, and `apply.py` refuses a mismatch, so re-dump first and inspect any refusal:
   `ROOT=<wt> OUT=base.json npx tsx tools/dumpw.mts` (run inside `lazytopper/`).
4. Apply the patches: `python3 tools/apply.py <wt> decisions/patches2.json report.json`.
   - Extend `apply.py` to also remove `isPYQ` on override, the same way it removes `pyqYear` / `pyqSet`.
   - Then handle every `ERROR` in `report.json`; factory rows are the likely ones.
5. Add the 183 bank withholds as a `// BANK-FIX-1 PR-2` block in `WITHHELD_QUESTION_IDS` (`canonicalQuestionBank.ts`), with the reason per id from `withholds2.json`. Then do steps 1–7 of "Not in `patches2.json`".
6. Re-dump, then run `tools/verify.py` (patched rows equal their intended values; every other row is byte-identical).
7. Regenerate:
   - `pnpm run gen:bank-chapters`
   - `node --import tsx scripts/generateBoardQuestions.ts`
   - the order fixture: `LT_WRITE_ORDER_PARITY=1 npx vitest run src/data/predictionCore.orderParity.test.ts`
   - the prerendered SEO pages: `seo:capture` + `gen:sitemap`
   - Lower the `publishability.guard.test.ts` floors by exactly the human rows withheld, with a dated comment.
8. **Independent re-solve (ruling 6), ONE agent at a time.** It covers about 560 content-changed rows plus 243 promptD answers.
   - Packets: `{id, kind, marks, question, options}`. **No answer is shown.** Prompt: `prompts/independent-resolve.md`.
   - Compare with the app's resolver (`tools/compare.py`). Adjudicate written answers with `prompts/independent-resolve-adjudicate.md`.
   - On disagreement: fix again or withhold. **The bar is 100% agreement on the shipped rows** (PR-1 was 215/215).
9. Ledger and pins: `data/bankFix/bankFix1Ledger.ts` gets `BANK_FIX_1_PR2` (via `tools/write_ledger.py`) and a `bankFix1.pr2.test.ts`. Pin:
   - ids unchanged;
   - withheld ⇒ not served;
   - objective keys resolve;
   - no override row is PYQ, NCERT or year-bearing;
   - **the audit checks re-run as tests**: options present on every MCQ/AR, objective = 1 mark / Section A, no duplicate pair both served, promptD rows have a non-empty stem and an answer, no `-D2` id;
   - served counts per chapter before and after.
   Run mutations (each must go RED).
10. Gates (CLAUDE.md §6, ALL of them): both `tsc` configs, build plus the verifier, mojibake, `scope:guard`, both `test:matrix:all`, full vitest and `git diff --check`.
    Then open PR-2 with the full report: before/after counts, the mutation table, the quoted CI lines, and the figure-withhold list. **Merge only after the cofounder's verdict.**

## PR-3 (not started)
A concept-label mapping table: label → Exam Trends concept for the 1,962 unmapped labels (PR #960 `tagging.csv`, category `concept-label-mapping`). Add a guard that no served label is unmapped. Labels on rows stay unchanged; ME-ENGINE-1 reads the table.

## Folder map
- `decisions/` — the final outputs (apply these).
- `agent-outputs/` — raw outputs of each agent pass.
- `inputs/` — the packets the agents saw.
- `prompts/` — the agent prompts.
- `tools/` — the scripts:
  - `apply.py` — the patch applier;
  - `verify.py` — checks the applied rows;
  - `dumpw.mts` — dumps the runtime rows;
  - `tslit.py`, `rowsrc.py` — TS literal parsing and row lookup;
  - `agg2.py`, `mk_patches2.py` — rebuild the decisions;
  - `write_ledger.py`, `compare.py`, `mutate.py`.
