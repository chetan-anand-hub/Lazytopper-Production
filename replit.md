# Overview

This project is a pnpm workspace monorepo for LazyTopper, an AI-powered educational platform designed to provide personalized learning experiences for students. Its core purpose is to enhance student performance and understanding by leveraging real CBSE board exam data and advanced AI. Key capabilities include predicting highly probable questions (HPQ), generating CBSE marking scheme-aligned solutions, providing AI tutoring, and offering a comprehensive student profile for progress tracking. The platform aims to offer an adaptive learning journey with a student-friendly interface and a robust learning loop, ultimately improving student outcomes and understanding.

# User Preferences

I want iterative development and prefer that you ask before making major architectural changes or introducing new external dependencies. For code, I prefer clear, readable TypeScript. When explaining concepts or changes, please be concise but ensure clarity on the "why" behind a decision. Do not make changes to files under `lazytopper/src/data/` or `lazytopper/src/prediction/` without explicit instructions, as these contain curated historical data and core prediction logic.

# System Architecture

The project is structured as a pnpm workspace monorepo utilizing TypeScript.

## UI/UX Decisions
The platform features a scroll-based homepage, a theme-aware interface with dark/light modes, and a guided new user experience. Key pages include a Student Profile with mastery tracking and achievements, an Exam Simulation for full-length mock tests, Weak Area Practice using a Spaced Repetition System, and a Parent/Teacher Dashboard. AI tutor messages are rendered with markdown and KaTeX. The theme system uses CSS variables for dynamic styling.

## Technical Implementations
The prediction engine employs a 5-signal weighted scoring system. Solutions are CBSE marking scheme-aligned. The core learning loop uses `dailyMixGenerator.ts` and client-side storage with Firestore sync. An `/api/check-solution` endpoint leverages Gemini Vision for handwritten solution evaluation. The Spaced Repetition Engine uses FSRS (Free Spaced Repetition Scheduler) targeting 90% retention, with mastery demotion logic. A Daily Mission System provides structured study sessions, adaptable based on an Adaptive Timeline Profiles system (Marathon, Sprint, Crash/Focus Plan modes). Subscription tiers and authentication (Google OAuth, Phone OTP, guest access) control feature access. A mobile app mirrors the web app's design with shared data and Firebase JS SDK. Student wellness features include anti-anxiety measures and adaptive interface changes based on exam urgency. Large page components are refactored into smaller, maintainable parts with global Error Boundaries. A Teacher Dashboard allows class creation and progress tracking. NCERT chapter references are integrated, and Exam Strategy Training components provide pre-mock tips and time guidance. An admin page provides Onboarding Funnel Analytics.

## Server Architecture
The LazyTopper AI server is fully modularized with `server/index.cjs` as a thin composition root. Configuration and utilities are separated. The mentor route is split into seven sub-modules for request handling, mode classification, response building, diagram helpers, teach contract handling, and evaluation. The prompt system is also modularized into domain-specific modules for core prompts, static data, grind, diagram, teach contract, validation, and learn prompts. AI clients for Gemini and Claude are abstracted. Other routes include sharing, diagrams, "more like this," step solutions, check solutions, and questions. A `StudentDataService` provides a unified facade for student data management, including schema versioning and migration. A 3-layer API cost optimization prioritizes static question banks, then pre-generated visuals, with AI as a fallback. All modules use factory functions with dependency injection, and prompt sub-modules use a shared context pattern.

## Routing Architecture
The frontend has a single entry point, with all client-side routes served from the `lazytopper-app` artifact at `/`. The API server handles `/shared-api/*` routes, and an AI Gateway proxy handles `/api/*` routes. In development, Vite serves the frontend and proxies API requests. In production, static files are pre-built and served.

## System Design Choices
TypeScript is used throughout, with pnpm workspaces and composite projects. API design follows OpenAPI 3.1 with Orval for codegen. The API server has a 5 MB request body limit, and AI tutor responses have increased `maxOutputTokens`.

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
- **Interactive Visual Explainers**: 96 pre-generated HTML files with inline CSS/JS covering all CBSE Class 10 chapters, stored in `lazytopper/public/visuals/` and registered via `lazytopper/src/data/visualConceptRegistry.ts`.