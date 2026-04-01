LazyTopper – Bundle 1 (MS‑H1, MS‑H2) + Bundle 2 (MS‑M1, MS‑M3)
=================================================================

This bundle contains:
- Updated Vite config with a dev proxy to the AI gateway (`vite.config.ts`).
- MentorPanel wired through the shared AI client (`src/components/MentorPanel.tsx`).
- PracticePage wired with “Ask AI Mentor” hooks per question (`src/pages/PracticePage.tsx`).
- The AI client layer (`src/ai/aiClient.ts`) copied from your current project.

-----------------------------------------------------------------
1. Local development – end‑to‑end practice + mentor
-----------------------------------------------------------------

Prerequisites:
- Node 18+ installed.
- `OPENAI_API_KEY` with access to `gpt-3.5-turbo` configured in your shell.

Steps:

1) Install dependencies (once):

   - npm install

2) Start the AI gateway (backend):

   - Set environment variables in your terminal (Windows Command Prompt example):

     - set OPENAI_API_KEY=YOUR_KEY_HERE
     - set OPENAI_MODEL=gpt-3.5-turbo
     - set PORT=3001

   - Then run:

     - npm run server

   You should see: “LazyTopper AI server running on port 3001”.

3) Start the Vite frontend:

   - In a second terminal:

     - npm run dev

   The app will be available at http://localhost:5173.

   Thanks to the updated `vite.config.ts`, any frontend calls to `/api/*`
   are automatically proxied to `http://localhost:3001`, so:

   - MentorPanel uses the shared `callMentor` client -> `/api/mentor`.
   - PracticePage uses `callMentor` for inline “Explain” / “Solve” under each question.

-----------------------------------------------------------------
2. Production deployment – high‑level blueprint
-----------------------------------------------------------------

There are many possible hosting combinations. A simple first version is:

- Host the React frontend on a static host (Vercel, Netlify, Cloudflare Pages, etc.).
- Host the AI gateway (`server/index.cjs`) on a Node host (Render, Railway, Fly.io, etc.).
- Configure your production environment so that the frontend can reach `/api/*`
  at the gateway host.

Option A – Same origin (recommended when possible)
--------------------------------------------------

- Put the AI gateway behind the same domain as the frontend (e.g. via Nginx/Apache).
- Route `/api/*` to the Node process running `server/index.cjs`.
- Serve the built frontend (`npm run build`) from the same domain (e.g. `/`).

With this setup, the existing `API_BASE = "/api"` in `src/ai/aiClient.ts`
continues to work without any further changes.

Option B – Separate domains (quick PoC)
---------------------------------------

- Host the AI gateway at a URL like `https://lazy-mentor.onrender.com`.
- Keep the React app on `https://lazytopper.app`.

In that case you have two options:

- Update `src/ai/aiClient.ts` so that `API_BASE` reads from an environment
  variable (e.g. `VITE_AI_API_BASE`) and point it to the Render URL, or
- Configure your static host (e.g. Vercel/Netlify) to proxy `/api/*` to the
  gateway URL.

This bundle does NOT change your production config automatically – it
focuses on getting dev + wiring correct so that deployment is a matter of
wiring hosts / proxies.

-----------------------------------------------------------------
3. Files in this bundle and where they live
-----------------------------------------------------------------

- vite.config.ts
  - Destination: project root (`./vite.config.ts`)
  - Purpose: add Vite dev proxy for `/api` -> `http://localhost:3001`.

- src/ai/aiClient.ts
  - Destination: `./src/ai/aiClient.ts`
  - Purpose: shared AI client for mentor + “more like this”. Already used by
    new wiring; no behaviour change vs your current version.

- src/components/MentorPanel.tsx
  - Destination: `./src/components/MentorPanel.tsx`
  - Purpose:
    - Uses `callMentor` from `src/ai/aiClient.ts` instead of a hard-coded
      `fetch("http://localhost:3001/…")`.
    - Keeps the existing study-plan formatting (season phases, chapter
      hours, daily schedule) for plan mode.

- src/pages/PracticePage.tsx
  - Destination: `./src/pages/PracticePage.tsx`
  - Purpose:
    - Adds per-question “Ask AI Mentor” buttons:
      - “Explain this” (mode = "explain")
      - “Solve step-by-step” (mode = "solve")
    - Calls `callMentor` with:
      - subject (Maths/Science),
      - topicKey (from the practice URL),
      - question text,
      - marks.
    - Renders the AI answer directly under that question card, with loading
      and friendly error states.

-----------------------------------------------------------------
4. How to apply this bundle
-----------------------------------------------------------------

1) Unzip the folder into a temporary location.
2) Copy each file to the matching path in your repo:

   - Replace your root `vite.config.ts` with the one from this bundle.
   - Copy `src/ai/aiClient.ts` (or merge if you have local edits).
   - Replace `src/components/MentorPanel.tsx`.
   - Replace `src/pages/PracticePage.tsx`.

3) Run:

   - npm run server   (backend)
   - npm run dev      (frontend)

4) Manual smoke tests:

   - Home -> AI Mentor / Study Plan:
     - Confirm that the plan is generated via the Node gateway (watch the
       server logs).
   - Trends/TopicHub -> Practice:
     - Confirm questions are generated as before.
     - Click “Explain this” / “Solve step-by-step” on a practice question.
     - You should see the mentor’s reply appear inline under that question.

Once this is working locally, we can move on to wiring HPQ + Trends
and final hosting tweaks.
