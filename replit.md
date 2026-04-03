# Overview

This project is a pnpm workspace monorepo using TypeScript, focused on an AI-powered educational platform named LazyTopper. The platform aims to provide students with personalized learning experiences, including highly probable questions (HPQ) prediction, step-by-step solutions, AI tutoring, and a comprehensive student profile to track progress.

The core vision is to offer a full-featured, adaptive learning journey that leverages real CBSE board exam data and advanced AI integrations to enhance student performance and understanding. Key capabilities include:
- Predicting highly probable questions based on historical CBSE data.
- Generating detailed, CBSE marking scheme-aligned step-by-step solutions.
- Providing an AI-powered mentor for conceptual clarification and solution checking.
- Offering a comprehensive student profile with mastery tracking, achievements, and performance statistics.
- A redesigned, student-friendly homepage with clear calls to action.
- A unified and robust student learning loop with local-first session storage and adaptive dashboard content.

# User Preferences

I want iterative development and prefer that you ask before making major architectural changes or introducing new external dependencies. For code, I prefer clear, readable TypeScript. When explaining concepts or changes, please be concise but ensure clarity on the "why" behind a decision. Do not make changes to files under `lazytopper/src/data/` or `lazytopper/src/prediction/` without explicit instructions, as these contain curated historical data and core prediction logic.

# System Architecture

The project is structured as a pnpm workspace monorepo.

## UI/UX Decisions
- **Design System (Duolingo-inspired):** Bright, approachable design with white backgrounds (#ffffff), green primary (#58cc02 / #46a302 dark), blue accent (#1cb0f6), orange secondary (#ff9600). Flat shadows (0 2px 0 #e5e5e5), bold Nunito font, uppercase button text with border-bottom: 4px, rounded corners (16px). No glassmorphism, no backdrop-filter, no dark gradients.
- **Navigation:** Bottom nav with 5 icon tabs (Home/Learn/Practice/Progress/Profile), green active state. Top header with green "LT" logo, "LazyTopper" brand, search button, and profile avatar.
- **Homepage (Marketing Landing Page):** Redesigned as a high-converting marketing page with: (1) Hero section with live CBSE board exam countdown timer, urgency headline, "Start Free" CTA, and social proof counter with avatar row ("12,800+ students"); (2) Animated trust bar with intersection-observer-triggered counters; (3) Interactive product preview showing real trend data bars with "Share with classmates" WhatsApp integration; (4) Redesigned "How it works" 3-step cards; (5) Social proof section with testimonials featuring score improvements (65→91, 58→88, 72→94), avatars, and 4.8/5 aggregate rating; (6) Freemium pricing section (Free ₹0 vs Premium ₹149/month) with Board Season Pack (₹349/3mo) and Annual (₹999/yr) options; (7) Mobile app promotion section with device mockup; (8) FAQ accordion (7 questions, rendered on page for SEO); (9) Proper footer with product/support/legal links and social icons; (10) Floating WhatsApp share FAB; (11) Sticky mobile CTA bar on small screens. OG image and favicon updated with branded assets.
- **Student Profile Page:** Located at `/profile`, it features three tabs:
    - **Overview:** Displays subject-wise chapter mastery rings and a growth journey timeline with milestones.
    - **Achievements:** Showcases 14 badge definitions across 5 categories (streak, practice, mastery, accuracy, milestone) with an associated evaluation engine.
    - **Stats:** Presents weekly accuracy charts, difficulty breakdowns, and summary statistics (questions solved, streak, topics started/mastered, strongest/weakest topics).
- **Exam Simulation:** `/exam-simulation?subject=Maths|Science` provides unlimited full-length 80-mark mock tests with CBSE blueprint (A:20×1m, B:5×2m, C:6×3m, D:4×5m, E:3×4m), 3-hour countdown timer with auto-submit, section navigation sidebar, question palette (green=answered, purple=marked, gray=unvisited), internal choice (OR questions) with branch dimming, self-assessment for subjective questions, and comprehensive post-exam analytics (section breakdown, topic heatmap, difficulty breakdown, weak areas, score trend chart). Accessible via "Unlimited Mock" buttons on the Predictive Papers hub. Uses seeded RNG with ≤30% overlap enforcement against last 5 papers via `unlimitedPaperEngine.ts`. Paper generation uses prediction-weighted sampling (predictionScore^1.5 with _adjustedScore fallback), topic-weightage targets from CBSE trend data, Science stream balance enforcement (Physics~27/Chemistry~20/Biology~33 marks ±8 tolerance), and guaranteed archetype seeding (must-appear topics like BPT proof, Ohm's law, etc. matched via fuzzy topic+subtopic matching). Canonical topic normalizer maps all question bank variant names to trend list keys for accurate weightage tracking.
- **Weak Area Practice:** `/weak-area-practice` page aggregates weakness signals from practice insights, wrong-answer logs, and topic mastery to show ranked weak areas with confidence scores. Includes SM-2 spaced repetition engine (`spacedRepetitionEngine.ts`), AI learning path generator with prerequisite ordering, and closure tracking.
- **Parent/Teacher Dashboard:** `/parent-dashboard` page displays progress report with overall stats, weekly accuracy trend chart, topic mastery heatmap, weak areas list, and shareable link. Accessible from Profile page "Share Report" button. Share link flow requires `SESSION_SECRET` env var for HMAC token signing and `VITE_FIREBASE_PROJECT_ID` + Firebase Admin credentials (`FIREBASE_SERVICE_ACCOUNT_KEY` or ADC) for token verification and server-proxied report data.
- **Tutor Message Rendering:** Shared `TutorMessageRenderer` component (`lazytopper/src/components/tutor/TutorMessageRenderer.tsx`) handles all AI tutor output across TutorDrawerV2, TeachFlow, MentorPanel, and HumanGradeCoachView. Features: lightweight markdown parser (headers, bold/italic, lists, code blocks, blockquotes), KaTeX math integration via MathText, and structured section renderers (goal banner, exam lines, worked examples with marks, checkpoint cards, watch-out callouts). Chat bubbles use solid Duolingo palette — white with `#e5e5e5` border for tutor, light blue `#dbeafe` with `#93c5fd` border for student.
- **Question Display:** `MathText` component renders LaTeX expressions using KaTeX for both inline and display math, with Unicode fallbacks and XSS safety.
- **Practice Page:** Consolidated primary actions with a single "Step-by-Step Solution" button. "Teach me this concept" and "Check My Solution" are integrated within the solution panel.
- **Highly Probable Questions (HPQ):** Streamlined card layout, replacing AI variants with a "Practice similar" button that intelligently filters to the Practice page.

## Technical Implementations
- **Monorepo:** pnpm workspaces manage packages, each with its own dependencies.
- **Prediction Engine:** 5-signal weighted scoring engine (`cbse5SignalScoring.ts`) combines: Historical Frequency (30%), Rotation Prediction (20%), SQP Alignment (25%), NEP Policy (15%), Difficulty Distribution (10%). Rotation pair tracker detects alternating subtopics (e.g., distance formula vs section formula). SQP ingestion pipeline matches against official sample papers. Guaranteed archetypes list enforces must-appear topics (BPT proof, Ohm's law numerical, etc.). Backtest engine validates predictions against 2023-2025 papers. Confidence rationale shown on HPQ cards ("92% likely — appears 8/9 years, matches SQP, NEP-aligned"). Built on real CBSE Class 10 board exam pattern data (2017-2025) for Maths and Science topics with fuzzy matching and calibrated NEP policy boosts.
- **Solution Quality:** Step-by-step solutions are aligned with the official CBSE marking scheme, supporting half-marks and 0-mark explanatory steps. AI context for solution generation is improved to expand on existing answers/explanations.
- **Core Learning Loop:** Unified daily mix generation via `dailyMixGenerator.ts`. Client-side `localStorage` serves as the primary session store for offline capability, with background Firestore sync for cross-device continuity. The Dashboard features an adaptive hero card prioritizing incomplete session resume, daily mix completion, weakest topic, or streak.
- **Solution Checker:** New `/api/check-solution` endpoint accepts student handwritten solution images and question context. Utilizes Gemini Vision to evaluate against CBSE marking schemes, providing step-by-step feedback, marks, and improvement tips.
- **API Server:** Express 5 server with routes for various functionalities, including AI interactions and health checks.
- **Database:** PostgreSQL with Drizzle ORM for schema definition and interaction.

## Subscription & Auth System
- **Subscription Tiers:** Free, Trial (7-day), Premium. Managed via `subscriptionService.ts` with localStorage persistence per user UID.
- **Feature Gates:** 13 features mapped to tiers in `featureGates.ts`. Free: Trends. Logged-in: practice (3/day), mock papers (1 view). Premium/Trial: everything else (unlimited mocks, exam simulation, predicted Qs, chapter hub, study planner, daily mix, weak area practice, full analytics, parent dashboard, mock builder).
- **Trial:** Auto-activated on first sign-in via `activateTrial(uid)` in Login.tsx. Auto-expires to free tier after 7 days.
- **Route Protection:** `RequireAuth` (requires login), `RequirePremium` (requires login + premium/trial tier). Premium routes show branded paywall with "Unlock Full Access" CTA when non-premium.
- **UpgradeModal:** Branded modal listing premium features, trial status/countdown, "Start 7-Day Free Trial" or "Upgrade to Premium" CTA. Placeholder upgrade sets premium in localStorage.
- **Login Page:** Clean branded page with Google OAuth, Phone OTP (with reCAPTCHA), and "Explore as Guest". Falls back to guest-only when Firebase is unavailable.
- **Trial Countdown UI:** Navbar shows "⏳ Xd trial" badge for trial users, red "Upgrade" button for expired trial. Profile page shows subscription status card with tier, countdown, and upgrade button.

## Mobile App (Expo)
- **Artifact:** `artifacts/lazytopper-mobile` — Expo React Native app with 5 tabs (Home, Trends, Practice, Progress, Profile).
- **Design:** Duolingo-inspired palette matching the web app (#58cc02 green, #1cb0f6 blue, #ff9600 orange, #ffc800 gold).
- **Shared Data:** Trend data lives in `lib/shared-data/` workspace package (`@workspace/shared-data`), containing types, maths, and science topic trends (14 + 13 topics with tiers, weightages, concepts). Mobile imports from this package instead of maintaining local copies.
- **Auth:** Firebase JS SDK (`firebase` package) with Google Sign-In and Phone OTP support, graceful fallback to guest-only auth when Firebase is not configured. Auth state persisted in AsyncStorage. `EXPO_PUBLIC_FIREBASE_*` env vars required for Firebase features.
- **Subscription:** User-scoped AsyncStorage-based subscription context (`context/SubscriptionContext.tsx`) with free/trial/premium tiers, matching the web model.
- **Practice Tab:** Combines predictive papers hub with exam simulation entry. Shows 3 predictive papers with premium gating, "Start Exam Simulation" CTA card.
- **Exam Simulation:** Full-screen modal (`app/exam-simulation.tsx`) with 3 phases: setup (instructions + exam details), exam (question-by-question navigation, 3-hour countdown timer, MCQ selection, mark-as-done for subjective questions, question dot palette), and review (completion stats + question summary).
- **Components:** `TopicCard`, `SubjectToggle`, `TierBadge` — reusable across screens.
- **Navigation:** NativeTabs (iOS 26 liquid glass) with classic Tabs fallback. Headers hidden, content uses `useSafeAreaInsets`.
- **No backend dependency:** Uses AsyncStorage for all persistence. No API server or database needed.

## System Design Choices
- **TypeScript:** Used consistently across the monorepo for type safety.
- **Composite Projects:** All packages use TypeScript composite projects with project references for efficient type-checking and build processes.
- **API Design:** OpenAPI 3.1 specification for API definition, with Orval used for codegen to generate React Query hooks (`api-client-react`) and Zod schemas (`api-zod`).
- **Server Body Size Limit:** `readJson()` enforces a 5 MB maximum request body size to mitigate DoS attacks.
- **Tutor Response Truncation:** Increased `maxOutputTokens` for conversational AI tutor responses to 1600 to prevent premature truncation.

# External Dependencies

- **Node.js**: Version 24
- **TypeScript**: Version 5.9
- **Package Manager**: pnpm
- **API Framework**: Express 5
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API Codegen**: Orval
- **Build Tool**: esbuild
- **AI Provider**: Replit AI Integration proxy for Gemini API (`gemini-2.5-flash`), configured via `AI_INTEGRATIONS_GEMINI_BASE_URL` and `AI_INTEGRATIONS_GEMINI_API_KEY`. Falls back to direct `GEMINI_API_KEY` if proxy is unavailable.
- **LaTeX Rendering**: KaTeX library (`MathText` component)
- **Image Upload for Solution Checking**: Gemini Vision API for image analysis.

# Question Bank

The canonical question bank (`lazytopper/src/data/canonicalQuestionBank.ts`) aggregates pack files from `questionBanks/class10/`:
- **Maths** (14 chapters × 55 questions = 770): 20 Easy / 20 Medium / 15 Hard per chapter. Covers MCQ, A-R, Short, Long, Case-Based, proofs (BPT, Pythagoras, tangent-radius), and constructions.
- **Science** (13 chapters × 40 questions = 520): 15 Easy / 15 Medium / 10 Hard per chapter. Covers MCQ, A-R, Short, Long, Case-Based.
- Pack files use `CanonicalQuestion` type from `predictionTypes.ts`. Each has a unique 2–4 letter prefix for IDs (e.g., RN-, POLY-, CARB-, CC-).
- AI "more-like-this" generation enforces requested difficulty and avoids near-duplicates.