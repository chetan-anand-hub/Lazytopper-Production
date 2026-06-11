# LazyTopper — Current State
Last updated: 2026-06-11 (post-PR #224 + #225 — INFRA-4/PR1: Railway backend DEPLOYED + LIVE; `vercel.json /api/*` wired to the live backend. Grading no longer dark in prod — owner-confirmed `stub:false`, Gemini direct-key. NEXT: owner+cofounder run the Track B live round-trip to CLOSE [TRACK-B-GATE]; then PR2 (harden: Postgres + tsx + admin/session + rate-limit + warm-pool); then RESP-DIV-2 (mobile logout))

## Live base
Branch: base/approved-thru-437
SHA: 7c106b610703b6dc8c54d47f9a05eb1a078b8fb4
Last merged PRs: #220 (mobile-me honesty — RESP-DIV-1 stopgap), #221 (docs), #222 (mobile-check trust guard + persistence — Track B), #223 (docs), **#224 (INFRA-4/PR1 — Railway deploy image: Dockerfile + railway.json + vercel sentinel; 4 files)**, **#225 (INFRA-4/PR1 — fill vercel.json with the live Railway URL; 1 file)**

## ✅ INFRA-4 / PR1 — backend DEPLOYED + LIVE (the go-live unlock)
The backend (`artifacts/api-server`, which self-spawns the `lazytopper/server` AI gateway as a child) is **deployed on Railway and
live** — owner-confirmed `/api/health` shows `stub:false` with Gemini **direct-key** auth. **Grading (`/api/check-solution`) is no
longer dark in production.** Wiring: Vercel static app → `vercel.json` rewrite (`/api/*` + `/shared-api/*`) →
`https://lazytopper-production-production.up.railway.app` → api-server (8080) → gateway (3001) → Gemini.
- **Deploy shape (load-bearing):** the image carries the **whole workspace** and keeps `typescript` installed — the gateway
  transpiles `lazytopper/src/**/*.ts` at runtime and resolves files relative to cwd (Dockerfile + `.dockerignore` encode this).
- **Deferred:** claudeClient Replit-proxy rewire (INFRA-4b) — grading is Gemini-only; Claude is visuals-only and degrades
  gracefully. **Flagged for PR2:** `tsx` (absent from manifests; warmup is `DATABASE_URL`-gated, inert until PR2 adds Postgres).
- **PR2 (harden, queued):** provision Postgres + `DATABASE_URL` + add `tsx` + `ADMIN_FIREBASE_UIDS` + `SESSION_SECRET` +
  rate-limit + warm-pool decision (`WARM_POOL_TOP_UP_INTERVAL_MS` currently `0`).
Reports: `report-api-server-deploy-investigation-2026-06-10.md`, `report-api-gateway-railway-2026-06-10.md` (incl. owner runbook).

## ⛔ TRACK B (#222) verification gate — now LIVE-TESTABLE; owner+cofounder run it to close
With the backend live, the grade→persist→mobile-Me→desktop-Me round-trip can finally be PROVEN. **Status: live-testable, NOT yet
closed.** The owner + cofounder run the real round-trip on the live app (sign in → grade a real answer → confirm "Saved to your
progress" → mobile Me shows the real mistake mix → desktop Me matches on the same uid; plus the failed-grade → error path). **Only
that pass closes [TRACK-B-GATE] / ISSUE-009.** Step-by-step in `report-api-gateway-railway-2026-06-10.md` §7. See OPEN_QUESTIONS [TRACK-B-GATE].

## PHASE-2 RESPONSIVE DIVERGENCE — Track A DONE (#220); audit ordered the rest
The Phase-2 work (reconcile stale mobile twins to the desktop source-of-truth; no invented numbers) is underway.
- **Full divergence audit (read-only):** `report-responsive-divergence-audit-2026-06-08.md` mapped every `useIsDesktop()`
  split. 7 split surfaces → 2 MATCH-by-design (Home, Welcome), 2 MATCH by construction (Exam Trends, Practice Hub),
  **5 DIVERGENT** (Me, chrome/avatar, Check & Improve, Topic Hub, Worksheets). Severities normalized (mobile-shows-less =
  functional, not trust-critical).
- **Track A DONE (#220, `8c478ce`):** mobile Me (`app/Me.tsx`) no longer shows fabricated personal data — the hardcoded
  `COMMON_MISTAKES` bars (−12/−8/−5) + invented weak-topics count are removed, replaced with honest empty-states (desktop
  Me's verbatim copy) + an honesty footer. The urgent trust-critical stopgap. Streak/XP kept (real localStorage). 1 file,
  +48/−56; grep-proven zero fabricated data; gates green; build CI-gated.
- **Punch-list order (OPEN_QUESTIONS):** Track A ✓ → **Track B (mobile Check trust + persistence — the data source mobile
  Me needs)** → RESP-DIV-2 (mobile has NO logout path) → Topic Hub reconcile → Worksheets parity → Home real-insights →
  RESP-DIV-3 (trial banner). Durable cure = converge mobile Me into desktop Me (one responsive component, one pipeline).

## SEVER PR (#218) — obsolete surfaces disconnected; product reaches ONLY live surfaces
PR #218 (`fix/sever-obsolete-surfaces`; squash-merged **`bcb7c2a`**, 57 files +170/−171) severed every inbound edge
(route, nav, catch-all, command-palette, leaked link) to obsolete/deferred pages so the running product reaches
ONLY live surfaces. **Markers-now doctrine** — no files moved/deleted; 46 disconnected files carry a top-of-file
`LEGACY-RETIRED` (43) / `DEFERRED-REVIVE` (3) marker for a future Phase-2 clean-branch (grep the markers to
delete/keep). Authority: `AGENT_sever_obsolete_surfaces_2026-06-08.md` + the two read-only audits
(`report-responsive-surface-audit-2026-06-08.md`, `report-banned-term-prose-audit-2026-06-08.md`).
- **Routing (App.tsx — owner-authorized, routing-scoped):** mobile `/` (RootEntry) + catch-all `*` (HomeRedirect)
  re-pointed off the retired old `/dashboard` to the live MobileHome (`/browse`) / `/`; `/browse` made terminal at
  mobile width (no `/`⇄`/browse` loop). **Fixes the two-contradictory-homes bug** (mobile `/` + catch-all landed on
  the old Dashboard while the BottomNav Home tab went to `/browse`). Durable nav-mirror rule encoded; BottomNav
  active-state residue trimmed to the live set. `main.tsx` was NOT needed (less forbidden-file surface).
- **18 dead `<Route>` entries removed** (RETIRE: dashboard, trends, daily-mix, daily-mission, planner, study-plan,
  night-before, revision-calendar, mini-mock, weekly-wrapped, weekly-digest, methodology, settings; DEFERRED:
  parent-dashboard, parent, predictive-papers). `weak-area-practice` KEPT (partial-sever: dead-Dashboard doorway +
  palette entry severed; live ExamSim/MockPaper inbound preserved).
- **11 leaks closed:** JourneyStrip removed from HPQ; command palette severed at switch + catalog
  (`commandPaletteConfig`) + intent (`commandIntent`); live back-defaults/links in PracticeQuestionList, TopicHub,
  WeakAreaPractice, ExamSimulation, MockBuilder, the Login post-login fallback, and Onboarding re-pointed off
  severed routes. (5 of these were BEYOND the named JourneyStrip+palette — surfaced by a manual dead-path grep
  that the connectivity graph cannot see.)
- **Merge gate = before/after connectivity graph** (a new reusable tool `connectivity-graph.mjs` in the diff
  folder): 18/18 intended cuts unreachable AFTER, **28/28 live routes preserved (zero loss)**, 0 unexpected losses;
  `/mock-paper` flagged collateral (kept routed, unreachable — its only entry was the deferred predictive-papers).
- **Gates:** tsc, mojibake, scope:guard product, root matrix 175/175, ops 6/6, git diff --check all PASS; **CI
  `quality-gate` GREEN** (the linux vite build + verify-production-build). Vercel preview verified by owner
  (MobileHome landing 360/768, desktop sidebar nav, gated-CTA→login→return, routing fix → MobileHome not old
  Dashboard). Report: `report-sever-obsolete-surfaces-2026-06-08.md` + `connectivity-{before,after,diff}.*`.
- **Auth untouched** — zero auth / `main.tsx` / Firebase files in the 57; this build is byte-identical to #214 on
  auth. New responsive-divergence findings from the preview logged in OPEN_QUESTIONS (Phase-2, soft-launch).

## SYLLABUS PROSE COPY-FIX (#216) — 3 Tier-1A banned terms removed from the live cockpit
PR #216 (`fix/banned-term-prose-copy`; squash-merged **`b35f764`**) fixed 3 out-of-syllabus strings the
175/175 guard cannot catch (its surface scan omits bare generics to avoid prose false-positives). 2 files,
copy-only (+2/−3): `lib/desktop/topics.ts:35` Polynomials blurb dropped "the division algorithm" → quadratic
zeroes-coefficient wording; `:45` Linear Equations blurb dropped "cross-multiplication"; `topicHubContent.ts:249`
removed the "Complementary angles" Board-Essentials row. Authority: `report-banned-term-prose-audit-2026-06-08.md`.

### Two READ-ONLY audits now drive the next workstreams (reports in `diff/`)
- **`report-responsive-surface-audit-2026-06-08.md`** — mapped the live cockpit vs the abandoned graveyard
  (old `/dashboard` subgraph + `components/dashboard/*`, orphans Home/ProfilePage/PracticeHome/MentorPanel,
  old `/trends`, `/planner`). **Headline risk:** mobile `/` + catch-all + command palette still route live
  students into dead surfaces (old Dashboard is the mobile landing today). Owner-ruling queue (Bucket B + C)
  → produces the kill-list. **The SEVER PR is the next instruction.**
- **`report-banned-term-prose-audit-2026-06-08.md`** — 3 Tier-1A fixed here (#216). Tier-1B + Tier-2 deferred
  (see OPEN_QUESTIONS).

## AUTH MIGRATION ARC — 4/4 COMPLETE (#214): auth is Firebase-only, end to end
The arc is closed: **PR-1 #206** (api-server edge `verifyIdToken`) → **PR-2 #208** (frontend rebuilt on Firebase
Auth + native login) → **PR-3 #210** (Clerk teardown — Firebase-only, repo Clerk-free) → **governance scrub #212**
(CLAUDE.md/§5 doctrine + setup docs) → **PR-4 #214** (phone / SMS-OTP). Auth providers live: **Google (popup) +
Email/Password + Phone (SMS OTP)**. Firestore keyed on Firebase uid; admin via `ADMIN_FIREBASE_UIDS`.
**Verified in production-preview:** a real-number phone login — real SMS, real OTP, signed in, **trial correctly
tied to the phone account**. (Deliverability caveat logged — see OPEN_QUESTIONS [SMS-DELIVERABILITY].)

## AUTH MIGRATION ARC — PR-3 of 4 DONE (#210): Clerk teardown — auth is now Firebase-only
PR-3 (`fix/remove-clerk-bridge` from `5fc4141`; squash-merged **`6bf6e58`**) removed **all remaining Clerk**:
the gateway custom-token bridge, the api-server Clerk dual-accept fallback, `@clerk/express` + the Clerk
middlewares, and the now-dead JWT libs. Auth is **Firebase-only end to end**. 14 files (2 deletions + 12 edits,
+30/−224) + lockfile (−162). Report: `report-pr3-remove-clerk-bridge-2026-06-08.md`.

### What landed
- **Deleted** `lazytopper/server/routes/firebaseAuth.cjs` (the `/api/auth/firebase-token` bridge) +
  `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts`.
- `server/index.cjs` — removed the bridge require/factory/route-handler/CORS entry. `lazytopper/package.json` —
  dropped `jsonwebtoken` + `jwks-rsa` (remain transitive under `firebase-admin`, which is correct).
- `requireFirebaseAuth.ts` — removed the Clerk `getAuth` fallback → **Firebase-only** (`verifyIdToken` or 401;
  503 if Firebase Admin unconfigured — fail-closed, since there is no fallback now).
- `app.ts` — removed `clerkMiddleware()` + the proxy mount. `artifacts/api-server/package.json` — dropped
  `@clerk/express` + the orphaned `http-proxy-middleware`.
- Scrubbed stale "Clerk" comments + the `authProvider` default (`"clerk"` → `"firebase"`).

### Zero-Clerk (owner gate)
`grep -rinE "clerk"` over `**/src`, `**/server`, `**/package.json` → **ZERO**. The lockfile `@clerk` count = 0
(whole `@clerk/*` tree removed). Remaining `clerk` matches are **non-code only**: gitignored `.env.local`,
auto-gen `.project_memory` snapshots, `handoff/*` migration history, and `CLAUDE.md`/`FIREBASE_SETUP.md`/
`docs/desktop-graduation-state.md` — the latter are the **governance/docs scrub** queued next (owner-ready
instruction; `CLAUDE.md §5` "Clerk stays for now — K2H-15" is now obsolete).

### PR-3 gate evidence (all green, Codespace + CI)
- **CI `quality-gate`**: PASS (run `27115594685`, 1m33s) — frozen install + root 175/175 + mojibake + build + ops.
- **Codespace (pre-push):** api-server tsc/build exit 0; lazytopper tsc/build exit 0; verify-production-build PASS;
  **gateway boots without the bridge** ("LazyTopper AI server running on port 3011"); root 175/175; ops 6/6;
  lockfile `@clerk` count = 0.

### ⚠️ Now load-bearing (the Clerk safety net is gone)
- **Admin bootstrap (BLOCKING):** `ADMIN_FIREBASE_UIDS` = your Firebase uid is the ONLY way admin routes
  authorize now. Until set: admin routes 503 in prod / dev-skip locally.
- **Railway env:** `artifacts/api-server` REQUIRES `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY`
  (or ADC) — `requireFirebaseAuth` returns 503 without it (no fallback).
- Remove `VITE_CLERK_PUBLISHABLE_KEY` from deploy env + the local `.env.local`.

### Remaining auth work
- **(DONE — #212) CLAUDE.md governance scrub** — surgical §1 stack + §5 doctrine edits, +
  `FIREBASE_SETUP.md` + `docs/desktop-graduation-state.md`. Owner-reviewed merge (governance files excluded from
  docs auto-merge). Trunk after #212: `c755adb`.
- **(NEXT, hold for owner go) PR-4 — phone / SMS-OTP** (`feat/auth-phone-otp`): fill the `initPhoneRecaptcha`/
  `sendPhoneOtp`/`verifyPhoneOtp` façade with `signInWithPhoneNumber` + reCAPTCHA v2 invisible; wire the Phone
  tab (+91 → 6-digit OTP). Project `lazzyy-topper` on Blaze; enable Phone provider + Authorized domains (owner).
- Google **One-Tap** (GIS) follow-up once a Web OAuth client ID is provided.

---

## AUTH MIGRATION PR-2 (#208): frontend on Firebase Auth (Clerk removed from the client)
PR-2 (`feat/auth-firebase-frontend` from `7f993cb`; squash-merged **`597880d`**) rebuilt the frontend auth on
**direct Firebase Auth** and removed Clerk from the client. The api-server edge (PR-1) is now hit with **Firebase
ID tokens** (its preferred `verifyIdToken` path); the Clerk fallback there goes idle (removed in PR-3). Design basis:
`LazyTopper_Login_Design_Spec_v2.md` + `lazytopper_login_prototype_v2.html`. Reports:
`report-pr2-auth-firebase-frontend-2026-06-08.md` + `report-pr2-evidence-2026-06-08.md`.

### What landed (6 files + lockfile)
- **`src/context/AuthContext.tsx`** — internals → direct Firebase Auth (`onAuthStateChanged`,
  `signInWithPopup(GoogleAuthProvider)`, email/password). **Added** `signInWithEmailPassword` /
  `signUpWithEmailPassword` (additive — `AuthContextType` shape preserved, ~38 consumers untouched).
  `getToken()` → `currentUser.getIdToken()`. Clerk→`/api/auth/firebase-token` bridge deleted from the client.
  **Local-dev/E2E anonymous-session path preserved verbatim.** Phone façade stays no-ops (PR-4).
- **`src/pages/Login.tsx`** — native v2 widget: official Google button + One-Tap sub-line, Email/Phone segmented
  toggle, **one-step** email+password, **disabled** Phone tab with honest "arrives shortly" note (handler = PR-4).
  `lt-login-clerk-frame` → `lt-login-frame`; **"Welcome back" header removed**; left brand panel untouched.
- **`src/pages/SignUpPage.tsx`** — native Google + email/password create-account.
- **`src/main.tsx`** — `ClerkProvider` removed (authorized for PR-2). **`package.json`** — `@clerk/react` dropped.
- **`artifacts/api-server/src/routes/admin.ts`** — admin allowlist migrated **`ADMIN_CLERK_UIDS` →
  `ADMIN_FIREBASE_UIDS`** (the forward-corrected functional step; `req.userId` is now a Firebase uid).

### Owner decisions (PR-2)
- **Google = popup** (`signInWithPopup`) — no new env/script. True GIS One-Tap is a fast-follow once a Web OAuth
  client ID is supplied. **Email = one-step**, password-based (no magic link). Phone toggle present, inert until PR-4.

### PR-2 gate evidence (all green)
- **CI `quality-gate`**: PASS (run `27102702574`) — frozen install + root matrix 175/175 + mojibake + lazytopper
  build + ops matrix.
- **Codespaces (pre-push, files copied in — no commit):** lazytopper `tsc -p tsconfig.app.json` **exit 0** (the
  ~770-line rewrite's first compile); api-server typecheck exit 0; **vite build exit 0**; verify-production-build
  PASS; root 175/175; ops matrix 6/6; lockfile regenerated (`@clerk/react` removed, −17 lines).
- **Vercel-preview screenshots** (360/768/desktop × login + signup) captured + assessed faithful to the v2
  prototype — `pr2-{login,signup}-{360,768,desktop}.png` in the diff folder.
- **Runtime auth verification (headless, real `lazzyy-topper`):** email/password sign-up+sign-in + `getIdToken()`
  → decoded JWT `iss = https://securetoken.google.com/lazzyy-topper`, `aud = lazzyy-topper`,
  `sign_in_provider = password` — a genuine **Firebase** token (NOT Clerk). Throwaway account deleted.
- Zero `@clerk`/`VITE_CLERK` refs remain in `lazytopper/src`. `scope:guard` classifies the 5 FE files as
  `product`; the 1 BE file (`admin.ts`) is the known `[unclassified]` gap (D47).

### ⚠️ PR-3 IS NEXT (owner to give go) — the Clerk teardown
PR-3 (`fix/remove-clerk-bridge`): delete the gateway bridge (`/api/auth/firebase-token` + `firebaseAuth.cjs` + its
`server/index.cjs` wiring; drop `jsonwebtoken`/`jwks-rsa`); remove the api-server **Clerk fallback** branch from
`requireFirebaseAuth` (Firebase-only); drop **`@clerk/express`**; unmount `clerkMiddleware()`; remove
`clerkProxyMiddleware`; remove Clerk env (`CLERK_SECRET_KEY`, `CLERK_JWKS_URI`, `CLERK_ISSUER`, `VITE_CLERK_*`).

### Owner / deploy actions still pending
- **Admin bootstrap:** sign in once via Firebase → capture your uid → set `ADMIN_FIREBASE_UIDS` (else admin routes
  503 in prod / dev-skip locally).
- **Firebase Authorized domains:** add the prod Vercel domain to `lazzyy-topper` so `signInWithPopup` works in prod
  (localhost already allowed; the Google popup couldn't be auto-tested headlessly — owner verifies with a real click).
- **Railway env (from PR-1):** `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY` (or ADC) on api-server.
- **One-Tap (GIS) follow-up:** small PR once a Web OAuth client ID is provided.

---

## AUTH MIGRATION PR-1 (#206) — Firebase edge verify + Clerk dual-accept (Option B)
Owner decided to **remove Clerk and use Firebase Authentication directly** (Google + Email/Password + a NEW
phone/SMS-OTP option). Rationale (verified): all student data already lives in Firestore (per-uid, secured by
`firestore.rules` `isOwner(uid)`); Clerk sits "midway" (login UI + session → a backend bridge mints a Firebase
custom token); Firebase has native auth, so Clerk is the removable layer. Cheapest to migrate now (no live
student accounts, Clerk production not yet set up). Authority: the read-only audit
`report-auth-migration-clerk-to-firebase-2026-06-07.md` (owner-reviewed) + the 4-PR build plan.

**The migration is 4 sequenced, owner-approved PRs (same executor, STOP-for-approval between each):**
- **PR-1 (#206, DONE)** — backend edge guard ("Surface B" = `artifacts/api-server`): verify Firebase ID tokens.
- PR-2 (NEXT) — frontend `AuthContext` internals + Login/SignUp rebuilt natively on Firebase Auth (Google One
  Tap + Email/Password); client switches to send Firebase ID tokens; drop `@clerk/react`; `main.tsx` authorized.
- PR-3 — delete the gateway bridge (`/api/auth/firebase-token` + `firebaseAuth.cjs`); remove the Clerk fallback
  **and** `@clerk/express` together; unmount `clerkMiddleware`; remove `clerkProxyMiddleware` + Clerk env.
- PR-4 — phone / SMS-OTP provider (reCAPTCHA v2 invisible; project `lazzyy-topper` on Blaze).

### PR-1 (#206) — what landed (5 files, all under `artifacts/api-server/`)
Branch `feat/auth-firebase-edge` from `45f733e`; squash-merged **`a3def5f`**. `.claude/` never staged.
- **NEW `src/lib/firebaseAdmin.ts`** — Firebase Admin init for the edge (mirrors the gateway: `VITE_FIREBASE_PROJECT_ID`
  + optional `FIREBASE_SERVICE_ACCOUNT_KEY`, else ADC). Exports `firebaseAdminApp` (or `null` if unconfigured).
- **NEW `src/middlewares/requireFirebaseAuth.ts`** — the dual-accept guard: (1) `verifyIdToken(bearer)` →
  `req.userId = decoded.uid`; (2) on failure, fall back to the **still-mounted** `@clerk/express` `getAuth(req)`;
  else `401 {ok:false,error:"Unauthenticated"}`. Augments `Express.Request` with `userId?: string`.
- `src/routes/admin.ts` / `src/routes/questions.ts` — `requireAuth()` → `requireFirebaseAuth`; read `req.userId`;
  dropped the `@clerk/express` imports from the route files. `x-user-id` forwarding to the gateway unchanged.
- `package.json` — added `firebase-admin@^13.7.0` (the one new dep; already in the lockfile via lazytopper).

### Option B (owner-confirmed) — the dual-accept lifecycle
PR-1 keeps `@clerk/express` mounted (the fallback's `getAuth` needs `clerkMiddleware`; the still-Clerk frontend
needs `clerkProxyMiddleware`). NO hand-rolled Clerk crypto; NO `jsonwebtoken`/`jwks-rsa`. The Clerk fallback +
`@clerk/express` are removed **together in PR-3**. Lifecycle: PR-1 adds Firebase verify + Clerk fallback (both
live) → PR-2 switches the client to Firebase tokens **and** migrates the admin allowlist → PR-3 removes the
Clerk fallback + `@clerk/express`. `/shared-api/questions/report` never breaks. Rejected Option A (hand-rolled
JWKS Clerk verification) as unjustified security-critical/throwaway code. The build doc's "drop `@clerk/express`
in PR-1" line is corrected → moved to PR-3. See DECISION_LOG (Option B).

### ⚠️ PR-2 FORWARD CORRECTION (admin allowlist) — do NOT lose
`admin.ts` `requireAdminRole` checks `req.userId` against **`ADMIN_CLERK_UIDS`** (Clerk ids). PR-1 deliberately
left this as-is. When **PR-2** switches the client to Firebase tokens, `req.userId` becomes a **Firebase uid**,
so every admin route would **403** until the allowlist is migrated. Therefore the **rename + revalue
`ADMIN_CLERK_UIDS` → `ADMIN_FIREBASE_UIDS` moves to PR-2 (not PR-3)**, with a bootstrap step: owner signs in
once via Firebase → capture the uid → set it in `ADMIN_FIREBASE_UIDS`. (A code comment in `admin.ts` notes the
deferral; that comment still says "PR-3" — PR-2 must update it.)

### Deploy-stage note (Railway) — NEW requirement from #206
`artifacts/api-server` now requires **`VITE_FIREBASE_PROJECT_ID`** + **`FIREBASE_SERVICE_ACCOUNT_KEY`** (or ADC)
in its Railway deploy environment to verify Firebase ID tokens. Without them `firebaseAdminApp` is `null` and the
edge relies on the Clerk fallback only (fine during the PR-1→PR-2 window; required real once PR-3 is Firebase-only).
Fold into the INFRA-4 backend-deploy env checklist.

### PR-1 gate evidence (all green)
- **CI `quality-gate.yml`**: PASS (1m29s, run `27100425116`) — frozen-lockfile install + root matrix 175/175 +
  mojibake + lazytopper build + ops matrix all green.
- **Codespaces (linux, pnpm 10.32.1)** — the gates that can't run on the Windows box: lockfile regenerated (only
  `pnpm-lock.yaml` changed, +8/−65, adds `firebase-admin` to api-server, committed in the PR); **api-server
  `typecheck` exit 0** (first real compile of the 2 new files; required building the `@workspace/api-zod`/`db`
  composite refs first); **api-server `build` (esbuild) exit 0** (`firebase-admin` externalized); root matrix
  **175/175**; lazytopper ops matrix **all 6 green** (the transient `llm-path 4/5` was a Codespace-only missing-
  ripgrep artifact — identical on trunk, unrelated to PR-1; CI installs ripgrep → 5/5).
- `scope:guard` is structurally **N/A** for an `artifacts/api-server`-only PR (its policy lanes are
  lazytopper-anchored — no `artifacts/api-server` lane); forbidden-files clean; diff confined to 5 files.

## ✅ INFRA ARC CLOSED THIS SESSION (4 items) — repo is healthy; NEXT SESSION PIVOTS TO PRODUCT
The whole arc this session was diagnosing + closing the infra tangle. As of trunk `5441060` all four are DONE:
1. **Lockfile fixed (#201)** — `pnpm-lock.yaml` regenerated to match `lazytopper/package.json`; frozen installs work on linux.
2. **CLAUDE.md corrected (#198)** — stale commands fixed (`verify-production-build.mjs`; `npx tsc -p tsconfig.app.json --noEmit`; the real gate bar; the two distinct `test:matrix:all`).
3. **CI LIVE (#198)** — `.github/workflows/quality-gate.yml` at the repo ROOT gates every PR into trunk + push to trunk: pnpm **10.32.1** frozen install → root matrix **175/175** → mojibake → **linux `vite build`** → ops matrix. Proven to RUN and to GATE (probe PR #202 went red on a planted mojibake). ripgrep installed in CI; `scope:guard` stays a LOCAL gate (working-tree-diff based → false-PASS on a clean CI checkout). No product-PR auto-merge (human gate retained).
4. **De-Replit COMPLETE (#199 PR-A + #204 PR-B)** — all Replit scaffold, the `@replit/vite-plugin-*` packages, `@replit/connectors-sdk`, and the 3 non-product stubs (`lazytopper-video`, `mockup-sandbox`, `lazytopper-mobile`) removed. The repo is now **fully `@replit`-free in manifests + source + lockfile** (verified `grep` = 0). Workspace **12 → 9 projects**; lockfile shrank **~7,300 lines** (21,345 → 14,051). PR-B (#204) was the **first real PR through the new CI gate** — it went green.

**KEPT (real, NOT removed):**
- `artifacts/api-server/` — the real Express/Clerk/Postgres backend that proxies to the AI gateway.
- `artifacts/lazytopper-app/` — the vite build **OUTPUT TARGET**: `lazytopper/src` builds into its `dist/public/app` (served at `/app/`). Now a shell (its stub `src` went in PR-A); kept only as the output path.
- `lazytopper/` — the product (the ONE responsive website).

**Backend architecture (mapped this session):** layered — frontend `/api/*` → `api-server` (Express edge: Clerk auth, Postgres/Drizzle, questions/admin) → spawns + proxies AI to → `lazytopper/server/*.cjs` (the Gemini/Claude/tutor/check-solution gateway on port 3001). So "deploy the backend" = deploy `api-server` (which runs the gateway as a child) + provision Postgres.

## CI ACTIVATED (#198) — the safety net is LIVE; CLAUDE.md corrected
GitHub Actions CI now runs on every PR into `base/approved-thru-437` and on push to it. This is the FIRST
time CI has ever executed (the predecessor `lazytopper/.github/workflows/mojibake-guardrail.yml` was in a
SUBDIRECTORY — GitHub only registers workflows at the repo ROOT — so it never ran). **D39 RESOLVED.**
- **Workflow:** `.github/workflows/quality-gate.yml` (repo root; old mislocated file deleted). On an
  ubuntu-latest runner it gates the full bar: pnpm `--frozen-lockfile` install → root `scripts`
  `test:matrix:all` (**175/175**) → lazytopper `check:mojibake` → **`build` (linux `vite build`)** →
  lazytopper `test:matrix:all`. A red run blocks merge. Triggers scoped to trunk (PR-into + push-to);
  `concurrency` cancels superseded runs.
- **Squash-merged `9d772cb`** (3 legible commits: CLAUDE.md fix / CI workflow / cross-platform ops fixes).
  Final green run `27088156112`; **proven to gate** — throwaway PR #202 with a planted mojibake glyph went
  RED at the mojibake step, then was torn down.
- **Prereq cleared:** the stale-lockfile blocker that parked #198 last session was fixed on trunk by **#201**
  (regenerated `pnpm-lock.yaml` to match `lazytopper/package.json`). #198 rebased clean onto that.
- **Three Windows-only fragilities** that only surface under live linux CI were found + fixed inside #198:
  (1) pinned CI to **pnpm 10.32.1** — the lockfile's regen version; pnpm 11 leaves `npm_config_user_agent`
  empty on linux so the root `preinstall` guard (`case ...pnpm/*`) trips; (2) added a **ripgrep** install
  step — the ops audits shell out to `rg` with no fallback and ubuntu-latest lacks it; (3) fixed **hardcoded
  Windows path separators** in `bsre_spike_acceptance.mjs:50` (blocking) + `trig_legacy_retire_acceptance.mjs:29`
  (latent) to a cross-platform `[\\/]` regex. (BSRE is live product code — powers the TopicHub tutor
  `/api/mentor` path — so the check stays; only the separator was wrong.) Left alone: `styles_change_impact:25`
  `hasBackslash()` is an intentional non-portable-path DETECTOR; `feature_file_matrix.mjs` absolute Desktop
  paths are an owner-local tool, not in CI.
- **CLAUDE.md corrected:** verifier `verify-build.mjs`→`verify-production-build.mjs`; TS check
  bare `tsc --noEmit`→`npx tsc -p tsconfig.app.json --noEmit`; dropped dead `NODE_ENV/BASE_PATH`; documented
  the pnpm-workspace reality + the real gate bar + the two distinct `test:matrix:all`; added §6a (CI active;
  `scope:guard` stays a LOCAL gate — it inspects the working-tree diff, so a clean CI checkout is a false-PASS).
- **NOT in scope (deferred):** product-PR auto-merge — the human merge gate is retained until CI is proven
  over a series of real PRs. Authority: `report-unpark-198-ci-green-2026-06-07.md`
  (+ `report-ci-activation-blocked-2026-06-05.md` for the prior parked diagnosis).

## de-Replit PR-A DONE (#199) — safe scaffold + dead lazytopper-app stub (zero build/lockfile risk)
First, lockfile-INDEPENDENT slice of retiring Replit. Authority: `report-replit-removal-audit-2026-06-06.md`
+ `report-de-replit-pr-a-2026-06-06.md`. Build-safety verified: the product build (`lazytopper/vite.config.ts`)
imports ZERO `@replit` plugins and CI builds `lazytopper` only — these deletes cannot break the shipped app.
Branch `chore/de-replit-pr-a` from `2857871`; **70 files (69 deletes + 1 root `package.json` build-fix);
squash-merged `fec2f92`**. `.claude/` never staged.
- **Deleted:** `.replit`, `.replitignore`, `.tmp-lazytopper-artifact.toml` (root scaffold); `scripts/backup-to-drive.mjs`
  (Replit-only Drive backup, wired to no script); `artifacts/lazytopper-app/src/**` (64 — vestigial wouter/radix
  stub, NOT in the shipped bundle) + its `.replit-artifact/artifact.toml`. The lazytopper-app `package.json` +
  the `dist/` output target the real build writes to are **KEPT**.
- **Root build hygiene:** dropped dead-stub filters (`@workspace/lazytopper-app`, `@workspace/lazytopper-video`)
  from the root `package.json` `build`; **kept** `@workspace/api-server` + `lazytopper` (`scripts`-field edit → lockfile-safe).
- **Gates:** tsc 0; mojibake 0; root `scripts` `test:matrix:all` **175/175**; lazytopper ops matrix green;
  `git diff --check` clean; remote forbidden-file check clean. Two NON-blocking, NOT-this-PR FAILs:
  `scope:guard` = coverage gap (no policy lane models root-scaffold/`artifacts/**` deletes; manually verified
  clean; governance JSON untouched), and `pnpm install --frozen-lockfile` = PRE-EXISTING #198 staleness
  (`lazytopper/package.json` test-dep drift; this PR changes ZERO lockfile inputs — confirmed live). `vite build`
  / `verify-production-build.mjs` not runnable on Windows (linux-pinned binaries); root CI workflow parked in #198.
- **DEFERRED to PR-B (lockfile-coupled — behind the #198 lockfile regen):** delete whole packages
  `artifacts/lazytopper-video/`, `artifacts/mockup-sandbox/`, `artifacts/lazytopper-mobile/` (all workspace
  importers; lazytopper-mobile = owner-confirmed non-product Expo native path); remove `@replit/vite-plugin-*`
  + the 3 stub `vite.config.ts` + the 3 `catalog:` entries; `pnpm-workspace.yaml` allowlist cleanup
  (`stripe-replit-sync`, `@replit/*` exclude); orphaned root dep `@replit/connectors-sdk`; reconcile the root
  `typecheck` glob (`./artifacts/**` still hits the src-less lazytopper-app).
- **KEEP (owner-confirmed):** `artifacts/api-server/` — real backend (Express/Postgres/Clerk → AI gateway);
  retained in the root build; map the backend separately before touching it.

## de-Replit PR-B DONE (#204) — @replit packages + 3 non-product stubs removed (atomic, lockfile-coupled)
The lockfile-coupled remainder that PR-A deferred. Authority: `report-de-replit-pr-b-2026-06-07.md`.
Branch `chore/de-replit-pr-b` from `a0c7018`; **144 files (140 stub-dir deletes + 4 edits) + the lockfile
regen; squash-merged `5441060`**. The atomic set (all in one PR, or the build breaks):
- **A — deleted 3 non-product stub packages:** `artifacts/lazytopper-video/`, `artifacts/mockup-sandbox/`,
  `artifacts/lazytopper-mobile/` (the Expo NATIVE-app path — NOT the product, which is ONE responsive website).
  All 3 were workspace/lockfile importers.
- **B — stripped the surviving `@replit` config:** `artifacts/lazytopper-app/vite.config.ts` →
  `plugins: [react(), tailwindcss()]` (removed `runtimeErrorOverlay` + the `REPL_ID`-gated cartographer/dev-banner).
- **C — removed `@replit` deps:** root `@replit/connectors-sdk` (orphaned once PR-A deleted its only consumer)
  + the 3 `@replit/vite-plugin-*` devDeps in `lazytopper-app/package.json`.
- **D — cleaned `pnpm-workspace.yaml`:** dropped the 3 `@replit` `catalog:` entries + the
  `minimumReleaseAgeExclude` block (`@replit/*`, `stripe-replit-sync`) + stale Replit comments. The `packages:`
  glob (`artifacts/*`) needed no edit; the linux-x64 `overrides` block is KEPT (build-platform pinning).
- **E — reconciled the root `typecheck`:** `--filter "./artifacts/**"` → `--filter @workspace/api-server`
  (the glob had started hitting the src-less `lazytopper-app`, which errored TS18003 after PR-A).
- **F — lockfile regen (Codespaces, pnpm 10.32.1):** the Windows box can't (the `minimumReleaseAge` registry
  check needs `time` metadata it couldn't fetch); regenerated on linux per the #201 path. Lockfile shrank
  ~7,300 lines. **The new #198 CI gated the PR green** — its first real-PR proof.
- Windows-side gates before handoff: `@replit` purged from all source; `git diff --check` clean; no
  `lazytopper/src`/handoff touched; `scope:guard` FAIL = the known `artifacts/**` coverage gap (D41), not a breach.

## 3 pre-existing test reds RESOLVED (#196) — mixed PR (product src/data + trackedTooling lanes)
The three acceptance suites that had been RED on trunk (tracked as D38) are now GREEN. Authority:
owner-approved diagnosis `report-preexisting-failures-diagnosis-2026-06-05.md` + independent re-verification
(`report-preexisting-failures-fix-2026-06-05.md`). Branch `fix/preexisting-failures` from `df88d29`; merged
`19b3029`. **3 lane-pure commits**, 7 files (+173/−393); `predictionTypes.ts` frozen; `.claude/` never staged.
- **Commit 1 (product/data) — mojibake re-encode.** `circles.proof.ts` (462 corrupted glyphs, 12 types) +
  `maths.caseBased.ts` (6 glyphs, 2 types) → correct Unicode via a 1:1 reversible map built from the EXACT
  in-file bytes. Only corrupted sequences changed; already-correct Unicode + the pre-existing BOM left
  byte-for-byte. Single-level UTF-8→cp1252 corruption (not double-encoded). **`test:mojibake` 1/3 → 3/3.**
  CORRECTION to the diagnosis: caseBased was a SECOND corrupted file it missed (signature single-level
  `â–³`→`△` ×5 + a subscript-n stored as `â`+ASCII-apostrophe+`™`, a smart-quote artifact) — NOT the
  predicted double-encoded `Ã¢âÂ³`.
- **Commit 2 (tooling + product orphan deletes) — stale-test cleanup.** bank-health was a stale test
  asserting never-built wiring (`bankHealthSummaryForSubject` exists nowhere; HPQ never imported the engine);
  the engine (`src/prediction/bankHealth.ts` + `buildTopicKeySources.ts`) was orphaned dead compute (nothing
  in `src/` imported it). Deleted both orphans + rewrote the test as a **retirement guard** (same idiom as
  `trig:retire`/`bsre:retire`): asserts the dead compute is gone + HPQ surfaces no computed health (no-fake-
  data doctrine). Script name KEPT — 4 harnesses invoke it (`test_matrix.json`, `software_testing_bot.mjs`,
  `agent2_test_guard.mjs`, `matrix_execution_acceptance.mjs`) — so no package.json change. **2/4 → 4/4.**
  canonical-generator was stale after the "Split giant files" refactor (`be5e2de`) relocated
  `generateUnifiedPracticeQuestions`/`canonicalFallback` from `PracticePage.tsx` into
  `practiceQuestionBuilder.ts`; re-pointed the two page-side checks to the live chain. Generator unchanged.
  **2/4 → 4/4.**
- **Commit 3 (tooling) — un-blind the mojibake checker.** `check-mojibake.cjs` broke its scan at 50 hits;
  the cap bounded the SCAN (not just output), so a heavily-corrupted file that filled it stopped the loop
  before later-sorting files were read. `circles.proof.ts` (96 corrupted lines) sorts before
  `maths.caseBased.ts`, so the checker never saw the second corrupted file — and corruption shipped past
  both the local gate AND the CI workflow (both run this checker). Now scans every file/line; a
  `DISPLAY_LIMIT` bounds only printed output. Proof: against base-corrupted inputs the old cap flags only
  circles; uncapped flags both.
- **CI finding (corrected twice; tracked D39).** A mojibake guardrail workflow FILE exists but at
  `lazytopper/.github/workflows/mojibake-guardrail.yml` — a SUBDIRECTORY. GitHub Actions only runs workflows
  at the repo-root `.github/workflows/`, so it has **never executed** (`gh workflow list --all` and
  `gh run list` both empty — zero workflows registered, zero runs ever). It is dormant. So corruption shipped
  for TWO independent reasons: CI mislocated (never runs) + the checker it/the local gate would run was
  capped/blind (now fixed). Full test matrix + scope-guard remain un-CI-gated.
- **Gates:** tsc 0; prod build 0; `verify-production-build` PASS; `scope:guard --mode mixed` SCOPE_GUARD_OK
  (product+trackedTooling); `git diff --check` clean; the 3 previously-red now GREEN (mojibake 3/3,
  bank-health 4/4, canonical 4/4); lazytopper `test:matrix:all` green; root `scripts` `test:matrix:all`
  **175/175**; exhaustive uncapped repo-wide rescan **0 corruption** in any content file. Trunk after #196:
  `19b3029`.

## HPQ Phase 1 — consistency + honesty DONE (#194) — gated src/data + page lanes
Highly-Probable-Questions now tells the SAME story as Exam Trends. **Logic/copy/plumbing only — no
content authoring (that is Phase 2); all questions kept (re-badge + de-emphasize, never delete).**
Authority: `LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md` + `report-hpq-refinement-audit-2026-06-05.md`.
Diff = exactly **3 files** (`src/data/highlyProbableQuestions.ts`, `src/pages/HighlyProbableQuestions.tsx`,
`src/utils/mergeBucketsByTopic.ts`; +140/−36). `predictionTypes.ts` frozen.
- **P0 — tier badge single source of truth.** `defaultTier` was hand-authored per bucket (74% must-crack;
  11/27 cards contradicted the locked tiers). NEW `LOCKED_TIER_SOURCE` table (verbatim from the locked doc)
  is flattened to a canonical-key→tier lookup; `getHighlyProbableQuestions()` overrides each bucket's
  `defaultTier` AND each question's `tier` from it — one chokepoint every consumer reads through, so it
  can't drift again. Executed-runtime: **0 contradictions (was 11/27); must-crack badge share 74%→42%**
  (per-question 74%→44%). Corrections: Polynomials/Heredity → must-crack; Real Numbers, Quadratic,
  Probability, Statistics, Coordinate Geom, Metals, Carbon, Control → high-ROI; Pair-of-Linear, AP, Human
  Eye → good-to-do.
- **P2 — dead confidence compute retired.** `deriveHPQConfidence()` ran on every load but the page renders
  no confidence UI → dead compute on a non-tier-aligned 5-signal basis. Call + import removed.
  `prediction/hpqConfidence.ts` KEPT on disk (untouched) for a future reconciled model; optional
  `confidenceScore?/Band?/Rationale?` type fields kept (still its return type). No other `src/` referent.
- **P3 — honest reframe (owner-approved copy).** H1 "Predicted Questions" → **"High-Probability Question
  Patterns"**; sub-head names the three locked evidence sources (4 years of papers + official blueprint +
  examiner-pattern analysis); disclaimer "high-probability patterns to prioritise — not predictions of the
  exact 2027 paper." Nav labels + stack blurbs aligned. NO confidence badge introduced.
- **P5 — plumbing.** `canonicalTopicKey()` (normalize + alias table, exported from mergeBucketsByTopic)
  keys the merge → duplicate "Pair of Linear Equations" and "Metals & Non-metals" cards collapse to one
  each (26 deduped cards). Science topic-allow filter matches on canonical key → the 3 silently-dropped
  Human-Eye seed questions survive (**Human Eye 1→4**); any future drop is DEV-logged (`console.warn`,
  stripped from prod), never silent.
- **Gates:** tsc 0; prod build 0; `scope:guard --mode product` SCOPE_GUARD_OK; `git diff --check` clean;
  matrix weightage/trig/llm/bsre green; `hpq:drift` green (changed=0). Pre-existing/unrelated reds
  (bank-health 2/4, canonical-gen 2/4, mojibake 1/3 `circles.proof.ts`) verified absent-on-base / not in
  diff. In-syllabus unchanged (3 recovered Human-Eye Q all IN). Report:
  `report-hpq-phase1-consistency-2026-06-05.md`. **Phase 2 = content authoring (see NEXT_ACTION).**
  Trunk after #194: `6d5b6ed`.

## scopeGuard monorepo path-prefix bug FIXED (#192) — tracked-tooling
`scope:guard` had false-FAILed on **every** product edit (3rd PR hit; see the #190 section's "known
monorepo path-prefix artifact" note — that artifact is now resolved). Root cause: `.git` is at the repo
root and the guard runs from `lazytopper/`, so `git diff` emits **git-root-relative** paths
(`lazytopper/src/...`) while the policy lane rules are **lazytopper-relative** (`src/`) → every product
file classified `unclassified` → `SCOPE_GUARD_FAIL`. **Fix (Option A, owner-approved):** normalize the
path *frame* in `lazytopper/scripts/scopeGuard.mjs` (1 file, +52/−6; policy JSON untouched) —
`detectAnchorPrefix()` derives `lazytopper/` from `git rev-parse --show-toplevel` vs cwd; `toPolicyFrame()`
strips it for in-anchor files (so they match `src/`-style rules) while files OUTSIDE the anchor keep their
full git-root path and are STILL classified (real lane, or `unknown` → visible FAIL); a no-blind-spot
invariant fails loudly if classified-count ≠ changed-count; coupled `git show HEAD:./package.json`
(cwd-relative) fix keeps the scripts-only package.json check reading the guard's own file. **The handoff's
`--relative` suggestion was REJECTED** (it emits only files under cwd → silently drops tracked changes
outside `lazytopper/` = false-PASS blind spot). Proven FAIL→OK on a product edit; tracked out-of-tree file
still seen+flagged; unclassified file → visible FAIL. Gates: tsc 0; `test:matrix:all` **175/175**; prod
build 0; verifier PASS; `git diff --check` clean. Follow-ups logged in OPEN_QUESTIONS (D32–D35). Trunk
after #192: `318c6b6`.

## Exam Trends BAND redesign DONE (#190) — step 6 complete; Option-B convergence #2
The flat ranked list (`src/pages/ExamTrendsRanked.tsx`, shipped #184) is now THREE collapsible priority
BANDS — **Must-crack** (open by default) → **High-ROI** (collapsed) → **Good-to-do** (collapsed). The band
IS the synthesized verdict, so the weight-vs-trend **Sort toggle was removed**; Subject + Science-stream
filters stay. Layout-only Option-B evolution of the ONE responsive component (no twin; verified 360/768/
desktop reflow grammar). The existing `TopicRow` is reused verbatim inside each band (name + trend chip +
marks-weight bar + ~N marks + HPQ + Open→Topic Hub + "⋯" Practice/Worksheet/Predicted/Add-to-selection);
within-band order = marks-weight desc. NEW: an **"Expect:" recurring-sub-pattern line** rendered ONLY on the
11 must-crack topics the locked doc supplies (High-ROI rows show none — no invented shapes); a **volatility
flag** ("Prepare deep · weight varies") on Trigonometry + Electricity in the existing amber caution tone
(no new color). Tiers/sub-patterns/volatility were transcribed **VERBATIM** from the owner-signed-off
authority `LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md` and co-located in the component as data —
NOT computed from `weight`/`trendTier`, and no `src/data/` or `src/lib/desktop/` edit needed (so the diff
is exactly **1 product file**, `src/pages/ExamTrendsRanked.tsx`, +406/−84). Design grammar preserved
byte-faithfully; honest empty states; in-syllabus only (corrected guard #188). The owner-locked tiers
(2026-06-05, model + 2 teacher overrides: Triangles→must-crack/Statistics→high-ROI; Heredity→must-crack)
**satisfy the D27 "re-derive priorities FRESH" prerequisite (step 5)** — tiering is now scientifically
derived + owner-locked, so the band-threshold open question is closed (bands are signed-off data, not a
computed threshold). Gates: `tsc --noEmit` 0; prod build 0; verifier PASS; `test:matrix:all` **175/175**;
`git diff --check` clean; forbidden patterns none. `scope:guard --mode product` reported FAIL listing the
file `[unclassified]` — the **known monorepo path-prefix artifact** (git root is `Lazytopper-Production`,
so diff emits `lazytopper/src/...` while the policy `product` rule is `src/`), manually verified as NOT a
real breach (the file matches `src/` relative to `lazytopper/`); not hacked around. Trunk after #190: `cfb3106`.

## Syllabus-correctness arc CLOSED (#186 RULER + #188 SWEEP) — gating guard GREEN
The full arc is now complete: verified → guard corrected (#186) → **content swept (#188)** → gating
`syllabusGuard` exits 0, `test:matrix:all` = **175/175 (incl. #19, previously red by design)**.
**#188 deleted the 93-item worklist** the corrected guard flagged: question banks Conversion of Solids
×46 (exemplar 42→19, ncert 24→14, pack2 50→37; canonical bank 6520→6474, exactly −46, spreads intact);
board-prep surfaces EMI/Motor/Generator + Euclid/Frustum ×47 across predicted/HPQ/competency/config/
trends/topics/topicHubContent + the tutor teach-contracts. Owner decision was DELETE (not retag);
blurbs/contracts were REWRITTEN to stay syllabus-accurate. `keyIdeas` is a fixed 4-tuple, so removed
tutor teach-steps were replaced with marked in-syllabus steps (`[content-sweep 2026-06-04]`) —
structurally required, caught by the prod build (`tsc -b`), not by `tsc --noEmit`. `syllabusGuard.ts`
and `predictionTypes.ts` were NOT touched (content conforms to the guard; schema frozen). Diff = exactly
11 files, all `lazytopper/src/**`. **Deferred follow-up (D31):** the `polynomials` tutor contract still
teaches the polynomial *division algorithm* (out of 2026-27 quadratic-only scope) — the surface scan
deliberately omits bare "Division Algorithm", so it is NOT flagged; left out of scope, tracked for a
future guard-phrase + sweep PR. Trunk after #188: `e0395fc`.

## Syllabus guard CORRECTED to official 2026-27 + EXTENDED (#186) — RULER done (history)
The syllabus RULER is now correct and trustworthy (verified against the live official CBSE 2026-27
Class X syllabus — Maths 041/241, Science 086, cbseacademic.nic.in; owner-signed-off
`report-syllabus-verification-2026-06-04.md`). #186 fixed 3 correctness bugs and extended scope:
- **Step Deviation un-banned** (it is IN the official Statistics scope — the prior ban wrongly
  stripped an examined method); **3 confirmed-OUT Maths items added** (Area of Triangle in Coord
  Geometry; Conversion of Solids; cubic zeroes–coefficient); **Evolution-section sub-topics banned
  while Heredity/Mendel/Sex-Determination are PRESERVED** (board-assessed; two-way test-asserted);
  Maths citation fixed 2025-26→2026-27.
- **Reproduction registry bug fixed (HIGH):** reproductive health / family planning / safe sex vs
  HIV-AIDS is IN-syllabus → moved into `cbse_scope_bullets` (was wrongly excluded). Formative-only
  (Periodic Classification, Evolution section, Motor/EMI/Generator) vs truly-deleted (Sources of
  Energy, Mgmt of Natural Resources) relabelled with explicit `category` tags.
- **Guard EXTENDED to 24 board-prep surfaces** (HPQ, mocks, worksheets, practice/daily-mix,
  exam-trends/topic metadata, filters/config, **tutor teach-contracts**) via a curated word-boundary
  phrase scan (`SURFACE_BANNED_PHRASES`) — bare generics (Evolution, Generator, Motor, …) deliberately
  excluded to avoid false positives on prose ("gas evolution") + code identifiers (`dailyMixGenerator`).
  Strictly-board-prep doctrine: formative-only + deleted topics excluded from EVERY surface INCLUDING
  the tutor. Tests 10→45 (per-surface-category, two-way preserved-term, precision). Two stale
  doctrine-locks corrected (registry-acceptance reproductive-health check inverted; opsAcceptanceGuard
  Block 4b made precise).
- At #186 the gating guard was **intentionally RED** on a **93-item sweep worklist** (banks: Conversion
  of Solids ×46; surfaces: EMI/Motor/Generator across predicted/HPQ/config/trends/topics/topicHubContent
  + the tutor teaching Euclid's lemma & evolution evidence) — matrix 174/175 (only #19 red by design).
  **That worklist was the spec for the CONTENT SWEEP, now DONE in #188** (see the arc-closed section at
  the top): all 93 deleted/rewritten, gating guard GREEN, matrix 175/175. D26 is fully closed.

## Responsive redesign (Option B) — FIRST convergence DONE (#184)
Exam Trends is the first surface converged under the LOCKED Option-B decision: ONE responsive
component (`src/pages/ExamTrendsRanked.tsx`) renders at every width (~360px → desktop) and replaces
BOTH twins (the old desktop card grid `DesktopExamTrendsPage.tsx` + the old mobile tier list
`app/ExamTrends.tsx`, both deleted). `App.tsx` `/exam-trends` no longer does the `isDesktop ?
<Desktop/> : <Mobile/>` split — it renders the one component at all widths (still `DesktopShell`-
wrapped ≥1024px via `isDesktopShellRoute`, reflows fluidly below). Locked ranked priority-list:
trend-colored marks-weight bars, "Open" → Topic Hub, "⋯" reveals Practice/Worksheet/Predicted/
Add-to-selection, Subject + Science-stream + Sort (Marks weight | Trend), multi-select tray. Design
grammar reused exactly; real data only (28 topics, both subjects, stream filter, honest trend tiers +
HPQ counts, no fabricated %); proof tag omitted (no real `proof` field). Gates green (tsc, build,
scope:guard --mode product, matrix 137/137). This sets the PATTERN for the remaining Option-B
surfaces (TopicHub, Check & Improve, Me/Progress, Worksheet). NOTE: the Exam Trends tiering/trend/
marks data is stale (D27) and must be re-derived fresh before the planned band redesign.

## Tutor teaching quality (RESOLVED on desktop — B2/#182, live-verified)
The concept_teach tutor now teaches in the owner-LOCKED style: answers the exact question
first (no Namaste/persona/flattery/filler-analogy openers, no "interactive above" narration);
stays strictly on the opened concept (no topic drift); organizes by marks with concrete board
examples; ends with exactly ONE step-marking follow-up offer. On "yes" it SOLVES ITS OWN
example with per-step `[½/1 mark]` CBSE step-marking — math spot-checked correct across both
subjects; plain-text notation (no LaTeX leak). General across subjects (Science conceptual is
not forced into a "prove it" offer). LIVE path = `server/prompts/promptLearn.cjs`
(`buildConversationalTeachSystemPrompt`) + the concept branch of `buildUserPrompt` in
`server/routes/mentorModeHandler.cjs` — NOT `promptTeachContract.cjs` (see DISCOVERIES D24).
Residual: occasional late analogy on a long first-teach message (~1/13 turns) — eval-set territory.

## Governance / gates
- scope:guard: **LIVE + monorepo-correct (#192)** — classifies `lazytopper/`-prefixed diffs correctly
  under `--mode product`; no longer false-FAILs every product edit (the path-frame bug that hit 3 PRs is
  fixed; `--relative` blind-spot fix rejected). NOTE: `git ls-files --others` is cwd-scoped, so **untracked**
  files *outside* `lazytopper/` are invisible to the guard (pre-existing; deliberately NOT widened — would
  false-FAIL on the untracked root `.claude/`; see OPEN_QUESTIONS D33). Was DEAD since `2081003`
  (a docs-cleanup chore) accidentally untracked `lazytopper/docs/project_memory/governance/
  repo_boundary_policy.json`, which two live scripts read; #176 restored it from history.
- `test:repo-boundary`: now RUNS again (4/5 checks pass). 1 pre-existing red:
  `vitest.config.ts` is tracked but matches no policy lane (`all_tracked_files_classified`)
  — backlog, deferred (see OPEN_QUESTIONS).
- LESSON (D23): a file-removal can silently break a live gate; `ci:smoke` runs only locally,
  NOT in CI, so the broken gate failed silently. Wiring `ci:smoke` into CI is the deeper
  fix (backlog).

## AI gateway status
- LIVE on LOCAL dev (non-stub): direct Gemini key in gitignored `lazytopper/server/.env`
  (`API_KEY` + `PORT=3001`); serverConfig auto-sets `AI_PROVIDER=gemini` + `STUB_MODE=false`.
  Boot proof: `Gemini: ON (gemini-2.5-flash) | Auth: direct-key`. Tutor (`/api/mentor`)
  and grader (`/api/check-solution`) both return real Gemini output locally.
- DARK in production until the Railway deploy (P0 ISSUE-009) + Clerk pk_live_ (P0 ISSUE-010).
- CONFIRMED 2026-06-02 (D22): testing the checker on the Vercel link returns "AI API request
  failed" — this is EXPECTED, NOT a bug. Vercel has no `/api/*` route to deploy to yet
  (ISSUE-009); AI features work ONLY on localhost (gateway up + `API_SERVER_PORT=3001`, per
  D19) until the Railway deploy.
- LOCAL DEV RUN: gateway = `npm run dev:gateway` (node server/index.cjs :3001); app =
  `API_SERVER_PORT=3001 npx vite` (:25246 → /app/). Both started SEPARATELY. See D19.

## Bank state
Total questions: ~6,318 (flat) / ~6,617 (incl. builders)
Authentic: 3,636 (58%) | AI-generated: 2,682 (42%)
Spreads: 332 (up from 266 pre-Sprint 1)
Tests: 137/137 PASS
PYQs: 760 total — all 4 main years complete
CBE Item Bank: 321 Qs (Maths 148 + Science 173)
CBSE Sample Papers (P5): 121 Qs (SP Maths 2022 + Science SQP 22-23 + OnBoard 2023)
CBSE Preboard SP1+SP2: 55 Qs (generated solutions, CBSE marking style)
Mojibake: 0 files affected
TopicKey orphans: 0
Filter system: ALL chips working
CBSE blueprint distribution: working (5-section parallel fetch)
COMPETENCY floor: gated by enforceCompetencyFloor flag
Render-test infra: Vitest 3.2.4 + Testing Library + jsdom (PR #160) — `npm test` in
  lazytopper/ runs src/**/*.test.tsx; 2 test files / 10 tests green (smoke + grammar);
  matchMedia polyfilled in src/test/setup.ts. Guard suite (137) unaffected.
Grammar primitives: PR #166 added src/components/grammar/ (Card, TileRow, Pill,
  SectionHeader, tokens, index) + the first real render test. TileRow reflows
  desktop↔mobile via a real @media(max-width:1023px) CSS rule (--lt-tile-cols var).
Mobile Home: PR #168 added src/pages/app/MobileHome.tsx (first page reflow) — the
  /browse cockpit now renders MobileHome below 1024px (isDesktop switch in App.tsx),
  stacking the 4 destinations via TileRow. Desktop DesktopHome render byte-identical.
  Shared firebase-free src/lib/desktop/homeDestinations.tsx (PRIMARY_CARDS + loginUrl)
  is the single source of truth for both Home variants. Vercel production deploy GREEN.
Mobile landing: PR #170 added src/pages/MobileWelcome.tsx — /welcome renders a
  swipe carousel (native CSS scroll-snap, 4 frozen v4 SVG cards) below 1024px
  (isDesktop switch in App.tsx). Desktop Welcome.tsx UNTOUCHED (zero diff). Sticky
  "Start free" → /browse (no gate); honest sub-line "7-day Premium trial — then free
  Basic, upgrade anytime." (never "then paid"). Vercel production deploy GREEN.
Mobile Home polish: PR #172 rebuilt src/pages/app/MobileHome.tsx to the owner-locked
  polish design (mobile_home_locked_final.html): illustrated gradient SVG icons per
  destination, orient-before-act order for new students, persistent per-row hints, and
  an inspiring Mistake-Intelligence panel with a clearly-labelled SAMPLE report + honest
  "Start free — find my reasons" CTA (real-data wiring on the firebase-free boundary;
  signed-in shows an honest empty state, never invented counts). BottomNav (App.tsx)
  recoloured to the light app grammar (white surface, soft border, green active /
  muted-slate inactive) and expanded 3→5 tabs (Home / Exam Trends / Practice / Check /
  Me) on canonical routes; visibility gate intact. theme-color #58cc02→navy #0f1b33
  (index.html) kills the green browser-chrome banner. Global public navbar suppressed on
  mobile /browse + /welcome (isMobileSelfChromedRoute, gated on !isDesktop) so each
  mobile page shows ONE locked-design brand bar — Search no longer on mobile Home
  (owner-approved; not re-added). Desktop byte-identical. Tests 19→32. Vercel production
  deploy GREEN.
Production build: GREEN. PR #162 added `exclude` to tsconfig.app.json so `tsc -b`
  (Vercel's `npm run build`) no longer compiles the dev-only test files. Vercel
  production deploy for the merge commit confirmed Ready/SUCCESS.
Dev tooling: PR #164 decommissioned the dead blackbox/tracker/pmem memory
  experiment (16 files: scripts + tools/pmem + tools/project-memory-blackbox-ext +
  blackbox.yml + 20 npm scripts). Repaired start:quick/start:safe to use the REAL
  `tsc -p tsconfig.app.json --noEmit` (killed the false-green bare `npx tsc --noEmit`).
  PRESERVED: .project_memory/ops/, docs/project_memory/, all scripts/ops/*,
  serverConfig.cjs. Vercel production deploy GREEN. Repo-wide refs to experiment: 0.

## Recent PRs (post-handoff backfill)
#152 — Handoff post-#150+#151
#153 — fix: filter UX redesign (student-language chips, pending/committed)
#154 — fix: source filter + chip constraints + ISSUE-006/007
#155 — fix: practice engine marks/section/competency/blueprint
#156 — docs: handoff post-#153+#154+#155
#157 — content: Sprint 1 CBSE CBE Item Bank + P5 Sample Papers (442 Qs)
#158 — content: CBSE Preboard SP1+SP2 generated solutions (55 Qs)
#159 — docs: handoff update post-#157+#158
#160 — chore: Vitest + Testing Library render-test infrastructure (tooling-only)
#161 — docs: handoff update post-#160
#162 — fix: exclude test files from production app tsconfig (Vercel green confirmed)
#163 — docs: handoff update post-#162
#164 — chore: decommission dead blackbox/tracker/pmem tooling + false-green tsc fix (Vercel green)
#165 — docs: handoff update post-#164
#166 — feat: shared responsive grammar primitives + first render test (Vercel green)
#167 — docs: handoff update post-#166
#168 — feat: mobile Home layout for /browse (reflow cockpit below 1024px) (Vercel green)
#169 — docs: handoff update post-#168
#170 — feat: mobile landing swipe carousel for /welcome (Vercel green)
#171 — docs: handoff update post-#170
#172 — feat: mobile Home polish + 5-tab light BottomNav + single brand bar <1024px (Vercel green)
#173 — docs: handoff update post-PR #172 (mobile Home polish; Vercel green)
#174 — fix: check-solution parse reliability (force JSON output + raise token cap; local-dev verified)
#175 — docs: handoff update post-PR #174 (check-solution parse fix; AI gateway live local; D19–D21)
#176 — fix: restore repo_boundary_policy.json (re-arm scope:guard + test:repo-boundary + ci:smoke)
#177 — docs: handoff update post-PR #176 (scope:guard re-armed; product decisions; D22–D23)
#178 — feat: tighten check-solution grading prompt (fix D21 over-classification; scenario-matrix measured; Vercel N/A — server-side)
#179 — docs: handoff update post-PR #178 (grading-prompt tightening; D21 resolved)
#181 — feat: wire concept tutor into desktop TopicHub (per-row "Learn this"; reuse ConceptTeachDrawer)
#182 — feat: tighten concept teach-prompt to LOCKED style (direct/no-fluff/on-concept; self-solved CBSE step-marking; live-verified)
#183 — docs: handoff update post-PR #182 (tutor visible + teaching LOCKED; pivot to responsive redesign)
#184 — feat: Exam Trends ranked-list responsive redesign (FIRST Option-B convergence; one component retires both twins; Vercel green)

## Parked / not-yet-merged branches
- **PR B (Part 1) — grading-prompt tightening — PARKED.** Committed on branch
  `feat/check-solution-grading-prompt` (`204ac7c`), NOT merged. Merges next, after this docs
  PR, once synced onto `1e9bd04`. (T4 accepted as Option 1 — documented boundary case; 3/19
  acceptance reds noted pre-existing/deferred.)

## Source breakdown

| Source | Authentic | Files | Auth status |
|---|---|---|---|
| NCERT | 636 | 26 *.ncert.ts | YES |
| Exemplar | 910 | 26 *.exemplar.ts | YES |
| PYQ (board) | 760 | 100 *.pyq*.ts | YES |
| SQP | 69 | various | YES |
| APQ | 215 | various | YES |
| Chapterwise | 549 | various | YES |
| CBE Item Bank | 321 | 26 *.cbe.ts | YES |
| P5 Sample Papers | 121 | 26 *.sp.ts | YES |
| Preboard SP1/SP2 | 55 | 13 *.preboard.ts | YES (generated) |
| AI-Pack (pack1/2/3) | — | various *.pack*.ts | NO |
| Synthetic (AR/Proof) | — | various | NO |

## Open P0 issues (must fix before launch)

| Issue | Fix | Effort |
|---|---|---|
| ISSUE-009: API gateway 404 in production | Railway deploy + vercel.json /api/* rewrite + VITE_API_BASE | HIGH |
| ISSUE-010: Clerk pk_test_ keys in production | Vercel env var change to pk_live_ | XS |

## Open P1 issues (before wide launch)

| Issue | Description | Effort |
|---|---|---|
| Practice session debrief | End-of-session results screen | M |
| PYQ 2019-20 extraction | After download from cbse.gov.in | M |
| GitHub Actions CI | Run 6 validations on every PR | S |
| practiceFilterGuard.test.ts | Tier 3 test for competency floor | S |
| Case-Based "Easy" re-tag | Find-replace fix | XS |
| TopicKey cleanup | 51 AI-Pack Title Case keys | XS |
| check-solution eval set | 40-60 graded answers as launch gate | M |
| ~~D21: check-solution OVER-classifies as conceptual~~ RESOLVED (#178) | Grading prompt tightened + measured 6/9→8/9 on T1–T9; sign-misread now SILLY, propagated errors single-root-cause, missing→null, unbalanced→presentation. T4 = accepted boundary case (see DECISION_LOG). | DONE |
| Rate limiting on API gateway | Bundle with gateway PR | XS |
| Repo-wide solutionSteps step-mark audit | Older questions missing [N mark] prefix | M |
| AR/Section/Marks tagging audit | Some AR questions tagged as Section D 5mk | S |

## Open P2 issues (post-launch)

CFPQ OCR extraction (300 image-only Qs) | K2D Mistake Intelligence aggregation |
Pack regeneration with Claude | TutorDrawerV2 | isPYQ backfill |
Diagram SVG generation (116 tagged questions) | PYQ 2021-22 Term II adaptation |
PYQ 2018-19 (heavy banned topic overlap) | Sentry/error monitoring backend

## Next safe actions (in order)

1. **CONTENT SWEEP (HIGH, NEXT)** — clean the 93-item worklist surfaced by the corrected guard
   (banks: Conversion of Solids ×46; surfaces: EMI/Motor/Generator + tutor teaching Euclid's lemma &
   evolution evidence). Turns the gating syllabusGuard + matrix #19 GREEN. Completes D26.
2. Re-derive Exam Trends priorities FRESH (tier+trend+marks) [D27]; recheck HPQ counts → then the
   Exam Trends band redesign (Must-crack / High-ROI / Good-to-do).
3. Then the other Option-B surfaces (TopicHub + Formula/Notes, Check & Improve, Me/Progress, Worksheet).
4. API gateway Railway deploy with rate limiting bundled (P0); Clerk pk_live_ switch (P0).
5. check-solution eval set (launch gate, P1); GitHub Actions CI + practiceFilterGuard.test.ts (P1).
6. Case-Based "Easy" re-tag (XS); repo-wide solutionSteps step-mark audit (M); AR/Section tagging audit (S).
7. Practice session debrief (P1); PYQ 2019-20 extraction (after download).

## Confirmed launch domain
lazytopper.in (owner-confirmed 2026-06-01 — NOT .app; earlier ".app" was wrong).
Verify DNS in Vercel before P0 gateway work starts.

## Owner clarifications (2026-06-01) — LOCKED
- Trial = ALL features for 7 days (full tutor + checker + everything), then reverts to
  free Basic. Gate is trial-not-paywall during those 7 days. No client-side premium/trial
  activation (doctrine unchanged): trial state comes from server/admin only.
- Fully responsive across ALL screen sizes — one fluid layout adapts at every width, NOT
  a 1024px desktop/mobile twin switch. This is more work than porting a mobile twin and is
  the target for the redesign (Track A).
- PR numbering follows git (next sequential, #175+). "PR-1..8" in the Track A breakdown are
  logical labels — map them to real git numbers.
- Two-track build, LOCKED: Track A (design/UI — fluid responsive redesign) + Track B
  (content: interactives via Claude, proofs, formula sheets, pre-generated PDFs) with
  robust content QA. Source specs are owner/architect-held (LazyTopper_Learn_Flow_Spec_
  LOCKED.md + LazyTopper_TrackA_PR_Breakdown.md) — NOT yet committed to this repo.

## Operating model unchanged
Chetan = owner/merger | Claude chat = architect/planner | Claude Code = executor
Co-Authored-By: Claude Opus 4.8 (1M context)
