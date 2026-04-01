# Pro Tips Implementation Plan

This document outlines a proposed approach to implement the habit‑forming features described in **Pro Tips.docx** within the LazyTopper platform.  Each feature builds on existing data and UI patterns.

## 1. Daily Focus Mix (Spotify model)

- **Goal:** Present a “Play” button on the dashboard which starts a session composed of one high‑weightage concept video, three must‑crack questions and one revision card.  This mix should vary daily to keep students engaged.
- **Data needed:**
  - **Concept videos:** A database of short explainer videos tagged by topic and weightage.  If unavailable, use TopicHub core ideas as text summaries.
  - **Must‑crack questions:** Derived from the canonical question bank and HPQ sets, filtered by prediction strength and recent trends.
  - **Revision cards:** Flashcard‑style summaries extracted from TopicHub (why it matters, common mistakes, core ideas).
- **Algorithm:**
  1. Determine the student’s current subject and high‑priority topics (using trend scores or personal weaknesses from past sessions).
  2. Select one concept video from the top‑weighted topic (avoid repeats within a week).
  3. Select three must‑crack questions with a mix of difficulties.
  4. Select one revision card (e.g., a micro example or exam tip).
  5. Shuffle lightly and present as a playlist.
- **UI:** A prominent “Play” button on the home page with an animated cover image.  Clicking it opens a modal or navigates to a dedicated session page showing the curated mix.

## 2. Match % Score (Netflix model)

- **Goal:** Display a simple “match” percentage on TopicHub cards based on board weightage, prediction scores and personal history.
- **Computation:**
  - Base weightage comes from official exam blueprints (e.g., marks allocated to each chapter).
  - Adjust based on trend data (recent exam recurrence) and user proficiency (questions attempted/answered correctly).
  - Normalise to a 0–100 % scale and colour‑code (e.g., green >80 %, amber 50–80 %, red <50 %).
- **UI:** A small badge on each TopicHub card showing “96 % match” with a tooltip explaining the factors.

## 3. Vibe Check (Emotional‑intelligence model)

- **Goal:** Allow students to indicate their energy level (“Low” or “High”) when they start studying so the system can adjust content difficulty.
- **Implementation:**
  - Add a toggle or small modal at login or session start.
  - If the student selects **Low energy**, emphasise easy questions and shorter tasks; if **High energy**, include harder or longer questions.
  - Store the selection for the session and adapt difficulty mixes in practice generation.

## 4. Command Palette (Superhuman model)

- **Goal:** Provide a global search/command interface (invoked via Cmd + K) to quickly jump to HPQ, mock builder, performance stats, etc.
- **Implementation:**
  - Build a reusable modal component triggered by a keyboard shortcut.
  - Populate it with quick actions (e.g., “Start HPQ for Algebra”, “View TopicHub for Probability”, “See last week’s stats”).
  - Use fuzzy search to filter available actions as the user types.
- **Data integration:** Each action needs a route and optional parameters; e.g., `navigate('/hpq?topic=Algebra')`.

## 5. Weekly Wrapped Data Story (Viral loop)

- **Goal:** Generate a shareable recap summarising study hours, topics covered, consistency streaks and improvements.
- **Data needed:**
  - Session logs: start/end times, topics, scores.
  - Personal bests and streaks.
- **Implementation:**
  - At the end of each week, run an aggregation job to compute stats.
  - Use a template to create an image or card summarising the data.
  - Provide a “Share” button that copies a link or image to the clipboard.
- **UI:** A carousel of cards with highlights (“You studied 7 hrs”, “Top topic: Algebra”, “Streak: 5 days”) and a call‑to‑action to share on social media.

## Dependencies & Phasing

1. **Data plumbing:** Ensure session logs and question metadata (topic, difficulty, marks) are stored per user.  Add endpoints to fetch these stats.
2. **UX prototypes:** Design wireframes for each feature and validate with a small group of students.
3. **Incremental rollout:** Launch Match % badges and Vibe Check first (low complexity).  Follow with Daily Mix, then Command Palette, and finally Weekly Wrapped once sufficient data accumulates.
