# LazyTopper Current Handoff State
Last updated: 2026-05-23
Live base SHA: b6be29081f594febe75b405f6c88d1da55b801f2

## Current state

Production branch: base/approved-thru-437
Last merged PR: #110 — docs(handoff): post-PR #108 #109 Maths extraction complete
Live Vercel: https://lazytopper-production-desktop.vercel.app/app/

## Complete PR history (all merged)

| PR | Title | Merge SHA | Key change |
|---|---|---|---|
| #75 | K2H-1: Practice checked-evidence hardening | 38f5a56a | MCQ clicks = real attempts |
| #78 | K2H-3: Auth/session shell hardening | 0addba3f | Removed guest mode |
| #80 | K2H-4: Frozen landing + explore-first | 018c95b1 | Landing frozen, /browse added |
| #82 | K2H-5: Login visual parity | 11aac1bc | Login polished |
| #85 | K2H-6: Home cockpit order | a0e540a8 | Cards order fixed |
| #87 | K2H-7: Pricing visual redesign | e239f883 | 2999/year, honest |
| #89 | K2H-8a: Practice focus continuity | 33d0eaff | subtopicHint forwarded |
| #92 | K2H-8b+8c: Advanced practice filters | b97ba30e | Section/difficulty/type chips |
| #94 | K2H-8d+8e: Filter wiring through engine | 699a39d4 | questionType+pyqOnly wired |
| #96 | Content Agent 1 fixes | 90c97f56 | 18 questions fixed |
| #97 | Docs: post-PR #96 | f687ba2 | Handoff updated |
| #98 | Science ch1-7 NCERT+Exemplar | b88ed11f | 608 questions extracted |
| #99 | Docs: post-PR #98 | 6a70889f | Handoff updated |
| #100 | Wire Science ch1-7 + topicKey + syllabus guard | 443a913 | 608 questions wired into engine |
| #101 | Fix: Clerk OAuth BASE_PATH 404 | f88f742 | Login Google OAuth working on Vercel |
| #102 | Squash: wire Science ch1-7 + handoff | 56ce39b | Base after wiring |
| #103 | Docs: post-PR #101 #102 | 63a01575 | Handoff updated |
| #104 | (not used — numbering gap) | — | — |
| #105 | Docs: post-Science ch8-12 (early) | 6e937d55 | Handoff updated |
| #106 | Science ch8-12 NCERT+Exemplar | dfbf725a | 296 questions wired into engine |
| #107 | Docs: post-PR #106 | 7a120ad9 | Handoff updated |
| #108 | Fix: deletionGuard.test.ts | 25230e8f | 29/29 tests passing |
| #109 | Maths ch1-14 NCERT+Exemplar | f0d90b1b | 643 questions wired into engine |
| #110 | Docs: post-PR #108 #109 | b6be2908 | CURRENT BASE |

## Question bank state

| Content | Questions | Status |
|---|---|---|
| Science NCERT+Exemplar ch1-12 | 904 | Live in engine |
| Maths NCERT+Exemplar ch1-14 | 643 | Live in engine |
| Existing pack1/pack2/pack3 | ~2,470 | Live, AI-generated (retirement pending) |
| Total in engine | ~4,017 | — |

canonicalQuestionBank.ts spread count: 104

## Known issues

- Clerk dev mode only (pk_test_) — no production instance configured
- AI features 404 in production (no /api/* rewrite in vercel.json)
- PYQ filter returns 0 (K2H-8f engine fix pending)
- pack1/pack2/pack3 questions are AI-generated — retirement planned
- deletionGuard.test.ts fixed (PR #108) — 29/29 tests passing
- strategyHint authored but never rendered (quick win pending)
- index.html meta stale (149/month, wrong theme-color)

## Frozen files — do not touch

Welcome.tsx, App.tsx, DesktopShell.tsx, main.tsx, vite.config.ts

## Data honesty rules

- No fake progress, mastery, score, weak areas, or Mistake Intelligence
- solutionSteps = CBSE marking guide only
- isPYQ: true only on verbatim CBSE official text
- MCQ click = real attempt, feeds Mistake Intelligence
- Check My Answer = real checking path, richer MI evidence
