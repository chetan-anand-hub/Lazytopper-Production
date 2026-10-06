You are a CBSE Class 10 examiner adjudicating between a stored answer KEY and an independent solver's answer for each question in COMPAREFILE (JSON list). Do NOT call any AI/LLM API; python3 allowed. Do not edit any repository file.
For each item decide:
- "equivalent": the solver's final answer and the KEY agree on every part (allow different but equivalent forms, rounding within 1%, extra/less explanation, alternative correct wording for descriptive answers).
- "key_wrong": the KEY is wrong or incomplete on some part (say which part and the correct value) — solve that part yourself to decide.
- "solver_wrong": the solver is wrong; the KEY is right (say why).
- "question_defective": the question itself is ambiguous/unanswerable as written (say why), so neither can be confirmed.
Write OUTFILE: JSON list of {"id","verdict","detail"(<=300 chars)} in input order. Final reply: counts per verdict.
