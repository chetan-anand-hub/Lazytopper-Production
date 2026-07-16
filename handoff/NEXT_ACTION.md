# LazyTopper — Next Action
# Updated: 2026-07-16 (post-PR **#447 — QR PR-2: SCAN-TO-SEND is LIVE on QUICK PRACTICE + HPQ + TOPIC HUB, trunk `d99c14d`, owner LIVE-VERIFIED on the deployed app (all four checks green).** **ONE file (`SolutionChecker.tsx`, +62/−7), ONE wire, THREE surfaces** — QP + HPQ + TopicHub all render `SolutionChecker`; the #441 channel was reused verbatim, nothing rebuilt. **NOT C&I** (it owns its own upload code; `DesktopCheckImprovePage:1714` is a COMMENT — re-verified true at `d99c14d`). **Seam contract honoured:** `mode="photo"` (one handwritten answer ⇒ the photo IS the answer), attached as a **sibling of the dropzone INSIDE the `answerTab==="upload" && !hasFile && !result` block — NEVER a third peer**; 360px safe **twice over** (two `flex:1` peers unchanged + `QrAnswerHandoff` returns null <1024px so it cannot render there); **sibling not nested** — the dropzone is a `<button>`. **★★ THE REUSABLE TRAP — the CT wire is NOT copy-pasteable: the phone's picker keeps `accept="...,application/pdf"` in EVERY mode** (`capture` only HINTS at the camera, it does not restrict the picker) **⇒ a PDF can arrive in `mode="photo"`**; CT has no preview so its 2-field set sufficed, but `SolutionChecker` has an `imagePreview` branch gated on `!isPdf` ⇒ it needs the **full FIVE-field tuple** (`fileName`/`isPdf`/`imageMimeType`/`imagePreview`/`imageBase64`) or a QR PDF renders **broken** in `<img>` (owner live-verified this exact case). **★ The QR-session reset needed NO code** — `!hasFile` gates the mount ⇒ delivery unmounts (cleanup cancels polling), clearing remounts fresh `idle`; *make the stale state unreachable rather than remembering to clear it.* **`mode` threads to the phone as `variant`, not `mode`** (mint body `{variant}` → coordination doc, defaulting to the SAFER `document` → phone copy + `capture`). **#447 ALSO closed `SolutionChecker`'s own 5 MB copy lie** (it had its **own** `MAX_PDF_BYTES = 5 MB`; now reads `services/uploadLimits.ts`, 3.5 MB, both copy strings derived) — folded in with owner approval because shipping QR@3.5MB beside a picker promising 5MB IS the forbidden "uploaded, then dead". **★★ FRAMING — do NOT record that as a surface #443 "missed":** [FU-QR-SOLUTIONCHECKER-WIRE] was logged **BLOCKED ("do NOT touch until they are out")** because the QP lane owned the file when #443 shipped; #443 correctly scoped to the three host panels then free. **SolutionChecker was the one correctly HELD BACK for PR-2 — the bug living until now is the seam contract WORKING AS DESIGNED.** *A deferred fix landing exactly when its lane opens is success, not debt.* **[FU-SOLUTIONCHECKER-TEXT-XOR-IMAGE] — #445 asked PR-2 to decide it; DECIDED: structurally moot, no data loss shipped** (the send is tab-gated at `:343-344` and QR is reachable only from the upload tab ⇒ a QR image can only be sent from `upload`; typed text is **preserved, not destroyed**). It stays open on its original terms — making text-alongside-image *work* is a grader change. **★★ BUT auditing that gate found a REAL latent bug → NEW [FU-SOLUTIONCHECKER-STALE-ANSWERTAB]:** `handleCheck` READS `answerTab` (`:343-344`) but OMITS it from its useCallback deps (`:404`) ⇒ upload+file → switch to type, type → switch BACK with no further edit → Check **sends the typed text while the screen shows the image** — *exactly* the failure the gate's own comment at `:340-342` says it prevents. **Pre-existing (#436), held out of #447 with owner approval; needs gate-vs-deps reasoning + a NEGATIVE TEST proving it fails pre-fix — a guard that cannot fail is theatre.** *The move that found it: when asked "is X safe?", audit the MECHANISM that makes it safe, not today's output.* **★★ NEXT FROM THIS LANE: [FU-QR-CI-WIRE] — the LAST wire** (C&I: `DesktopCheckImprovePage` + mobile `CheckImprove`, `mode="photo"`; #436 touched both, so check lane-overlap first). **Two owner-approved "assume nothing" checks, both earned the hard way in THIS lane:** (1) **look for a THIRD copy of the 5 MB constant** — SolutionChecker had its own that nobody expected; **do NOT inherit "the lie is gone everywhere" as a fact twice in one lane**; (2) **if C&I has its own tab-gate, check it for the SAME stale-closure shape.** Then the QR lane is closed but for owner-infra **[FU-QR-STORAGE-LIFECYCLE]** (24h lifecycle on `qr-uploads/`) + **[FU-GRADER-5MB-COPY]** (forbidden grader file, own owner-approved PR). **⚠ The 9th stale-base catch happened here:** docs #446 merged MID-SESSION and the branch went stale — it presented as **seven handoff files appearing as DELETIONS, indistinguishable from the §2a collision signature until checked**; verified docs-only, rebased onto `c2db430`. *Every diff surprise on a shared trunk is a real collision until proven otherwise.* **BRANCH CLEANUP IS ON HOLD at the owner's explicit instruction** (CLAUDE.md §3: branch deletion is NEVER auto-approved). **§7 (the PAYWALL PR) remains UN-DISPATCHED** — unchanged by #447; its trap is recorded under the #445 header below and is untouched. **LIVE LANES (file-disjoint, do NOT start anything new):** Fable bank expansion.)
# _Superseded header (post-PR #445):_ Updated: 2026-07-16 (post-PR **#445 — GRADER `objective` FLAG (§2) + ATTEMPT-DEDUP `mode` DROP (§4b), trunk `ad2a9b2`, owner LIVE-VERIFIED on the deployed app.** Two bugs, ONE root: **nothing client-side could tell an objective question from a subjective one** — hence both the "+0 marks" chip AND the attempt double-count; they shipped as one PR. **§2:** the grader has always (PR-348) zeroed per-step marks on an objective question BY DESIGN (the whole 0-or-full mark lives at ANSWER level) but never SAID so, so five sites printed "0 marks / +0" per step under a "Full marks 1/1" header — reading as *the student scored 0 on every step*. One **additive** `objective` field from **BOTH** grader functions (`handleCheckSolution` + `normaliseStructuredResult` — the keep-in-sync pair, **patched together**) → five chip sites **suppress the chip, KEEP the annotation**. **Gated at the VIEW, not grade-time** (stored scorecards froze the old 0s; pre-`ad2a9b2` scorecards carry no flag → old chip, honestly stale, never rewritten). No score change; subjective byte-identical. **★ The flag had to reach FURTHER than the five chips** — through the TYPES they render: `WorksheetQuestionGrade` (`aiClient.ts:407`) + `CiGradedQuestion` + the four print-props builders; the client parse is a **generic passthrough (`handleJsonResponse<T>`) so NO grade-service edit was needed** (mirrors the PR-2 `topicSlug` precedent). *Lesson: trace to the TYPE the renderer consumes, never assume the server response reaches it directly.* **§4b:** `attemptDedupKey` included `ctx.mode` and **★ the key IS the Firestore doc id** ⇒ dedup is **all-time + cross-device** (the 400-entry local ring is only a fast pre-check); a wrong-click then a graded typed answer on the same question minted **TWO permanent attempt docs** and progress counted it twice forever. Dropping `mode` collapses exactly that pair; **the score stays in the key so 0/1 vs 1/1 never collapse**; `mode` still lives in the attempt DOCUMENT (display/analytics). **Owner live-verified all three:** chip gone + annotation kept · 5-mark subjective still shows per-step marks (**the gate did not leak into the subjective path**) · click-wrong-then-grade = **+1, not +2**. **★★ NEXT FROM THIS LANE: NOTHING — it is CLOSED.** **★ THE UNBLOCK: `SolutionChecker.tsx` IS VACATED** — #445 was the last lane holding it; no branch/PR touches it (its only history was #436, already merged), and CI **`lane-overlap` PASSED** ⇒ **[FU-QR-SOLUTIONCHECKER-WIRE] (QR PR-2) is UNBLOCKED and DISPATCHED to a fresh agent.** ⚠ **`SolutionChecker.tsx` line numbers MOVED in #445** (dead banner deleted, chip gate added, `AnnotatedStepCard` gained an `objective` prop) — **re-derive; never trust a pre-`ad2a9b2` line number.** For that agent: one wire still covers **QP + HPQ + TopicHub**, **NOT C&I**; don't disturb the `objective` prop threading; **[FU-SOLUTIONCHECKER-TEXT-XOR-IMAGE] sits directly in its path** (client `hasText && !hasImage` AND the grader's prompt branch — a QR upload sets the IMAGE, so a typed answer is ignored at BOTH layers); real ceiling **≈3.5 MB not 5 MB** (`uploadLimits.ts`); `lazytopper.checkResult.v1.` has **no version bump** across shape changes. **§7 (the PAYWALL PR) remains UN-DISPATCHED**, awaiting its own turn; its **§7.7 test is drafted + PARKED** at `scratchpad/PR2-paywall-7.7-test-DRAFT.mjs` — ★ **the paywall counter counts API SPEND EVENTS; the attempt key counts DISTINCT QUESTION-OUTCOMES. A re-check is a second Gemini call and MUST count again — do NOT dedupe the paywall counter against the attempt key; conflating them under-bills every re-check.** Baseline unchanged: **`recordQuestionAnswered` has NO caller** (the daily counter ticks for nobody); §7's wiring re-arms the gate for the first time, must make the gate **action-level** (block the Check button, never the route — browsing + MCQ clicks are free forever), and must stay **OFF** `subscriptionService.ts`/`AuthContext.tsx`/`featureGates.ts` (the urgent cloud-auth lane owns those). New FUs: **[FU-STEPMARKCHIP-EXTRACTION]** (the five chips are five INLINE re-implementations with no shared component — inline was chosen DELIBERATELY so the diff stayed narrow and did not hold the QR/paywall lanes hostage for a behaviour-neutral refactor; extract `StepMarkChip` in its own PR) + **[FU-BANK-SUBJECTIVE-FORMAT-IN-SECTION-A]** (117 one-mark rows carry a subjective format yet sit at section A ⇒ graded binary 0/full). **LIVE LANES (file-disjoint, do NOT start anything new):** QR PR-2 (dispatched) · Fable bank expansion.)
# _Superseded header (post-PR #441 + #443):_ Updated: 2026-07-15 (post-PR **#441 + #443 — QR DESKTOP→MOBILE ANSWER UPLOAD is LIVE, trunk `5aaaeec`, owner live-verified on the Full Mock result screen.** A laptop student who solved on paper no longer photographs → WhatsApps/emails themselves → saves → uploads: the desktop shows a QR, the phone scans + sends, the file lands in the SAME answer box and **grades exactly as today** (the grader was never touched — QR is a DELIVERY mechanism). Channel = **Firebase Storage blob + a Firestore coordination doc, both written server-side via firebase-admin**; the phone never touches Firebase. **NO rules change / NO deploy step / NO new dep / NO new env var** (admin bypasses both rule sets and no client touches either → the existing deny-alls are correct and protective — do NOT add a rule for `qrUploadSlots` or `qr-uploads/`, and do NOT touch `ncert/`). **Security:** two-token split makes write-only literal — `uploadToken` (in the QR) can only write, `pickupToken` (desktop-only) reads once + destroys; 256-bit, sha256-hashed at rest, single-use, delete-on-pickup, never logged; **mint requires auth so caps are PER-UID — never per-IP** (shared school wifi / carrier NAT would throttle a whole school). **#443** also fixed a **live PRE-EXISTING bug: "PDF up to 5 MB" was never spendable on EITHER path** (base64 ×4/3 ⇒ 6.67 MB vs `readJson`'s 5 MB cap) — a 4-5 MB PDF attached **on the desktop, no QR**, passed the picker and died at the grader; measured true ceiling **≈3.68 MB**, limits unified in `src/services/uploadLimits.ts`, guarded by a **negative-tested** cap-arithmetic assertion in `test:qr:channel` (46/46, in `test:matrix:all`). **★★ THE CREDENTIALS TRAP — do not re-derive: `verifyIdToken` working proves NOTHING about service-account credentials** (it needs only the project id + Google's PUBLIC certs); the deploy log read `credentials: explicit` **only because the key was already set for the pre-existing `[share]` feature**, not because auth implied it. **NEXT FROM THIS LANE: [FU-QR-SOLUTIONCHECKER-WIRE] (PR-2) — BLOCKED until the QP lane vacates `SolutionChecker.tsx` (still mid-flight there; #442 open).** One wire there covers **QP + HPQ + TopicHub** — **NOT C&I** (corrected: C&I owns its own upload code; `DesktopCheckImprovePage:1714` is a COMMENT, not an import). Seam contract: **QR attaches INSIDE the upload panel, never as a third peer** (360px CTA math). Then **[FU-QR-CI-WIRE]** for C&I. New owner-infra **[FU-QR-STORAGE-LIFECYCLE]** (24h bucket lifecycle on `qr-uploads/`) + **[FU-GRADER-5MB-COPY]** (the grader still says "under 5 MB" — forbidden file, own PR). **[FU-FULLMOCK-NO-UPLOAD-PANEL] WITHDRAWN — never file it; Full Mock IS covered.** **LIVE LANES (file-disjoint, do NOT start anything new):** QP-sessions (#442 open) · Fable bank expansion.)
# _Superseded header (post-PR #435):_ Updated: 2026-07-15 (post-PR #435 — **[FU-MATHTEXT-COMMAND-CORRUPTION] CLOSED, trunk `fd57db1`, owner live-verified.** The app's single shared maths renderer (`MathText`, 13 consumers) no longer mangles bare LaTeX commands: the tutor renders cos²A/sin²A as real maths and every consumer surface is unchanged. Fixed BY CONSTRUCTION (protected-span model: scan delims (…) AND […] + command names with balanced args → promote only in the gaps → wrap only what KaTeX proves it can render) — **no lookbehind, so bank content (AB^2, CO_2, cm^2) is byte-identical by construction**. 2 files, zero consumer edits, dead `renderMathInText` deleted. **NEXT FROM THIS LANE: nothing — it is CLOSED.** ★ NEW **[FU-CI-GATE-VITEST]** (fix before soft launch): four vitest suites exist and **none run in CI** — `MathText.test.tsx` (shared renderer), `EquationInput.test.tsx` (equation widget), `tutorRoundTrip.test.ts` (tutor round-trip), `WorksheetPrintDoc.test.tsx` (worksheet print doc); `quality-gate.yml` = root matrix → mojibake → build → ops matrix, no vitest anywhere. Also new: [FU-MATHTEXT-MULTILETTER-BASE], [FU-MATHTEXT-RENDER-GATE-RATIONALE] (do NOT delete `katexCanRender` as redundant). **LIVE LANES (file-disjoint, do NOT start anything new):** QP-sessions (#436, being widened with the fetch fix) · QR desktop→mobile upload · Fable bank expansion.)
# _Superseded header (post-PR #344, kept for context):_ Updated: 2026-07-08 (post-PR #344 — **Progress-Journey ARC · PR-3 per-surface Worksheet HISTORY MERGED, trunk `a4c3eec`.** NEW `components/results/SurfaceHistory.tsx` renders the durable session records (PR-1 store) as a "Your worksheets" section on the WorksheetGenerator BUILD view — **CONSUMES the store read-only** (§3a): C1 rows (code/title/date/score-chip-or-awaiting-pill/four-type dot-strip + honest empty) · C2 `getSubjectProgress` vs-last-time chip (honest-or-silent; subject-level month trend) · C3 tap-row → READ-ONLY `<ResultsScorecard>` re-open (no `perQuestionRef` reconstruction; Download only when local caches resolve). PR-2 files additive (no live-scorecard regression); CT/FM history = deferred seams. 3 self-caught defects fixed (pending-upload no-Download + honest copy). Owner-QA'd. **BUILD LANE IMMEDIATE NEXT: arc PR-4, Me/Progress redesign** (§3b / §4-step-4 — ONE responsive component reads the recent strip + rolled-up before→now; retires the legacy dashboard widgets). SEPARATELY: 3 owner-found worksheet bugs (grader MCQ all-or-nothing + PDF filename + history placement) fix in their own follow-up PR — NOT PR-3 regressions. New FU: [FU-HISTORY-C2-PER-WORKSHEET-DELTA]. _Prior: post-PR #341 — arc PR-2 the Universal `<ResultsScorecard>` MERGED (`8c4c159`), worksheet+QP variants LIVE, CT/FM deferred, presentational §1a._ _Prior: post-PR #338 — arc PR-1 the session-record DATA LAYER MERGED (`d704b1c`): the `sessionRecords/{uid}/records/{code}` store + `progressStore` reader + durable `#NN` + `perQuestionRef`; new Firestore collection → rule `dc73360`._ **CONTENT LANE:** Light is ship-tracked — the trusted-student QC verifies the 230 authored solutions + 52 flagged diagrams from `docs/light-extraction-review-queue.md`; deferred gdrive leftovers (757 AR 25Q, 821 objective 51Q, 2022-23 PYQ residual, CBSE Practise Papers) are a later 1-mark pass; **Electricity extraction starts ONLY on explicit owner go**, reusing the pipeline in `Desktop\Content\extraction\light\`.)
# Base SHA: d99c14d  (squash of #447; re-derive after this docs PR merges — never trust a written SHA. #445's pre-flight caught a handoff written against a tip FOUR commits stale AND a shared checkout that was too; #447's run had docs #446 merge MID-SESSION and go stale underneath it — the 9th such catch.)

## ⏭️ CURRENT POINTER (as of 2026-07-13 — trunk `a8f36ab`: **#423 FINAL MOBILE-PARITY SWEEP merged + owner LIVE-VERIFIED (360px) — no live route shows the old global brand bar at mobile width; [FU-MOBILE-OLD-HEADER-STRAGGLERS] CLOSED; Exam Trends + HPQ fully ✅ in SURFACE_TRACKER; the launch-board "mobile-parity confirms" item is DONE.** Over #419 bank Batch 11 `69e319d` [bank 8,597; NEXT bank batch = Batch 12 = trigonometry + circles + carbon-and-its-compounds] / #420 C&I PR-3 `cc84ae5` [C&I surface COMPLETE] / #416 C&I PR-2 `a1eaebc` / #412 PR-B-v2 `1228c95`. **Launch spine's next domino remains Home nudge (arc PR-5)**; new non-gating [FU-LEGAL-FOOTER-LINK] + [FU-MOBILE-SHELL-PADDING-STACK])

> **UPDATE 2026-07-15 (#438 OPEN, base `a5691a7`) — BANK-COMPLETION SEQUENCE STARTED. The bank is the LAST critical-path item before soft launch.** Sequence = **#438 MCQ repair (open, awaiting owner byte-review + merge) → then 4 EXPANSION PRs of 3 TOPICS EACH** for the 12 remaining topics (packaging RATIFIED at 3-per-PR; a 6-per-PR proposal was rejected — owner byte-review caught real syllabus errors in 2 of 11 batches that skeptics + gates passed, and diff size is the remaining variable). **NEXT batch = Batch 12 = trigonometry + circles + carbon-and-its-compounds.** Lane record + live per-topic census + all rulings: `handoff/BANK_EXPANSION_LANE_STATE.md` (READ IT — it is the lane's authoritative floor policy, gate stack, skeptic process, and syllabus-anchor process-fix).
>
> - **#438:** [FU-BANK-UNRESOLVABLE-MCQ-KEYS] CLOSED — **13 rows withheld, not 34; ZERO were key-fixes** (every one's OPTIONS are destroyed too ⇒ a key-only repair leaves it unanswerable, and authoring distractors would FABRICATE a PYQ). Bank 8,597 → **8,584**. **Severity claim in the record was FALSE and is corrected: the item silently NEVER SCORES — a correct pick is never marked wrong.** CI landmine cleared; `CBE-S-MAGN-A-001` HOLD + the 168 no-options VSA rows CLOSED as non-defects. Recovery split to **[FU-BANK-MCQ-REEXTRACT]** (pymupdf only — `pdfplumber` BANNED).
> - **✅ REACHABILITY SETTLED — all four surfaces (QP · Worksheet · CT · FM) source `canonicalQuestionBank`. [FU-QP-WORKSHEET-BANK-SOURCING] WITHDRAWN — premise disproven; do NOT re-file.** QP/Worksheet reach it ONE TRANSITIVE HOP below their direct imports (`practiceSetGenerator`/`predictionDataService` → `PredictionCore` → `unifiedQuestionBank` ⊇ the bank), proven by calling the real fns (10/10, 8/8 canonical). **The expansion IS visible to students.**
> - **⚠ [FU-BANK-SCARCE-BAND-MISBANDING] (NEW, pre-launch)** — the owner's live "5-mark Section D / Easy = *Find the value of cosec 60°*" bug is a **CANONICAL BANK ROW** (`TG3-056`): the bank serves faithfully; **the bank is wrong**. **76 MCQ/AR rows sit at section D / 5 marks** (grader clamps 0-or-5; reaches CT/FM Section D) + ~178 under-stepped D/E solutions, over 16 topics. **Own PR(s), class (a) first — NOT folded into the expansion.**
> - **⚠ SYLLABUS RULING — magnetic-effects is RETAINED & EXAMINED (official 2026-27 Unit IV = 13 marks), but Motor / Electromagnetic Induction / Electric Generator are OUT of board-prep authoring** ("assessed only formatively… without adding to summative assessments"). Expect a hard honest-stop on that chapter. **`CLAUDE.md` §5 is STALE — FLAGGED for the owner, deliberately NOT edited.**
> - Also new: **[FU-TOPICMATCHES-SUBSTRING-CONFLATION]** (`circles` ↔ `areas-related-to-circles` — the only colliding pair of 26, and BOTH are in the remaining Maths set) · **[FU-REACHABILITY-TEST-SCOPE]** (step 6 proves bank integrity, never surface sourcing).

> **UPDATE 2026-07-15 (#432, `65fdf85`) — TUTOR STAGE 2 COMPLETE + owner-live-verified (360px).** The round-trip works: durable `tutorSessions/{uid}` session survives close/reopen; Practise → Quick Practice concept-filtered (returns via `practiceInsights`) / Get-marked → C&I (returns via `sessionRecords`), both into the SAME thread; ONE intent-driven CTA via the `[[offer:…]]` sentinel (server-stripped); demonstrations pull a verified bank question. #428 shipped Stage 2, #432 fixed the six preview bugs. **NEXT for the tutor = Stage 3 (explanation-panel visuals) — a SEPARATE dispatch, do NOT start unprompted.** Launch spine's next domino is still Home nudge (arc PR-5). New live tutor FUs: [FU-MATHTEXT-COMMAND-CORRUPTION], [FU-QUICK-PRACTICE-DURABLE-SURFACE], [FU-RETURN-TICKET-CONTRACT], [FU-PRACTICE-COUNT-PASSTHROUGH], [FU-TUTOR-INCHAT-QUESTION-UPLOAD].

> **UPDATE 2026-07-13 (#423, `a8f36ab`) — FINAL MOBILE-PARITY SWEEP merged + owner live-verified.** `isMobileSelfChromedRoute` grew 4 families whose matchers MIRROR `isDesktopShellRoute` (exact `/practice/worksheets` · `/topic-hub*` · `/highly-probable*` · runner regex) and the new route-level `<MobileSelfChrome>` (App.tsx) applies the shared MobileShell avatar header at mobile width — AROUND `RequirePremium`/`PracticeLimitGate`, so premium-upsell/daily-limit states carry the header. 2 files; pages/gates/DesktopShell byte-untouched; desktop chrome byte-identical. Confirm-and-report: /pricing already own-chromed, /profile a redirect alias, all legacy/retire routes have NO live inbound (none chromed). Report: `Desktop/diff/report-mobile-parity-sweep-2026-07-13.md`.

> The header block + "CURRENT BASE" below are STALE (base `a4c3eec`, pre-#363/notes); a full NEXT_ACTION rewrite is part of the owed [FU-HANDOFF-DOC-DRIFT] hygiene pass. Current reality:
>
> - **✅ C&I PR-3 = MERGED (#420, code `cc84ae5`) — [FU-CI-SOLUTION-CACHE] CLOSED; the Check & Improve arc has NOTHING left.** The model-solution cache is LIVE via the owner-ratified SCHEME-FIRST design (pre-flight caught the spec's wrap-point error): keyless SUBJECTIVE questions grade against a student-agnostic solution from the EXISTING `step_solutions` Postgres cache (hash → read → generate-from-question-ONLY on miss → **Gate-2a quality gate, applied at EVERY cache write path** → write-if-pass) injected into the grader's EXISTING marking-scheme slot — same question shares ONE solution across students; interoperates with `/api/step-solution`. Sacred `checkSolution.cjs` diff = +95/−4 deps-injected hooks ONLY (owner byte-review: "textbook-clean"; rules/clamps byte-unchanged; cache failure degrades, grading never blocks). Gate 2b = `POST /api/admin/solution-cache/evict|regenerate`, **`ADMIN_FIREBASE_UIDS`** Bearer allowlist fail-closed → **[FU-ADMIN-UIDS-DEPLOY-ENV]: set the env on the server (Railway) or the endpoints stay safely disabled.** CACHE_VERSION now prefixes ALL hashes (staleness bug fixed). Structurally addresses [FU-MODEL-ANSWER-QUALITY]. **Owner live-verify pending** (repeat-question fast · garbled-not-persisted · eviction · 503-without-env). vitest 62/62 Codespace; CI green.
>
> - **✅ C&I PR-2 = MERGED (#416, code `a1eaebc`) — the Check & Improve surface is COMPLETE desktop+mobile.** All 5 items landed (A per-Q topic via A2 grader-untouched · B counted `N topics` chip + by-topic lens · C PDF solution upload · D mobile parity composing shared services, #437 stub deleted · E `/exam-trends`+`/practice-hub` one-header). Closed **[FU-CI-PERQUESTION-TOPIC]** + **[FU-MOBILE-CI-PARITY]** + **[FU-MOBILE-OLD-HEADER-TRENDS-PRACTICE]**. **The ONLY thing left on C&I = the owner-gated [FU-CI-SOLUTION-CACHE] (PR-3/4)** — the Tier-2 model-solution cache, gated on owner sign-off of its 3 safety gates (server-only writes · mandatory invalidation/quality-flag · store text-never-the-image). Do NOT build it unprompted. New open **[FU-MOBILE-OLD-HEADER-STRAGGLERS]** (11 mobile routes still on the old brand bar — pre-launch cleanup pass).
>
> - **✅ PR-B-v2, the progress ENGINE fixes = MERGED (#412, code `1228c95`) + OWNER LIVE-VERIFIED on the stable link → the Me/Progress Verified cell is ✅ and LAUNCH-DOMINO #3 IS CLOSED (the arc shows REAL data across all four surfaces).** All three engine FUs closed in `progressStore` read-side (grader/App.tsx/rules/src/data untouched): **[FU-PROG-TOPIC-KEY-MISMATCH]** (resolveCanonicalSlug on BOTH sides of every topic compare — 5/26 topics could never key-match; legacy label attempts re-bucket; registry-driven all-slugs regression test) · **[FU-PROG-DATA-COMPLETENESS]** (the UNIFIED graded stream: cloud attempts ∪ record payload marks, deterministic ws:/ct:/fm: id dedup — CT/FM objective Section-A now counts, pre-#403 record-only history healed; C&I records skipped by construction = dual write counts once) · **[FU-PROG-WINDOW-MODEL]** (activity-median split, wider ⊇ narrower; spanDays + isShortSpan → the honest amber short-term label on the Me arc + Topic Hub). Plus the Topic Hub running-accuracy SPARKLINE over the new cross-device `getTopicTrendFromCloud` (real scores from 2 points). Live-verify: Polynomials hub 33.9%→46.9% + sparkline + honest label; Trigonometry honestly empty. **⏭️ THE NEXT LAUNCH-SPINE DOMINO = Home nudge (arc PR-5)** (orient-first convergence + ungraded nudge; reads PR-B). New FUs from #412: **[FU-PROGRESS-PRESENTATION-REDESIGN]** (owner-recorded, LATER presentation-only PR: fold the per-topic trend into the topic HERO card + graphical Me with subject toggle + topic dropdown — do NOT build now) + **[FU-PROG-PRE403-QP-BACKFILL]** (deferred historical QP blob recovery).
>
> - **✅ MOBILE CHROME — app-wide account avatar-dropdown parity = MERGED (#410, trunk `f662fbe`), owner byte-reviewed + live-verified CLEAN.** The mobile header now carries the SAME account menu as the desktop shell, added once in the shared `MobileShell` (mirrors the desktop dropdown; READ-ONLY subscription, no trial activation; same `/pricing?source=account-menu&returnTo=…` URL + logout), and the old global mobile brand bar no longer double-stacks on `/check-improve`, `/intent`, `/practice/worksheets/ready` (added to `isMobileSelfChromedRoute`). Option A reuse: `DesktopShell.tsx` byte-unchanged, new shared pure `utils/accountStatus.ts` helper. **Owner live-verify surfaced a COVERAGE GAP (not a #410 defect): `/exam-trends` + `/practice` still show the OLD global brand bar** → **[FU-MOBILE-OLD-HEADER-TRENDS-PRACTICE]**, folded into C&I PR-2 as item E (reuse `accountStatus.ts`, no fork; + sweep for other straggler mobile routes). New FUs: [FU-DESKTOP-ACCOUNT-MENU-SHARE], [FU-SUBSCRIPTION-AUTOTRIAL-ONMOUNT].
>
> - **BANK-EXPANSION Batch 9 = polynomials +62 MERGED (#411, trunk `9749fc9`) + Batch 10 = pair-of-linear-equations / arithmetic-progression / acids-bases-and-salts +440 MERGED (#415, trunk `ae2b447`, the FIRST 3-topics-per-PR batch).** Batch 9 ABSORBED the sum/product-of-roots (zeros↔coefficients of quadratic polynomials) items as **Class-10 2026-27 CORE** (extract-max A/B/C +13 + D 12→34 + E 10→37, both honest-stop; scope held to quadratic zeros-coefficient only — cubic/division-algorithm/complex zeros excluded). Batch 10 shipped 3 topics on ONE branch/wire/PR (per-topic discipline unchanged): PLE +163 (D 29→77 · E 16→81, incl. a reducible-to-linear pack +30) · AP +114 (D 20→72 · E 28→70, AP only no GP) · ABS +163 (D 27→63 · E 12→72, qualitative Class-10). **BOUNDARY CORRECTION (owner):** "equations reducible to a pair of linear equations" (1/x=p, 1/y=q) is IN the CBSE 2026-27 syllabus — the main sweep wrongly excluded it; added on-branch; a proposal to add it to `syllabusGuard.ts` was **WITHDRAWN → syllabusGuard UNTOUCHED** (Cross-Multiplication Method stays OUT). Skeptics dropped 16+3 twins + fixed a chem MCQ collision. Owner byte-review CLEAN on both. **Bank → 8,282; 11 distinct topics done; 15 remain (8 Maths + 7 Science).** New FUs: [FU-AP-BANKED-GP-ITEM], [FU-ABS-WASP-STING-ALKALINE]; [FU-SYLLABUS-GUARD-PLE-REDUCIBLE] WITHDRAWN.

> **UPDATE — Batch 11 = triangles + coordinate-geometry + metals-and-non-metals +315 MERGED (#419, trunk `69e319d`, the SECOND 3-topics-per-PR batch).** triangles +127 (294→421: extract 18 A/B/C + authored D 44 + PROOF 20 [7 D-weight + 13 C-weight] + case-E 45; scarce D 40→91 · E 23→68) · coordinate-geometry +67 (232→299: extract 7 + D 13 + E 47; thin, D honest-stop at 28) · metals-and-non-metals +121 (299→420: extract 45 + D 28 + E 48; D 32→60 · E 10→58). **BOUNDARY PRECEDENTS (owner-verified 2026-27):** internal ANGLE-BISECTOR THEOREM (BD/DC=AB/AC) is OUT ("proof of various theorems" trimmed from Triangles) → 2 D items dropped, BUT PF-015 (corresponding bisectors of SIMILAR triangles proportional via AA) KEPT (in-syllabus similarity, not the deleted theorem); coordinate-geometry AREA-FROM-COORDINATES stays OUT (guard-banned, ~28 dropped); metals Periodic Classification (Ch5) OUT — syllabusGuard NOT edited. 3 skeptics dropped 9; tsc caught 8 invalid `format` strings. Owner byte-review CLEAN. **Bank → 8,597; 14 distinct topics done; 12 remain (6 Maths + 6 Science = exactly half). ⏭️ NEXT batch (Batch 12, 3-per-PR) = trigonometry + circles + carbon-and-its-compounds** (2 Maths + 1 Science, interleaved). Regenerate the per-topic census from a fresh dump vs the 8,597 bank.

**⏭️ (superseded) NEXT batch (3-per-PR, continuous run) = triangles + coordinate-geometry + ONE Science (metals-and-non-metals OR carbon-and-its-compounds).** **CONTINUOUS-PUSH:** the lane is at a CLEAN BOUNDARY — a fresh Fable window resumes straight from `handoff/BANK_EXPANSION_LANE_STATE.md` + the task file (regenerate the per-topic census from a fresh dump vs the CURRENT bank; anchor every syllabus call to official CBSE 2026-27 + live `syllabusGuard.ts`, NEVER memory/prior-year; per-topic discipline holds inside the 3-topic bundle). Keep shipping 3-topic batches per PR until all remaining are done.
>
> - **CHAPTER TEST BALANCED PYQ+FRESH MIX = MERGED (#397, trunk `6db7f1d`) — [FU-CT-BALANCED-MIX] CLOSED.** The CT now sources each section (A–D) through the SHARED `drawBalancedSet` (the FT helper, reused verbatim), so a CT paper deliberately mixes real PYQs with fresh authored/extracted questions (~50% PYQ, honest fallback for thin/zero-PYQ topics). SOURCING-ONLY: paper shape/marks/grading/scorecard/numbering + the `MIN_TEST_QUESTIONS` honest gate byte-identical; seed in-blueprint so `ChapterTestPage.tsx` untouched; exactly 2 files. **Owner live-verify pending** (visible PYQ+fresh mix; thin-PYQ topic still a full valid paper). **Surfaced two bank/test FUs (NOT this PR):** [FU-BANK-UNRESOLVABLE-MCQ-KEYS] (34 MCQs bank-wide whose key matches no option → unscorable in CT/FT Section A; **before-launch scoring-correctness fix**, bank lane; full id-list in OPEN_QUESTIONS) + [FU-FM-BLUEPRINT-TEST-SEED-LUCK] (relax the FT test's strict key assertion). CT is now section+concept+four-type + chrome-less full-screen + balanced-sourced → ready to flip live at `MockViewGate` at the owner's discretion.
> - **CHECK & IMPROVE = a first-class SessionSurface (#395, trunk `e33b9d3`) — C&I PR-1 MERGED, owner byte-reviewed CLEAN.** Every graded C&I session now writes a durable `sessionRecords` record (idempotent on the durable cross-device `CI-{S}-{TOK}-{NN}` code — `lt:ci-multi-seq` retired), carries `topicSource` provenance (confirmed/inferred/mixed; **bank-matched RESERVED-not-emitted** — no bank-match path exists; never wire a fake matcher), opens the 5th `<ResultsScorecard>` variant (shell zero-line-diff), and has a "Your checked papers" overlay history (locked CT card shape; MIX = plain "Mixed topics" chip, no fabricated count). Detection/correction/MI byte-intact. Closes [FU-CI-SCORECARD-VARIANT] + [FU-CI-DEVICE-LOCAL-SEQUENCE]. Remaining C&I arc: PR-2 per-question topic → PR-3/4 solution cache (owner 3-gate sign-off).
> - **✅ PR-B, the progress memory layer (launch-blocker) = MERGED (#403, `894ef6a`).** The cross-device, multi-rung windowed ENGINE is LIVE: `getWindowedProgress(uid, window, scope?, nowMs?) => Promise<WindowedProgress>` (progressStore) — the ONE aggregation arc PR-4 + scorecards consume (`WindowedProgress = { window, subjects[], topics[], concepts[], sections[], mistakeTypes[], activity, mistakeLog }`; `RungTrend = { key, label, before, now, delta, sampleBefore, sampleNow }`), honest-or-silent per rung, over the durable streams honoring uid. subject/topic marks = attempts ONLY (no double-count); concept/section bank-matched only; mistake-type = composition share over fully-graded only (adversarial review caught + fixed a pending-record rate fabrication); no rollup, `firestore.rules` untouched. The desktop Me arc (`ProgressWindowArc`) reads it. **Owner byte-reviewed CLEAN + merged.**
> - **✅ arc PR-4, the Me/Progress redesign = MERGED (#408, code trunk `25c3cd7`), owner byte-reviewed CLEAN.** The CONSUMPTION layer over PR-B is DONE, desktop + **mobile**: new `pages/mobile/MobileMePage` retires the legacy Streak/XP hero (`pages/app/Me` un-routed for PR-G) → **[FU-MOBILE-ME-PROGRESS-PARITY] closed**; the shared responsive `ProgressWindowArc` now renders every rung (subject/section/topic/concept/mistake-composition, honest-or-silent) on both widths + the honest window empty-state ([FU-PROGRESS-WINDOW-SPLIT-UX] stopgap); `TopicProgressTrend` wires `getTopicProgress` into the Topic Hub → [FU-TOPICHUB-PROGRESS-ARC] wired. Consumption-only (data-layer byte-untouched); careless mark-loss carried forward; BottomNav preserved; trial badge dropped. **✅ RESOLVED: PR-B-v2 (#412, `1228c95`) fixed all three engine bugs + owner live-verified → the Me/Progress Verified cell FLIPPED ✅ (see the top bullet). NEXT on the spine = Home nudge (arc PR-5).** Separately: [FU-MOBILE-CI-PARITY] (C&I mobile parity lane).
>
> - **FULL TEST (Full Mock) = BUILT (#387) + FINALIZED (#391, trunk `25257c0`)** — the surface is REACHABLE from the app UI: hub "Full Test" card + DesktopHome per-subject tiles + MI-panel link, all plain-navigating to `/full-mock/:grade/:subject` (**MockViewGate the ONLY gate**; every old-engine /exam-simulation//mock-builder entry retired). Cross-device upload-later CLOSED (`services/fullMockPaperStore.ts` — text-only snapshot under the existing sessionRecords rule, firestore.rules byte-untouched; verbatim honest fallback for true misses). Title-case display fallback + scorecard-header comments fixed. **Owner live-verify on the stable production link pending** (`report-ftfinalize-build-2026-07-13.md` §7) → flips the FM Verified cell. Bank-expansion merged in parallel: #381/#384/#385/#388/#393/**#396** (assembled **7,534**; scarce floor ≥75 distinct, honest-stop; **NEXT recommended = chemical-reactions-and-equations** per `BANK_EXPANSION_LANE_STATE`; ~20 topics remain). New FUs: [FU-RETIRE-EXAM-SIMULATION-LINKS] + [FU-VITEST-PREEXISTING-FAILURES].
>
> - **NOTES SURFACE COMPLETE** — all 26 canonical topics specced + audited (batches #365/#368/#370/#371/#372); clickable NCERT page-cites LIVE + owner-verified (#375 offset map + owner-hosted PDFs). Fable notes content lane is DONE — no longer "parked".
> - **Part A of the current task, [FU-LEDGER-CLICKABLE-CITES] (PR #376), IN REVIEW** — source-ledger `p.N` made clickable; awaiting owner merge (do NOT self-merge the product PR).
> - **Chapter Test = BUILT + MERGED (#374, `e54ab8c`), owner live-verified** — the legacy `ChapterTestPage` rebuilt to the locked spec (two-phase grading, native canonical sourcing, `<ResultsScorecard>` chapter-test variant live, `CT-{S}-{TOPIC}-{NN}`); **behind `MockViewGate`**. **Fast-follow before the gate flips — BOTH SHIPPED in #380 (`5bd148c`):** [FU-CT-CONCEPT-LENS] (subtopic marks-lost lens, derived-at-render) + [FU-CT-HEADER-UNIFORMITY] (chrome-less full-screen via `isBareFullScreenRoute` — the chrome was the NON-shell navbar, so `DesktopShell` byte-unchanged). **CT is ready to flip live at `MockViewGate` at the owner's discretion.** New open [FU-RETIRE-OLD-GLOBAL-HEADER] (product-wide legacy-header retirement, later).
> - **IMMEDIATE NEXT (owner-picked):** the CT fast-follows are DONE (#380); the **Full Mock rebuild is DONE + FINALIZED** (#387 + #391 — built, LINKED, cross-device closed; see the bullet above). Remaining: (1) **Bank extraction / expansion** — 6 batches merged (#381/#384/#385/#388/#393/#396; assembled **7,534**; ≥75-distinct scarce floor + honest-stop; **NEXT = chemical-reactions-and-equations** (recommended) per `BANK_EXPANSION_LANE_STATE`; ~20 topics remain, lane at a clean boundary for a fresh window); case-based is a Fable AUTHORING lane, not extraction. (2) **Me/Progress redesign (arc PR-4)** — now the surface critical path. (3) **[FU-CT-BALANCED-MIX]** — ✅ DONE (#397, `6db7f1d`); the CT draw is wired to `drawBalancedSet`, owner live-verify pending.
> - Coordination is LIVE (#366): every PR runs `lane-overlap` (REQUIRED) + `quality-gate`; sequence overlapping lanes, keep branches up to date; owner squash-merges (no self-merge on product PRs).

## CURRENT BASE

Branch: base/approved-thru-437
SHA: a4c3eec
Last PRs: **#344 Progress-Journey ARC · PR-3 — per-surface Worksheet HISTORY (`SurfaceHistory.tsx`: "Your worksheets" list + honest-or-silent vs-last-time chip + read-only stored-scorecard re-open; CONSUMES the store read-only; PR-2 files additive; 3 self-caught defects fixed; owner-QA'd; → `a4c3eec`)** + **#342 Notes biology pilot — Life Processes note-spec (`c9f4177`)** + **#341 Progress-Journey ARC · PR-2 — Universal `<ResultsScorecard>` (extracted from `WorksheetScorecard`; shell + typed 4-surface variant interface; worksheet[byte-identical]+quick-practice LIVE, CT/FM deferred seams; presentational — writes nothing §1a; old `WorksheetScorecard.tsx` deleted; owner live-verified; → `8c4c159`)** + **#305 Worksheet MCQ DETERMINISTIC honesty → step 1 now fully deterministic incl. the objective case (carried `section` client→server + reused `isObjectiveType` in `normaliseStructuredResult`: incorrect objective step → `mistakeType` null regardless of `studentWork`; `handleCheckSolution` byte-identical; [FU-WORKSHEET-MCQ-OBJECTIVE-GUARD] CLOSED; new [FU-MCQ-ANSWER-OPTION-FIELD] + [FU-GRADING-RELIABILITY]; owner live-verified — all-zero buckets every run; → `93f1594`)** + **#302 Worksheet no-working honesty fix → D-PROG-2 / step 1 CLOSED (ported #301 into `gradeStructuredSet`/`normaliseStructuredResult`: worksheet rule 5 + `noWorkingNulled` guard + `rawAdjusted` reconcile; `handleCheckSolution` byte-identical; MCQ residual ~40% → [FU-WORKSHEET-MCQ-OBJECTIVE-GUARD]; owner dual live-verified; → `c5e148d`)** + **#297 Z3 figure-binding golden slice (113 source figures bound → 93 Qs, rendered as `<img>` in the question body + step-mark pill fix; → `449d686`)** + **#295 Worksheet PR-A grade-results redesign (`1a85186`)** + **#291 Worksheet PR-E2b grade loop (`60c5bf9`)** + **#292 Z3 Competency extraction (102 authentic Maths case-based Qs → `competency.z3.ts`; → `b1d3e46`)** + **#289 Note-spec validator gate (`c525b2a`)** + **#282 Notes track Step-1 (`de2a616`)** + **#280 Worksheet PR-E2a (`d065922`) + #283 PR-E2a.1+.2 (`9a080a0`) + #284 PR-E2a.3 (`cfff277`)** + #279 docs(handoff) post-#278 (`883e904`). Earlier: #272 (**Topic Hub PR-C concept tutor "Teach me" flow**; → `d9ba545`) + #273 (docs(handoff) post-PR-C; → `6aa0640`) + #274 (**Topic Hub PR-D final-IA LAYOUT**; → `b57fa79`) + #275 (docs(handoff) post-PR-D; → `acc419b`) + #276 (**Topic Hub PR-E1 — concept-row Practise → Quick Practice + exact mark-band filter + Chapter-test wired + MockBuilder un-route**; → `1de6f3e`) + #277 (docs(handoff) post-PR-E1; → `b4163ef`) + #278 (**CLAUDE.md governance refresh** — worktree rule, matrix de-hardcode, Replit→CI, CBSE 2026-27, verification doctrine + marks-bucket/MockBuilder/MI/syllabusGuard rules; → `f7170ef`)

## ⏭️ IMMEDIATE NEXT — Grading-reliability PR ([FU-GRADING-RELIABILITY]) — cofounder-gated, off `93f1594`
**D-PROG-2 / step 1 is now FULLY deterministic (#305 closed the MCQ residual):** the worksheet grader's subjective AND objective no-working cases are deterministic (empty/whitespace/absent → null + 0 buckets; rawSummary leak → 0; worked-wrong preserved; **wrong objective/MCQ step → null regardless of `studentWork`** via the reused `isObjectiveType` guard in `normaliseStructuredResult`, fed by `section` now carried client→server). Owner live-verified — all-zero mistake buckets every run. **[FU-WORKSHEET-MCQ-OBJECTIVE-GUARD] CLOSED.**
- **The next gap is RELIABILITY, not honesty.** Two issues surfaced from #305 live testing (neither blocks PR-B; the honesty guard is solid):
  - **[FU-GRADING-RELIABILITY] (this PR):** grader temperature `0.15` causes OCR-cascade variance on borderline partial-credit answers, and `couldNotRead` fires inconsistently on legible "Don't know" / explicit non-attempt responses (related to [FU-WORKSHEET-NONATTEMPT-TEXT]). Fix direction: lower/zero the grading temperature, harden the detect/`couldNotRead` path, and consider a `thinkingBudget` so borderline reads are stable run-to-run. **Cofounder hands the full instruction** (its own STEP 0 confirming the temperature/genConfig call sites + the detect path before any code). **Do NOT open its worktree until handed that instruction.**
  - **[FU-MCQ-ANSWER-OPTION-FIELD]:** MCQ *scores* (correct/incorrect) are still non-deterministic because the bank's `finalAnswer` stores answer TEXT, not the option LETTER, so the grader can't do a deterministic string compare of the picked option. The honesty path is fixed; the score path is not. Touches the bank/data shape → likely a `src/data` (gated) lane → its own scoped PR.
- **Sequencing:** the grading-reliability PR first → then the **detect/`thinkingBudget` fix** → then **PR-B** (the durable per-student worksheet record). [FU-MCQ-ANSWER-OPTION-FIELD] slots in when owner authorizes the data-lane change.
- Also tracked (separate PRs): **[FU-WORKSHEET-NONATTEMPT-TEXT]** (explicit "don't know"/non-attempt text — non-empty, guard can't see it; folds into [FU-GRADING-RELIABILITY]), **[FU-WORKSHEET-BANK-ANSWER-POLLUTION]** (~26 files / ~54 strings marking-scheme junk in model answers; content lane).

> **Two parallel queues now exist** — pick per owner: **(1) Bank Expansion** Batch 3 (Triangles + Circles), the IMMEDIATE NEXT below; and **(2) Topic Hub rebuild** — PR-B concept-spine (landed via `c418f59`) + **PR-C tutor flow DONE (#272, `d9ba545`, owner live-verified)** + **PR-D final-IA LAYOUT DONE (#274, `b57fa79`, owner live-verified GOOD)** + **PR-E1 DONE (#276, `1de6f3e`, owner live-verified)** — concept-row Practise → Quick Practice direct + exact mark-band filter + single-pool count fix + Chapter-test button wired + MockBuilder un-routed; **[FU-PRACTISE-CONCEPT-FILTER] CLOSED** → **PR-E2 NEXT** (Worksheet — its own locked spec) → PR-F (Notes + Examiner's-tips content) → PR-G (delete dead old-mobile + the retired MockBuilder/TutorDrawerV2/MentorPanel set), all verified against the FINAL IA committed in #268 (`docs/design/topichub_ia_mockup_FINAL_2026-06-19.html` + the supersession block in `LazyTopper_Learn_Flow_Spec_LOCKED.md`). **Each PR starts fresh in its own worktree.** Two Topic-Hub follow-ups stand apart from the layout/wiring queue: **PR-D.1** (mobile full-screen tutor toggle, a `TeachFlow` change split from PR-D, owner-approved — `TeachFlow` now backs ONLY the one live Topic Hub tutor, so low blast radius) and **[FU-CONTEXTUAL-TUTOR-REBUILD]** (the `/api/mentor` `concept_teach` engine serves a scripted "Ravi Sir/Step N of 5" lesson, not contextual to student input; pre-existing, separate workstream). See OPEN_QUESTIONS + IMPLEMENTATION_ROADMAP for the PR-E…PR-G breakdown.

## ⏭️ NOTES TRACK — next action (as of #282 merged, squash `de2a616`)

### Notes track — next action (as of #282 merged, squash de2a616)
**Decision (settled, owner-approved):** notes ship as a shared React **`<Note spec={…}/>`** component fed by a **structured note-spec** (`notes/specs/<topic_key>.json`) as the single source of truth — NOT standalone HTML. The tutor and PR-F both consume the spec as data. **Step 2 authors specs (JSON), not HTML.**

**Next build order (gated — do not reorder):**
1. ✅ **DONE (#289, `c525b2a`)** — `notes/validate_spec.py` (source-required validator to note-spec **schema v1.1**: rejects unsourced verbatim/example/NCERT-figure; checks `topic_key` ↔ `topics.ts`, banned keywords via `syllabusGuard.ts`, mojibake, third_tab/example `kind` shape, source_ledger count) + the schema-v1.1 doc + the validated `light-reflection-and-refraction.json` reference spec + 5 negative fixtures + self-test. Light VALID; negatives each trip exactly one rule. The gate that makes the ~35-note fan-out safe is now live (and `--json` mode is ready to wire as a `SubagentStop` hook — a later step, not yet done).
2. ⏭️ **IMMEDIATE NEXT — Content PR (under `notes/`):** evolve the kit to `render_note(spec)` (so the preview HTML is GENERATED from the spec, not hand-written); finish Light's figure (base64→WebP into `notes/assets/light/`) + mindmap (D3-JS → `spec.mindmap` tree) lift, replacing the `_TODO` in the Light spec. Validate with `python notes/validate_spec.py --all` before/after.
3. Then in parallel: **PR-F** (`<Note>` component + Topic Hub wiring — cofounder/frontend session, reads `notes/specs`+`notes/assets`, writes `src/`) built on the Light spec, AND **Step-2 spec authoring** (the 4 prototype enrichments → ~35 notes), validator-gated.

**Do NOT start Step-2 generation or PR-F before the kit `render_note(spec)` content PR lands.**

---

## ⏭️ IMMEDIATE NEXT — Bank Expansion P1 **Batch 3 (Triangles + Circles)** when owner authorizes
Batches 1 (AP+Stats+SAV, 60) and 2 (CG+ARC, 45) are DONE + merged. **Batch 3 = Triangles + Circles** — ⚠️ this batch holds the bulk of the
**42 high-mark figure-locked questions** (Triangles 18 + Circles 15 of the 67-item census), so the **[FU-DIAGRAM-RECOVERY]** decision (recover
diagram-dependent Qs vs drop them) converges here — confirm with owner whether to drop-and-census as usual or pair with a diagram pass.
Same recipe per batch: extract verbatim from the Exemplar PDF → syllabus-filter (copy banned list from `scripts/src/syllabusGuard.ts`;
no banned subtopic in Triangles/Circles, but Constructions is its own out-of-scope chapter) → dedup vs repo (by `ncertRef` + content; surface
borderline) → AI step-marked solutions (`[N mark]` summing to marks; finalAnswer cross-checked vs jeep2an.pdf) → new `*.exemplar2.ts` +
register in `canonicalQuestionBank.ts` + add ids to `AI_GENERATED_SOLUTION_IDS` (NEVER edit `predictionTypes.ts`) → gates + Codespaces
vitest (now 11/11 green post-#264) → **STOP for owner solution/fidelity verification; no self-merge.** Then Batch 4 (Trig + Pair-of-Linear-Eq)
→ Batch 5 (Real-Numbers + Polynomials). Reusable tooling: `C:\Users\Chetan\OneDrive\Desktop\diff\exemplar-extraction\`.

## ⏭️ ALSO QUEUED (parallel tracks, owner-authorized separately) — [FU-AITIER-MARKS-MISMATCH] content pass → [FU-AITIER-RANK-DIFFICULTY-HELPERS] → (iii) gated-spelling → (2) MI eval → (3) Stage 3 → Fix B
topicKey audit (i) + Fix A (#242) + Check & Improve auto-detect (#244) + detect-then-confirm (#246) + (ii) "Finish session"
scorecard trigger (#249) + **read-only AI-tier audit (DONE)** + **AI-tier PR1 (#251 — DONE, [FU-MALFORMED-QUESTION] RESOLVED)** +
**AI-tier PR1b pack retags (#253 — DONE, [FU-AITIER-PACK-5MK-SHORT] RESOLVED)** +
**AI-tier PR2a provenance + soft ranking (#255 — DONE, trunk `686f737`, multipliers `1.0/0.6/0.3`, Quick Practice/topic
practice covered, owner live-verify PASS)** + **AI-tier PR2b `pastBoardYear` strip (#257 — DONE, trunk `d6e0e14`, 96 values / 5
files stripped, dedup → score-only, HPQ confidence proven unaffected, `predictionTypes.ts` untouched)** are done. The items below
are **QUEUED but NOT yet authorized** — the owner sends each as its own instruction, branched fresh from `d6e0e14`. Do not start
until instructed.

- **[FU-AITIER-RANK-MOCKS-HPQ] — ✅ DONE (#259, trunk `775ee75`).** Extended PR2a's `SOURCE_MULTIPLIER` (reused, exported
  `getSourceMultiplier`) to **Full Mock** (`unlimitedPaperEngine.weightedSelect` + authentic-first archetype prefill) and **Topic
  Mock** (`topicMockEngine.weightedShuffleByScore`) — per-slot soft demotion, structure-preserving. **⚠️ HPQ was a no-op** —
  `highlyProbableQuestions.ts` is a hand-authored curated bank, never uses `getAllQuestions()`, ZERO AI-pack content → left
  untouched (boundary correction). All AI-bearing surfaces now covered. Codespaces vitest 7/7. Owner live-verify (queued below).
- **(NEXT) [FU-AITIER-RANK-DIFFICULTY-HELPERS] — difficulty-helper surfaces.** `difficultyAwarePractice.ts` +
  `difficultyAutoSuggest.ts` also call `getAllQuestions()` and serve AI at parity, but were out of #259's named scope + authorized
  file list (NOT touched). Apply the same `getSourceMultiplier` demotion to their selection. Owner-authorized, separate, its own
  instruction branched fresh from `775ee75`.
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
