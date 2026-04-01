# Practice/Mentor BSRE Integration

- `PracticePage.tsx` now adds both `payload.studentAttempt` and `payload.studentAnswer` when a learner submits their Socratic answer so the backend receives an explicit attempt and can route into the Triangles evaluation branch.
- `TopicHub.tsx` (component `MentorSolveDrawer`) appends the same keys before posting each user response so Triangles grind and tutor sessions can also trigger `runBsreEvaluation` whenever the flag is on.
- These extra fields flow into `POST /api/mentor` without new client-side logging, leaving the existing `TRIANGLES_BSRE_FEATURE_FLAG` + Gemini fallback untouched on the server.
