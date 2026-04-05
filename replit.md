# Overview

This project is a pnpm workspace monorepo for LazyTopper, an AI-powered educational platform designed to provide personalized learning experiences for students. Its core purpose is to enhance student performance and understanding by leveraging real CBSE board exam data and advanced AI. Key capabilities include predicting highly probable questions (HPQ), generating CBSE marking scheme-aligned solutions, providing AI tutoring, and offering a comprehensive student profile for progress tracking. The platform aims to offer an adaptive learning journey with a student-friendly interface and a robust learning loop.

# User Preferences

I want iterative development and prefer that you ask before making major architectural changes or introducing new external dependencies. For code, I prefer clear, readable TypeScript. When explaining concepts or changes, please be concise but ensure clarity on the "why" behind a decision. Do not make changes to files under `lazytopper/src/data/` or `lazytopper/src/prediction/` without explicit instructions, as these contain curated historical data and core prediction logic.

# System Architecture

The project is structured as a pnpm workspace monorepo utilizing TypeScript.

## UI/UX Decisions
The design system is inspired by Duolingo, featuring a bright, approachable palette with white backgrounds, green primary, blue accent, and orange secondary colors. It uses flat shadows, the Nunito font, uppercase button text, and rounded corners. Navigation includes a bottom bar with 5 icon tabs and a top header. The homepage functions as a marketing landing page with a hero section, trust bar, product preview, "How it works" section, social proof, freemium pricing, mobile app promotion, FAQ, and a sticky mobile CTA bar. The Student Profile page (`/profile`) includes sections for Overview (mastery rings, growth timeline), Achievements (14 badge definitions across 5 categories), and Stats (weekly accuracy, difficulty breakdowns, summary). Exam Simulation (`/exam-simulation`) offers full-length mock tests based on the CBSE blueprint with a 3-hour timer, section navigation, and comprehensive post-exam analytics. Weak Area Practice (`/weak-area-practice`) identifies and addresses student weaknesses using a spaced repetition engine. A Parent/Teacher Dashboard (`/parent-dashboard`) provides progress reports. The `TutorMessageRenderer` component handles all AI tutor output with markdown, KaTeX math integration, and structured section rendering. `MathText` components render LaTeX expressions. The practice page streamlines actions, and HPQ cards have a "Practice similar" button.

## Technical Implementations
The monorepo uses pnpm workspaces. The prediction engine (`cbse5SignalScoring.ts`) uses a 5-signal weighted scoring system combining historical frequency, rotation prediction, SQP alignment, NEP policy, and difficulty distribution, validated against historical CBSE data. Solutions are CBSE marking scheme-aligned. The core learning loop uses `dailyMixGenerator.ts`, client-side `localStorage` for session storage with Firestore sync, and an adaptive dashboard. A new `/api/check-solution` endpoint uses Gemini Vision to evaluate handwritten solutions. The API server is an Express 5 server. PostgreSQL with Drizzle ORM is used for the database.

## Subscription & Auth System
Subscription tiers include Free, Trial (7-day), and Premium, managed by `subscriptionService.ts`. Feature gates (`featureGates.ts`) control access to 13 features based on tier. Trial is auto-activated on first sign-in and expires after 7 days. Route protection is implemented with `RequireAuth` and `RequirePremium` components, displaying a branded paywall for non-premium users. An `UpgradeModal` facilitates upgrades. The login page supports Google OAuth, Phone OTP, and guest access. A trial countdown UI is present in the navbar and profile.

## Mobile App (Expo)
An Expo React Native app (`artifacts/lazytopper-mobile`) mirrors the web app's design with 5 tabs. It uses shared data from `@workspace/shared-data` for trends, Firebase JS SDK for authentication with AsyncStorage persistence, and a user-scoped subscription context matching the web model. The Practice tab combines predictive papers with exam simulation entry. Exam simulation is a full-screen modal with setup, exam, and review phases. The mobile app is designed to function without a backend, relying on AsyncStorage.

## System Design Choices
TypeScript is used consistently. All packages utilize TypeScript composite projects. API design follows OpenAPI 3.1 with Orval for codegen (React Query hooks, Zod schemas). The API server enforces a 5 MB request body limit. AI tutor responses have increased `maxOutputTokens` (1600) to prevent truncation.

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
- **AI Provider**: Replit AI Integration proxy for Gemini API (`gemini-2.5-flash`)
- **LaTeX Rendering**: KaTeX library (`MathText` component)
- **Image Upload for Solution Checking**: Gemini Vision API