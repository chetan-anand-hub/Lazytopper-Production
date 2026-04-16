# Overview

LazyTopper is an AI-powered educational platform, structured as a pnpm workspace monorepo, designed to personalize learning for students. It aims to improve student performance by utilizing real CBSE board exam data and advanced AI capabilities. The platform predicts highly probable questions (HPQ), generates CBSE marking scheme-aligned solutions, offers AI tutoring, and provides a comprehensive student profile for tracking progress. Its goal is to deliver an adaptive learning experience through a student-friendly interface and a robust learning loop. The project targets enhanced student understanding and academic success.

# User Preferences

I want iterative development and prefer that you ask before making major architectural changes or introducing new external dependencies. For code, I prefer clear, readable TypeScript. When explaining concepts or changes, please be concise but ensure clarity on the "why" behind a decision. Do not make changes to files under `lazytopper/src/data/` or `lazytopper/src/prediction/` without explicit instructions, as these contain curated historical data and core prediction logic.

# System Architecture

The project is a pnpm workspace monorepo built with TypeScript.

## UI/UX Decisions
The platform features a scroll-based homepage, adaptive dark/light themes, and a guided onboarding process. Key pages include a Student Profile with mastery tracking and chapter completion badges, an Exam Simulation for mock tests, and Weak Area Practice utilizing a Spaced Repetition System. A Parent/Teacher Dashboard is also provided. AI tutor messages support markdown and KaTeX rendering. The theme system uses CSS variables for dynamic styling.

## Mobile App (Expo)
An Expo React Native app (`artifacts/lazytopper-mobile`) mirrors the web app's design, sharing data and using Firebase JS SDK for authentication, operating without a dedicated backend by relying on AsyncStorage.

## Student Wellness & Anti-Anxiety Features
Features include an option to hide the exam countdown, renaming "crash" pace to "Focus Plan", welcome messages for streak resets, break reminders, a pre-mock breathing exercise, and mental health resource links.

## Exam Timeline Urgency Modes
The platform adapts its interface and features based on the remaining days until an exam, including a "Night Before Page" (≤1 day), "7-Day Final Sprint Mode" (≤7 days), a "30-Day Revision Calendar", timeline-aware onboarding, and motivational messaging.

## Component Architecture
Large page components have been refactored into smaller, maintainable units. Global and section-level Error Boundaries (`ErrorBoundary.tsx`) are implemented for robust error handling. TopicHub remembers the last-studied concept index per chapter and restores scroll position on re-entry.

## Teacher Mode & Methodology
A Teacher Dashboard allows class creation and progress tracking. A Methodology Page explains the 5-signal prediction system. NCERT chapter references are integrated, and Exam Strategy Training components provide pre-mock tips, time guidance, and internal choice decision tools.

## Pricing, Referral & Funnel Analytics
A Pricing page details subscription tiers. A Referral Program offers premium access incentives. An admin page provides Onboarding Funnel Analytics for tracking user conversion.

## Server Architecture
The LazyTopper AI server is fully modularized. `server/index.cjs` acts as a composition root. Configuration and utilities are separated. The mentor route is split into seven sub-modules handling request classification, prompt building, response generation, validation, diagram helpers, and teach contract handling. The prompt system is divided into seven domain modules for modularity. AI clients handle model routing. Other routes include share, diagrams, moreLikeThis, stepSolution, checkSolution, and questions. `StudentDataService.ts` provides a unified facade for student data management. The API employs a 3-layer cost optimization strategy: static question bank → pre-generated visuals → AI fallback. All modules use factory functions with dependency injection.

## Routing Architecture
The frontend has a single entry point, with all client-side routes served from `/`. The API server (`/shared-api/*`) runs on port 8080, and an AI Gateway proxy (`/api/*`) routes through the API server to port 3001. In development, Vite serves the frontend and proxies API calls. In production, static files are pre-built and served.

## System Design Choices
The project uses TypeScript with pnpm workspaces and composite projects. API design adheres to OpenAPI 3.1 with Orval for codegen. The API server has a 5MB request body limit. AI tutor responses have increased `maxOutputTokens`.

## CBSE 2026-27 Syllabus Alignment
Question banks and prediction engine aligned to 2026-27 CBSE Class 10 syllabus. Deleted topics: Periodic Classification, Management of Natural Resources (Science); Frustum of Cone/Ogive (Maths); Evolution portion of Heredity; Sources of Energy. A `syllabusGuard.ts` CI script catches banned subtopics. A `bannedExercises.json` config catches banned ncertRef values (Ex 13.3, NCERT Ch15).

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
- **Animated Video**: `artifacts/lazytopper-video` (embedded explainer video)
- **Interactive Visual Explainers**: 96 self-contained HTML files (`lazytopper/public/visuals/`) generated by Claude Sonnet, integrated via `VisualExplainer.tsx`.
