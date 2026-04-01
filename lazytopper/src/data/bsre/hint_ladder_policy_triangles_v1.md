# Hint Ladder Policy for Triangles (v1)

This document defines the hint ladder (H0–H3) for the **Triangles** BSRE pilot.  Hints are designed to scaffold student understanding without revealing the full solution too early.  Each level corresponds to increasing specificity:

## H0 – Gentle nudge

* **Purpose:** Encourage the student to think about the problem without giving away any new information.
* **Examples:**
  * “Have you identified the triangles and the given information?”
  * “Which congruence or similarity rule might apply here?”
* **Misconception mapping:** Use H0 hints when no misconception tags have been triggered yet or when the student appears to be off‑track but has not made a specific mistake.

## H1 – Identify missing idea

* **Purpose:** Point out a missing concept or keyword that is required in the next step.
* **Examples:**
  * For `mis_rule_congruence`: “Remember that AAA only establishes similarity; which criterion proves congruence?”
  * For `mis_no_parallel`: “Is there a parallel line or midpoint condition that you can use to apply the proportionality theorem?”
  * For `mis_no_bisector`: “Look at the angle being bisected – what ratio does the bisector theorem relate?”
* **Guardrails:** Do **not** supply the actual rule or ratio; simply remind the student of the relevant concept.

## H2 – Show structure or outline

* **Purpose:** Provide an outline of the steps required to solve the problem, guiding the student to organise their proof correctly.
* **Examples:**
  * For congruence proofs: “First state the two triangles and given data.  Next, specify the congruence rule (SSS/SAS/ASA/RHS) and match the corresponding sides or angles.  Finally, conclude the triangles are congruent.”
  * For midpoint/BPT: “Identify the triangle and midpoint or parallel segment, state the basic proportionality theorem, then set up the ratio of corresponding sides.”
* **Guardrails:** Do **not** fill in the specific values or equalities; keep the outline high‑level.

## H3 – Near‑solution

* **Purpose:** Provide almost all the reasoning needed, leaving only minor details for the student to fill in.  Use this level sparingly, ideally after multiple attempts.
* **Examples:**
  * For similarity proofs (SAS): “You have two pairs of equal sides (PQ=XY, QR=YZ) and the included angle Q=Y.  Show that the ratios of the equal sides are proportional, then conclude the triangles are similar by SAS.”
  * For angle bisector theorem: “Since AD bisects angle A, you can apply the angle bisector theorem which states BD/DC = AB/AC.  Identify AB and AC and substitute the known lengths.”
* **Guardrails:** Even at H3, refrain from writing the entire solution verbatim.  Leave the final substitution or conclusion for the student.

## Do not leak full solutions

Across all levels, hints must never reveal the full solution prematurely.  The objective is to guide learning, not provide answers.  If a student’s answer exhibits multiple misconception tags, start from the lowest relevant hint and progress gradually.  Only present higher‑level hints (H2 or H3) if the student has already engaged with previous hints and still struggles.

## Mapping hints to misconception tags

| Misconception tag | Suggested H1 hint | Suggested H2 hint |
|-------------------|-------------------|------------------|
| `mis_rule_congruence` | “AAA is for similarity; recall which criteria prove congruence.” | Outline the four congruence criteria and remind to match corresponding parts. |
| `mis_correspondence` | “Check that you have matched the correct corresponding sides or angles.” | Describe how to identify corresponding parts in two triangles. |
| `mis_conclusion_congruence` | “Don’t forget to state that the triangles are congruent once the conditions are met.” | Give an outline emphasising the conclusion step. |
| `mis_rule_similarity` | “AA, SAS and SSS are the valid criteria for similarity; which one applies here?” | Outline how to compare ratios or angles for similarity. |
| `mis_ratio_similarity` | “Make sure you show the ratios of corresponding sides are proportional.” | Provide the structure for setting up and equating ratios. |
| `mis_conclusion_similarity` | “State explicitly that the triangles are similar after verifying the conditions.” | Emphasise the conclusion step in the outline. |
| `mis_no_parallel` | “Look for a parallel line or midpoint; the basic proportionality theorem applies in that case.” | Outline the steps of the basic proportionality theorem. |
| `mis_no_ratio_bpt` | “Set up the ratio of the segments implied by the theorem.” | Explain which segments should be related. |
| `mis_no_bisector` | “Identify the bisected angle in the triangle before applying the bisector theorem.” | Outline how to apply the angle bisector theorem. |
| `mis_wrong_ratio_bisector` | “Check the ratio – it should involve the adjacent sides and the segments on the opposite side.” | Describe the correct form of the ratio in the bisector theorem. |