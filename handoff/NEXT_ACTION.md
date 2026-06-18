# LazyTopper — Next Action
# Updated: 2026-06-18 (post-PR #257 — **AI-tier PR2b strip fabricated `pastBoardYear` MERGED** (trunk `d6e0e14`): anti-fabrication — predicted/HPQ questions claimed a board year with no traceable PYQ reference (authentic uses `pyqYear`; authentic tree has ZERO `pastBoardYear`). **⚠️ Boundary corrected: instruction assumed 75 values / 2 files; exhaustive enumeration (owner-mandated first) found 96 / 5** — `predictedQuestions.ts` 55, `predictedQuestionsScience.ts` 20 (incl. 8 `"Model"`), `class10SciencePredictiveEngine.ts` 12, `highlyProbableQuestions.ts` 8 (HPQ), `hpq_phase2_acceptance.entry.ts` 1 (fixture). Stripped all 96 (field-removal only); all 8 `.pastBoardYear` reads cleaned → dedup **score-only**, `sourceYearHint` → `targetYear-1`, dead 5-signal-input fields removed. **`predictionTypes.ts` NOT touched** (optional field stays declared). **HPQ confidence proven UNAFFECTED** — scorers read dataset `sourceYear`, never `pastBoardYear` (dead plumbing); only dedup tiebreaker changed. Count-integrity: served bank 6,715 unchanged, `pastBoardYear_remaining=0`. Codespaces vitest 9/9 (5 PR2b + 4 PR2a regression). CI GREEN (root matrix 181/181; linux build); owner squash-merged; branch deleted. IMMEDIATE NEXT (owner; queued, each its own instruction branched fresh from `d6e0e14`): **[FU-AITIER-RANK-MOCKS-HPQ]** (apply `sourceMultiplier` to Full Mock / Topic Mock / HPQ — they use `getAllQuestions()` + own selection) → deferred **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7. Previously post-PR #255 — **AI-tier PR2a source-provenance stamp + soft AI-lower ranking MERGED** (trunk `686f737`): ARCHITECTURAL — the provenance + ranking half of the audit's PR2. `AI_GENERATED_QUESTION_IDS` stamped at ingest from the 54 `.pack[1-3]` arrays (additive, `canonicalQuestionBank.ts`; bank untouched → counts unchanged); `_source` tier (`authentic`/`ai-generated`/`predicted`) on the LOCAL `CanonicalQuestionWithScore` intersection (forbidden `predictionTypes.ts` NOT touched); `getAdjustedScore *= SOURCE_MULTIPLIER {authentic 1.0 / predicted 0.6 / ai 0.3}` (owner-locked; soft, never zero). **Covers Quick Practice / topic practice** (`getLikelyQuestionsForConcept`); **Full Mock / Topic Mock / HPQ use `getAllQuestions()` + own selection → [FU-AITIER-RANK-MOCKS-HPQ]**. Live split (Codespaces): 6,715 = 3,710 auth (55.3%) + 2,764 ai (41.2%) + 241 predicted, 0 unstamped. vitest 4/4 in Codespaces (CI quality-gate does NOT run vitest). **Owner live-verify PASS** — ~50%-AI topics serve all authentic in the top 10 (first AI @#97 Real Numbers / #127 Triangles / #186 Trigonometry). Decisions locked: multipliers `1.0/0.6/0.3`; **curated-26 stay authentic → [FU-CURATED-26-PROVENANCE]**. CI GREEN (root matrix 181/181; linux build); owner squash-merged; branch deleted. IMMEDIATE NEXT (owner; queued, each its own instruction branched fresh from `686f737`): **PR2b** (`pastBoardYear` strip — unblocked by this stamp) → **[FU-AITIER-RANK-MOCKS-HPQ]** (mocks/HPQ ranking) → deferred **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7. Previously post-PR #253 — **AI-tier PR1b pack-file 5-mark retags MERGED** (trunk `f83915b`): relabel-only follow-up to #251. **12** genuine 5-mark pack long-answers relabelled `format:"Short"→"Long"` (`ARC2-016/017, ABS2-048, CC2-048, CR2-044/045/046, HEC2-039, LT2-016/024, ME2-025, REP2-048` — each confirmed by reading its `questionText`). **`PR2-018` reclassified** on inspection (single-step `7/12` one-liner, not an LA) → moved to quarantine; Group A = 12 not 13. **7 QUARANTINED** (`TG3-056, TG3-059, ABS2-047, CR2-043, MNM2-037, REP2-039, PR2-018`) kept pinned + annotated → **[FU-AITIER-MARKS-MISMATCH]** (marks/content pass, NOT a relabel). **Backlog 19→7**; count UNCHANGED. **[FU-AITIER-PACK-5MK-SHORT] RESOLVED** (relabel half). CI GREEN (root matrix 181/181 with backlog 7); owner squash-merged. IMMEDIATE NEXT (owner; queued, each its own instruction branched fresh from `f83915b`): **PR2** (source-provenance stamp + AI-lower-ranking enforcement in `getAdjustedScore` + `pastBoardYear` strip); plus the deferred **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7. Previously post-PR #251 — **AI-tier PR1 mechanical content-integrity MERGED** (trunk `f4a41b6`): `QuestionKind` += `"Long"` (both predicted files; + `toCanonicalFormat` propagation), **24** five-mark Section-D predicted items retagged `Short→Long`, fused **Q10** (`2026-RN-LA-03`) split into `2026-RN-SA-08` (LCM, C/3mk) + `2026-RN-SA-09` (√5 proof, C/3mk) [net +1], and `aiTierContentIntegrityGuard` added to the root matrix (175→181). **[FU-MALFORMED-QUESTION] RESOLVED.** Audit undercounted → **[FU-AITIER-PACK-5MK-SHORT]**: 19 more `format:"Short"` defects in gated `.pack` files pinned as a shrink-only backlog for **PR1b**. CI GREEN; owner squash-merged. IMMEDIATE NEXT (owner; queued, each its own instruction branched fresh from `f4a41b6`): **PR1b** (retag the 19 genuine pack LA; QUARANTINE content↔marks mismatches like `TG3-056`/`REP2-039`) → **PR2** (source-provenance stamp + AI-lower-ranking enforcement + `pastBoardYear` strip). Previously post-PR #249 — **"Finish session" scorecard trigger MERGED** (trunk `704dcff`): replaces #240 sub-task 5's `allDone`-only scorecard trigger with an explicit student-declared "Finish session" button (always-available at the set foot, both widths) → fires `practice_finish_session_click` + sets `sessionFinished` → surfaces the scorecard. `allDone` kept as a convenience auto-offer. Reuses the EXISTING `sessionStats` — no new counters/persistence/state machine. Partial-session honesty PROVEN in owner live-verify (a 3-of-10 finish reads "3 of 10 attempted · 0/3 MCQs correct · 0% accuracy · the 7 you didn't reach aren't counted"; zero-attempt honest too). CI GREEN. Supersedes #240 sub-task 5. [FU-SESSION-SCORECARD-TRIGGER] CLOSED. NEW: **[FU-MALFORMED-QUESTION]** (Real Numbers Quick Practice Q10 fused alarm-clock LCM + prove √5 with inconsistent 5-mark/Section-D/Short tags; suspected AI-generated pack origin) — for the upcoming read-only AI-generated-question-tier audit. IMMEDIATE NEXT (owner; its own instruction, branched fresh from `704dcff`): **read-only AI-generated-question-tier audit**. Previously post-PR #246 — Check & Improve detect-then-confirm + question photo upload MERGED (trunk `c9404e1`): the UX layer on Claim 2 (#244). Detection is now VISIBLE + CORRECTABLE before grading. "Read the question →" → detection-only `POST /api/detect-question` → confirmation chip (subject·topic·marks + source) + quiet [Change] (constrained correction; corrected mark → marksSource "user") → grade on CONFIRMED values via the unchanged trusted path. Question photo upload added (distinct slot). Override logged on the attempt record (reuses recordAttempt; no new collection). **`SHOW_DETECTION_META` flag default=ON for testing — ⚠️ MUST flip to OFF before student launch ([FU-DETECTION-META-LAUNCH-FLIP], hard pre-launch gate).** Bank-grounding deferred behind Fix B. CI GREEN. **Owner live-verify of #246 = PASS 5/6** (printed marks correct; inference genuine + graduated AP=2 vs proof=3; topics bucket clean; selectors gone both widths). The 6th: **[FU-DETECTION-MARKS-CEILING]** — inference under-calls true 5-mark questions (multi-part numerical + proofs) as 3; caught-and-correctable via [Change], NOT a blocker. QUEUED NEXT (owner; NOT yet authorized — each its own instruction, branched fresh from `c9404e1`): (ii) "Finish session" scorecard-trigger PR → (iii) gated-spelling [FU-SPELLING-GATED-REMAINDER]; then (2) MI eval ([MI-EVAL]) → (3) Stage 3 ([FU-DRILL-ENRICHMENT]) → Fix B [FU-TOPICKEY-CONSOLIDATION] when authorized. PRE-LAUNCH gate: [FU-DETECTION-META-LAUNCH-FLIP]. Carried: [FU-SPELLING-GATED-REMAINDER] + [FU-TOPICKEY-CONSOLIDATION] + [FU-DETECTION-META-LAUNCH-FLIP] + [FU-DETECTION-MARKS-CEILING] + [FU-IMPROVEMENT-CARD] + [FU-WEAKAREA-ALIAS-DISPLAY] + [FU-ATTEMPT-MARKS-ACCURACY] + [FU-ATTEMPT-SR] + [FU-ME-REFRESH] + [FU-GRADE-MARKSCALE]/[FU-GRADE-CONSISTENCY]/[MI-EVAL]; owner+cofounder close [TRACK-B-GATE]; RESP-DIV-2)
# Base SHA: d6e0e14

## CURRENT BASE

Branch: base/approved-thru-437
SHA: d6e0e14
Last PRs: #253 (AI-tier PR1b pack-file 5-mark retags; → `f83915b`) + #254 (docs) + #255 (AI-tier PR2a source-provenance stamp + soft AI-lower ranking; → `686f737`) + #256 (docs) + #257 (AI-tier PR2b strip fabricated `pastBoardYear`; → `d6e0e14`)

## ⏭️ IMMEDIATE NEXT — [FU-AITIER-RANK-MOCKS-HPQ] (mocks/HPQ ranking) → [FU-AITIER-MARKS-MISMATCH] content pass → (iii) gated-spelling → (2) MI eval → (3) Stage 3 → Fix B
topicKey audit (i) + Fix A (#242) + Check & Improve auto-detect (#244) + detect-then-confirm (#246) + (ii) "Finish session"
scorecard trigger (#249) + **read-only AI-tier audit (DONE)** + **AI-tier PR1 (#251 — DONE, [FU-MALFORMED-QUESTION] RESOLVED)** +
**AI-tier PR1b pack retags (#253 — DONE, [FU-AITIER-PACK-5MK-SHORT] RESOLVED)** +
**AI-tier PR2a provenance + soft ranking (#255 — DONE, trunk `686f737`, multipliers `1.0/0.6/0.3`, Quick Practice/topic
practice covered, owner live-verify PASS)** + **AI-tier PR2b `pastBoardYear` strip (#257 — DONE, trunk `d6e0e14`, 96 values / 5
files stripped, dedup → score-only, HPQ confidence proven unaffected, `predictionTypes.ts` untouched)** are done. The items below
are **QUEUED but NOT yet authorized** — the owner sends each as its own instruction, branched fresh from `d6e0e14`. Do not start
until instructed.

- **(NEXT) [FU-AITIER-RANK-MOCKS-HPQ] — ranking parity for the remaining surfaces.** PR2a's `sourceMultiplier` only applies inside
  `getLikelyQuestionsForConcept` (Quick Practice / topic practice). **Full Mock** (`unlimitedPaperEngine` :353), **Topic Mock**
  (`topicMockEngine` :147), and **HPQ** (`highlyProbableQuestions`, own pool) route through `getAllQuestions()` + own
  selection/weighting and still draw AI at parity — apply the same demotion there. Higher regression risk (mock/HPQ ordering).
- **[FU-CURATED-26-PROVENANCE] — decision recorded** (the 26 curated inline `2026-…` items stay `authentic`; re-open only if they
  should become a curated/predicted tier).
- **(THEN) [FU-AITIER-MARKS-MISMATCH] — content/marks pass for the 7 quarantined pack items.** `TG3-056, TG3-059, ABS2-047,
  CR2-043, MNM2-037, REP2-039, PR2-018` are SHORT questions wrongly tagged 5-mark (NOT a label problem — PR1b deliberately did
  NOT relabel them). Fix the MARKS (or rewrite the question to match 5 marks), then remove each from `PACK_5MK_SHORT_BACKLOG` in
  `aiTierContentIntegrityGuard.test.ts`. Content-judgment + gated `.pack` edits — owner-authorized, separate.
- **Read-only AI-generated-question-tier audit — ✅ DONE** (`report-ai-tier-audit-2026-06-17.md`). Characterised the tier:
  file-based classification (no per-question `source` field), ~3,684 authentic vs ~3,010 AI in the live pool (~45% AI, ~816
  short of the 4,500 threshold), Q10 = a one-off cross-concept fusion, the 5-mark-"Short" tag defect was systematic, no
  ranking demotion exists, mocks draw from the mixed unified bank. Seeded **PR1 (#251)** + PR1b + PR2 above.

0. **⚠️ PRE-LAUNCH GATE — [FU-DETECTION-META-LAUNCH-FLIP].** Before shipping Check & Improve to students, flip
   `SHOW_DETECTION_META` to `false` in `lazytopper/src/utils/checkImproveDetection.ts`. It is ON now so the owner can see the
   detection machinery (source label etc.) during testing; students must NOT see it. This is the tester-vs-student line — a
   one-line change, but a real miss if forgotten. (It hides only the meta/source label, never the detected values or the
   Change control.) Verify on both desktop + app after flipping.

1. **(i) Read-only topicKey audit — ✅ DONE** (`report-topickey-duplication-audit-2026-06-16.md`). Fix A (#242) shipped the
   **read-time repair** half ([FU-WEAKAREA-EXAMTRENDS-FALLBACK] RESOLVED). **Fix B = the bank-key DATA consolidation to one
   canonical kebab topicKey per topic + a CI guard that fails if a non-canonical topicKey reappears = [FU-TOPICKEY-CONSOLIDATION],
   HELD / authorized-later** (gated `src/data/**` across ~60 files; staged Maths/Science; migration map + guard design in the
   audit report §5). Do NOT start Fix B until owner-authorized.
2. **(ii) "Finish session" scorecard-trigger PR — ✅ DONE (#249, trunk `704dcff`).** Replaced #240's `allDone`-only scorecard
   trigger with an explicit student-declared "Finish session" action; honest on PARTIAL sessions (attempted-only denominators +
   "the M you didn't reach aren't counted"). Owner live-verify PASS (3-of-10 + zero-attempt both honest).
   **[FU-SESSION-SCORECARD-TRIGGER] CLOSED.** Report: `report-finish-session-scorecard-2026-06-17.md`.
3. **(iii) Gated-spelling follow-up — [FU-SPELLING-GATED-REMAINDER].** Owner-authorized separate PR for the ~60
   `src/data/**` + `src/lib/desktop/loginPrompts.ts` rendered "Practise" strings #240 could not touch (gated dirs).
4. **MI eval — [MI-EVAL] check-solution eval set** (40–60 graded answers + tutor fabricated-solution correctness eval;
   launch gate). Gates how hard we lean on AI-estimated grades; unblocks the eval-gated items.
5. **MI Loop Stage 3 — concept-level targeting (eval-gated).** Pass the weak concept/mistake-pattern into
   `generatePracticeSet`'s `conceptKey` (needs MI sub-concept capture + the eval set). = **[FU-DRILL-ENRICHMENT]**.
   Do not start until the eval (step 4) exists.

### MI-loop follow-ups (logged; slot into the batches above)
- **[FU-IMPROVEMENT-CARD]** (the loop-closer deletes the wrong-answer entry at zero, erasing the improvement record →
  record a durable "gap cleared" event before building any improvement/journey card on Me — sequence: durable event FIRST).
- **[FU-WEAKAREA-ALIAS-DISPLAY]** (active-gaps count under-shows for label≠canonical-slug topics; surface/ranking — batch 1).
- **[FU-ATTEMPT-MARKS-ACCURACY]** (marks-weighted Me accuracy; display-only — but touches how accuracy reads, so eval-aware),
  **[FU-ATTEMPT-SR]** (dropped spaced-repetition side-effect — its own decision).
3. **Stage-1 polish follow-ups** (see OPEN_QUESTIONS): **[FU-DRILL-ROUTING]**, **[FU-WEAKAREA-LABEL]**, **[FU-WEAKAREA-CTAS]**,
   **[FU-WEAKAREA-HUB-LIMIT]**. **[FU-ME-REFRESH]** — Me auto-refresh after a grade (still open). **[FU-GRADE-MARKSCALE]** /
   **[FU-GRADE-CONSISTENCY]** / **[MI-EVAL]** — eval-gated grade-quality items.

## ⏭️ IMMEDIATE NEXT — close the Track B gate (live round-trip), then PR2 (harden), then resume Phase-2
INFRA-4/PR1 is **DONE + the backend is LIVE on Railway** (owner-confirmed `stub:false`, Gemini direct-key); grading is no longer
dark in prod. The critical path is now:
1. **[OWNER+COFOUNDER] Track B live round-trip → CLOSE [TRACK-B-GATE].** On the live app: sign in → grade a real answer → confirm
   "Saved to your progress" → mobile Me shows the real mistake mix → desktop Me matches (same uid); plus failed-grade → error.
   Runbook §7 in `report-api-gateway-railway-2026-06-10.md`. Only this pass closes the gate / ISSUE-009.
2. **INFRA-4 / PR2 (harden) — queued.** Provision Postgres + set `DATABASE_URL`; **add `tsx`** (warmup needs it once Postgres is on);
   set `ADMIN_FIREBASE_UIDS` (admin routes 503 without it) + `SESSION_SECRET` (share feature); add rate-limiting; decide warm-pool
   (`WARM_POOL_TOP_UP_INTERVAL_MS` is `0` for a quiet first deploy). **INFRA-4b** claudeClient Replit-proxy rewire = later visuals PR.
3. **Resume Phase-2 responsive divergence** — RESP-DIV-2 (mobile logout) next, then the rest of the punch-list below.

### 1. Phase-2 RESPONSIVE DIVERGENCE punch-list (desktop is source-of-truth; no invented numbers)
Ordered in OPEN_QUESTIONS. Each is its own scoped PR (desktop-leads, mobile-adapts; Option-B grammar):
- ~~**Track A — mobile Me honesty (RESP-DIV-1)**~~ **DONE (#220).** Fabricated −12/−8/−5 + invented weak-topics removed.
- ~~**Track B — mobile Check trust + persistence**~~ **DONE (#222), but verification-gated.** Guard fixed; persistence wired to
  the shared `logMistakes`/`getMistakeLogs` pipeline; mobile Me reads real data. ⛔ **[TRACK-B-GATE]** the successful
  grade→persist→Me round-trip is UNPROVEN until the backend deploy (grading is dark in prod) — verify at INFRA-4 go-live; do not
  mark fully done until then.
- **RESP-DIV-2 (NEXT, functional-HIGH) — mobile has NO logout path.** Add Log out + Manage subscription to mobile chrome / Me page.
- **Topic Hub reconcile** (wire mobile "Learn" to the tutor; label/drop synthetic fallback questions; honest progress vs the
  localStorage "Chapter Mastered" claim) → **Worksheets parity** (mistake-intelligence + multi-topic/full-subject + save +
  Science `stream` field) → **Home real-insights** (firebase-free boundary decision) → **RESP-DIV-3 (cosmetic) trial banner**.
- **Durable cure:** converge mobile Me into desktop Me (one responsive component, one data pipeline) — after Track B.
Owner supplies order confirmation + any frozen design before each.

### 2. Phase-2 clean-branch (later) — execute the marker deletions
#218 marked 46 files `LEGACY-RETIRED` (43) / `DEFERRED-REVIVE` (3) without deleting them. A later clean-branch greps
the markers to delete (retired) / keep (deferred). Also clear the §7 sever residue (MockPaper into the predictive
family; admin-lane back-links; TopicHubHome orphan; dead buildUrl helpers). See OPEN_QUESTIONS.

### 3. Go-live deploy chain (the launch unlock — AI is dark in prod until this)
INFRA-4 backend deploy: deploy `api-server` (runs the `lazytopper/server` gateway as a child) + provision Postgres →
Railway + `/api/*` rewrite in `vercel.json` + rate limiting; INFRA-4b Claude/Gemini client rewiring (Replit-proxy →
direct Anthropic/Gemini key).

### Owner / deploy actions pending (go-live)
- **Admin bootstrap (BLOCKING):** set `ADMIN_FIREBASE_UIDS` to your Firebase uid — the ONLY way admin routes
  authorize now (else 503 in prod).
- **Railway env:** `artifacts/api-server` REQUIRES `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY` (or
  ADC) — `requireFirebaseAuth` returns 503 without it.
- **Firebase Authorized domains:** add the prod Vercel domain (Google `signInWithPopup` needs it; email/password does
  NOT). Phone-OTP is unchanged since #214 (the sever touched zero auth files).
- **Google One-Tap (GIS)** follow-up once a Web OAuth client ID (`VITE_GOOGLE_CLIENT_ID`) is provided.
- **[SMS-DELIVERABILITY]** Firebase default SMS sender lands in Android spam (DLT-registered sender / custom provider
  needed; operator lead-time — start early if phone becomes primary). Phone is the fallback; Google/email is primary.

## (the PRODUCT-track sections below remain valid — pick up after the auth migration arc, or in parallel per owner)

## ✅ THE INFRA THAT MATTERED IS DONE — NEXT SESSION PIVOTS TO PRODUCT + THE LAUNCH DEPLOY
Closed this session (see CURRENT_STATE): lockfile fixed (#201), CLAUDE.md corrected (#198), CI LIVE + proven
(#198), de-Replit COMPLETE (#199 + #204 → fully `@replit`-free). CI now gates every PR (pnpm 10.32.1 frozen
install → root matrix 175/175 → mojibake → linux build → ops matrix); human merge gate retained.

### Remaining infra — TRACKED, but NOT blockers to product work
- **INFRA-4 — backend deploy** (THE launch unlock; AI is dark in prod until this): deploy `api-server`
  (runs the `lazytopper/server` gateway as a child) + provision Postgres → Railway + `/api/*` rewrite in
  `vercel.json` + rate-limiting.
- **INFRA-4b — Claude/Gemini client rewiring** (`lazytopper/server/services/claudeClient.cjs` Replit-proxy
  → direct Anthropic API with the owner's key) — lands WITH the backend deploy.
- **INFRA-5** Clerk `pk_live_`; **INFRA-6** Vercel proper build config; **INFRA-7** domain; **INFRA-8**
  check-solution eval set (launch gate).

### Product entry points (pick with the owner)
- **Responsive/mobile-completeness audit** (read-only first) — the product is ONE responsive website, but the
  `src/pages/` desktop/app/mobile split is inconsistent (`mobile/` has only ~5 surfaces). Map every surface ×
  desktop-done/mobile-done BEFORE the redesign roadmap.
- **TopicHub Option-B convergence** — the big surface; locked design specs exist (the next Option-B after
  Exam Trends #184/#190).
- **HPQ Phase 2** (content authoring; supervised brief exists; depends on TopicHub for mastery-loop routing).
- **Notes / formulae / interactives for ~40 topics** (Gemini-generate → owner-validate → TopicHub-render;
  template sign-off gates it).

NOTE: the HPQ Phase 2 / Exam-Trends / Option-B detail sections below are unchanged and still current.

## POST-#196 (housekeeping done; does not change the next HPQ task)
The three long-red ops suites (D38) are GREEN: mojibake 3/3 (re-encoded circles.proof.ts + the second
corrupted file maths.caseBased.ts the diagnosis missed), bank-health 4/4 (stale→retirement guard + orphan
dead-compute deleted), canonical 4/4 (re-pointed to the relocated practiceQuestionBuilder.ts). The
`check-mojibake.cjs` 50-hit scan cap (why the second file stayed hidden, and the local+CI blind spot) is
removed. **NEW tracked follow-up [D39]:** the mojibake guardrail workflow is mislocated under
`lazytopper/.github/workflows/` so GitHub never runs it — relocating + EXPANDING CI (gate the full matrix +
scope-guard, not just mojibake) is a deliberate infra change owed its OWN PR (verify uncapped checker clean
across all trunk first; decide trigger scope). Not blocking the next HPQ task.

## HPQ PHASE 1 — DONE (#194). Consistency + honesty (logic/copy/plumbing only).

HPQ now tells the SAME story as Exam Trends. Tier badges are driven from the locked tiers
(`LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md`) via a single canonical-key→tier lookup in
`getHighlyProbableQuestions()` — **0 tier contradictions (was 11/27); must-crack badge share 74%→42%**.
Dead `deriveHPQConfidence` compute retired (page shows no confidence UI; `hpqConfidence.ts` kept for a
future model). Copy reframed to honest "High-Probability Question Patterns" (representative shape, not a
specific-question prediction; three locked evidence sources named). Plumbing: canonical-key merge dedupes
the duplicate Pair-of-Linear / Metals cards; Science filter fix recovers Human Eye 1→4 and DEV-logs any
future drop. All questions KEPT (re-badge + de-emphasize, never delete). 3 files, +140/−36;
`predictionTypes.ts` frozen. Gates green; pre-existing reds (bank-health/canonical-gen/mojibake) verified
unrelated. Report `report-hpq-phase1-consistency-2026-06-05.md`. Trunk `6d5b6ed`. See CURRENT_STATE top.

## NEXT HPQ TASK — HPQ PHASE 2 (content authoring; gated `src/data/`, owner-validated, PYQ-sourced).

Phase 1 only RE-BADGED. Phase 2 adds/rebalances CONTENT — author from real PYQ sources, owner-validated:
1. **Missing every-year 5-mk Section-D Long-Answer marquee shapes** (the deepest "same story" gap): Trig
   Heights & Distances 5-mk LA; Surface Areas combination-of-solids 5-mk LA; Statistics grouped-median
   5-mk LA; Triangles similarity/BPT proof (Section D); Acids/Bases 5-mk LA; Chemical Reactions 3-mk
   displacement SA. (Maths currently has effectively ZERO valid 5-mk LA HPQs.)
2. **Distribution re-weight toward must-crack:** lift Circles (2) and Heredity (4) to adequate; trim or
   re-tier the over-stacked sets (Pair of Linear 8, AP 6, Metals 12) so volume over-indexes must-crack and
   tapers to good-to-do. (Phase 1 deliberately left volume alone — re-badging only.)
3. **`rn-hpq-4` Section-D/4-mark mislabel** — Section D = 5-mk LA in CBSE; fix the only Maths "Section D"
   item (currently 4 marks, which is why Maths reads as zero valid 5-mk LA).
4. **Backfill 49 competency `solutionSteps`** (the `*-comp-*` entries carry answer+explanation but no
   step-marked working) to the §13 CBSE step-marking minimums per section.
5. **Confidence-model reconciliation** — DEFERRED until a confidence UI is actually designed; re-base
   `compute5SignalScore` on blueprint-weight + 4-year frequency + §4 sub-pattern (so a band can never
   contradict a tier) before any confidence badge ships. See OPEN_QUESTIONS.

## EXAM TRENDS BAND REDESIGN — DONE (#190). Steps 5 + 6 complete.

The Exam Trends surface is now 3 collapsible priority bands (Must-crack / High-ROI / Good-to-do) on the
owner-signed-off locked tiers (`LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md`, transcribed VERBATIM).
The locked doc IS the fresh, scientifically-derived tiering D27 asked for (step 5), and #190 is the band
redesign (step 6). Layout-only Option-B evolution of the ONE component; 1 product file; "Expect:" line on
the 11 must-crack topics only; volatility flag on Trig + Electricity; no fabrication; grammar preserved.
Gates green (tsc, build, verifier, matrix 175/175). scope:guard FAIL = known monorepo path-prefix artifact
(verified not a breach). Trunk `cfb3106`. See CURRENT_STATE top section + SESSION_LOG.

## SYLLABUS-CORRECTNESS ARC — CLOSED (#186 + #188). Gating guard GREEN, matrix 175/175.

The content sweep (#188) deleted the 93-item worklist the corrected guard flagged → gating
`syllabusGuard` exits 0, `test:matrix:all` = 175/175 (incl. #19). Banks: Conversion of Solids ×46
deleted (canonical 6520→6474, spreads intact). Surfaces: EMI/Motor/Generator + Euclid/Frustum ×47
deleted/rewritten across predicted/HPQ/competency/config/trends/topics/topicHubContent + tutor
contracts. Owner decision DELETE-not-retag; blurbs/contracts rewritten syllabus-accurate. The tutor no
longer teaches Euclid's lemma or evolution evidence. See DISCOVERIES D26 (CLOSED) + D31 (deferred
polynomials follow-up).

## IMMEDIATE NEXT TASK — step 7: next Option-B surface (TopicHub concept-spine)

Exam Trends (the FIRST Option-B surface, #184) is now fully converged through its band redesign (#190).
The next track item is the next Option-B surface — **TopicHub concept-spine (+ Formula Sheet / NCERT
Notes)** — using the same template (ONE responsive component per surface; design grammar reused; honest
data only). Note the carried OPEN gate: the Notes/Formula template needs owner sign-off (structure,
granularity, #examples) BEFORE generation. Optional pre-step for #190: capture the 360/768/desktop ×
Maths/Science band screenshots as PR evidence (deferred — owner to request).

## THE SEQUENCE (owner-confirmed; reordered post-#186)

1. ~~Track A PR-1 — tutor wiring~~ DONE (#181 — desktop TopicHub "Learn this").
2. ~~PR B2 — teach-prompt tightening~~ DONE (#182 — LOCKED style; owner live-verified).
3. ~~Exam Trends ranked-list responsive redesign~~ DONE (#184 — FIRST Option-B convergence; merged `93a2674`).
4. ~~Correct + EXTEND syllabusGuard (the RULER)~~ DONE (#186 — corrected to official 2026-27; extended
   to 24 board-prep surfaces; 2 stale doctrine-locks fixed; merged `918b754`). The guard half of D26.
4b. ~~CONTENT SWEEP~~ DONE (#188 — deleted the 93-item worklist; gating guard GREEN, matrix 175/175
   incl. #19; banks Conversion of Solids ×46, surfaces EMI/Motor/Generator + Euclid/Frustum ×47;
   DELETE-not-retag; blurbs/contracts rewritten syllabus-accurate; trunk `e0395fc`). Closes D26.
5. ~~Re-derive Exam Trends priorities FRESH~~ DONE (owner-signed-off composite model + 2 teacher
   overrides → `LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md`; the scientific basis D27 asked for).
6. ~~Exam Trends band redesign~~ DONE (#190 — Must-crack / High-ROI / Good-to-do collapsible bands;
   reuses the merged ranked-list rows; the band replaces the weight-vs-trend Sort toggle; 1 product
   file; "Expect:" line on the 11 must-crack topics; volatility flag on Trig + Electricity; trunk `cfb3106`).
7. **(NEXT) Then the other Option-B surfaces: TopicHub concept-spine (+ Formula Sheet / NCERT Notes) →
   Check & Improve → Me/Progress → Worksheet generator** (each Option B; one responsive component per
   surface; same template as Exam Trends #184).
8. Separate follow-up PRs (not blocking): interactive-handoff fix (`findVisualForConcept` returns the
   WRONG visual — standard-angles showed Height & Distance); mobile-tutor wiring (mobile
   `src/pages/app/TopicHub.tsx` "Learn" is a placeholder → Check & Improve, NOT wired to concept_teach);
   Formula/Notes generation + content-correctness pass; AI cost/rate-limit hardening (launch gate, D25).
5. **Railway deploy** + `vercel.json /api/*` rewrite + rate limiting — the unlock that makes the
   Vercel link's AI features work (ISSUE-009) → hand students the link. At link-time: Clerk
   `pk_test_`→`pk_live_`, DPDP/consent for minors, monetization charge path.
6. **Launch chain (after the redesign + eval set):** check-solution eval set (40–60 graded answers,
   launch gate) + the tutor fabricated-solution correctness eval → Railway deploy + `vercel.json /api/*`
   rewrite + AI rate-limit/cost hardening (D25) → Clerk pk_test_→pk_live_, DPDP/consent for minors,
   charge path → hand students the live link. Deploy ONLY after grading + teaching are reliably GOOD locally.

## SUPERSEDED — old mobile-twin reflow track (replaced by Option B convergence)

The earlier mobile-reflow track (PR A #166 primitives → #168 mobile Home → #170 mobile landing →
#172 Home polish; staged usePracticeHub/MobilePracticePage) built mobile TWINS of desktop pages.
That approach is now SUPERSEDED by the LOCKED responsive Option B (DECISION_LOG 2026-06-03): one
responsive component per surface (desktop-leads, mobile-adapts), retiring both twins. The grammar
primitives (`src/components/grammar/`) and the `isMobileSelfChromedRoute` navbar pattern remain
useful building blocks for the convergence, but new work converges twins rather than forking them.

Remaining staged items (owner picks order & supplies the instruction + any frozen
design before each):
  - usePracticeHub extraction — reusable Practice Hub data/state hook
  - MobilePracticePage — mobile Practice reflow (consumes the hook)
  - (any further per-platform reflows for routes that render a desktop page at mobile
    width — verify render sites; RootEntry-style redirects mean not every site needs it)

Branch fresh from the current tip. Await the instruction (+ frozen art if any) first.

PATTERNS ESTABLISHED (reuse in PR C/D):
- Per-platform split: `isDesktop ? <Desktop/> : <Mobile/>` at the route (App.tsx edit
  permitted ONLY for that minimal branch). RootEntry-style redirects may mean only
  some sites need the switch — verify render sites first.
- Reuse without firebase coupling: lift shared, dependency-free logic into a small
  module (e.g. PR #168's src/lib/desktop/homeDestinations.tsx) imported by both
  variants; do NOT import a heavy page into a light one (pulls firebase into the chunk
  + unit test).
- Grammar primitives: import from `src/components/grammar` (`Card`, `TileRow`, `Pill`,
  `SectionHeader`). TileRow reflow is pure CSS (@media max-width:1023px); `columns` prop.
- Desktop-unchanged proof: keep edits to the desktop component module-level only
  (relocate declarations; never touch the component JSX) and show the diff hunks are
  all pre-component.

NOTE: build gate = `npm run build` (the real Vercel command); the Vercel PREVIEW
check on each PR is a valid pre-merge production-build gate. The false-green
`npx tsc --noEmit` was fixed in #164.

## RENDER-TEST INFRA NOW AVAILABLE (PR #160)

`npm test` in `lazytopper/` runs Vitest over `src/**/*.test.{ts,tsx}` (jsdom,
Testing Library, jest-dom; `window.matchMedia` polyfilled in `src/test/setup.ts`,
overridable per-test via `setMatchMediaMatches`). Every future UI PR (grammar
primitives, Mobile Home, practice-page extraction) MUST ship a real render/reflow
test as proof-of-work. The `scripts/` guard suite (137 tests, node:test runner) is
separate and unaffected — `vitest.config.ts` `include` is scoped to `src/`.

NOTE: the false-green `npx tsc --noEmit` was RESOLVED in #164 — `start:quick` now
runs `npx tsc -p tsconfig.app.json --noEmit && npm run build`, and `precommit:check`
was removed. Use `npx tsc -p tsconfig.app.json --noEmit` (or `npm run build`) for a
real app typecheck.

## BANK STATE

Total questions: ~6,120
  - Authentic: ~3,341
  - AI-Generated: ~2,779
  - Board PYQs: 857 (all 4 main exam years complete)
    214 from 2022-23 (PR #135+#137)
    172 from 2023-24 (PR #147+#148+#150)
    182 from 2024-25 (PR #144+#145)
    193 from 2025-26 (PR #141+#142)
Spreads: 266 (post-PR #150; PR #151 added no new imports)
Test matrix: 137/137 PASS (5 test files)
Retirement threshold: 4,500 (~74.2% reached)

## FILTER + STEP MARKS STATE

All filter chips working (post-PR #151):
  MCQ · Proof (broadened) · Competency · Assertion-Reasoning · Case-based · PYQ toggle
Section A + Remembering competency override active in 3 sites
Our Environment normaliser merged 156 split questions under one topic key
Step-marks guide-only banner removed for canonical bank questions

KNOWN ISSUE (post-#151): Proof filter still catches Section A conceptual
recall questions (subtopic contains "proof" or "identit"). Fix is one line
per file in practiceQuestionBuilder.ts + PracticePage.tsx — see ISSUE-007.

## PYQ EXTRACTION STATUS — COMPLETE

| Year | Maths | Science | Status |
|---|---|---|---|
| 2025-26 (pyqYear 2026) | 42 Qs ✓ | 151 Qs ✓ | Done PR #141+#142 |
| 2024-25 (pyqYear 2025) | 57 Qs ✓ | 125 Qs ✓ | Done PR #144+#145 |
| 2023-24 (pyqYear 2024) | 96 Qs ✓ | 76 Qs ✓ | Done PR #147+#148+#150 |
| 2022-23 (pyqYear 2023) | 103 Qs ✓ | 111 Qs ✓ | Done PR #135+#137 |
| 2021-22 (pyqYear 2022) | 0 | 0 | LOW PRIORITY — Term II format |

All 4 main exam years extracted. P4 phase COMPLETE.

## IMMEDIATE NEXT TASKS (in order)

### Task 1 — Small fix PR: Hindi garbled + Proof Section A exclusion (P0 — before launch)
Branch: fix/remove-hindi-garbled-pyq (fresh, small)
Combines ISSUE-006 + ISSUE-007 in one PR.

ISSUE-006 fix:
  Search all PYQ files for garbled Devanagari patterns and remove offending question(s):
    Select-String -Recurse -Path "lazytopper\src\data\questionBanks\class10" `
      -Include "*.ts" -Pattern "OgHo|_mZ|H\$m|bE 2 sin"

ISSUE-007 fix (one line each in two files):
  Add at TOP of Proof branch in practiceQuestionBuilder.ts (line ~485) and
  PracticePage.tsx (line ~290):
    const qSection = String((q as { section?: unknown }).section ?? "");
    if (qSection === "A") return false;

Validation: 137/137 PASS, TypeScript exit 0

### Task 2 — P5 Sample paper extraction (P1 — pre-launch content boost)
Target: ~200 questions from CBSE sample + preboard papers
Branch: content/p5-sample-papers

### Task 3 — Filter UX redesign (P1 — student vocabulary, 2-layer layout)
Default visible (2 rows):
  Row 1 — Question Style: All · MCQ · Proof · Application & Scenario ·
           Assertion-Reasoning · Case-based
  Row 2 — Marks: All · 1 mark · 2 marks · 3 marks · 5 marks · Case (4 marks)
Toggle: "Board exam questions only" (PYQ)
Advanced (expandable): Difficulty + Source (Authentic / Practice only)
Key renames: "Competency" → "Application & Scenario", Section labels → Mark labels

### Task 4 — API gateway Railway deploy (P0 — AI features 404 in prod)
+ vercel.json rewrite

### Task 5 — Clerk pk_live_ keys switch (P0 — Vercel env var)

## PARKED (do not start yet)

- VSA-format doctrine: 96 questions (90 in B + 6 in A) not covered by the 7 migration rules
- Pack question regeneration with stricter per-section prompts (post-launch)
- K2D → Mistake Intelligence aggregation (post-launch)
- TutorDrawerV2 decision (post-launch)
- 2022 Term II papers (low priority)
- Product PRs (strategyHint button, Show visual fix, Formula sheet) — parked until authentic ≥ 4,500

## PIPELINE SCRIPTS

C:\Users\Chetan\OneDrive\Desktop\diff\fix_section_format_migration.mjs (PR #151)
C:\Users\Chetan\OneDrive\Desktop\diff\add_competency_field.mjs (PR #151)
C:\Users\Chetan\OneDrive\Desktop\diff\fix_canonical_bank.mjs (PR #151)
C:\Users\Chetan\OneDrive\Desktop\diff\probe_section_format.mjs (PR #151 dry-run aid)
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_probe.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_extract.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_generate_ts.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_checkpoint_b.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_pyq_reachability.mjs

## LAUNCH TARGET

First week of June 2026 (~12 days from this handoff)
Primary use case at launch: chapter-by-chapter practice + worksheet generation
Filter complexity not needed by students until September (PT1 season)
Full timed mock + advanced filter system needed before October (half-yearly)
