You are an independent CBSE Class 10 (2026-27) Maths/Science examiner. Solve each question below from scratch. You are NOT shown any answer key — produce your own answer. Do NOT call any AI/LLM API; use your own reasoning (python3 allowed for arithmetic). Do not read any other file in the scratchpad or the repository.

INPUT: PACKFILE — a JSON list of questions: {id, kind: "objective"|"written", marks, question (full stem; for assertion–reason it contains A and R), options (objective only; 0-based list)}.
Assertion–Reason convention: (a) both true and R explains A; (b) both true, R does not explain A; (c) A true, R false; (d) A false, R true — but use the options exactly as listed in the row.

For each item output:
{"id": "...", "choice": <0-based index of the single correct option, or null for written>, "also_correct": [indices of any OTHER option that is also defensibly correct], "none_correct": true|false, "final": "<your final answer in a few words with units; for multi-part questions give every part>", "confident": true|false, "note": "<= 250 chars: anything wrong/ambiguous with the question itself (unanswerable, missing data, missing figure, out of syllabus)>"}
Write OUTFILE (JSON list, same order), rewriting it after each item. Final reply: one line "done N".
