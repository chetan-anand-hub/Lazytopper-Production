# Bank-Expansion Lane — State

**Lane:** deepen the canonical question bank to a rotation-healthy floor of **≥50 questions per
{topic × section-band}** for BOTH subjects, all 26 canonical topics, bands A–E.
**Mode:** EXTRACT real net-new first (where the reservoir has the target band), then AUTHOR to fill the
remainder. Review-FREE: mechanical gates + an adversarial skeptic carry it; TRUSTED-STUDENT QA is the human
quality gate (surfaces stay GATED until then). Never self-merge (`src/data/**` is CODEOWNERS).
**Write surface (file-disjoint from CT + notes lanes):** `lazytopper/src/data/questionBanks/class10/**` +
the `canonicalQuestionBank.ts` import/spread lines + `docs/bank-expansion-review-queue.md` (manifest).
**Base:** branched from origin trunk `ebc95d7` (real tip; bank unchanged since `f2934e6` — the 7,084 census
holds; only notes/chapter-test surfaces moved between them).

## Ground truth
Assembled bank = **7,084** (Maths 3,088 / Science 3,996; 26 topics). Census by {topic × section} taken from
the import-based `assembled_bank_dump.json` (7,084 rows). Floors target **≥50 per A/B/C/D/E per topic**.

## FLOOR POLICY — band-scarcity split (AUTHORITATIVE, per updated task §4, 2026-07-12)
- **Sections A, B, C (1-mark MCQ/AR · 2-mark VSA · 3-mark SA, non-proof): NO forced floor. EXTRACT-MAX.**
  Extract every GENUINELY net-new item the Content + gdrive sources hold (abundant). Do NOT author these,
  do NOT pad. Extracting the maximum honest net-new IS the job for these bands.
- **SCARCE, high-value categories — 4-mark CASE-BASED (E), 5-mark LONG-ANSWER (D), and PROOF-type
  (wherever they sit): floor ≥50 per topic, GENUINELY DISTINCT.** Extract what exists, then AUTHOR the
  remainder. Authoring headroom lives here.
- **ANTI-REDUNDANCY (hard):** reject number-swapped OR structural variants — of each other AND of the
  banked 7,084. "Distinct" must differ in MORE THAN numbers/surface-context (different method or a real
  twist in sub-part composition). The skeptic enforces this.
- **HONEST STOP:** if a scarce category cannot reach 50 genuinely-distinct even with authoring, stop at the
  honest count and REPORT — never pad. (Real-numbers C/D — and, for a thin chapter, even E and proofs —
  will honest-stop well below 50; that is expected and correct.)

## Prior flat-floor gap table (now SUPERSEDED — kept for reference only)
The earlier flat-≥50 gap (A 0 · B 137 · C 77 · D 544 · E 890 = 1,648) drove the wrong strategy: it treated
A/B/C as needing fills and counted variant-level items. Under the band-scarcity policy the A/B/C "gaps"
are irrelevant (extract-max, not fill) and the D/E floors are re-scoped to genuinely-distinct-with-honest-stop.

**Batch-1 evidence for the policy change:** authored 90 real-numbers items to the flat floor → the dedup gate
caught **15 outright bank-duplicates** (e.g. "HCF/LCM of 6,72,120"; "Three bells at 9,12,15 min"; "prove √5
irrational" ≈ banked "prove √2 irrational") + many trivial number-variants. Real-numbers is a saturated thin
chapter; a flat ≥50 C/D floor is unreachable without redundancy. This drove the band-scarcity floor.

## Per-topic gaps (sections; 0 = already ≥50). Order = batch queue.
Maths: real-numbers C5 D36 E37 · polynomials B9 D38 E40 · pair-linear B14 D21 E34 · quadratic B9 D21 E28 ·
AP B9 D30 E22 · triangles D10 E27 · coordinate-geom B4 D35 E26 · trigonometry E14 · circles B3 D27 E40 ·
areas-circles B3 D30 E33 · surface-vol B26 C14 D5 E31 · statistics B24 D22 E30 · probability B15 D34 E28.
Science: chem-reactions D11 E39 · acids-bases D23 E38 · metals D18 E40 · carbon D11 E39 · light E34 ·
human-eye B3 C8 D26 E39 · electricity E32 · magnetic C4 D23 E42 · life-processes D19 E35 ·
control-coord C11 D21 E40 · reproduce C13 D13 E42 · heredity B5 D29 E40 · our-environment B13 C22 D41 E40.

## Batch plan (one {topic} = one batch = one PR; owner merges on green + skeptic-clean)
Serialized. Per batch: [extract where band-eligible] → author gaps → skeptic re-solve every Q → mechanical
gate stack → manifest ids → PR. Handoff update after each merge.
Pipeline order: real-numbers (proof batch) → rest of Maths → Science (Science E-heavy).

## Mechanical gate stack (scratchpad `gate.mjs` — transpile+import based, not a source scan)
unique ids (vs 7,084 + within set) · topicKey ∈ topics.ts slugs · subtopic present + not syllabus-banned ·
marks match section (A1 B2 C3 D5 E4) · every step has a `[N mark]` prefix, prefixes sum to marks ·
MCQ answer = exact option · Case-Based ⇒ section E · dedup vs 7,084 (norm+Jaccard, NET-NEW <0.45) + within set.
Plus repo gates: `npx tsc -p tsconfig.app.json --noEmit`, `scope:guard --mode product`, root+ops matrices,
mojibake, `git diff --check`, and the assembled-bank runtime proof (count = 7,084 + N, 0 dup, 0 orphan).

## Skeptic (automated correctness — the review-free substitute, NOT human review)
A fresh subagent independently re-solves every question, checks answer-consistency + step validity + mark-sum
+ in-syllabus + not-a-near-dup + (figure matches, if any). Any failure → reject (re-do or drop). Log reasons.

## Open follow-ups
- **[FU-DBAND-PEDAGOGICAL-FLOOR]** — a uniform Section-D (5-mark) floor of 50 is pedagogically unnatural for
  thin chapters (Real Numbers, Probability, Human-Eye) that CBSE rarely sets 5-mark items on. Authored D-band
  items for these are multi-part-constructed to earn 5 marks honestly, but the owner may prefer a lower D
  floor for such chapters. Flagged for ratification; not blocking.
- Case-based (E) is the highest fabrication-risk category (authored scenarios, no owner content review) —
  student QA is load-bearing here; every id is manifested.

## EXHAUSTIVE-SWEEP DISCIPLINE (standing, per owner — [FU-BANK-EXPANSION-SOURCE-SWEEP])
Before concluding a net-new count for ANY topic, sweep ALL sources: the whole `Content\` folder (14 study-package
folders; docx incl. TABLES, pdf) + all `diff\cbse-papers\` (Practise Papers, PYQ+MS pairs, Exemplar, chapter-wise
online). Fingerprint every candidate vs the CURRENT bank; produce a MANDATORY per-source table
(candidates / DUP / borderline / NET-NEW). Prove a low yield by exhaustion, never by sampling. Confirmed working:
life-processes 75 A/B/C vs real-numbers 23 = real reservoir depth.

## FIGURE-PENDING SAFEGUARD (standing, per owner — [FU-FIGURE-PENDING-SAFEGUARD])
- Un-answerable-without-a-PROVIDED-figure ("identify structure X") ⇒ ship the real figure (Bucket A extraction
  preferred; B/C only if skeptic-verified to match) OR add id to `WITHHELD_QUESTION_IDS`. Never ship answer-less.
- Text-answerable + figure-enriched ⇒ may ship now; figure is a later enhancement.
### Running figure-pending list (classify each; none silently forgotten)
| id | topic | question | bucket | action |
|---|---|---|---|---|
| LPSD-009 | life-processes | describe air passage + alveolar adaptation | ENRICHMENT (text-answerable) | reference figure later |
| LPSD-018 | life-processes | "draw a labelled diagram of the heart" + describe | ENRICHMENT (student-produced diagram) | reference figure later |

## Batch queue status
- **Batch 1 — real-numbers +30: MERGED #381 (`3866a94`), docs #383 (`c4c7032`).** extract 10 + authored 20.
- **Batch 2 — real-numbers corrective +12: MERGED #384 (`63c6b04`).** Exhaustive re-sweep 11 + perfect-cube D 1.
  Real-numbers A/B/C reservoir proven ≈23 net-new by exhaustion; scarce ceiling ≈24 distinct methods (audit).
- **Batch 3 — life-processes +136: MERGED #385 (`ce34b3e`).** extract-max 75 A/B/C + scarce D×22 (→53) + case×39 (→54).
- **Bank now = 7,262.** This bundled docs handoff covers #384 + #385.
- **NEXT: another Science topic** (our-environment / how-do-organisms-reproduce — large reservoirs). Same
  exhaustive per-source sweep + table; extract-max A/B/C; ≥50-distinct D/E/proofs with honest-stop + inventory.
- **Tooling (scratchpad, reusable):** gate.mjs (dedup + mechanical), rewrite.mjs (drop rejected ids),
  AUTHORING_SPEC.md, dump_batch*.mjs (regenerate the bank dump vs CURRENT bank after each merge — dedup must be
  vs the latest), the assembled-bank runtime proof one-liner. **Regenerate the dump before each new topic.**

## Follow-ups opened this batch
- [FU-EXTRACT-CONTENT-F13] — Content-folder "Question Bank" (folder 13) real-numbers file not swept; small
  extra A/B/C extract-max source.
- [FU-BANK-EXACTNORM-DUPS] — the assembled bank already has ~114 exact-normalized-questionText duplicate
  groups PRE-EXISTING (not from this batch; my 30 contribute 0). Data-quality cleanup candidate, separate lane.

## Progress log (newest first)
- 2026-07-12: Batch 3 (life-processes) MERGED #385 — first Science batch, +136, exhaustive-sweep fix confirmed
  (75 A/B/C vs 23). Batch 2 (real-numbers corrective) MERGED #384 — exhaustive re-sweep + D/E exhaustion audit.
  Bundled docs handoff (#384+#385) done. Figure-pending safeguard doctrine adopted.
- 2026-07-12: Batch 1 (real-numbers) COMPLETE → PR #381. Floor policy corrected mid-batch to band-scarcity
  (owner). Authored-to-flat-floor packs discarded; re-did as extract-max A/B/C + distinct-author scarce D/E/proofs.
- 2026-07-12: Lane opened. Worktree `LT-worktrees/bank-expansion`. Census + gap table + gate tooling built.
