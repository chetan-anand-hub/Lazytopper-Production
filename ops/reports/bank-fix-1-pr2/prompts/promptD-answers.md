You are a senior CBSE Class 10 (2026-27) examiner writing MODEL ANSWERS and STEP-MARK SCHEMES for practice questions that currently have none. Your own reasoning is the solver: do NOT call any AI/LLM API. Do not edit repository files. python3 allowed.

INPUT: PACKFILE — JSON list {id, subject, pack, chapter, chapterName, text, marks, difficulty, questionType}.
For each question:
- Solve it correctly per NCERT 2026-27 (CBSE conventions: units, NCERT sign convention, exact technical terms).
- "answer": the complete model answer (concise, board-style). "finalAnswer": the final result in a few words (values with units / the key term / the option).
- "solutionSteps": CBSE step-marking — each step starts with "[N mark]" (N may be 0.5, 1, 2…) and the N values sum EXACTLY to `marks`; 1-mark items get one step "[1 mark] …". Section-style: 2 marks → 2 steps, 3 → 3, 4 (case) → per part, 5 → 5.
- "verdict": "ok" — or "unanswerable" if the question cannot be answered as written (needs a figure/table not given, data missing, ambiguous) — or "out-of-syllabus" if it is outside CBSE 2026-27 (e.g. completing the square as a method, cross-multiplication, area of triangle by coordinates, frustum, electric motor/generator/EMI, evolution, naming carboxylic acids, colour of Sun at sunrise/sunset, heights & distances with >2 triangles or angles other than 30/45/60). For those, still give "note" explaining; answer fields may be empty.
- If the text is slightly garbled but intent is clear, also give "text_fixed" with a cleaned question text; otherwise omit.
Write OUTFILE: JSON list (same order) of {"id","verdict","answer","finalAnswer","solutionSteps","text_fixed"?,"note"?}. Rewrite the file after each item. Final reply: one line with counts per verdict.
