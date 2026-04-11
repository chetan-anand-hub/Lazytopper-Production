# Overview

This project is a pnpm workspace monorepo for LazyTopper, an AI-powered educational platform designed to provide personalized learning experiences for students. Its core purpose is to enhance student performance and understanding by leveraging real CBSE board exam data and advanced AI. Key capabilities include predicting highly probable questions (HPQ), generating CBSE marking scheme-aligned solutions, providing AI tutoring, and offering a comprehensive student profile for progress tracking. The platform aims to offer an adaptive learning journey with a student-friendly interface and a robust learning loop.

# User Preferences

I want iterative development and prefer that you ask before making major architectural changes or introducing new external dependencies. For code, I prefer clear, readable TypeScript. When explaining concepts or changes, please be concise but ensure clarity on the "why" behind a decision. Do not make changes to files under `lazytopper/src/data/` or `lazytopper/src/prediction/` without explicit instructions, as these contain curated historical data and core prediction logic.

# System Architecture

The project is structured as a pnpm workspace monorepo utilizing TypeScript.

## UI/UX Decisions
The platform features a scroll-based homepage, a theme-aware interface with dark/light modes, and a guided new user experience. Key pages include a Student Profile with mastery tracking and achievements, an Exam Simulation for full-length mock tests, and Weak Area Practice using a Spaced Repetition System. A Parent/Teacher Dashboard is also available. AI tutor messages are rendered with markdown and KaTeX.

## Technical Implementations
The monorepo uses pnpm workspaces. The prediction engine (`cbse5SignalScoring.ts`) employs a 5-signal weighted scoring system. Solutions are CBSE marking scheme-aligned. The core learning loop uses `dailyMixGenerator.ts` and client-side storage with Firestore sync. An `/api/check-solution` endpoint leverages Gemini Vision for handwritten solution evaluation. The Spaced Repetition Engine uses FSRS (Free Spaced Repetition Scheduler) targeting 90% retention, with mastery demotion logic. A Daily Mission System provides structured study sessions, adaptable based on an Adaptive Timeline Profiles system (Marathon, Sprint, Crash/Focus Plan modes).

## Subscription & Auth System
Subscription tiers (Free, Trial, Premium) are managed by `subscriptionService.ts` and control feature access via `featureGates.ts`. Authentication supports Google OAuth, Phone OTP, and guest access, with route protection and an upgrade modal for premium features.

## Mobile App (Expo)
An Expo React Native app (`artifacts/lazytopper-mobile`) mirrors the web app's design with shared data and Firebase JS SDK for authentication. It functions without a dedicated backend, relying on AsyncStorage.

## Student Wellness & Anti-Anxiety Features
Features include a toggle to hide the exam countdown, renaming "crash" pace to "Focus Plan", a "Welcome back!" message for streak resets, break reminders during study sessions, a pre-mock breathing exercise, and mental health resource links.

## Exam Timeline Urgency Modes
The platform adapts its interface and features based on days remaining until the exam. This includes a "Night Before Page" (≤1 day), "7-Day Final Sprint Mode" (≤7 days), a "30-Day Revision Calendar", timeline-aware onboarding, and profile-specific motivational messaging.

## Component Architecture
Large page components like `Dashboard.tsx` and `PracticePage.tsx` have been refactored and split into smaller, maintainable parts. Global and section-level Error Boundaries (`ErrorBoundary.tsx`) provide robust error handling.

## Teacher Mode & Methodology
A Teacher Dashboard allows class creation and progress tracking. A Methodology Page explains the 5-signal prediction system's weighting. NCERT chapter references are integrated across the platform. Exam Strategy Training components provide pre-mock tips, time guidance, and internal choice decision tools.

## Pricing, Referral & Funnel Analytics
A Pricing page details subscription tiers. A Referral Program allows users to earn premium access. An admin page provides Onboarding Funnel Analytics to track user conversion.

## System Design Choices
TypeScript is used throughout, with pnpm workspaces and composite projects. API design follows OpenAPI 3.1 with Orval for codegen. The API server has a 5 MB request body limit. AI tutor responses have increased `maxOutputTokens`.

# External Dependencies

- **Node.js**: Version 24
- **TypeScript**: Version 5.9
- **Package Manager**: pnpm
- **API Framework**: Express 5
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Validation**: Zod, `drizzle-zod`
- **API Codegen**: Orval
- **Build Tool**: esbuild
- **AI Providers**: Dual-provider setup via Replit AI Integration proxy:
  - **Gemini** (`gemini-2.5-flash`): Primary for tutoring, structured responses, image-based solution checking
  - **Claude** (Sonnet `claude-sonnet-4-6`, Haiku `claude-haiku-4-5`): Visual explainer generation (Sonnet), simple factual queries (Haiku)
- **LaTeX Rendering**: KaTeX library
- **Image Upload for Solution Checking**: Gemini Vision API
- **Animated Video**: artifacts/lazytopper-video (embedded explainer video)

## Interactive Visual Explainers (Task #73)
- **96 interactive visual explainers** generated (50 Maths + 46 Science) covering all 26 CBSE Class 10 chapters
- Each visual is a self-contained HTML file (~20KB) with inline CSS/JS — interactive animations, bilingual Hindi+English, step-by-step walkthroughs
- Stored in `lazytopper/public/visuals/{subject}/{chapter}/{slug}.html`, served at `/app/visuals/...`
- Registry: `lazytopper/src/data/visualConceptRegistry.ts` maps all chapters→concepts→file paths
- Generation script: `lazytopper/scripts/generateVisuals.mjs` (Claude Sonnet via Replit proxy, rate limiting, resume support, manifest tracking)
- Component: `lazytopper/src/components/VisualExplainer.tsx` (sandboxed iframe with loading/error/fullscreen/collapsible states)
- Integration: `TeachFlow.tsx` and `TutorDrawerV2.tsx` auto-show matching visuals via `findVisualForConcept()` keyword matching
- Manifest: `lazytopper/public/visuals/manifest.json` tracks all generated visuals with metadata

## Navigation Simplification (Task #77)
- **Bottom nav fix**: "Practice" button now goes to `/practice/{grade}/{subject}` (was incorrectly going to `/predictive-papers`)
- **Topic Mock → Chapter Test**: `/topic-mock/` routes redirect to `/chapter-test/`. All deep links updated (TrendsPage, TopicHub, guidedJourneyService, buildUrl.ts). TopicMockPage.tsx remains but is no longer routed to directly.
- **Top nav simplified**: Removed standalone Pricing button (accessible via Profile page)
- **"What's next?" card**: PracticePage shows post-completion card with context-aware next actions (retry, chapter test, predicted questions, study chapter)
- **Label updates**: "Topic Mock Paper" → "Chapter Test", "Build topic mock" → "Chapter Test" in TrendsPage dropdown

## CBSE 2025-26 Syllabus Updates (Task #74)
- **Constructions chapter removed** from CBSE 2025-26 Class 10 Maths syllabus. Removed from all data files, question banks, topic registries, prediction engine, server prompts, and UI. 2.5% weightage redistributed proportionally across remaining 13 topics.
- **Two-exam system**: Phase 1 (compulsory, Feb 17, 2026) and Phase 2 (optional re-attempt for up to 3 subjects, May 15, 2026). Best score counts. Dates in `cbseDates.ts`, prediction in `cbseExamDate.ts`. Info cards on Onboarding and SprintDashboard.
- Weight sources: `class10MathTopicTrends.ts`, `class10MathTopicWeights.ts`, `lib/shared-data/src/mathsTrends.ts` — all sum to ~100% with redistributed weights.