# WAVE DPDP-A STATE — updated 2026-08-08 (controller start)

> ★ THIS FILE IS UNTRACKED AND IS THE CONTROLLER'S MEMORY. It is NOT part of any product
> allowlist. A replacement controller resumes from this file alone.
> ★ PROVENANCE: everything below is the DPDP-A CONTROLLER'S OWN EXTRACT unless a line says
> "owner-stated". The three spec files in `C:\Users\Chetan\OneDrive\Desktop\diff\WAVE-DPDP-A\`
> are controller transcriptions of owner-attached documents, not owner-authored files.
> ★ `SPEC_Context_Safeguards_v1_1.md` §6 is reconstructed from the owner's amendment PROSE —
> the controller never received the v1.1 FILE. Treat it as an owner instruction, not a transcript.

CONTROLLER: DPDP-A. LIFETIME = ONE WAVE (lanes ERASE-1, EXPORT-1, CLEARTEXT-1 + the
FU-DPDP-USERS investigation). SETTINGS-1 belongs to a FRESH controller (DPDP-B).

TRUNK: `55d5ee198078eb2e895b8ac98da27eb53e888560` — re-derived 2026-08-08 (moved TWICE during
  ERASE-1). **Ancestry verified, not equality:** `6c94d8f0` → `8d813a41` → `55d5ee19` each an
  ancestor of the current tip, so trunk moved **FORWARD** both times. `c359744c` (ERASE-1's PR head)
  is correctly NOT an ancestor — it is an unmerged draft.
  - `8d813a41 docs(handoff): archive waves 4 and 5A, document the wave-state lifecycle (#633)`
  - `55d5ee19 feat(progress): carry raw marks through the progress rungs (MARKS-1) (#634)`
  ⚠ **New lanes branch from `55d5ee19`.** ERASE-1 (#638) branched from `8d813a41` and USERS-1 (#639)
  from `6c94d8f0`; both are BEHIND but not conflicting.

OPEN PRs (2026-08-08): **#639 USERS-1 (draft, mine)** · **#638 ERASE-1 (draft, mine)** ·
  #637 MI-CONCEPT-1 (draft, other arc) · #636 TRENDS-MARKS-1 (draft, other arc) ·
  #635 `docs(ops)` — **`ops/AGENT_STANDING_RULES.md` only, NOT `handoff/**`**, so it does NOT hold
  the handoff lock.

## ★★ HANDOFF LOCK — CHECKED BY COMMAND, 2026-08-08
- **NO handoff PR is open.** ⇒ under the v1.1 positional rule, **if this wave closes first, THIS
  controller writes the handoff.**
- ⚠ **#633 WAS a handoff PR and it merged — but it did NOT close a wave.** Its file list is
  `.gitignore` · `handoff/README.md` · `WAVE_STATE_WAVE4_ARCHIVE.md` · `WAVE_STATE_WAVE5A_ARCHIVE.md`.
  **Archival housekeeping only.** It touched neither `CURRENT_STATE.md`, `SESSION_LOG.md` nor
  `NEXT_ACTION.md`.
- ★ **VERIFIED BY COMMAND, not assumed** — `git show origin/base/...:handoff/<f> | grep -c "#<n>"`
  across `CURRENT_STATE.md`, `SESSION_LOG.md`, `NEXT_ACTION.md` for #629, #630, #631, #632, #633,
  #634: **every count is ZERO.** ⇒ **`handoff/` is SIX commits stale, not the four the owner said.**
  The two extra are #633 (the archive PR itself) and #634 (MARKS-1).
- ★ **The WIRE-2 dormancy block IS present** in `CURRENT_STATE.md` (matches at the `[CURRENT]` head
  and in several superseded blocks below it). **It must survive the next prepend and be RESTATED.**
- ⚠ **`MI-CONCEPT-1` IS #637 AND IS STILL AN OPEN DRAFT** — so it is **not on trunk**, and
  **SETTINGS-1 (wave DPDP-B) remains correctly blocked.** This upgrades the earlier inference to a
  checked fact.

## LANES
| id | title | files (allowlist) | status | PR | notes |
|----|-------|-------------------|--------|----|----|
| SCOUT-1 | map + live server surface + prior-art search | READ-ONLY, no PR | **RETURNED PASS** | — | report 40,994 B (path below) |
| SCOUT-2 | CodeQL re-derivation + FU-DPDP-USERS investigation | READ-ONLY, no PR | DISPATCHED | — | feeds CLEARTEXT-1 brief |
| ERASE-1 | server-side erasure route | `lazytopper/server/**` + ⚠ `lazytopper/package.json` (1 file OUTSIDE the allowlist — justified, see below) | **RETURNED PASS — DRAFT #638, AWAITING OWNER** | #638 | CI PASS on head `c359744c`. Owner live-verify owed. |
| EXPORT-1 | data export | `lazytopper/server/**` (same as ERASE-1) | QUEUED BEHIND ERASE-1 | — | controller-decided: they collide on `index.cjs`. Sequence, do not race |
| CLEARTEXT-1 | uid-only storage guard + dismissal rationale (NOT remediation) | 5 new `*.uidOnly.test.ts` beside the 5 alert files | **RETURNED PASS — DRAFT #640, AWAITING OWNER** | #640 | ZERO production-code change — all five `.ts` byte-identical to trunk, proven by `git hash-object`. CI PASS on head `b88cba42`. |
| USERS-1 | delete the dead `users` write (+ map notes, + guard expectation, + map header drift FU) | `learnerAccountService.ts` · `AuthContext.tsx` · `studentDataMap.ts` · `studentDataMap.test.ts` (+2 new tests) | **RETURNED PASS — DRAFT #639, AWAITING OWNER** | #639 | 6 files, ALL in allowlist, verified locally AND on the remote PR. CI PASS on head `3d5e5a93`. |
| SETTINGS-1 | student-facing surface | `lazytopper/src/pages/**` + `src/services/**` | BLOCKED — NOT THIS WAVE | — | waits on MI-CONCEPT-1 on trunk; belongs to controller DPDP-B |

## DISJOINTNESS
Scouts were READ-ONLY, wrote no repo files, and both removed their worktrees cleanly.
**RESOLVED (controller decision):** ERASE-1 and EXPORT-1 both target `lazytopper/server/**` and
both must register a route in `lazytopper/server/index.cjs` → **exact-path collision**
(`lane_overlap.mjs` is `files.filter(f => mineSet.has(f))`). **They SEQUENCE: ERASE-1 first,
EXPORT-1 only after ERASE-1 is on trunk.** EXPORT-1 then reuses ERASE-1's map-walker rather than
authoring a second one (a second walker is a drift hazard, not redundancy).
**CLEARTEXT-1 vs USERS-1 — RESOLVED DISJOINT (controller, from SCOUT-2's report, by exact path):**
- CLEARTEXT-1 owns the five alert files, all under `lazytopper/src/services/`:
  `mistakeIntelligence.ts` · `practiceInsights.ts` · `referralService.ts` · `sessionRecords.ts` ·
  `studentProgressStore.ts` — plus the new uid-only test files it adds beside them.
- USERS-1 owns `lazytopper/src/services/learnerAccountService.ts` (the dead write),
  `lazytopper/src/context/AuthContext.tsx` (the `Promise.allSettled` caller),
  `lazytopper/src/services/studentDataMap.ts` and `studentDataMap.test.ts`.
- **No exact path appears in both.** ⚠ `AuthContext.tsx` is the CodeQL **taint source**, so it is
  the one file that could pull both lanes in — it is assigned to **USERS-1 only** and explicitly
  FORBIDDEN to CLEARTEXT-1, which does not need it (the owner ruled *dismiss*, not *remediate*, so
  CLEARTEXT-1 changes no production code at all).
- **`studentDataMap.ts` is READ-ONLY to ERASE-1** and writable only by USERS-1 — which is why the
  map-header drift FU was assigned to USERS-1 rather than to the lane that noticed it.

**CONCURRENCY, not just disjointness:** ★ parallelism on this box is bounded by RAM, not by file
sets — two concurrent full matrices have OOM-killed the editor before. **Cap: 2 lanes in flight.**
ERASE-1 + USERS-1 run together; CLEARTEXT-1 waits for a slot. All three are file-disjoint, so the
constraint is the machine, not the lanes.

## ★ SCOUT RESULTS — bounded. Full evidence is in the two report files, NOT here.
- `report-scout1-map-and-surface-2026-08-08.md` (40,994 B)
- `report-scout2-codeql-and-users-2026-08-08.md` (48,911 B)
Both in `C:\Users\Chetan\OneDrive\Desktop\diff\WAVE-DPDP-A\`.

**SCOUT-1 (map + surface) — VERDICT PASS.** ★ Provenance: these are SCOUT-1's findings, verified by
SCOUT-1, NOT by the controller. Cite as *"SCOUT-1 reports"*.
- **The map's 12 figures were re-derived and ALL MATCH the brief** — 29 / 11 subcollection /
  5 admin-sdk-required / 1 client-local / 1 third-party-unreachable / 1 exportable:false.
- **The two-surface question was a false dichotomy.** BOTH are live, in one process tree:
  `railway.json` + Dockerfile start `artifacts/api-server/dist/index.mjs`, which **spawns**
  `lazytopper/server/index.cjs`; `vercel.json` rewrites `/api/*` → gateway and `/shared-api/*` →
  api-server, same Railway host. **`artifacts/` is the deploy entrypoint, NOT a De-Replit archive.**
- **The map IS server-consumable today** — `lazytopper/server/index.cjs` installs
  `require.extensions['.ts']` via `ts.transpileModule` and already requires a `.ts` file at boot;
  the map has zero imports so nothing drags React/firebase in. **"Iterate the map" IS executable.**
  ⚠ **This is strong inference, not executed proof** — a scout worktree has no `node_modules`.
  SCOUT-1 itself flagged this and asks ERASE-1 to ship a smoke test. Do not harden it into fact.
- **NO PRIOR ART.** Zero deletion/export code anywhere. The map currently has **no consumer at all**
  except its own test.
- ★★ **ERASE-1's two needs sit on OPPOSITE surfaces.** Storage (the handwriting images) and
  map-import are **gateway-only**; a real rejecting owner-auth (`requireFirebaseAuth` →
  `verifyIdToken` → 401) exists **only on api-server**. The gateway's `resolveVerifiedUid` is
  **advisory and falls back to a spoofable header** — a gateway route trusting it would let a
  spoofed `X-Lazytopper-Uid` **erase another child's account.** Either surface alone leaves a hole.
- ★ **`qrUploadSlots` keys uid as a FIELD, not a doc id** — a doc-id delete finds nothing and
  **reports success**. A silent no-op sitting directly in the erasure path.
- Contradictions found in the map's own header: it says "Three" admin-sdk-required (there are five)
  and names a field `adminSdkRequired` that does not exist (the discriminant is `mechanism`).
- The repo-wide belief "caps are per-UID, never per-IP" is **wrong**: an IP tier exists
  (`ip:<xff>`, 3/day, signed-out). Gateway only; **api-server has no limiter at all.**

**SCOUT-2 (CodeQL + `users`) — VERDICT PASS.** ★ Same provenance caveat: SCOUT-2's findings.
- **CodeQL re-derived from the run, not carried:** 47 open alerts, **clear-text-storage = 9 across
  5 files**, analysis `1589869170` @ `6c94d8f` 2026-08-08T13:29:33Z — **the analysed commit IS
  trunk**, so the set is current, not stale. The brief's 18 / 4 / 7 breakdown **confirmed exactly**,
  with one correction: the "7" span **two** rule ids, so a rule-id suppression would leave two open.
- ★★ **All 9 clear-text-storage alerts appear to be FALSE POSITIVES.** CodeQL taints the whole
  `UserCredential` from a single point in `AuthContext.tsx`; SCOUT-2 reports that **only the uid**
  reaches the nine `localStorage` sinks, evidenced by a control grep finding zero occurrences of
  email/password/phoneNumber/displayName in all five files. **This may mean CLEARTEXT-1 as specced
  — "remediate 9 alerts" — is not the lane that should be built.**
- The 4 `missing-rate-limiting` alerts are in `artifacts/api-server/`, **not** the gateway.
- **`[FU-DPDP-USERS-COLLECTION-UNDECLARED]` — ANSWERED.** One site. Introduced by **PR #78
  "PR-K2H-3: Auth/session shell hardening"** (`0addba3f`, merged 2026-05-16). Its own PR body says
  it "adds safe learner account metadata sync without storing credentials" — a **login-time
  signup/last-seen roster mirroring the Firebase Auth record.** Every field it carries **already
  lives in the map's auth-account entry**, and **nothing was ever built to consume it.**
  **Dead in both directions.**
- ★ **Sharper than the spec stated:** the write is **never issued at all** — the preceding `getDoc`
  is denied first and throws; the empty `catch` plus the caller's `Promise.allSettled` swallow it
  twice. "Silently denied" understates it.
- **`users` has NEVER appeared in `firestore.rules` in the repo's entire history** (`git log -S`
  empty); only the deny-all catch-all matches `users/{uid}`. SCOUT-2 read **all 13** match blocks,
  not the first — the right method, since a restriction is only as strong as the most permissive
  rule that matches.
- **The map is NOT at fault here.** Listing `users` is the conservative correct choice and the
  entry's `notes` field already documents the defect accurately.
- ⚠ **Deleting the write turns `studentDataMap.test.ts` RED** — the guard re-derives
  `expect(undeclared).toEqual(["qrUploadSlots","users"])` from `src/services`. Removal is therefore
  **coupled to the map and the guard in the same PR**, plus an auth-spine edit needing live-verify.

## DECISIONS MADE THIS WAVE
- **Trunk taken as `6c94d8f`, not the arc file's `7786878d`.** Reason: re-derived from
  `git ls-remote`; ancestry proves forward movement, so the arc file is merely stale, not wrong.
- **Two read-only SCOUTS dispatched before any product lane.** Reason: three separate premises in
  the dispatch spec are unverified and each one determines an allowlist — (a) which server surface
  is live, (b) whether a `.ts` module under `lazytopper/src/services/` is even reachable from a
  `.cjs` server, (c) the CodeQL count. Writing an allowlist on an unverified premise is how a lane
  gets rebuilt.
- **The controller wrote all three attached specs to disk before dispatching.** Reason: standing
  rule "AN ATTACHED DOCUMENT IS NOT A FILE".
- **SETTINGS-1 is explicitly out of this wave.** Reason: addendum §1, one controller per wave.
- **No handoff PR opened yet.** Reason: v1.1 §6 — the check is `gh pr list --state open` at the
  moment of closing, not now.
- **ERASE-1 and EXPORT-1 SEQUENCE; they do not race.** Reason: both must register in
  `lazytopper/server/index.cjs`, which is an exact-path collision. EXPORT-1 reuses ERASE-1's
  map-walker; a second walker would drift from the first the day the map changes.
- **The `client-local` (localStorage) location is OUT of ERASE-1's scope, and ERASE-1 must REPORT
  it rather than pretend it erased it.** Reason: no server can reach a browser's localStorage.
  The arc already assigns the browser half to SETTINGS-1 (wave DPDP-B). This answers SCOUT-1's
  owner-question #4 without troubling the owner — it is already in the spec's own design.
- **Student-facing Gemini disclosure wording is DEFERRED to SETTINGS-1 (DPDP-B).** Reason: it is
  student copy, and the owner rules on copy. ERASE-1/EXPORT-1 need only the machine-readable
  "not deleted / cannot be deleted" field in the response, which the arc already requires.
- **`users` STAYS LISTED in `studentDataMap.ts` even if the write is deleted, until production is
  verified empty.** Reason: SCOUT-2's point, adopted — de-listing is the single move that could
  make a future erasure LIE about what it covered. Listing a collection that turns out to be empty
  costs nothing; omitting one that is not is the failure this whole arc exists to prevent.

## ★ OPEN PREMISES — status after both scouts
- ~~map counts~~ **RE-DERIVED AND CONFIRMED** by SCOUT-1: all 12 figures match. Safe to cite.
- ~~"9 clear-text-storage alerts"~~ **READ FROM THE RUN** by SCOUT-2 (analysis `1589869170`, the
  analysed commit IS trunk). The count is right; **what is now in doubt is whether any of the 9 is
  a real defect.**
- **STILL UNVERIFIED — "the gateway can require a `.ts` map at runtime."** SCOUT-1's YES is strong
  inference from the existing `require.extensions['.ts']` hook, **not an executed import.** ERASE-1
  must prove it by running it, and must treat a failure here as a lane-blocking finding, not a
  detail. Do not restate as fact until then.
- **STILL UNVERIFIED — "MI-CONCEPT-1 is not on trunk."** Inferred from the trunk log showing only
  #631 since 7786878d. The ME controller has not been asked. Only matters to DPDP-B.

## FU ENTRIES COLLECTED (bodies live in the two scout report files)
- `[FU-DPDP-USERS-COLLECTION-UNDECLARED]` — ★ **ANSWERED by SCOUT-2, may be closed by the handoff.**
  PR #78 login-time account-metadata roster; dead in both directions; never issued (the read is
  denied first). Superseded by the two entries below.
- `[FU-DPDP-USERS-WRITE-DEAD-BOTH-DIRECTIONS]` · `[FU-DPDP-SILENT-CATCH-NO-OBSERVABILITY]`
- `[FU-DPDP-DRIFT-GUARD-SCAN-ROOTS-NARROW]`
- `[FU-CODEQL-CLEARTEXT-NINE-FALSE-POSITIVE]` · `[FU-CODEQL-DIAGRAMS-SEVEN-SPAN-TWO-RULES]`
- `[FU-DPDP-MAP-HEADER-COUNT-DRIFT]` — the map's header comment says "Three" admin-sdk-required
  (five) and names a nonexistent field `adminSdkRequired`. One-line comment fix; no lane owns
  `src/services/studentDataMap.ts` yet this wave.
- `[FU-DPDP-MAP-SERVER-IMPORT-SMOKE]` — ★ **assigned to ERASE-1**, not deferred.
- `[FU-DPDP-QRUPLOADSLOTS-FIELD-KEYED]` — ★ **assigned to ERASE-1**; a doc-id delete on a
  field-keyed collection is a silent no-op **inside the erasure path**.
- ~~`[FU-DPDP-GATEWAY-NO-OWNER-AUTH]`~~ — ★ **WITHDRAWN.** It rested on SCOUT-1's description of
  `resolveVerifiedUid` as advisory, which the owner disproved by reading the file. **Superseded by
  the two entries below.** ⚠ Recorded here rather than deleted because a withdrawn finding that
  leaves no trace is how the wrong version becomes the memorable one.
- `[FU-DPDP-GATEWAY-SPOOFABLE-UID-HEADER]` — ★ **owner-verified, real and current.**
  `verifiedCaller.cjs` and `rateLimiter.cjs` both read `X-Lazytopper-Uid`, trivially spoofable.
  ⚠ **The Wave 5D header strip does NOT cover this** — it strips `x-user-id` at the api-server
  proxy (`app.proxy-headers.test.ts`): different header, different surface. **Not ERASE-1's to
  fix**; ERASE-1 simply never trusts it.
- `[FU-DPDP-VERIFIEDCALLER-STALE-COMMENT]` — ★ **assigned to ERASE-1** (one line, comment only, and
  it is already in the file). The `catch` says *"Fall back to the header — never to anonymous"*
  while the code returns `""`. **This stale comment is the most likely source of SCOUT-1's wrong
  description** — a security-critical function documented as doing the opposite of what it does.
- `[FU-DPDP-APISERVER-NO-RATE-LIMIT]` · `[FU-DPDP-RATE-LIMIT-PER-IP-EXISTS]` (corrects a
  repo-wide belief recorded elsewhere as "per-UID, never per-IP")
- `[FU-DPDP-MAP-NO-CONSUMER]` — closed the moment ERASE-1 lands.

## ★ ERASE-1 RESULT — bounded. Full evidence: `report-erase1-2026-08-08.md` (46,283 B).
★ Provenance: ERASE-1's findings, verified by ERASE-1. Cite as *"ERASE-1 reports"*.
**VERDICT PASS · DRAFT #638 · CI run `31263073127` on head `c359744c` PASS.** Zero-skip quoted both
ways: root matrix `# suites 29 # pass 196 # fail 0 # skipped 0 # todo 0`; vitest
`Test Files 120 passed (120) / Tests 1534 passed (1534)`. Own suites `26/26` and `12/12`, 0 skipped.
- ★★ **The map-import premise is now EXECUTED, not inferred.** 29 locations read inside the server
  process via `require.extensions['.ts']`. `[FU-DPDP-MAP-SERVER-IMPORT-SMOKE]` **CLOSED.**
  SCOUT-1's inference was right; it is no longer an inference.
- ★★ **The `qrUploadSlots` hazard is closed and PROVEN closed.** Every location returns `deleted:N`
  or `notFound`; mutation M4 (field-keyed → doc-id) went red with
  `actual: 'notFound' / expected: 'deleted'` — **red because zero documents matched**, which is the
  exact proof the owner asked for. `[FU-DPDP-QRUPLOADSLOTS-FIELD-KEYED]` **CLOSED.**
- ★★ **The "audit all 29, don't spot-check" instruction paid for itself.** ERASE-1's own audit test
  **disproved its own first classifier**: a nested path with no `{uid}` was being field-queried — a
  silent miss it would otherwise have shipped. Fixed, with control cases. **This is the finding that
  justifies the instruction; a spot-check of the one known location would have missed it.**
- **Owner-verified auth ruling CONFIRMED by execution:** `resolveVerifiedUid` is fail-closed and
  never reads a header. The owner was right and SCOUT-1 was wrong. The negative test sends a victim
  uid in **body + query + two headers** and none is honoured.
- ⚠ **ALLOWLIST BREACH, ACCEPTED: `lazytopper/package.json`, 3 lines.** ERASE-1 reports
  `ci_docs_lane a15` enumerates `server/**/*.test.cjs` **from disk** and fails any unwired suite —
  so omitting it means **red CI *and* a suite gated by nothing.** Wiring count 9 → 11.
  ★ This is the "your verified finding wins" clause working: it reported the breach rather than
  silently widening or silently dropping the tests. **The owner approves the PR; flag it to him.**
- ⚠ `scope:guard --mode product` **cannot** pass this PR; `--mode mixed` is correct and passed.
- ★ ERASE-1 reports the brief's **mutation-4 recipe was wrong as written** — it went red for the
  wrong reason (a call-shape assertion fired first), so it split the test to make the red *be* the
  zero match. **Controller note: that is the rule "when a mutation goes red, check it is red for the
  reason you claimed" applied to my own brief.**
- ⚠ **Two mutations were ABORTED by the harness as unapplied** — correctly caught by the
  `mutated-sha != baseline-sha` precondition, which is exactly why that precondition exists.

## ★ USERS-1 RESULT — bounded. Full evidence: `report-users1-2026-08-08.md` (27,095 B).
★ Provenance: USERS-1's findings, verified by USERS-1. Cite as *"USERS-1 reports"*.
**VERDICT PASS · DRAFT #639 · CI runs `31263327480` Quality Gate / `31263327461` Lane Overlap /
`31263327502` CodeQL, all PASS on head `3d5e5a93`.** Zero-skip: `Test Files 122 passed (122)` /
`Tests 1546 passed (1546)`. **6 files, all in allowlist — verified locally AND against the remote
PR**, which is the reconciliation `CLAUDE.md` §8 has never had a gate for.
- ★★ **THE MOST VALUABLE RESULT IN THIS WAVE SO FAR IS A MUTATION THAT DID NOT GO RED.**
  Mutation 1 as I specified it stayed green — and that was **a REAL HOLE in the drift guard
  protecting the student data map**: `doc(firestoreDb!, ...)` (legal, since `firestoreDb` is
  nullable) **evaded the guard's pattern entirely.** Nothing is unmapped today — all 47 real call
  sites use the guarded style — but **the next such call site would have been invisible, and the
  guard is the thing standing between a new collection and an erasure that silently misses it.**
  ⇒ **Closed properly:** the scanner is now a **PURE function with fixture tests that prove
  REJECTION, not merely acceptance** — the exact remedy for "a parser only run on the real file can
  be shown to ACCEPT, never to REJECT."
  ★ **Standing rule vindicated:** when a mutation does not go red, the first hypothesis is that the
  SUITE has a hole, not that the code is fine. It did.
- **Owner ruling B held:** `users` **stays declared** in the map; the drift guard's exact `toEqual`
  was **kept, not loosened**, so re-adding a `users` write turns it red.
- **Map header drift fixed by re-derivation, not by copying my brief:** 5 `admin-sdk-required`
  (auth-account, users, subscriptions, qrUploadSlots, storage.qr-uploads), census `5+22+1+1 = 29`.
- **Blast radius handled:** 1 production caller + **7 `vi.mock` sites** enumerated. The module was
  **kept on disk** because `vi.mock` needs the path to resolve and 2 of the 7 sites are outside the
  allowlist; **export surface kept byte-identical.** ★ That is the `vi.mock IS A COMPLETE
  REPLACEMENT` rule being obeyed rather than discovered.
- ★ **A hazard visible ONLY under mutation:** its own new suite had a `vi.mock` TDZ fault that a
  green tree hid — under mutation it degraded to a **collection error instead of an assertion**.
  Fixed with `vi.hoisted()`. **A suite that fails to collect looks nothing like a suite that fails
  an assertion, and only one of them is evidence.**
- ⚠ **`CLAUDE.md` §6 is itself stale:** it says the root matrix is "SIX suites / 190 checks"; it
  reports **196 / 29**. The file's own instruction is "verify what the suite reports now, do NOT
  hardcode a number" — and it hardcodes one. `CLAUDE.md` is in no lane's allowlist; logged for the
  handoff.
- ★ **OWNER DECISION RAISED:** delete `learnerAccountService.ts` outright? It is now **inert and
  uncalled**, but removing it needs 2 test files outside this lane's allowlist.

## ★ CLEARTEXT-1 RESULT — bounded. Full evidence: `report-cleartext1-2026-08-08.md` (35,583 B).
★ Provenance: CLEARTEXT-1's findings, verified by CLEARTEXT-1. Cite as *"CLEARTEXT-1 reports"*.
**VERDICT PASS · DRAFT #640 · CI `31264700568` on head `b88cba42` PASS.** Zero-skip:
`Test Files 125 passed (125)` / `Tests 1555 passed (1555)`, ops matrix `# skipped 0`, root matrix
`# suites 29 / # pass 196`, and **all five `uidOnly` suites named individually in the CI log** —
which is the difference between "the suite exists" and "the suite ran".
- **Premise HELD, and re-verified three ways:** the control grep reproduced (0 hits in the five
  files, 6 in `learnerAccountService.ts`), the caller set enumerated, and — the one that matters —
  **confirmed on the WRITTEN BYTES at runtime**, not on source text. 9 of 9 sinks covered, each
  driven through a real exported path. **Zero production-code change**, all five `.ts` byte-identical
  to trunk by `git hash-object`.
- ★★ **MY §0 AMENDMENT WAS WRONG AND WAS DISPROVED EMPIRICALLY.** I told CLEARTEXT-1 (and the owner)
  that #637 would collide and that whichever merged second would see a correct red. **It will not.**
  #637's `concept`/`questionId` land on the **Firestore `MistakeLogEntry` via `buildEntry`**, never
  on the **localStorage dedup payload**; `dedupKey`/`writeDedup` are untouched. **Proven by swapping
  #637's actual file blob (`56c262bb`) into the tree → guard GREEN `4 passed (4)` → restored to
  `a9e512fd`.** No coordination step is needed and the PR body says so with the evidence, so nobody
  "fixes" a phantom red by deleting the guard.
  ⇒ ★ **And the corollary it stated honestly rather than burying:** my argument *"if #637 had added
  an identifying field your guard would catch it"* is **false for this case** — the guard's boundary
  is the localStorage sinks, not the Firestore log. **The allowlist shape is still right (it fails
  safe); the justification I gave for it was not.** Fix the reason, not just the outcome.
- ★ **CodeQL flagged only 4 of the 6 `setItem` calls in `referralService.ts`.** ⇒ **anyone auditing
  "the referral sinks" from the alert list would cover 4 of 6.** The guard audits all six.
  **Enumerate the set; do not work from the alert list.**
- ★★ **Its own first mutation harness produced FIVE FALSE REDS** — `execFileSync` on the
  extensionless `.bin/vitest` returned `ENOENT`, which reads exactly like a failing test. **Caught by
  requiring the failure to QUOTE THE INJECTED VALUE**, then rebuilt with a pre-mutation green plus a
  "did it actually run" assertion. ⇒ **A false RED is as dangerous as a false green and this project
  had no rule against it. New standing rule: a mutation's red must quote the injected value.**
- ⚠ **`Math.random()` is used for a user-facing referral code** in `referralService.generateCode()`
  — a `CLAUDE.md` §7 violation, **present on trunk, not flagged by CodeQL**, out of this lane's
  scope. Needs its own lane.
- §7's `package.json`-wiring warning did **not** apply here: `a15` walks only `server/**/*.test.cjs`;
  `src/**` suites are auto-discovered by vitest. No breach, `--mode product` passed.

## ★★ OWNER RULINGS — 2026-08-08. ALL THREE ANSWERED. Cite as OWNER-VERIFIED where marked.
**Q1 → A. Gateway (`lazytopper/server/**`).** ★★ **And the owner VERIFIED the crux himself, which
makes the lane smaller: `resolveVerifiedUid` in `verifiedCaller.cjs` is ALREADY FAIL-CLOSED.**
Every path — no token, no admin SDK, unverified, expired, forged, network down — returns `""`, and
**it never consults the header.** ⇒ **The fail-open behaviour is in the CALLERS, not the function.**
So there is **no new gate to build**: the erasure route consumes what exists and refuses empty —
`const uid = await resolveVerifiedUid(req); if (!uid) return 401;`. **No change to
`verifiedCaller`, no effect on any existing route.**
  ★ **SCOUT-1's phrasing — "`resolveVerifiedUid` is advisory and falls back to a spoofable header"
  — is CORRECTED by the owner. Do not propagate it.** The header-reading is a DIFFERENT function in
  the same file.
  ★ **The spoofing hazard is nonetheless REAL AND CURRENT (owner-verified):** `verifiedCaller.cjs`
  and `rateLimiter.cjs` both read `X-Lazytopper-Uid`, trivially spoofable. ⚠ **The Wave 5D header
  strip does NOT protect the gateway** — it covers `x-user-id` at the api-server proxy
  (`app.proxy-headers.test.ts`): **a different header on a different surface.**

**Q2 → A. Dismiss the 9 as false positive, WITH the guard.** ★ **The TEST is the deliverable, not
the dismissal.** It must sit **beside the storage call, not in a distant suite**, so a future change
trips it. The dismissal rationale must record that **the "7" span two rule ids**, so nobody later
suppresses by rule id and leaves two open. Reason given: remediating a persisted value read on
every load is the exact class that broke production past 1,082 green tests — an unacceptable risk
to take for a false positive.

**Q3 → A. Delete the dead `users` write, own lane, this wave.** Reason: an FU only asks people to
remember; removing the write closes the door permanently against someone later "fixing" it with a
rules block. ★ **`users` STAYS LISTED in the map** — erasing a path that was never written is a
harmless no-op, and de-listing is the one move that could make a future erasure lie.
★ **Live-verify is narrow and specific (owner-defined):** create a new account on **email** and on
**Google**, and **sign in again on each**. That is the whole risk surface of an inert login-time
write.

**★★ PROMOTED TO LANE-BLOCKING ON ERASE-1 by the owner** — the `qrUploadSlots` finding, which this
controller had reported at the bottom of a message as "worth knowing". The owner's ruling:
*"That is the worst failure available to this lane. A minor's handwriting images stay live while
the product tells a parent the account was erased."*
  1. The erasure **must query by field** for that location, **never by doc id**.
  2. ★★ **A delete that matches nothing MUST NOT report success.** Every location returns
     `deleted N` **or** `not found`, and **the caller distinguishes them.**
  3. **Mutation:** point it back at a doc-id delete → the test goes red **because zero documents
     matched**, not because an assertion changed.
  4. ★ **Audit all 29 locations for the same shape. Enumerate; do not spot-check.** If one location
     keys uid as a field, assume others might.

**★ CONTROLLER PROCESS NOTE:** the owner asked that decision questions be put **in the message body
with their options, not through the question picker.** He replies in the body only.

## ★★ OWNER RULINGS — ROUND 2, 2026-08-08. WAVE CLOSES WITH THREE LANES.
**Merge order APPROVED: #640 → #639 → #638.** Byte-reviewed by the owner; #640 confirmed
`+1,323/−0` across five test files; **#638's `package.json` change is scripts-only, so no lockfile
update is owed** (this closes `[FU-DPDP-ERASE-PACKAGE-JSON-OUT-OF-ALLOWLIST]` as accepted, not as a
defect).

**EXPORT-1 → a FRESH DPDP-B CONTROLLER, together with SETTINGS-1. This wave closes with three lanes.**
★★ **THE OWNER ASKED THAT THIS FRAMING BE KEPT FOR WHOEVER REPLACES ME — it is NOT a context
calculation.** Addendum §1 is deliberately **positional**: *a controller that finishes with context
left stands down anyway.* ⇒ **The arithmetic version — "do I have enough context for one more
lane?" — would justify precisely the behaviour §1 exists to prevent.** Never reason about your
lifetime by measuring your remaining context.
EXPORT-1 also cannot start until #638 is **on trunk**, which would mean idling through three merges
and three live-verifies. **DPDP-B takes both lanes with full context.**

**207 → controller recommendation ACCEPTED, with an addition the controller did not propose:**
200 when every reachable location returned a **definite outcome**; 207 only on **genuine failure**.
★★ **But the body enumerates all 29 locations with their outcome REGARDLESS of status code. The code
is for machines; the body is the evidence, and SETTINGS-1 will read the body.**
★ **`notFound` is a DEFINITE OUTCOME, not a failure** — a path never written to is legitimately
empty. ⇒ **Carry this to SETTINGS-1: it must not render `notFound` as an error to a student.**

**3/day cap → ACCEPT.** **`learnerAccountService.ts` → LEAVE IT**; DPDP-B is already in that tree.

## FU BODIES THE OWNER DICTATED — write these into the handoff verbatim in substance
**`[FU-DPDP-GUARDIAN-CHANNEL-LEGAL]` — ⚠⚠ ESCALATE, DO NOT MERELY FILE. LAUNCH-BLOCKING LEGAL
QUESTION FOR THE OWNER, NOT AN ENGINEERING NICETY.**
> India's DPDP Act treats the data of **anyone under 18** as a child's data and requires
> **verifiable parental consent to PROCESS it**. **Every LazyTopper student is in that class.**
> ⇒ **This potentially reaches SIGNUP ITSELF, not just deletion.** A guardian erasure channel is the
> visible corner of a much larger question. **Neither the owner nor any agent here is a lawyer.**
> This must read to the next reader as a **launch blocker requiring legal advice**, not as a backlog
> item about a delete button.

**`[FU-REFERRAL-MATH-RANDOM-USER-FACING]`** — `referralService.generateCode()` uses `Math.random()`
for a **user-facing** referral code: a `CLAUDE.md` §7 violation **living on trunk**. ★ **CodeQL did
not flag it.** ⇒ **Same lesson as the 4-of-6 finding: the scanner's output is not the set.** Own
small lane; not this wave.

**`[FU-CLEARTEXT-GUARD-KIT-DUPLICATED]`** — accept the five copies now, schedule extraction to
`src/test/`. ★ **The owner elevated the controller's reasoning to a standing rule:**
> **Duplication that keeps a lane honest about its scope is cheaper than the scope breach that
> avoiding it would require. A lane that widens its allowlist to DRY something has traded a real
> guarantee for a cosmetic one.**

## ★★ TWO FINDINGS THE OWNER ORDERED INTO `cofounder-skill/SKILL.md` — NOT ONLY THIS FILE
★ Verified on trunk: **`cofounder-skill/SKILL.md` EXISTS.** ⇒ include it in the handoff PR (docs-only,
zero product files — `CLAUDE.md` §8 compliant).
1. **THE ALERT LIST IS NOT THE SET.** CodeQL flagged **4 of the 6** `setItem` calls in
   `referralService.ts`. Anyone remediating from the alert list covers four, believes they are done,
   and ships. **Generalises to every scanner this project uses.**
2. **A RULE AGAINST FALSE REDS.** A year of defences against false GREENS and nothing against the
   inverse: an `ENOENT` on an extensionless `.bin/vitest` read exactly like a failing test —
   **five false reds.** Remedy: **require the failure to QUOTE THE INJECTED VALUE**, plus a
   pre-mutation green and a did-it-actually-run assertion.
   ★ **A mutation that "fails" for a reason unrelated to the mutation is as worthless as one that
   never landed.**
### ★★ THE TWO-HOMES RULING — OWNER, 2026-08-08. #635 MERGES; the boundary is ONE-DIRECTIONAL.
The owner accepted the 4-of-6 comparison as fair but ruled that **untracked-on-one-laptop is worse
than two files**, so #635 lands. The boundary:
> **`ops/AGENT_STANDING_RULES.md` is what AGENTS read. `cofounder-skill/SKILL.md` is what the
> COFOUNDER reads. Different audiences. SKILL.md POINTS AT the ops file for agent-facing rules and
> DOES NOT RESTATE them. ★★ NO RULE IS WRITTEN IN BOTH.**
`[FU-DOCS-STANDING-RULES-TWO-HOMES]` — log the convergence question; **do NOT resolve it mid-flight
while branches are open against those paths.**

⚠ **AN UNRESOLVED TENSION, RECORDED RATHER THAN SILENTLY DECIDED.** The owner directed the two
findings below into **`cofounder-skill/SKILL.md`**, and that instruction is followed. But **both are
arguably AGENT-facing execution rules** — especially the false-RED rule, which governs how an agent
runs a mutation. **By the boundary above they would belong in the ops file.** ⇒ The handoff writes
them to `SKILL.md` as instructed **and** notes inside `[FU-DOCS-STANDING-RULES-TWO-HOMES]` that they
are candidates to MIGRATE (not copy) to `ops/AGENT_STANDING_RULES.md` when convergence is resolved.
★ **Recorded because the failure mode is precisely the one the ruling exists to prevent: a rule
living in the file its audience does not read.**

## ★★★ DEPLOY BLOCKER — 2026-08-09. #638 IS MERGED AND CANNOT DEPLOY.
**Production is serving the #639 build. The #638 deployment CRASHED ON BOOT and Railway rolled it
back.** Owner-reported:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'tsx' imported from /app/lazytopper/
```
**Mechanism:** `tsx` is declared **only** in `artifacts/api-server/package.json` (`"tsx": "catalog:"`)
— **absent from `lazytopper/package.json` and from the root.** pnpm workspaces isolate deps per
package, so **the gateway cannot resolve it.** The Dockerfile does **not** prune
(`# do NOT run --prod / prune`) ⇒ **this is an UNDECLARED dependency, not a stripped one.**

`[FU-ERASE-1-GATEWAY-TSX-UNDECLARED]` — **LIVE DEPLOY BLOCKER.**
- ⚠ **A manifest change without a matching `pnpm-lock.yaml` update fails the Vercel build too.**
- ⚠ **The acceptance test is a SUCCESSFUL RAILWAY BOOT, not a green suite.**

### ★★ RECORD THE MECHANISM, NOT JUST THE FIX — this is the lesson of the wave
**This is exactly the premise SCOUT-1 flagged and the controller made lane-blocking:** *"the gateway
can import the map is strong INFERENCE from an existing hook, not an executed import."*
**ERASE-1 then reported `MAP IMPORT IN SERVER PROCESS: EXECUTED PASS` — and that was true.**
★★ **The requirement was RIGHT. It was NOT MET.** The import was executed **in a dev worktree, where
every workspace dependency resolves** — and **never in the production image, where pnpm's per-package
isolation applies.** The two environments disagree, and only one of them serves students.
> ★★ **NEW STANDING RULE — the missing rung on this project's evidence ladder:**
> **A test proves the code works. A build chunk proves it ships. ★ ONLY A BOOT PROVES IT RUNS.**
> `MOUNT ≠ LIVE` has a level below it that this project had never named: **RESOLVES-IN-DEV ≠
> RESOLVES-IN-THE-DEPLOYED-IMAGE.** An `EXECUTED PASS` is scoped to the environment that executed it,
> and **a lane-blocking proof run in the wrong environment reads exactly like a met requirement.**
> ⇒ **Any lane that adds a runtime import to a server must state WHICH IMAGE it executed in.**

`[FU-DEPENDABOT-BLOCKS-RAILWAY-DEPLOY]` — **six Dependabot Update workflows are FAILING on trunk, and
Railway gates on the branch CHECK SUITE** ⇒ **a bot failure blocks every production deploy.**
⚠ **Only visible as a "Skipped" badge** — the most dangerous shape: an infrastructure stop
presenting as a non-event. ★ Same family as the wave's other findings: *a zero from something nobody
proved can fire*, and *the alert list is not the set.*
★★ **DIAGNOSED BY THE OWNER 2026-08-09 — AND IT IS THE SAME ROOT CAUSE AS THE DEPLOY BLOCKER, NOT A
SECOND PROBLEM.** The repo uses **pnpm catalogs** — 17 entries in `pnpm-workspace.yaml`, six packages
referencing `catalog:`. **Dependabot's `npm_and_yarn` updater cannot resolve that protocol**, so
**every security-update job fails.**
⇒ **The 4 critical security alerts and the `tsx` deploy blocker are ONE root cause: the `catalog:`
protocol.** `tsx` was declared as `"tsx": "catalog:"` in one package and never added to the gateway;
the same catalog mechanism is what the updater chokes on. **Write them up together — a fix lane that
treats them as two unrelated bugs will fix one and leave the other.**

## ★ STATUS AT STAND-DOWN — 2026-08-09
**ALL THREE LANES ARE ON TRUNK. Verified by CONTENT and by log, not by `merge-base` on a PR head
(this repo SQUASH-merges, so ancestry on a PR head is the wrong test):**
```
6f7da56e feat(server): a student can erase their own account, and a zero-match delete says so (#638)
6ef083b5 fix(privacy): a login no longer writes a child's identity to a dead collection (#639)
c9445a1e test(privacy): prove only the uid reaches the nine localStorage sinks (#640)
```
Trunk at stand-down: **`6f7da56ea9495fcfdbe80c577bc13b16a987f456`**.
⚠ **#642 (`docs(handoff): Wave ME-A closed`) IS STILL OPEN.** ⇒ **The DPDP-A handoff PR MUST NOT be
opened until #642 merges.** #635 also still open (blocked on its repo-boundary check).
⚠ **Trunk also gained #636, #637 and #641 from the ME arc** — those belong to ME-A's handoff (#642),
**not mine.** The census decides; do not assume.

**THE TSX DEPLOY FIX IS NOT THIS CONTROLLER'S** — owner-assigned to **DPDP-B as its FIRST lane, ahead
of EXPORT-1 and SETTINGS-1.** Reason: this controller is below its context floor, and §1 is
positional.

## BLOCKED / OWNER DECISIONS OWED
- ★★ **#642 IS AN OPEN HANDOFF PR AS OF 2026-08-09. DO NOT OPEN A SECOND.** The owner will merge it
  shortly. **Re-run `gh pr list --state open` before writing**, then run the coverage census below —
  #642's content is now part of what may already be recorded.
- **ERASE-1's live-verify is MOOT until the deploy is fixed** — production is not running that code,
  so a Console check would prove nothing about it. **The abandoned-QR-upload verification waits on
  `[FU-ERASE-1-GATEWAY-TSX-UNDECLARED]`.**
- **All product decisions answered.** Nothing else outstanding.
- **WAITING ON:** the owner merging **#640 → #635 → #639 → #638** and live-verifying. **The handoff
  cannot be written until my three are on trunk** — and `gh pr list --state open` must be re-run
  first, because "no handoff PR is open" is a fact with a shelf life.
- ★★ **UPDATED 2026-08-09 — ME-A CLOSES FIRST AND I WRITE MY OWN.** The owner ruled: ME-A's handoff
  covers **only what has landed**, so **my three drafts are not in it. There is nothing to hand
  over — keep the close-out for my own handoff.**
- ★★ **THEREFORE THE QUEUE IS REAL: ME-A's handoff PR may be OPEN when my three land.**
  **Exactly one handoff PR open at any moment.** ⇒ **If ME-A's is open, WAIT for it to merge before
  opening mine.** Do not open a second. ⚠ Force-merging two handoffs through the GitHub UI has
  silently preserved stale content over corrections with no gate catching it.
- ★★ **DO NOT ASSUME WHAT ME-A COVERED — MEASURE IT.** ME-A closing first means the six previously
  unrecorded merges **may already be recorded by the time I write.** Writing them again would
  duplicate; assuming they are there would drop them. **Re-run the census immediately before
  writing** — the same command that established the gap in the first place:
  ```bash
  for f in CURRENT_STATE.md SESSION_LOG.md NEXT_ACTION.md; do
    for n in 629 630 631 632 633 634 635 638 639 640; do
      echo "$f #$n : $(git show origin/base/approved-thru-437:handoff/$f | grep -c "#$n")"
    done; done
  ```
  **Cover exactly the zeroes.** ★ This is the same instrument that proved `handoff/` was six commits
  stale rather than the four I was told — it is reliable, and it is cheap.
- ⚠ **#635 IS BLOCKED, NOT MERELY UNMERGED** — the owner reports it is **failing its repo-boundary
  check**. ⇒ **`ops/AGENT_STANDING_RULES.md` DOES NOT EXIST ON TRUNK**, so `cofounder-skill/SKILL.md`
  is **the only home that exists today.** The two-homes tension is resolved as
  **"correct, and blocked on a PR"** — write to SKILL.md, keep
  `[FU-DOCS-STANDING-RULES-TWO-HOMES]` as a **migrate-not-copy** note.
  ★ The owner's meta-point, worth keeping: **raising the tension instead of quietly resolving it was
  the wanted behaviour, even though the answer turned out to be "you're right, but blocked."**
- **Merge sequence as of 2026-08-09:** **#640 first (no live-verify owed)**, then **#639**, then
  **#638 with the abandoned QR upload.**
  ★★ **The invariant is EXACTLY ONE HANDOFF PR OPEN AT ANY MOMENT — not one ever.** Two handoff PRs
  **in sequence is correct**. A replacement controller must not read "one handoff PR" as "one per
  release".
- ★ **THE LIVE-VERIFY PHRASING THE OWNER WANTS IF THE ABANDONED QR UPLOAD CANNOT BE PRODUCED**, to
  be used verbatim rather than softened:
  > **"live-verified on 28 of 29 rows, unproven on the one row this lane was built for."**
  The fixture-integrity test already establishes the hazard below the live layer, **so the gap is
  honest rather than fatal — but it must not read as full coverage.**
- **SETTINGS-1** waits on `MI-CONCEPT-1` reaching trunk; the ME controller must signal. Not this
  controller's wave either way.
- ⚠ **CodeQL alert dismissal is an OUTWARD-FACING repo-state change.** The CLEARTEXT-1 subagent
  will author the rationale and the exact commands but **will NOT execute the dismissal** — same
  class as "push as draft, never merge". **The owner performs the dismissal.** Flagged so it is not
  silently dropped.

---

## HANDOFF DRAFT — prose, ready to paste

### [CURRENT] The launch blocker moved: a student can now erase their own account
**Wave DPDP-A took the DPDP arc from an inventory nobody consumed to an erasure a student can
trigger.** `DPDP-1` (#630) had shipped `studentDataMap.ts` — 29 locations of a minor's data — and
**nothing in the product read it except its own test.** ERASE-1 (#638) makes it the spec it was
always meant to be: an authenticated, owner-scoped route that walks the map, deletes all 11
subcollections **explicitly** because Firestore does not cascade, uses admin credentials for the
five locations that need them **including the handwriting images in Storage**, and reports the one
location we cannot reach (Gemini) and the one no server can reach (browser localStorage) **as not
deleted rather than pretending otherwise.** USERS-1 (#639) removes a write that had been sending a
child's identity at every login to a collection that has never existed.

**What it means for a student:** for the first time, a minor's data can actually be removed on
request — and where it cannot be, the product says so instead of implying success. ⚠ **The
student-facing surface is NOT built yet** (SETTINGS-1, wave DPDP-B) — today the erasure is reachable
only by an authenticated API call. **Nothing ships to students on this arc until that lands.**

### ★★ The two findings this wave would want its successor to know
1. **A delete that matches nothing used to report success.** `qrUploadSlots` keys the uid as a
   **field, not a document id** — so the obvious doc-id delete was a **silent no-op sitting in the
   erasure path**. Every location now returns `deleted:N` or `notFound` and the caller
   distinguishes them. **Auditing all 29 rather than spot-checking the known one found a second
   instance the lane's own first classifier had got wrong.**
2. **The guard protecting the data map had a hole, and a mutation that stayed GREEN is what found
   it.** `doc(firestoreDb!, …)` evaded the drift scanner's pattern. Nothing is unmapped today, but
   the next such call site would have been invisible — and that guard is what stands between a new
   collection and an erasure that silently misses it. The scanner is now a pure function with
   fixture tests that prove **rejection**, not merely acceptance.

### ★ CARRY FORWARD VERBATIM
- **The WIRE-2 dormancy block in `CURRENT_STATE.md`** — must survive every prepend and be RESTATED
  in the new `[CURRENT]`. Its absence once cost five days.
- ★★ **CORRECTED 2026-08-09 BY THE OWNER — MY EARLIER FOUR-NAME LIST WAS WRONG. DO NOT CARRY IT.**
  **`WIRE-2` (#621) ALREADY ENDED #578, #611 AND #617** — owner-verified, `gradeQuickPracticeBatch`
  invoked at `PracticePage.tsx:2223`. Those three are **LIVE, not dormant.**
  ⇒ **The dormancy block is now TWO entries: `expectedMarks`, and `ERASE-1`.**
  ★★ **ERASE-1 is the sharpest dormancy this project has recorded: MERGED, UNDEPLOYED, AND
  UNREACHABLE.** It is not merely "built but unwired" — **production is not running this code at
  all** (see the DEPLOY BLOCKER section). State it in the block, not only in `[CURRENT]` prose.
  ⚠ **This correction is the reason the "do not invent the block's contents" instruction exists —
  and I violated it myself by asserting four names from memory.** The hedge saved nothing; the
  assertion still propagated into a dispatched instruction. **Read the real block on trunk. Verify
  every name against the file.**
- **The four unrecorded merges `handoff/` is stale by:** #629, #630, #632, #631. Whichever
  controller writes the first handoff covers all four in addition to its own wave.
  - **#631 is the significant one** (owner-stated): /me converged onto one responsive page and
    stopped reading device-local data — verified, 6 `getWindowedProgress`, 0 `loadInsights`.
  - #630 = DPDP-1, shipped `studentDataMap.ts` + its drift guard.
  - #629 = FENCE-1, a student cannot forge the typed-answer delimiter.
  - #632 = the premise-ledger gate for agent specs.

### Lanes
| lane | PR | what it changed | what it disproved |
| SCOUT-1 | none (read-only) | nothing — scoped ERASE-1/EXPORT-1 | that the two server surfaces are alternatives: **both are live in one process tree**, and `artifacts/` is the deploy entrypoint, not a De-Replit archive |
| SCOUT-2 | none (read-only) | nothing — scoped CLEARTEXT-1, answered the `users` FU | that the 9 clear-text alerts are defects (**all 9 look like false positives — only the uid reaches the sink**), and that the `users` write is "silently denied" (**it is never issued at all**) |
| ERASE-1 | #638 (draft) | a student can erase their own account, server-side, driven by the map; every location reports `deleted:N` or `notFound` | that a doc-id delete on `qrUploadSlots` was safe — it **matched nothing and reported success**, so a minor's handwriting images would have stayed live while the product told a parent the account was erased |
| USERS-1 | #639 (draft) | a login no longer writes a child's identity to a collection that never existed | that the drift guard protecting the data map was sound — **`doc(firestoreDb!, …)` evaded its pattern entirely**, so a future undeclared collection would have been invisible to it |
| CLEARTEXT-1 | #640 (draft) | a guard, beside each storage call, pinning that only the uid reaches the nine `localStorage` sinks — zero production change | that the nine CodeQL `clear-text-storage` alerts were defects: **all nine are false positives**, the taint starts from the whole `UserCredential` and only the uid arrives. Also that the alert list is a complete audit — **CodeQL flagged 4 of the 6 referral sinks** |
| EXPORT-1 | _(not built this wave — queued behind ERASE-1 reaching trunk)_ | | |

### FU ids — new / closed / kept open
- **closed:** `[FU-DPDP-USERS-COLLECTION-UNDECLARED]` — answered; it was PR #78's login-time
  account-metadata roster, dead in both directions, never issued. Superseded by two new FUs.
- **new / kept open:** see the FU ENTRIES COLLECTED list above (14 ids). Two are assigned into
  ERASE-1 rather than deferred: the map-import smoke test and the field-keyed `qrUploadSlots`
  silent no-op.

### ★ A STUDENT-FACING FACT THIS WAVE ESTABLISHED
Before this wave, `studentDataMap.ts` had **no consumer but its own test** — the inventory of a
minor's data existed and nothing acted on it. That is what ERASE-1 changes.

### Decisions made, with the reason
- (see DECISIONS MADE THIS WAVE above — copy verbatim at close)
