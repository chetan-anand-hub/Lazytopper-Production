# Gateway Dev (Local)

## Run
- Gateway: `npm run dev:gateway`
- Web: `npm run dev`

## Stub mode (no API key)
- If `AI_PROVIDER` or `API_KEY` is missing, the gateway responds with deterministic stub JSON.
- Stub content is sourced from `src/data/_final/maths-triangles/mentor.json` (or `src/data/_finalGenerated/triangles.mentor.ts`).

## Enable a real provider
1) Create `server/.env`.
2) Add:
   - `AI_PROVIDER=gemini`
   - `API_KEY=your_key_here`
   - (optional) `GEMINI_MODEL=gemini-2.5-flash`

Optional: override CORS with `CORS_ORIGIN=http://localhost:5173`.

## P0-2: Human-grade loop enforced server-side
Every `/api/mentor` structured response now includes the loop blocks under `structured.tutor.*`:
- `tutor.diagnosis` (mistake tags, misconception summary, confidence)
- `tutor.socratic` (question, expected thought)
- `tutor.hint_ladder` (level, hint, next action)
- `tutor.board_steps_ms` (steps, total marks, deductions, examiner note)
- `tutor.next` (micro drill, revision hook, optional suggested practice ids)
