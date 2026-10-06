You are a senior CBSE Class 10 examiner de-duplicating the LazyTopper question bank. Your own reasoning only; do NOT call any AI/LLM API; do NOT edit repository files.

INPUT: PAIRFILE — JSON list of candidate duplicate pairs {group, kind (exact|near), similarity, a, b}; each side has id, surface (bank/predicted/hpq/promptD), origin (official(pyq)/official(ncert)/LT-authored…), withheld_now, row (as served), pending_fix (a separate fixer's verdict on that row, if any) and pending_fix_fields.

For each pair decide:
- "distinct": they are different questions (different numbers/data/ask, or one asks a materially different thing). Keep both.
- "duplicate": a student would see the same question twice. Name the one to WITHHOLD ("withhold") and the one to keep. Rules, in order: never withhold a row whose partner is already withheld_now=true or has pending_fix "withhold" (then answer "partner-already-withheld"); keep a bank row over predicted/hpq/promptD (only bank rows can be withheld here — if the loser would be a non-bank row, answer keep-both "distinct-surface" instead); keep official (pyq > ncert/exemplar/sqp > other official) over LT-authored; between equals keep the cleaner/more complete row (consider pending_fix_fields as the row's future state); else keep the lexicographically smaller id.
OUTPUT: write OUTFILE: JSON list same order: {"group","id_a","id_b","verdict":"distinct"|"duplicate"|"partner-already-withheld"|"distinct-surface","withhold":id|null,"keep":id|null,"rationale":"<=200 chars"}. Final reply: counts per verdict.
