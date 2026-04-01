$ErrorActionPreference = 'Stop'

$timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$exportBase = 'C:\Users\Chetan\OneDrive\Desktop\Lazytopper\wayforward\23-01-2026\GPT Codes'
$exportFolderName = "LT_${timestamp}_PRACTICE_INTEGRATION_PACK"
$exportFolder = Join-Path $exportBase $exportFolderName
$zipPath = Join-Path $exportBase "LT_${timestamp}_PRACTICE_INTEGRATION_PACK_CODEX_EXPORT.zip"

$filesToCopy = @(
  "src/App.tsx",
  "src/main.tsx",
  "src/pages/PracticePage.tsx",
  "src/ai/aiClient.ts",
  "server/index.cjs",
  "src/data/questionGenerator.ts",
  "src/data/practiceSetGenerator.ts",
  "src/data/promptDPracticePacks.ts",
  "src/data/class10ContentConfig.ts",
  "src/data/topicHubV2Full.ts",
  "src/data/predictedQuestions.ts",
  "src/data/predictedQuestionsAdditions.ts",
  "src/data/predictedQuestionsScience.ts"
)

New-Item -ItemType Directory -Force -Path $exportFolder | Out-Null

foreach ($file in $filesToCopy) {
  $source = Join-Path $PWD $file
  if (-not (Test-Path $source)) {
    throw "Required file missing: $file"
  }
  $dest = Join-Path $exportFolder $file
  $destDir = Split-Path $dest -Parent
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  Copy-Item -Force $source -Destination $dest
}

$reportLines = @(
  '# PRACTICE INTEGRATION REPORT',
  '',
  '1. **Practice route + params**',
  '- Route: `/practice/:grade/:subject` (e.g., `/practice/10/Maths`).',
  '- Query params: `topic` (display slug), `topicKey` (explicit pack key), `section`/`pattern`/`type` map to board sections A-E, and optional `boardPattern` may be passed via navigation state.',
  '- Navigation state (`location.state.practiceFilters`) allows richer payloads: `subtopicHint`, `focusBankIds`, `recommendedCount`, `difficultyPreset`, and `sectionFilter` overrides.',
  '',
  '2. **Generator input schema**',
  '- `buildPracticeQuestionsFromEngine` accepts `{ subjectKey, topicKey, count, difficulty, subtopicHint?, focusBankIds?, boardPattern? }` and enforces a 3-25 question window.',
  '- It taps `generatePracticeSet` (`src/data/practiceSetGenerator.ts`) which merges bank-curated questions+generated variants and normalizes board patterns/difficulty mixes.',
  '- AI top-up is handled by `generateMoreLikeThis` (`src/ai/aiClient.ts`), which POSTs `{ subject, topicKey, seedQuestion, numVariants }` to `/api/more-like-this` and appends the response variants when the bank set is short.',
  '',
  '3. **Practice decision logic**',
  '- Topic selection resolves via `resolvePracticePackKey`: canonical topic slugs to practice pack keys defined in `src/data/promptDPracticePacks.ts`. Fallbacks cross-reference canonical topic metadata under `src/data/class10ContentConfig.ts` and `src/data/topicHubV2Full.ts`.',
  '- Difficulty respects the dropdown state (`All/Easy/Medium/Hard`) and can be pre-seeded (`difficultyPreset`).',
  '- Section/type filters come from query params (`section`, `pattern`, `type`) or nav `sectionFilter`, and the UI enforces uppercase A-E or ALL.",
  '- `practiceFilters.focusBankIds` and `subtopicHint` influence ordering by promoting focused bank questions sourced from `src/data/predictedQuestions*.ts` through the unified `questionGenerator`.',
  '',
  '4. **Best integration path**',
  '- **Query params** are the most reliable entry (topic/topicKey/section) and align with `/practice/:grade/:subject?topic=Triangles&section=A`. They survive page refresh and link sharing.',
  '- Use **router state** only when passing extra hints (focus IDs, board patterns, recommendedCount) from interactive components (Trends/TopicHub) because only that entry point controls `location.state.practiceFilters`.',
  '- Global store/context is not required; the page self-manages selection via React state and effects.',
  '',
  '5. **Blockers / unknowns**',
  '- The `practiceFilters` object depends on upstream components explicitly populating `location.state`; links from third-party screens must replicate that shape.',
  '- Board-pattern overrides are normalized through `normalizeBoardPattern`, but the UI does not expose a canonical pattern selector yet, making programmatic injection (via nav state) non-trivial.',
  '- AI top-up requires the backend `/api/more-like-this` gateway (server/index.cjs) with Gemini credentials; offline QA will need mock responses.',
  '',
  'Summary: Hook integrations via the `/practice/:grade/:subject` route + query params and, when necessary, supply richer hints through router state so the unified generator can target the correct topic/difficulty/section mix.'
)

$reportLines | Set-Content -Encoding UTF8 -Path (Join-Path $exportFolder 'PRACTICE_INTEGRATION_REPORT.md')

Write-Host "Zipping $exportFolderName..."
Compress-Archive -Path (Join-Path $exportFolder '*') -DestinationPath $zipPath -Force

Write-Host "Export ready: $zipPath"
