# SEO — decisions, with their reasons

**Not a task list.** `handoff/OPEN_QUESTIONS_AND_FOLLOWUPS.md` holds tasks. This file
holds **rulings and the reasoning behind them**, because in six months the decision is
recoverable from the diff and the reason is not.

★ **Any session working on SEO reads this before its first action.** A session that
does not will re-litigate the trailing slash and rediscover the doorway line.

---

## 1 · ROUTING

**R1 · Static pages live in `lazytopper/public/questions/**` and are exposed by ONE
`vercel.json` rewrite.** Not `dist/public`. Vercel's Output Directory is a **dashboard
setting absent from git** — no gate can check it, so nothing load-bearing may depend on
it. The chosen route reuses the mechanism already serving `robots.txt` and 105 pages at
`/app/visuals/…`. *(ENGINE-0, #714)*

**R2 · Rewrite sources use `:path(.*)`, never `:path*`.** Vercel compiles `source` with
`path-to-regexp`, where `:path*` matches **segments and does not match a path ending in
`/`**. Every trailing-slash URL 404s. *(ENGINE-0; SLASH-1, #716)*

★ **The discriminator that proved it, kept because it is reusable:** `/app/:path*` has a
literal, always-present destination that cannot fail to resolve — and it still 404'd.
**If one stage of a two-stage pipeline cannot fail and the request still fails, the fault
is the other stage.**

**R3 · `trailingSlash: true` is FORBIDDEN.** Tried in ENGINE-0. It is **harmful, not
merely ineffective**: the advertised URL still 404s *and* every SPA deep link 308s into
the same dead end. Reverted. Do not re-litigate.

**R4 · Advertised URLs carry a trailing slash** — `…/light-reflection-and-refraction/`
resolving to `index.html`. Standard static-site convention; works inside the existing
model without weakening it. Sitemap `<loc>`, canonical and `og:url` all agree.

**R5 · `Disallow: /app/` is LAST, after public twins exist.** `/app/`, `/app/pricing`
and `/app/exam-trends` are the only three indexable URLs the product has. **Disallowing
`/app/` before `PUBLIC-1` deindexes the entire site.** Any lane proposing to move it
earlier is wrong.

---

## 2 · CONTENT

**C1 · The doorway line.** A page earns its own URL when it is a **genuinely different
artefact**, not the same content with a different heading. A worksheet (questions +
separate answer key), a formula sheet (reference card), notes (prose) and a mock test
(timed paper) are different objects. Four URLs rendering the same questions under
different titles is a doorway cluster, and **education is the most spam-policed vertical
there is** — a new domain doing it at scale is suppressed sitewide.

**C2 · The corpus gate.** A matrix cell emits a page **only if the corpus can fill it**.
No formula sheet without a populated `formula_strip`; no worksheet under 8 questions; no
topic page under 8 publishable questions. This gate is what separates a content layer
from a doorway farm — and it means **bank improvements become pages automatically**,
which is how the bank track and the SEO track coordinate without talking.

**C3 · Publishability is defined in code, not prose** —
`lazytopper/scripts/seo/publishability.ts`. Provenance, step marking (both conventions),
marks summing, no fabricated `pyqYear`, and the figure rule. **Both tracks import it.**

**C4 · The figure rule, and the near-miss behind it.** A naive filter banning the word
"diagram" **deleted all three genuine 2023 board questions** from the first generated
page — their text says *"draw a ray diagram"*, an instruction to the student, not a
reference to a supplied figure. Every gate stayed green. **The rule is about what the
page must supply, not about a word**, and both directions need a control.

**C5 · Batched publication.** ENGINE-1 emits in **two or three batches over a fortnight**,
not one drop. A new domain publishing 130 pages in a day is a content-farm pattern.

**C6 · Claims.** Only these are verified and publishable: **8,500+ practice questions ·
10 years of real CBSE papers · 26 topics · Maths and Science (Physics, Chemistry,
Biology) only.** No star ratings, no review counts, no success percentages, no user
numbers. Trial wording is fixed: *"7-day Premium trial — then free Basic, upgrade
anytime"* — never "then paid". Describe the AI as a **teaching assistant**, never a
"tutor": tutors are a distribution channel, not a competitor.

---

## 3 · SUPERSEDED

**S1 · `og:image` moved apex → www, superseding #612.** *(OG-1, #712)* #612's reasoning
was sound when these URLs were not distributed at volume — a redirecting **image** costs
a hop and the bytes still arrive, unlike a redirecting **directive**. They are now
distributed at volume and not every scraper follows a redirect on an image fetch.
`domain.guard.test.ts` pins www. **A future apex form is a regression, not a choice.**

---

## 4 · MEASUREMENT

**M1 · Gate A — technical, 3–7 days after submission.** Does Google index a
`/questions/` URL at all? **If Gate A passes, ENGINE-1 is safe to build.** No traffic
data needed to know the plumbing works.

**M2 · Gate B — commercial, 2–4 weeks.** Does an organic visitor start a trial? Decides
investment in volume and quality, not whether to scale at all.

**M3 · The window is free.** It costs no agent time and no owner time and runs
concurrently with everything else. **That is the argument for shipping one page now
rather than a matrix later: the waiting is the expensive part.**

---

## 5 · DOCTRINE — earned in this arc, each by being wrong

**D1 · A model of a mechanism must fail toward RED, never toward GREEN.** The ENGINE-0
stand-in modelled `:name*` as `(.*)` — more permissive than Vercel — so it could only
ever **hide** a 404, never invent one. A model erring toward failing is self-announcing.
A model erring toward passing is silent and **retroactively devalues its entire history
of greens.** Build a stand-in stricter than the real thing.

**D2 · Agreement among artefacts is not verification of the mechanism that consumes
them.** Rewrite, sitemap `<loc>`, canonical and emitted path were mutually consistent —
and the page 404'd. Consistency was never the question.

**D3 · A control needs its FAILING case demonstrated before it is trusted, not just its
passing one.** Two controls in this arc could not detect what they existed to detect.

**D4 · Prove a mutation applied before trusting its result.** A heredoc collapsed `\\`
into a backspace; the test printed a clean green that proved nothing. The `$&` hazard
then fired again in Node, not the shell — it is a **string-expansion hazard wherever
`$&` survives into a replacement.**

**D5 · A follow-up logged on a hypothesis is a tombstone with a number.** Log measured
defects; probe hypotheses first.

**D6 · A carry-forward instruction is a claim about the repo and rots like any other.**
Verify before restating; do not delete on one session's say-so.

**D7 · Anchor by identity, not by incidental form.** Pin a rewrite by
`destination === "/app/index.html"`, not by its source string. A line number in
`crawlerReachability.guard.test.ts` rotted **three times in one arc**.
