# LazyTopper – Difficulty Policy v1 (Easy / Medium / Hard)

**Location (suggested):** `docs/difficultyPolicy_v1.md`

## 1. Purpose

Normalise question difficulty across the canonical bank using a deterministic policy so that:
- Bank Health metrics by difficulty are meaningful.
- Practice generation can target balanced mixes (e.g. 40% Easy, 40% Medium, 20% Hard).
- Future models (difficulty auto-suggest, Mentor guidance) can rely on a stable definition.

The policy is implemented as a pure function over canonical question metadata, with no dependence on student performance data:

```ts
type DifficultyLabel = "easy" | "medium" | "hard";

function suggestDifficulty(meta: CanonicalQuestionMeta): DifficultyLabel;
```

## 2. Required canonical metadata

The function assumes that each canonical question exposes at least:

- `marks: number` – official marks as per CBSE blueprint (1, 2, 3, 4, 5, 6+).
- `bloomLevel: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create"`.
- `format: "mcq" | "veryShort" | "short" | "long" | "caseStudy" | "assertionReason" | "matchTheFollowing"`.
- `steps: 1 | 2 | 3 | 4` – approximate number of conceptual/working steps.
- `calculationLoad: "low" | "medium" | "high"` – for numeric questions.
- `hasMultiConcept: boolean` – true if the solution depends on 2+ distinct concepts.
- `chapterImportance: "core" | "supporting"` – optional; core chapters bias difficulty upwards slightly.

If some field is missing at runtime, the implementation will fall back to reasonable defaults (e.g. `steps = 1`, `calculationLoad = "low"`).

## 3. High-level intuition

1. **Marks drive the base band.**
2. **Bloom level adjusts within/between bands.**
3. **Format and structure (case-based, assertion–reason, multi-step) push difficulty upward.**
4. **We never skip directly from Easy → Hard or Hard → Easy in a single adjustment step.**

Think of it as: **Base from marks → adjust with Bloom → nudge using format/structure.**

## 4. Step 1 – Base band from marks

We first assign a base difficulty from marks only:

- `marks <= 1` → base = `easy`
- `marks in [2, 3]` → base = `medium`
- `marks >= 4` → base = `hard`

This aligns with CBSE’s typical blueprint where higher-mark questions inherently require more steps and depth.

## 5. Step 2 – Bloom adjustment

We map Bloom levels to a numeric offset:

- `remember` → −1 (tends easier)
- `understand` → 0 (neutral baseline)
- `apply` → 0 (still core mid-band)
- `analyze` → +1 (tends harder)
- `evaluate` or `create` → +1 (harder conceptual work)

We convert `easy/medium/hard` into scores (`easy = 0`, `medium = 1`, `hard = 2`), add the Bloom offset, clamp to `[0, 2]`, and convert back.

Examples:

- Base `medium` + Bloom `remember` → `easy`.
- Base `easy` + Bloom `analyze` → `medium` (not directly to `hard`).
- Base `hard` + Bloom `understand` → stays `hard` (clamped).

## 6. Step 3 – Format / structure nudges

Starting from the Bloom-adjusted difficulty, we apply at most **one** additional step of adjustment based on question format and structure.

We compute a `structureScore` (0 / +1) as:

- If `format` in `["caseStudy", "assertionReason", "matchTheFollowing"]` → `+1`.
- Else if `steps >= 3` or `hasMultiConcept` → `+1`.
- Else if `calculationLoad === "high"` and `steps >= 2` → `+1`.
- Otherwise → `0`.

We then bump difficulty by +1 *only if* the current band is `easy` or `medium`:

- `easy` + structureScore 1 → `medium`.
- `medium` + structureScore 1 → `hard`.
- `hard` stays `hard` (no further bump).

This prevents every long-format or multi-step question from being labelled `hard` by default.

## 7. Final label

After all adjustments, the label is:

- Score 0 → `easy`
- Score 1 → `medium`
- Score 2 → `hard`

This label can be stored as `canonicalDifficulty` and used wherever a stable difficulty is required.

## 8. Worked examples

1. **1-mark, remember-level MCQ (single concept)**  
   - marks = 1 → base `easy`  
   - bloomLevel = `remember` (−1) → stays `easy` (clamped at 0)  
   - format = `mcq`, steps = 1, calculationLoad = `low` → structureScore = 0  
   - **Final: `easy`**

2. **2-mark, understand-level short answer (single step)**  
   - marks = 2 → base `medium`  
   - bloomLevel = `understand` (0) → `medium`  
   - format = `short`, steps = 1 → structureScore = 0  
   - **Final: `medium`**

3. **3-mark, apply-level numeric with 3 steps and high calculation load**  
   - marks = 3 → base `medium`  
   - bloomLevel = `apply` (0) → `medium`  
   - steps = 3, calculationLoad = `high` → structureScore = 1  
   - `medium` + 1 → **`hard`**

4. **5-mark, analyze-level case study**  
   - marks = 5 → base `hard`  
   - bloomLevel = `analyze` (+1) → stays `hard` (clamped)  
   - format = `caseStudy` → structureScore = 1 but `hard` stays `hard`  
   - **Final: `hard`**

## 9. Implementation notes

- The policy is strictly **pure** – same metadata → same label, independent of who is attempting the question.
- The same function can be reused for:
  - Bank Health difficulty histograms.
  - Practice set generation (“mix by difficulty”).
  - Difficulty auto-suggest tooling (Phase 0b – Workstream B2).
- Later, you can add overrides (e.g. manual difficulty corrections) as a separate layer that runs *after* this policy, without changing the core rule.