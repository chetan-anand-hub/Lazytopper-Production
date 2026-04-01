# MVP Deploy Checklist (Tutor-RAG B7)

## Recommended platform
- Vercel (fastest setup for Vite)

## Vercel deploy steps (UI)
1) Open Vercel dashboard and click "Add New Project".
2) "Import Git Repository" and select the LazyTopper repo.
3) Framework preset: Vite.
4) Build command: npm run build
5) Output directory: dist
6) Install command: npm install
7) Click "Deploy".

## Environment variables
- None required for MVP.
- (If you want live AI responses, set GEMINI_API_KEY in the hosting provider and run the server separately.)

## Smoke-test checklist (post-deploy)
1) Landing page loads without console errors.
2) Navigate to /topic-hub/10/maths/triangles.
3) Click the top "Let me teach you" CTA; Tutor drawer opens.
4) "Was this helpful?" feedback submits without crashing.
5) Build assets load and page remains responsive after navigation between Learn/Grind tabs.

## Rollback steps
1) In Vercel, open the project.
2) Go to "Deployments".
3) Select the previous stable deployment.
4) Click "Promote to Production".

## Known caveats
- Vite build may warn about large chunks (>500 kB). This is OK for MVP and does not block deploy.
