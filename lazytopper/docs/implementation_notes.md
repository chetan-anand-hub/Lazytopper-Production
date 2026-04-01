## How to wire this in code

The following guidelines describe how to consume the `cbseCompetencyPolicy.ts` configuration without altering the core prediction engine.  Use these notes to adjust the scoring and selection logic in your existing functions.

1. **HPQ ranking**
   - When computing the likelihood score for each question, multiply the base frequency‐based score by the `QUESTION_TYPE_MULTIPLIER` value corresponding to its type (`mcq`, `assertionReasoning`, `caseBased`, etc.).  This boosts case‑based and assertion‑reasoning questions while slightly down‑weighting procedural items【49808403724831†L238-L246】.
   - Incorporate Bloom’s taxonomy by checking the question’s `bloomSkill` and nudging its score towards the target distribution in `BLOOM_TARGET_DISTRIBUTION`.  For example, if the bank currently has too few “Applying” questions relative to the 40 % target, increase scores of “Applying” items until the distribution converges.
   - Combine this with recency or policy signals already computed in the engine (e.g. via temporal decay and NEP tags) to produce a final probability score.

2. **Predicted question selection for practice**
   - When assembling a practice set, honour the difficulty bias from `VIBE_MODE_DIFFICULTY_BIAS` based on the student’s chosen energy mode (Zombie or Beast).  Use it as a soft probability distribution rather than a hard filter: sample questions such that the proportion of easy, medium and hard items roughly matches the configured percentages【942856973627798†L190-L223】.
   - Within each difficulty bucket, sort candidates by the adjusted HPQ likelihood score.  Fill the set sequentially, ensuring that the Bloom level mix approaches the targets defined in `BLOOM_TARGET_DISTRIBUTION`.
   - For daily practice sessions, adopt the `DAILY_MIX_RECIPE`: deliver one concept item (e.g. video or formula card), three must‑crack questions (pulled from the top of the ranked list) and one revision card.  Chain these items in the prescribed order to reduce decision fatigue and improve engagement【781858749423696†L14-L23】.

3. **Paper generation (blueprint constraints)**
   - Modify the paper engine’s weight calculation to include the question type multipliers when scoring candidate sets.  This ensures that case‑based and assertion‑reasoning questions occupy their rightful share of Section E and Section A slots.
   - Use the Bloom distribution to validate that the compiled paper respects CBSE’s competency emphasis: roughly 40 % applying, 25 % analysing, 10 % evaluating, etc.  If a generated paper deviates, iteratively swap questions from the bank until the distribution matches the targets.
   - Maintain CBSE section marks (A–E) as per the blueprint (20 marks MCQ, 10 marks very short, 18 marks short, 20 marks long, 12 marks case‑based) and adjust selection to satisfy both marks and competency goals【49808403724831†L248-L259】.

4. **Dynamic difficulty adjustment during a session**
   - Implement a simple state machine to adapt difficulty in real time.  Initialise a session at the user’s selected mode (Zombie or Beast).  Keep a running tally of consecutive correct and incorrect responses.
   - If a student answers three questions correctly in a row with ease, transition to a higher difficulty state (e.g. from easy → medium or medium → hard).  Conversely, if they answer two in a row incorrectly, step down the difficulty.  Use gentle transitions and communicate them with mentor‑style messages to preserve trust【942856973627798†L226-L327】.
   - Continue sampling from the bank using the updated difficulty bias.  Record the trajectory of difficulty shifts and performance metrics; pass this data to the AI mentor to personalise future study plans.

These integration notes ensure that the new configuration steers the predictive engine towards NEP‑aligned competency patterns while preserving the exam‑oriented structure and adaptive learning principles.