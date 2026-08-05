# LazyTopper — Cost & Pricing Analysis · v1.1

**Supersedes v1.0 (2026-07-25).** Derived from live code, trunk `694c81b`.
Every path below was trigger-traced. **v1.1 corrections are marked ★ — three findings landed
after v1.0 was written and two of them changed the conclusions.**

> ⚠️ **Every cost figure here is an ESTIMATE** derived from prompt structure and
> `maxOutputTokens`, not measurement. `[FU-EFF-INSTRUMENTATION]` (PR #540) is what converts
> this document from a model into data. **Do not set final pricing from these numbers — set it
> from the telemetry once a read path exists.**

---

## 1 · WHAT IS ACTUALLY LIVE

| Student action | Endpoint(s) | Calls per action |
|---|---|---|
| Tutor question | `/api/tutor` | **1** |
| C&I solution check | `detect-question` → `check-solution` | **2** (+1 retry on parse miss) |
| Worksheet grade | `grade-worksheet` | **1 — whole sheet batched** |
| Chapter Test grade | `grade-worksheet` | **1 — whole test batched** |
| Full Mock grade | `grade-worksheet` | **1 — whole 80-mark paper batched** |
| Diagram / visual | `generate-diagram` / `generate-visual` | 1 |
| MCQ / objective scoring | `objectiveScoring.cjs` | **0 — free** |

Chapter Test and Full Mock both import `gradeWorksheet` and route to the same batched
`gradeStructuredSet`. **A 38-question board paper is one Gemini call.**

### ★ v1.1 CORRECTION — the tutor is ONE call, not 1–3
v1.0 costed a "tutor repair multiplier" from the six repair paths in
`mentorResponseBuilder.cjs`. **That file is an orphan.** `/api/mentor` was deleted by
Retirement PR-2 (`index.cjs:124`); the live tutor is `/api/tutor` (`:414`, "fresh /api/tutor,
NOT /api/mentor"). Nothing requires `mentorResponseBuilder`. The repair architecture I costed
is dead code.

### DEAD — endpoints with no live caller
| Endpoint | Evidence |
|---|---|
| `/api/step-solution` | Only ref in `src/` is the definition at `aiClient.ts:232`. `PracticeQuestionCard:171-179` only calls `scrollIntoView` — steps render from **bank data** |
| `/api/more-like-this` | Only `aiClient.ts:141` + two string literals in `learningSignals.ts` |

**Solution steps are served from the repo question bank at zero cost.** This is already the
optimisation it looked like we needed to build.

### ★ `DATABASE_URL` — NOT a cost saving. Do not provision for that reason.
v1.0 called this the single biggest lever. **Wrong.** The Postgres cache serves
`/api/step-solution`, which nothing calls. `getOrCreateModelSolution` (in `stepSolution.cjs:454`)
*is* reached by the grader, but `:456` gates it: `if (!getPool()) return null;` — no pool, no
call, no cost.

What provisioning would buy is **grading quality**: a derived marking scheme for arbitrary
uploaded questions, written once per unique question and amortised across every student who
uploads it. Owner confirms the design intent is write-once-read-forever.

★ **If provisioned, set `WARM_POOL_TOP_UP_INTERVAL_MS=0` in the same change.**
`index.cjs:556-574` schedules a Gemini-calling warm-pool job that currently aborts only for
lack of a database (`warmQuestionPool.cjs:375`). One env var, two opposite effects.

---

## 2 · COST PER CALL

Gemini 2.5 Flash: **$0.30/M input, $2.50/M output. Thinking bills as output.**

| Call | Cost |
|---|---|
| `detect-question` (thinking 0, 4k cap) | $0.001 |
| `check-solution` | **$0.013** |
| tutor turn | $0.004 |
| worksheet (10 q) | $0.022 |
| chapter test (15 q) | $0.032 |
| **full mock (38 q)** | **$0.067** |
| diagram / visual | $0.005 |

**Cross-check:** actual spend was ₹340.27 / 28 days = **$0.138/day** for dev and testing only.
The model below predicts $0.156/day for one engaged student. Same order of magnitude.

---

## 3 · A REAL CLASS 10 STUDENT (peak season)

| Activity | Per day | Cost |
|---|---|---|
| Tutor questions | 10 | $0.040 |
| **C&I checks** | **5** (=10 calls) | **$0.070** |
| Worksheet | 0.5 | $0.011 |
| Chapter test | 0.2 | $0.006 |
| Full mock | 0.15 | $0.010 |
| Visual | 1 | $0.005 |
| MCQ practice | 15 | **$0** |
| **~22 calls** | | **$0.156/day incl. retries** |

**≈ $4.68/month. C&I checks are 45% of spend; the tutor is 26%.**

---

## 4 · MARGIN AT ₹599

₹599 → −18% GST → −2.5% gateway → **₹495 net ≈ $5.62**

| Scenario | Cost/mo | Margin |
|---|---|---|
| Today | $4.68 | **17%** |
| + quick-practice batching | $3.24 | 42% |
| + `responseSchema` | ~~$2.95~~ | ~~48%~~ **← CORRECTED 2026-07-29, see below** |
| **+ grader thinking budget** | **$2.35** | **58%** ✓ **← now the TOP lever, on measured data** |

### ⚠ CORRECTION 2026-07-29 — the `$2.95 / 48%` row is NOT attributable to `responseSchema`

**`responseSchema` shipped as #559 and the saving above is not supportable.** The dominant
parse-miss cause documented in the grader itself is **truncation at `maxOutputTokens`**, and
**constrained decoding does not prevent truncation.** The change can only reduce the
**shape-variance** share of parse misses. **That share is unquantified**, and it cannot be
quantified today — see the metric note below. The struck row is left visible rather than deleted,
because it was cited elsewhere as fact and a silently corrected number is harder to detect than a
struck one. → `[FU-C2-TRUNCATION-VS-SHAPE-SPLIT]`.

**★ IN THE SAME BREATH: THE QUALITY ARGUMENT STANDS, AND IT IS THE SOUND REASON #559 SHIPPED.**
This correction is **not** a reason not to have shipped it. Constrained decoding means one output
shape every time, so Mistake Intelligence stops being built on shape noise — and that argument is
now **verified rather than argued**: the owner graded a real answer on production, then a **fully
correct** answer specifically to exercise the null path, and got full marks with **no spurious
mistake type**. A schema that forced `mistakeType` to a value would have made MI learn from noise;
making it **nullable with no enum** is what prevented that.

**⚠ AND NO BEFORE/AFTER CAN BE HONEST UNTIL A METRIC EXISTS.** `retryCount` counts `attempts > 1`
**inside a single `callGemini`** (429 / mime / fallback only). The grader's parse-miss retry is a
**second `callGemini` invocation**, so it emits two records each `attempts:1, retry:false`. **A
before/after read will show no signal whatever happens.** → `[FU-C2-PARSE-MISS-NOT-COUNTED]`, a
**prerequisite, not a nice-to-have.**

### ★ FIRST MEASURED FIGURES — 2026-07-28, owner live-verify. n = 2 vision calls, ONE session.

**These are the first MEASURED numbers in a document that is otherwise all estimates. Each carries
its own date, n, and limit deliberately** — measured figures dropped in beside estimates decay into
"settled" otherwise, which is the same failure class as every stale derived value this project
keeps finding.

Source: one owner curl of `GET /api/admin/token-telemetry` after the Wave 2 deploy.

```
vision    2 calls · prompt 4,932 · candidates 1,408 · thoughts 9,961 · 48,928 ms
practice  2 calls · prompt 2,754 · candidates   250 · thoughts     0
anonKey   client 0 / loopback 0   (across four SIGNED-IN calls)

per call, derived:
vision    prompt 2,466 · candidates 704 · thoughts 4,980 · 24.46 s   ~= $0.0150
practice  prompt 1,377 · candidates 125 · thoughts     0             ~= $0.00073
```

**★ THINKING IS ~87% OF VISION OUTPUT TOKENS AND ~24.5 SECONDS PER GRADE.** Owner ruling: that
makes **`[FU-EFF-THINKING-BUDGET]` both the largest cost lever AND a latency fix — it OUTRANKS
`responseSchema`**, which was previously ranked above it. Rates confirmed from Google's pricing
page: `gemini-2.5-flash` $0.30 input / $2.50 output, the header stating *"Output price (including
thinking tokens)"*.

Measured $0.0150/vision call against the $0.0130 estimate ⇒ **the model is ~15% pessimistic, not
wrong.** It also **validates #537's billing-bucket decision with data**: the comment justifying
moving detect-question out of `vision` estimated *"about $0.001 against ~$0.013 for a grade"*;
measured, **$0.00073 vs $0.0150**. And `thoughts: 0` on practice **independently confirms
detect-question really does run at `thinkingBudget: 0`.**

**⚠ THIS IS NOT A DISTRIBUTION — DO NOT DERIVE A BUDGET FROM IT.** Owner ruling, verbatim:

> Two calls from one session is one paper, one student, one difficulty band. Thinking tokens on a
> grader should scale with how much working there is to follow, so the variance that matters is
> exactly what a single session cannot show. A week of data, then **p90 — and p90 PER MARKS-BAND**,
> since a 5-mark long answer and a 1-mark MCQ are not the same distribution. Grading genuinely
> needs reasoning; the lever is to bound it, not remove it.

⚠ **Counters are per-process and reset on redeploy**, so a "week" only accrues if nothing ships —
capture a reading before each merge. ⚠ **The grading call sets no thinking cap at all**
(`gradingGenConfig` in `handleCheckSolution`); that is where the measured ~4,980 thought-tokens and
~24.5 s per vision grade are spent, and #558's tests now record the absence as **deliberate**, so a
future budget is a conscious change rather than an accident.

**₹599 is viable today and comfortable after three changes.** No price increase is required.
A later reduction to ₹499 becomes possible — and a reduction is a marketing moment, whereas an
increase is a bait-and-switch. **Publish ₹599 and lower later if the levers land.**

---

## 5 · OPTIMISATION LEVERS, RANKED

### 1. Quick Practice → batch grading — **saves $0.048/day (31%)**
Five separate checks cost $0.070; batched, $0.022. **69% off the largest line.**
`gradeWorksheet` is self-described surface-agnostic with two proven wrappers
(`chapterTestGradeService:27`, `fullMockGradeService:26`) — a third is the same pattern.

**Owner-locked flow:** student types/uploads per question as today → *Finish session* → instant
MCQ scorecard (scored locally, no API) → prompt to confirm nothing further to upload → on
confirm, ONE batched grade → graded answersheet + full scorecard.

★ **v1.1:** because capture is per-question, bare MCQs (option pick only) can be scored locally
and excluded from the prompt. MCQs **with** uploaded working still go for mistake diagnosis —
owner ruling: 0/1 always, never step-marked, the diagnosis is the point. *This only works in
the new flow;* the current batch path sends one image of the whole sheet, so the server cannot
know which MCQs carry working without the call it is trying to avoid.

**Product win: the tutor receives one graded answersheet instead of five disconnected checks.**
Requires a FORBIDDEN-list amendment (`SolutionChecker.tsx`, `ResultsScorecard.tsx`) — owner
authorised; replace the ban with targeted tests per the #519 precedent.

### ★ 2. `responseSchema` (new in v1.1) — cost AND grading consistency
~~Constrained decoding is used **nowhere**; only `responseMimeType: 'application/json'`, which
*asks* for JSON rather than constraining it. That is why the retry at `checkSolution.cjs:301`
exists. A schema makes malformed output impossible.~~

**This is the fix for `[FU-GRADING-RELIABILITY]` / `[FU-GRADE-CONSISTENCY]`** — one output shape
~~every time, so MI stops being built on noise. Highest quality-per-rupee item on the board.
Touches `checkSolution.cjs`, which is FORBIDDEN-listed.~~

> **CORRECTION 2026-08-05 (Wave 5D) - THIS ENTIRE ITEM WAS ALREADY SHIPPED AND IS STRUCK ABOVE.**
> `responseSchema` shipped as **#559 / PR-C2**, before this analysis was written. Independently
> verified on trunk `51f7712`: `GRADE_RESPONSE_SCHEMA` / `DETECT_RESPONSE_SCHEMA` /
> `WORKSHEET_RESPONSE_SCHEMA` defined at `:167` / `:212` / `:266`, **wired** into the request
> config at `:595` / `:888` / `:1385`, and reaching the wire at
> `services/geminiClient.cjs:392`. `callGemini` has exactly three call sites in that file and
> **every one carries a schema**. 18 contract tests cover it; one asserts it is *sent*, another that
> the retry carries it, and a third that it reaches the outgoing request body.
>
> **So: "constrained decoding is used nowhere" was FALSE when written, and the**
> **"MI stops being built on noise" framing is RETIRED - grading output has been constrained since**
> **#559.** The wrong claim reached three documents and cost a spec error plus a scout to disprove.
> The mechanism: `responseMimeType` was read as present *without* a schema and "not shipped" was
> inferred - **one line read, twelve unread.**
>
> `[FU-EFF-RESPONSE-SCHEMA]` is CLOSED. Struck, not deleted, per the precedent at lines 105-110 of
> this file, so anyone who cited it can see the change.
>
> **What remains real from this item:** `[FU-GRADER-SCHEMA-STRIP-RETRY-SILENT]` - the retry ladder
> gates `responseSchema` and `responseMimeType` **together** on `includeStructuredOutput`, so a
> rejected schema **silently strips both** and grading degrades to pre-#559 output **with no alarm**.
> A counter or warning on the degraded path would make it observable - the same shape as GATE-1's
> fail-open witness, which exists precisely because **a correct fallback that cannot be seen firing
> is indistinguishable from no protection.**

### 3. Grader thinking budget — **saves ~$0.028/day**
Thinking bills as output and output is ~90% of cost, yet only one call sets a budget
(`checkSolution.cjs:600`, `thinkingBudget: 0` on detect-question). Plumbing exists at
`geminiClient.cjs:76-77`. **MEASURE FIRST** — set budgets at p90 of observed
`thoughtsTokenCount` per class. Grader first; tutor deliberately excluded.

### 4. Tutor — **do not cut**
26% of spend and the product's differentiator. `GEMINI_TUTOR_MODEL` is already a separate env
var, so the model can be tuned or A/B'd from Railway without code. Better prompts mean longer
outputs, so set a thinking budget and `maxOutputTokens` deliberately **in the same lane**, or a
quality win silently doubles the tutor bill.

### NOT levers
- **★ Lowering `maxOutputTokens` would RAISE the bill.** It is a ceiling, not a charge
  (`checkSolution.cjs:591` says so), and lowering it triggers the once-only retry at `:301`.
  The 8000→16000 raise exists specifically to avoid that. **Do not do this.**
- **Model routing to Flash-Lite** — the cheap calls it would have targeted are dead.
- **Prompt caching** — modest. Output dominates on a thinking model.
- **`detect-question`** — it determines the marks a question carries, which is the prerequisite
  for step-marking, and the student can correct it. At ~$0.001 it is 7% of a check and already
  runs `thinkingBudget: 0` with multi-question batching. **Do not merge it into the grade call:**
  that saves ~$0.001 and removes the marks-confirmation step at
  `DesktopCheckImprovePage:1133-1136`. Reclassified to the `practice` rate-limit bucket in #537
  — a billing-bucket change only, no behaviour change.

---

## 6 · INSTRUMENT BEFORE TUNING

`usageMetadata` returns `promptTokenCount`, `candidatesTokenCount`, `thoughtsTokenCount`,
`totalTokenCount`. PR #540 logs all four per call class.

★ **`[FU-TELEMETRY-NO-READ-PATH]`:** #540 records but nothing serves `snapshot()` or
`getTokenTelemetry()`. Until a read endpoint exists (needs `index.cjs`), the instrumentation
measures and does not report — and **every pricing and thinking-budget decision depends on
reading it.** This is the next lane after the launch set.

---

## 7 · CAPACITY

At a ₹20,000/month spend cap: $7.58/day ÷ $0.0071 blended = **~1,070 calls/day ≈ 48 engaged
students** today; **~78** after optimisation. `LT_CAP_GLOBAL_HARD` derives from
`LT_MONTHLY_BUDGET_INR` (#537) — change the console cap and the env var together.

**Rule: spend cap ≈ ₹350 × active premium students + ₹500 baseline.**

---

## 8 · RECOMMENDED ORDER

1. **Telemetry read path** — `[FU-TELEMETRY-NO-READ-PATH]`. Without it #540 is inert.
2. **Quick Practice batch grading** — biggest saving + the tutor product win.
3. **`responseSchema`** — cost and the grading-consistency FU together.
4. **Grader thinking budgets** — after a week of real data.
5. ~~`DATABASE_URL`~~ — **not a cost lever.** Provision only as a grading-quality decision, and
   only together with `WARM_POOL_TOP_UP_INTERVAL_MS=0`.

**Then set the final price from measured numbers, not from this document.**
