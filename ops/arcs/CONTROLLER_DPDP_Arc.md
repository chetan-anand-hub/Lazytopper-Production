<!--
CONTROLLER PREAMBLE (added by the Wave DPDP-B controller on receipt; the body below is the
owner's spec, faithfully preserved).
- Written to disk 2026-08-09. Trunk re-derived at receipt: f654dc645152049830c16645c6aeb2f6dd46b353
- Arrived as an ATTACHMENT with transport-corrupted emphasis glyphs. Markers normalised to ASCII.
  NO WORDING changed, reordered, or removed.
- STATUS UPDATE as of Wave DPDP-B start (this file was authored for WAVE DPDP-A):
    ERASE-1     = #638 MERGED (6f7da56e) -- BUT UNDEPLOYED AND NEVER RUN. See CONTROLLER_WAVE_DPDP_B.md Section 0.
    CLEARTEXT-1 = #640 MERGED (c9445a1e)
    USERS-1     = #639 MERGED (6ef083b5)  -- closed [FU-DPDP-USERS-COLLECTION-UNDECLARED]
    Wave DPDP-A handoff = #643 MERGED (f654dc64)
    EXPORT-1 and SETTINGS-1 remain OPEN and are lanes of WAVE DPDP-B.
- Section 5's "QUEUES BEHIND MI-CONCEPT-1" gate is CLEARED: #637 is on trunk (92cc9fc4, verified
  by `git merge-base --is-ancestor`).
- Section 7's two-controller handoff rule is SUPERSEDED by CONTROLLER_ADDENDUM_Context_Safeguards.md
  v1.1 Section 6: the rule is per-WAVE, not per-arc. Whoever closes a wave writes the handoff for
  everything landed since the last one. "The Me/Progress controller writes the handoff for both
  arcs" is NO LONGER THE RULE.
- This file is retained for Section 0 -- the data-map facts EXPORT-1 and SETTINGS-1 consume.
-->

# CONTROLLER - THE DPDP ARC

**v1.0 - 2026-08-08 - trunk `7786878d` at authoring -- RE-DERIVE IT.**
Read `LazyTopper_Controller_Subagent_Model.md` first.

> ** **THIS IS THE LAUNCH BLOCKER.** It has been deferred in five consecutive waves because it is
> not interesting. It is legally required, the students are minors, and nothing ships without it.

> **THE RULE THAT MATTERS: you never read product source, never run builds, never inspect diffs.**

---

## 0 - ** WHAT ALREADY EXISTS - read this before scoping anything

**`DPDP-1` (`#630`) shipped `lazytopper/src/services/studentDataMap.ts` -- 419 lines, plus a
287-line drift guard.** It is the authoritative inventory and **every lane below consumes it.**

**Verified on trunk `7786878d`:**

```
29 locations         14 firestore-collection - 11 firestore-subcollection
                      1 auth-account - 1 storage-prefix - 1 local-storage - 1 third-party

ErasureMechanism     22 browser-sdk          -- the Web SDK can delete these, signed in as the owner
                      5 admin-sdk-required   -- browser delete is REFUSED or undeclared
                      1 client-local         -- localStorage['lazytopper.*']
                      1 third-party-unreachable -- Gemini. We cannot delete it and must SAY so

exportable: false     1 location
```

**Three facts in that file that shape every lane:**

1. ** **Firestore does not cascade.** The type's own comment: *deleting `a/{uid}` leaves
   `a/{uid}/sub/*` orphaned and still readable.* **All 11 subcollections must be deleted
   EXPLICITLY.** An erasure that deletes the 14 parents and stops leaves a minor's data readable.
2. ** **Five locations need `admin-sdk-required`** -- including `qr-uploads/{uid}/{slotId}.{ext}`,
   the student's **handwriting images**. A browser-only erasure silently fails on these.
3. **One location is `third-party-unreachable`** (Gemini). **The product must tell the student
   plainly that this exists and cannot be deleted.** Silence here is the dishonest option.

**The map's guard fails by design when a new collection is added to the product without being
listed.** Do not weaken it. If a lane needs a new collection, it adds the map entry too.

! **`DPDP-1` disproved its own dispatch spec: Razorpay and Resend are NOT integrated** -- no
dependency, no import. Any brief that assumes them is wrong.

! **`[FU-DPDP-USERS-COLLECTION-UNDECLARED]` -- owner-confirmed in the Console: no `users` collection
exists; the write has been silently denied since it was written.** ** **Investigate what it was for.
Do NOT add a rules block** -- that would newly store a child's identity at the exact moment the data
map is fresh. **This is an investigation, not a fix.**
[CONTROLLER NOTE: CLOSED by #639.]

---

## 1 - THE ARC - FOUR LANES

```
WAVE DPDP-A  (3 lanes, parallel, file-disjoint)
  ERASE-1   server-side erasure route
  EXPORT-1  data export
  CLEARTEXT-1  the 9 clear-text-storage CodeQL alerts
                    |
WAVE DPDP-B  (1 lane)
  SETTINGS-1  the student-facing UI + the browser half of local erasure
```

** **`SETTINGS-1` MUST QUEUE BEHIND `MI-CONCEPT-1` (the Me/Progress arc).** Both touch local
mistake storage. **Confirm `MI-CONCEPT-1` is on trunk before dispatching it.**
[CONTROLLER NOTE: CONFIRMED on trunk -- 92cc9fc4. Gate cleared.]

**Disjointness is by EXACT PATH** -- `lane_overlap.mjs:112` is
`files.filter((f) => mineSet.has(f))`. Confirm with `gh pr list --state open` before every dispatch.

---

## 2 - LANE ERASE-1 - server-side erasure
[CONTROLLER NOTE: SHIPPED as #638. Merged, UNDEPLOYED, never run. Retained for its acceptance
criteria, which EXPORT-1 mirrors.]

**Allowlist:** `artifacts/api-server/**` or `lazytopper/server/**` (RE-DERIVE which hosts admin
routes) - `firestore.rules` **only if a lane proves a rule blocks a legitimate delete** - tests.
**Nothing under `lazytopper/src/pages/`.**

**Build** -- an authenticated, owner-scoped erasure that walks `STUDENT_DATA_MAP` and deletes every
location, **driven by the map, never by a hand-written list.**

** **THE MAP IS THE SPEC. Iterate it. A hardcoded list drifts the day someone adds a collection --
which is the exact failure `studentDataMap.test.ts` exists to prevent.**

- **All 11 subcollections deleted explicitly**, before or independently of their parents.
- The **5 `admin-sdk-required`** locations use firebase-admin credentials.
- The **1 `third-party-unreachable`** location is **reported to the caller, never silently skipped.**
- **Idempotent** -- a second erasure on an already-erased account succeeds and deletes nothing.
- **Partial failure is reported, not swallowed.** A run that deletes 27 of 29 must say which two.

**Tests** -- every map entry is visited (CONTROL: adding a fake entry to a fixture map makes the
"all visited" test red) - subcollections deleted explicitly, proven by asserting the child path was
targeted and not merely the parent - a second run is a clean no-op - the unreachable location appears
in the result as *not deleted* - a mid-run failure surfaces the remaining locations.
**Mutations** -- delete parents only, skip subcollections -> red - hardcode the list instead of reading
the map -> the fixture-map control red - swallow the unreachable location -> red.

** **LIVE-VERIFY IS THE GATE AND IT IS THE OWNER'S.** Create a throwaway account, generate real data
across several surfaces, erase it, then **open the Firebase Console and confirm every path is gone --
including the subcollections and the handwriting images in Storage.** A green test suite has never
once found a real defect on this project.

---

## 3 - LANE EXPORT-1 - data export

**Allowlist:** the same server surface as ERASE-1 is **FORBIDDEN while ERASE-1 is open** -- they will
collide on exact paths. **Dispatch EXPORT-1 only after ERASE-1 merges, OR scope it to files ERASE-1
does not touch and prove disjointness first.** Ask the owner rather than guessing.

**Build** -- an export driven by `STUDENT_DATA_MAP`'s `exportable` flag. **One location is
`exportable: false`** -- it must be excluded, and the export must say the exclusion happened rather
than pretending the location does not exist.

Machine-readable (JSON) and legible to a parent. Includes the `third-party-unreachable` entry as a
disclosure line.

**Tests** -- every `exportable: true` location appears - the `exportable: false` one does not, **and
is disclosed** (CONTROL both ways) - an empty account exports a valid, honest, empty file.

---

## 4 - LANE CLEARTEXT-1 - the 9 CodeQL alerts
[CONTROLLER NOTE: SHIPPED as #640.]

**Allowlist:** whichever files hold the alerts. **RE-DERIVE the list from CodeQL; do not trust a
count in any document.** ! *"9 alerts across 232 call sites"* is a carried figure -- **read it from the
run and name the run.**

Of ~47 CodeQL alerts, most are **not** problems: 18 are `notes/*.html` prototypes, 4
`missing-rate-limiting` are expected survivors because the limiter is hand-rolled, 7 are the
deliberately-excluded `diagrams.cjs` sanitiser. **The `clear-text-storage` ones are the real set and
they belong here** -- same files, same concern as erasure.

**Tests** -- each remediated site has a test proving the sensitive value is no longer stored in clear
text, with a CONTROL proving the test would fail if it were.

---

## 5 - LANE SETTINGS-1 - the student-facing surface

**! QUEUES BEHIND `MI-CONCEPT-1`. Confirm it is on trunk first.**
[CONTROLLER NOTE: CONFIRMED -- 92cc9fc4 is an ancestor of trunk. Gate cleared.]

**Allowlist:** the settings/account surface under `lazytopper/src/pages/` + `src/services/` for the
local-storage half + tests.

**Build**
- **Download my data** -> EXPORT-1. **Delete my account** -> ERASE-1.
- ** **A confirmation flow proportionate to an irreversible act on a minor's account.** Type-to-confirm,
  a plain statement of what is deleted, and **an explicit line that the AI provider retains what it
  retains** -- the `third-party-unreachable` entry. **Do not soften this.**
- **The browser half:** clear `localStorage['lazytopper.*']` -- the one `client-local` location.
- After erasure the student is signed out and cannot re-enter a half-deleted account.

**Tests** -- the flow cannot be completed accidentally - the local keys are actually cleared (CONTROL:
a key outside the `lazytopper.*` prefix survives) - the third-party disclosure is present, pinned by
copy assertion - a cancelled flow deletes nothing.

**LIVE-VERIFY, OWNER:** run the whole thing on a real throwaway account, on a phone, and confirm in
the Console. **At 360px.**

---

## 6 - STANDING - every lane inherits these

**SHOW THE EVIDENCE, NOT THE CONCLUSION.** Never *"X is absent / live / ran"* without pasting the
command and its literal output, and stating **what proves the command could have found X.** If you
cannot show it, say **"I could not verify."**
**NEVER `head`, NEVER `grep -c`, ON AN EXISTENCE QUESTION** -- a count cannot tell code from a
comment about code.
**ENUMERATE THE SET; DO NOT GREP A MEMBER.**
**TRACE THE WHOLE PATH** -- *"the field reaches the emitter"* is not *"the request reaches the
emitter."*
**A COUNT IS READ AT THE TIME, NEVER CARRIED -- including from this brief.**
**RESTORE BY BYTE SNAPSHOT AND SHA.** Assert `mutated-sha != baseline-sha` **before** any red.
**`scope:guard` BEFORE `git add`** - `tsc` both configs - ! **`check:mojibake` scans TRACKED files
only** - ! `tsc ... | head` returns `head`'s exit code.
**NEVER read or push from `C:\Projects\Lazytopper-Production`.**
**PUSH AS DRAFT. Never `gh pr ready`, never merge.**
**IF THIS SPEC IS WRONG, YOUR VERIFIED FINDING WINS.** `DPDP-1` disproved its own dispatch spec on
Razorpay and Resend. Expect to do the same.

---

## 7 - ** RULE 0 - AND THE HANDOFF LOCK BETWEEN TWO CONTROLLERS
[CONTROLLER NOTE: SUPERSEDED by ADDENDUM v1.1 Section 6 -- the rule is per-WAVE, not per-arc.]

**A wave is closed when `handoff/` describes trunk.** One handoff PR, seven paths, exactly one
un-superseded `[CURRENT]`, prepends proven by a per-file heading census.
** **The WIRE-2 dormancy block in `CURRENT_STATE.md` must survive and be RESTATED in your
`[CURRENT]`.**

> ** **TWO CONTROLLERS ARE RUNNING. The seven `handoff/` files are a SINGLE SHARED LOCK and you
> will collide on them.** Product PRs may race; **handoff PRs must queue.**
> **The Me/Progress controller writes the handoff for both arcs.** You supply it a bounded
> close-out -- lanes, PR numbers, FU ids, decisions -- and **you do not open a handoff PR yourself.**
> [CONTROLLER NOTE: THIS SENTENCE IS SUPERSEDED. See ADDENDUM v1.1 Section 6.]
> Force-merging two handoffs via the GitHub UI has silently preserved stale content over
> corrections with no gate catching it.
