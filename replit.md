# Overview

LazyTopper is an AI-powered educational platform, structured as a pnpm workspace monorepo, designed to personalize learning for students. It aims to improve student performance by utilizing real CBSE board exam data and advanced AI capabilities. The platform predicts highly probable questions (HPQ), generates CBSE marking scheme-aligned solutions, offers AI tutoring, and provides a comprehensive student profile for tracking progress. Its goal is to deliver an adaptive learning experience through a student-friendly interface and a robust learning loop. The project targets enhanced student understanding and academic success, offering significant market potential in the educational technology sector.

# User Preferences

I want iterative development and prefer that you ask before making major architectural changes or introducing new external dependencies. For code, I prefer clear, readable TypeScript. When explaining concepts or changes, please be concise but ensure clarity on the "why" behind a decision. Do not make changes to files under `lazytopper/src/data/` or `lazytopper/src/prediction/`.

# System Architecture

The project is a pnpm workspace monorepo built with TypeScript.

## UI/UX Decisions
The platform features a scroll-based homepage, adaptive dark/light themes, and a guided onboarding process (new user experience). Key pages include a Student Profile with mastery tracking (including chapter completion milestones), an Exam Simulation for mock tests, and Weak Area Practice utilizing a Spaced Repetition System. A Parent/Teacher Dashboard is also provided. AI tutor messages support markdown and KaTeX rendering. The theme system uses CSS variables for dynamic styling, with specific components using `useThemeColors()` for inline, theme-aware styles.

## Technical Implementations
The core prediction engine uses a 5-signal weighted scoring system (`cbse5SignalScoring.ts`). Solutions are aligned with the CBSE marking scheme. The learning loop is driven by `dailyMixGenerator.ts` with client-side storage synchronized with Firestore. An `/api/check-solution` endpoint uses Gemini Vision for evaluating handwritten solutions. The Spaced Repetition Engine employs FSRS targeting 90% retention and includes mastery demotion logic. A Daily Mission System offers structured study sessions, adaptable via an Adaptive Timeline Profiles system (Marathon, Sprint, Crash/Focus Plan). Subscription tiers control feature access. Authentication supports Google OAuth, Phone OTP, and guest access. Student wellness features are integrated, including break reminders and a pre-mock breathing exercise. Large page components are refactored for maintainability, and Error Boundaries provide robust error handling.

## Server Architecture
The LazyTopper AI server is fully modularized. `server/index.cjs` serves as a thin composition root. Server-side logic is divided into distinct modules for configuration (`serverConfig.cjs`), utilities (`serverUtils.cjs`), mentor routes (further split into sub-modules for handling requests, response building, classification, and diagram/teach helpers), and a modular prompt system (split into core, data, grind, diagram, teach contract, validation, and learn modules). AI clients for Gemini and Claude are integrated (`geminiClient.cjs`, `claudeClient.cjs`). Other routes include sharing, diagrams, 'more like this', step solutions, check solutions, and questions. A `StudentDataService` provides a unified facade for student data management, including schema versioning and migration. A 3-layer API cost optimization prioritizes static question banks, then pre-generated visuals, with AI as a fallback. All modules use factory functions with dependency injection.

## Mobile App (Expo)
An Expo React Native app (`artifacts/lazytopper-mobile`) mirrors the web app's design, sharing data and using Firebase JS SDK for authentication, operating without a dedicated backend by relying on AsyncStorage.

## Student Wellness & Anti-Anxiety Features
Features include an option to hide the exam countdown, renaming "crash" pace to "Focus Plan", welcome messages for streak resets, break reminders, a pre-mock breathing exercise, and mental health resource links.

## Exam Timeline Urgency Modes
The platform adapts its interface and features based on the remaining days until an exam, including a "Night Before Page" (≤1 day), "7-Day Final Sprint Mode" (≤7 days), a "30-Day Revision Calendar", timeline-aware onboarding, and motivational messaging.

## Component Architecture
Large page components have been refactored into smaller, maintainable units. Global and section-level Error Boundaries (`ErrorBoundary.tsx`) are implemented for robust error handling.

## Teacher Mode & Methodology
A Teacher Dashboard allows class creation and progress tracking. A Methodology Page explains the 5-signal prediction system. NCERT chapter references are integrated, and Exam Strategy Training components provide pre-mock tips, time guidance, and internal choice decision tools.

## Pricing, Referral & Funnel Analytics
A Pricing page details subscription tiers. A Referral Program offers premium access incentives. An admin page provides Onboarding Funnel Analytics for tracking user conversion.

## Routing Architecture
The frontend has a single entry point served from `lazytopper-app`, with all client-side routes served from `/`. The API server (`/shared-api/*`) runs on port 8080, and an AI Gateway proxy (`/api/*`) routes through the API server to port 3001. In development, Vite serves the frontend and proxies API calls. In production, static files are pre-built and served.

## System Design Choices
The project uses TypeScript with pnpm workspaces and composite projects. API design adheres to OpenAPI 3.1 with Orval for codegen. The API server has a 5MB request body limit. AI tutor responses have increased `maxOutputTokens`.

# External Dependencies

-   **Node.js**: Version 24
-   **TypeScript**: Version 5.9
-   **Package Manager**: pnpm
-   **API Framework**: Express 5
-   **Database**: PostgreSQL
-   **ORM**: Drizzle ORM
-   **Validation**: Zod, `drizzle-zod`
-   **API Codegen**: Orval
-   **Build Tool**: esbuild
-   **AI Providers**: Dual-provider setup via Replit AI Integration proxy:
    -   **Gemini** (`gemini-2.5-flash`): Primary for tutoring, structured responses, image-based solution checking
    -   **Claude** (Sonnet `claude-sonnet-4-6`, Haiku `claude-haiku-4-5`): Visual explainer generation (Sonnet), simple factual queries (Haiku)
-   **LaTeX Rendering**: KaTeX library
-   **Image Upload for Solution Checking**: Gemini Vision API
-   **Animated Video**: `artifacts/lazytopper-video` (embedded explainer video)
-   **Interactive Visual Explainers**: 96 interactive visual explainers (HTML files with inline CSS/JS) for Maths and Science, generated by Claude Sonnet, stored in `lazytopper/public/visuals/` and integrated via `VisualExplainer.tsx` component.
