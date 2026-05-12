# LazyTopper Implementation Roadmap

This roadmap preserves the staged implementation plan after PR #73 merge.

Latest verified live base:
```
base/approved-thru-437
39861a455dd9728dea70924e8e9dea6575bf1208
```

Current stage:
PR #73 is merged. The next implementation stage is PR-K2H: Practice graded evidence + Mistake Intelligence bridge + advanced filters + solution-quality repair.

Current implementation branch:
```
None (docs-only handoff update)
```

## Roadmap rule

Do not treat this roadmap as permission to skip audits.

Before each implementation stage:
- verify GitHub base
- inspect relevant files
- preserve allowed-file scope
- validate
- QA visible work
- audit GitHub diff before merge
- update handoff folder

## PR-K2F / PR #72 - Practice and HPQ Level-3 visual grammar alignment

Status:
Completed and merged.

PR:
```
https://github.com/chetan-anand-hub/Lazytopper-Production/pull/72
```

Purpose:
Align Practice and HPQ with the desktop Level-3 product grammar. HPQ is a prediction-first execution surface, not a generic practice-mode page.

Completed in local repair:
- Practice visual grammar pass from earlier PR #72 commit preserved.
- HPQ moved into desktop shell.
- Old HPQ desktop chrome hidden.
- Prediction-first HPQ hero.
- Stronger Maths / Science toggle.
- Lightweight Refine predictions filters.
- Competency questions integrated into predicted stacks.
- State-aware mock basket with planning-only copy.
- HPQ self-check removed.
- Check my answer primary path for non-MCQ.
- MCQ / Assertion-Reason option click feedback where structured data exists.
- Check panel and steps panel mutually exclusive.
- Objective Solution logic avoids inflated marks.
- Duplicate answer-only objective logic row hidden.
- Student-safe step-solution fallback copy.
- Topic Hub returns to Predicted Questions.
- SolutionChecker restyled to desktop grammar.

Exit gate:
- TypeScript passes.
- Production build passes.
- Build verifier passes.
- GitHub diff scope is clean.
- Vercel preview works at `/app/`.
- Browser Agent QA or documented manual QA covers visible flows.
- GPT owner audits before merge.

QA note:
- Browser Agent verified Practice visual grammar.
- HPQ and Exam Trends Browser QA was inconclusive because the guest Browser Agent hit the Premium Feature interstitial and cannot complete magic-link authenticated QA.
- Product owner manually verified HPQ while signed in / trial-unlocked on the Vercel preview.
- Remaining issues are question-bank / solution-quality / structured-option completeness, not PR #72 visual grammar.

## PR-K2G / PR #73 - Practice visual/shell/routing/CTA closeout

Status:
Merged.

Final head:
`54638b25c6cf2ca88c1f336a91712e2d1d0108ad`

Merge commit / base:
`39861a455dd9728dea70924e8e9dea6575bf1208`

Scope:
- Practice Hub improved as a Level-3 entry surface.
- Start quick practice now routes directly to full Practice.
- Inline generated quick-practice detour removed from normal flow.
- Full Practice now renders in DesktopShell at desktop width.
- Practice visual grammar moved closer to HPQ/upgraded desktop pages.
- Back/returnTo from Practice Hub to full Practice fixed.
- Mobile/narrow Practice Hub no longer falls back to old legacy PracticeHome.
- CTA labels/panels polished:
  - Check my answer
  - Show steps
  - Hide check
  - Hide steps
  - Check and Steps are mutually exclusive.
- Session notes are local-only and explicitly not saved to Me / Progress.
- No fake progress/mastery/score/Mistake Intelligence was added.

Not full graded evidence completion:
- PR-K2G is a visual and UX closeout only.
- It does not implement the Practice graded evidence path.
- It does not connect Practice to Mistake Intelligence or Me / Progress from local Practice interactions.

Exit gate:
- Manual Browser/owner visual QA accepted.
- Documentation and handoff updated.
- No product-code work is included in this docs-only stage.

## PR-K2H - Practice graded evidence + Mistake Intelligence bridge + advanced filters + solution-quality repair

Purpose:
Make Practice a true Level-3 execution surface that chooses scope, attempts, checks/grades, and saves evidence honestly.

Scope:
- Audit existing Practice engines and question-generation code.
- Audit the Check & Improve / SolutionChecker grading path.
- Design the Practice evidence model.
- MCQ auto-check only when structured answer key exists.
- Written grading through typed/uploaded answer checker.
- Mistake logs only from real checked/graded results.
- No local attempts or Show steps as saved evidence.
- Fix step-mark totals or hide uncertain step marks.
- Add richer section/type/competency filters.
- Dedupe and improve question tags.
- Preserve student agency: checking encouraged, not forced unless explicitly needed for grading.

Forbidden:
- fake progress
- fake mastery
- fake score
- fake Mistake Intelligence from local-only interactions
- broad question-bank edits unless explicitly scoped in later work

Exit gate:
- Practice evidence is honest and grounded in real checked/graded results.
- Grading and Mistake Intelligence paths are separate from local-only practice interaction.
- Validation and visual QA pass.

## PR-K2I - Mock pages Level-3 detail finalisation

Purpose:
Bring mock builder / mock attempt / mock review into Level-3 desktop grammar and clarify the real mock lifecycle.

Scope:
- mock page UI/UX
- basket-to-mock clarity
- attempt / review flow
- future graded-evidence wording

Forbidden:
- fake mock grading
- fake score
- fake Mistake Intelligence
- fake Me / Progress updates

Rule:
Every mock a student writes and gets graded on LazyTopper must eventually integrate with Mistake Intelligence and Me / Progress only through real graded evidence. Until that path is real, copy must not imply it.

Exit gate:
- Mock pages match desktop grammar.
- Mock lifecycle copy is honest.
- No fake graded evidence is introduced.

## PR-K2J or later - HPQ Question + Solution Quality

Purpose:
Audit and improve HPQ question bank completeness, structured MCQ options, solution steps, diagrams, and cache coverage.

Order:
1. Audit report first.
2. Data-only structured options normalization.
3. Solution / diagram / cache quality repair.

Rule:
Do not begin this before Practice and Mock detail stages unless the product owner explicitly changes priority.

## Post-K2F follow-ups

### MCQ structured options normalization

Purpose:
Normalize Science and Maths HPQ MCQ / Assertion-Reason data so click feedback can be available wherever real options exist.

Rules:
- data-only PR
- do not invent options in UI
- do not change grading/checking APIs
- keep `correctOption` explicit

Known Science audit:
- Science MCQ / AssertionReason total: 29
- Structured options/aROptions present: 14
- `correctOption` present: 14

### PR #72 QA repairs

If Vercel or Browser Agent finds visual or interaction issues, do a narrow follow-up repair on the PR #72 branch before merge.

### PR #69 / K2D

Status:
Still separate and not merged.

Rule:
Do not cherry-pick or absorb PR #69/K2D code into other PRs without explicit audit and product owner approval. Each PR must be validated independently before merge. Do not blindly merge PR #69.

### Mock grading to Mistake Intelligence

Future work:
Every mock that a student actually writes and gets graded on LazyTopper should eventually feed Mistake Intelligence and Me / Progress through real saved grading evidence.

Not part of PR #72:
- no fake mock score
- no fake progress
- no fake Mistake Intelligence

## Later stages

### PR-K3 - Check & Improve source-context integration

Ensure Check & Improve carries source/context from worksheets, practice, topic hub, HPQ, and other routes.

### PR-K4 - Mistake Intelligence from saved checked evidence only

Make Mistake Intelligence depend only on real saved checked answers and real mistake logs.

### PR-K5 - Me / Progress real aggregation

Aggregate real saved evidence into Me / Progress without fake time, score, mastery, or weak-area claims.

### PR-K6 - Tutor / examiner quality polish

Improve copy and guidance from student, tutor, and board-examiner lenses without claiming official CBSE marking schemes unless verified.

### PR-K7 - HPQ / Chapter Test / Mock output loop

Connect HPQ, Chapter Test, and Mock outputs into real evidence pathways.

### PR-J - Final desktop polish / parity sweep

Final visual, route, data-honesty, responsiveness, and preview QA sweep.
