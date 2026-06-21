# Worksheet track — HANDOFF (E2a → E2a.3 complete; PR-E2b next)

**Last updated:** 2026-06-21 · **Trunk:** `base/approved-thru-437` @ **`cfff277`** (post-#284).
For the next worksheet agent. The worksheet **foundation is DONE and merged** (E2a → E2a.3); the next chunk is **PR-E2b — the AI grade loop**.

## 1. State of play (PRs)
| PR | what | status |
|---|---|---|
| #280 | **PR-E2a** — ONE responsive `WorksheetGenerator` (build→generated in-place) + distribution (even/weightage/MI) + deleted-topics filter + honest counts + 2 PDFs + persist-by-worksheetId | **MERGED** (`d065922`) |
| #283 | **PR-E2a.1+.2** — real math via MathText/KaTeX; then real PDF **file** download (html2canvas→jsPDF, Option B); count identity | **MERGED** (`9a080a0`) |
| #281 | PR-E2a.1 standalone | **CLOSED** (superseded by #283); branch deleted |
| #284 | **PR-E2a.3** — view-aware Back; MI-box visible + in right preview as a NAVY anchor + honest locked states (login-return); missing-symbol = source-data FLAG | **MERGED** (`cfff277`) |

Worktrees after this handoff: main checkout + `notes-gen` (separate track). The worksheet worktrees were removed post-merge.

## 2. Architecture (all `lazytopper/src/components/worksheet/` unless noted)
- **`WorksheetGenerator.tsx`** — the ONE responsive page at `/practice/worksheets`, every width (App wraps in DesktopShell on desktop; global BottomNav on mobile). Single component, `view: "build" | "generated"` (in-place, no route nav). Class-driven scoped `<style>` (`WS_CSS`), pure `@media(max-width:1023px)` reflow, NO inline style objects. Legacy twins `pages/desktop/DesktopWorksheetsPage.tsx` + `pages/app/Worksheets.tsx` UN-ROUTED (kept for PR-G deletion).
  - **Back (view-aware):** generated → `setView("build")` (builder state intact); build → validated `returnTo` query (`safeInternalReturnTo`, default `/practice-hub`).
  - **MI control:** lives in the RIGHT preview (`.lt-ws__preview`) AFTER the snapshot (chips → Distribution → Sections → **MI** → Generate), styled as the page's single NAVY anchor (`hsl(220,25%,12%)`, white title, soft-light body, green accent). Three honest states via `isSignedIn`/`canEnrich`: signed-out → `/login?reason=mistake-aware&redirect=<here>` CTA; signed-in + in-scope hotspot → toggle (weights toward `hotspot.label`); signed-in + no hotspot → how-to-unlock note. `isSignedIn = !!user.uid && !user.isLocalSession`.
- **`worksheetModel.ts`** — pure logic. `getTopics(subject,stream)` filters `DELETED_TOPIC_KEYS` (heredity-and-evolution, magnetic-effects). `weightFor()` (board weightage from class10MathTopicWeights / class10ScienceTopicTrends). `planWorksheet()` builds unique pools (generatePracticeQuestions allowRepeats:false) → `allocateCounts()` (largest-remainder, capped at availability → honest counts), MI boost ×1.5. `generateFromPlan()` selects + shuffles. Deterministic allocation (unit-tested).
- **`WorksheetPrintDoc.tsx`** — capture-only doc to the locked PDF design; every question/step via `<MathText>` (KaTeX). White bg, absolute tiled watermark, NO #print-area/print.css coupling, NO footer (jsPDF draws it).
- **`worksheetPdfExport.ts`** — Option B. Renders `WorksheetPrintDoc` into a DETACHED offscreen host, `html2canvas` (scale 2, fonts.ready wait) → slices across A4 → `jsPDF` + per-page footer/page-numbers → `doc.save()`. Clean isolation by construction. Files `lazytopper-<slug>-questions.pdf` / `-answer-key.pdf`.
- **`services/worksheetSessionStore.ts`** — persists generated question set + marking schemes by `worksheetId` to localStorage (`mintWorksheetId`, `saveWorksheetSession`, **`getWorksheetSession(id)`**, `listWorksheetSessions`). **THIS is the data contract PR-E2b grades against.**
- **MathText** (`components/question/MathText.tsx`) — shared KaTeX renderer (LaTeX + unicode + bare `sqrt5`/`a^2`). Reuse; don't rewrite.

## 3. KNOWN-OPEN items
- **PYQ `√`/expression data gaps (HIGH, separate track):** hyphenated `real-numbers.pyq*.ts` packs ship 11 irrationality questions with `√`/expressions stripped from `questionText` (clean camelCase `realNumbers.*.ts` are fine); ~31 such lines across maths `*pyq*.ts` → all-subjects audit needed. Full id/year/paper-ref list + recoverable-vs-unrecoverable split: **`diff/worksheet-bank-symbol-data-gaps-2026-06-21.md`**. Goes to the **parallel symbol-fix agent** (src/data, all subjects). RULE: recover the real symbol from the clean twin files / authoritative source paper (the `ncertRef` paper code pinpoints it), NEVER invent, flag unrecoverables for the owner. NOT a worksheet-agent task. The PDF render is correct — only the source data is wrong (no worksheet-side filter added; would risk dropping valid questions).
- **`[FU-PITFALL-DATA]`** — answer-key "⚠ where students lose marks" annotations omitted (no real per-question pitfall data). Add when real data exists.
- **`[FU-WORKSHEET-PDF-SERVERSIDE]`** — PDF math is a raster image (not selectable text). Acceptable for print; a server-side text PDF is a future upgrade if client quality proves insufficient.

## 4. PR-E2b — the grade loop (NEXT)
- **Contract:** read the persisted worksheet by `worksheetId` via `getWorksheetSession(id)` — each question has its number, text, marks, `solutionSteps`, `finalAnswer`. Grade the ONE uploaded PDF as a STRUCTURED SET keyed to Q1…QN.
- **Server:** EXTEND `lazytopper/server/routes/checkSolution.cjs` (the per-question Gemini grader) to loop the known questions and locate/grade each numbered answer against its scheme; honest "couldn't read Qn" — never fabricate a mark. Do NOT build a separate blob-grader.
- **MI wiring:** route graded mistakes through the SINGLE front door `services/mistakeIntelligence.ts` `recordMistake` (+ `recordAttempt`) so worksheets feed weak-areas + Me/Progress. The worksheet is a major MI source — this ALSO unlocks the MI-enrich toggle (currently shows the "grade a worksheet first" locked state for students with no mistakes yet). Never bypass the front door.
- **Mandatory live-verify:** AI round-trip — generate a 5-Q quick drill → solve a few → scan to one PDF → upload → grading maps to the right questions/schemes + honest unreadable path + feeds MI.

## 5. Gotchas (read before you start)
- **Agent is BLIND to the running UI.** Windows dev box CANNOT run vite/vitest/a browser (linux-pinned rollup/esbuild binaries stripped by the workspace). tsc + static gates pass ≠ UI works. Verify on the **Vercel PR preview** with REAL bank questions, desktop + phone. (This bit the worksheet track repeatedly.)
- **Global CSS trap:** `styles.css:265` `input,select { width:100%; padding; appearance:none }` balloons any bare `<input>` (caused the "MI box hanging in air"). Hard-scope form controls in component CSS (fixed width/height, `appearance:auto`).
- **Watch out for backticks inside template-literal CSS** (`WS_CSS`) — a backtick in a CSS comment terminates the literal (tsc parse error). Don't put backticks in `WS_CSS` comments.
- **Verify with real data, not clean mockups** — the mockup examples had clean symbols; real bank questions exposed the √-stripping.
- **Recover-don't-fabricate** for bank data; `src/data/**` is GATED — flag, don't edit without authorization.
- **Worktree isolation mandatory** (CLAUDE.md §2a); confirm `git branch --show-current` before every commit. `git worktree remove` errors "Permission denied" on Windows (node_modules lock) but de-registers anyway; `rm -rf` the dir after, then `git worktree prune`.
- **CI quality-gate does NOT run vitest** — only tsc-equivalent build + matrices + mojibake. Vitest runs in Codespaces only; new `*.test.tsx` are documentation/Codespaces-only, not a CI gate.
- **Gates:** `tsc -p tsconfig.app.json --noEmit`; root `scripts` `test:matrix:all` (181 currently — verify, don't hardcode); lazytopper `test:matrix:all`; `check:mojibake`; `scope:guard --mode product` (or `mixed` if docs touched); `git diff --check`. Use `corepack pnpm@10.32.1`; install `corepack pnpm@10.32.1 install --frozen-lockfile`.
