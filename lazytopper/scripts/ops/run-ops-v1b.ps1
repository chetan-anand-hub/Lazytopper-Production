$ErrorActionPreference = 'Stop'

$timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$exportBase = 'C:\Users\Chetan\OneDrive\Desktop\Lazytopper\wayforward\23-01-2026\GPT Codes'
$exportFolderName = "LT_${timestamp}_OPS_V1B_MOJIBAKE_ROOTFIX"
$exportFolder = Join-Path $exportBase $exportFolderName
$zipPath = Join-Path $exportBase "LT_${timestamp}_OPS_V1B_MOJIBAKE_ROOTFIX_CODEX_EXPORT.zip"

New-Item -ItemType Directory -Force -Path $exportFolder | Out-Null

$beforeMatchesPath = 'docs/ops/out/mojibake_matches_before.txt'
$afterMatchesPath = 'docs/ops/out/mojibake_matches_after.txt'
$summaryPath = 'docs/ops/out/mojibake_scan_summary.json'
$checklistDocPath = 'docs/ops/checklists/triangles.closure.checklist.json'
$srcChecklistCopy = 'src/data/ops/triangles_closure_checklist.json'
$auditReportDocPath = 'docs/ops/out/triangles_audit_report.json'
$srcAuditCopy = 'src/data/ops/triangles_audit_report.json'
$runReportPath = Join-Path $PWD 'RUN_REPORT.md'
$sessionLogPath = Join-Path $PWD 'session_change_log.md'
$changeLogPath = Join-Path $PWD 'docs/change-log.md'
$buildLog = Join-Path $exportFolder 'build.log'
$auditLog = Join-Path $exportFolder 'audit.log'
$mojibakeLog = Join-Path $exportFolder 'mojibake_cleaner.log'
$gitDiffSummary = Join-Path $exportFolder 'git_diff_summary.txt'

Write-Host 'Running mojibake cleaner (Node) ...'
node scripts/ops/mojibake_cleaner.mjs 2>&1 | Tee-Object -FilePath $mojibakeLog

if (-not (Test-Path $summaryPath)) {
  throw "Mojibake summary missing at $summaryPath."
}

$summary = Get-Content -Raw $summaryPath | ConvertFrom-Json
$beforeCount = $summary.beforeCount
$afterCount = $summary.afterCount
Write-Host "Mojibake matches: before=$beforeCount, after=$afterCount"

if ($afterCount -ne 0) {
  throw "Mojibake matches still present after cleaning. Check $afterMatchesPath."
}

Copy-Item -Force $checklistDocPath $srcChecklistCopy

Write-Host "Running npm run build..."
npm run build 2>&1 | Tee-Object -FilePath $buildLog
$buildExitCode = $LASTEXITCODE
if ($buildExitCode -ne 0) {
  throw "npm run build failed (see $buildLog)."
}

$previousEnv = $env:OPS_BUILD_OK
$env:OPS_BUILD_OK = "1"
Write-Host "Running npm run ops:triangles-audit..."
npm run ops:triangles-audit 2>&1 | Tee-Object -FilePath $auditLog
$auditExitCode = $LASTEXITCODE
$env:OPS_BUILD_OK = $previousEnv
if ($auditExitCode -ne 0) {
  throw "npm run ops:triangles-audit failed (see $auditLog)."
}

if (-not (Test-Path $auditReportDocPath)) {
  throw "Audit report missing at $auditReportDocPath."
}

Copy-Item -Force $auditReportDocPath $srcAuditCopy

$auditData = Get-Content -Raw $auditReportDocPath | ConvertFrom-Json
if (-not $auditData) {
  throw "Unable to parse audit report JSON."
}

$buildStatusText = if ($buildExitCode -eq 0) { 'pass' } else { 'FAIL' }
$auditStatusText = if ($auditExitCode -eq 0) { 'pass' } else { 'FAIL' }

$gitStatusLines = & git diff --name-only HEAD

$runReportLines = @(
  '# RUN REPORT - Triangles OPS V1B Mojibake Root Fix',
  '',
  "## Stage summary ($timestamp)",
  "- Build status: $buildStatusText (`build.log`)",
  "- Audit status: $auditStatusText (`audit.log`)",
  "",
  "## Mojibake cleanup",
  "- Matches before cleanup: $beforeCount (`docs/ops/out/mojibake_matches_before.txt`)",
  "- Matches after cleanup: $afterCount (`docs/ops/out/mojibake_matches_after.txt`)",
  "",
  "## What changed",
  "- Sanitized mojibake tokens using `scripts/ops/mojibake_cleaner.mjs`.",
  "- Added OpsChecklist UI + /__ops/checklist dev route with persisted state.",
  "- Synced checklist/audit JSON under `src/data/ops`.",
  "- Updated the triangles audit gate logic to honor `OPS_BUILD_OK=1`.",
  "- Files changed:"
)

foreach ($file in $gitStatusLines) {
  $runReportLines += "-   $file"
}

$runReportLines += ""
$runReportLines += "### Audit gate snapshot"
foreach ($gate in $auditData.gates.PSObject.Properties) {
  $statusLabel = if ($gate.Value.status) { 'PASS' } else { 'FAIL' }
  $runReportLines += "- $($gate.Name): $statusLabel · $($gate.Value.details)"
}

$runReportLines | Set-Content -Encoding UTF8 $runReportPath
Copy-Item -Force $runReportPath $exportFolder

$sessionEntry = @"
## $timestamp - Ops V1B Mojibake Root Fix
- Sanitized repository-wide mojibake matches ($beforeCount → $afterCount).
- Added the OpsChecklist UI + dev-only /__ops/checklist route with persisted state.
- Reran npm run build + npm run ops:triangles-audit (OPS_BUILD_OK=1) and aligned gates.
- Exported artifacts to $exportFolder.
"@
Add-Content -Encoding UTF8 $sessionLogPath $sessionEntry
Copy-Item -Force $sessionLogPath $exportFolder

$changeLogEntry = @"
### Ops Checklist V1B / Mojibake Root Fix $timestamp
- Removed $beforeCount mojibake matches across source files (now $afterCount remain).
- Added the OpsChecklist UI + dev-only /__ops/checklist route with persisted state.
- Updated the triangles audit gate script and reran npm run build + npm run ops:triangles-audit (OPS_BUILD_OK=1).
"@
Add-Content -Encoding UTF8 $changeLogPath $changeLogEntry
Copy-Item -Force $changeLogPath $exportFolder

$docsOpsChecklistExport = Join-Path $exportFolder 'docs/ops/checklists'
New-Item -ItemType Directory -Force -Path $docsOpsChecklistExport | Out-Null
Copy-Item -Force $checklistDocPath $docsOpsChecklistExport

$docsOpsOutExport = Join-Path $exportFolder 'docs/ops/out'
New-Item -ItemType Directory -Force -Path $docsOpsOutExport | Out-Null
Copy-Item -Force $beforeMatchesPath $docsOpsOutExport
Copy-Item -Force $afterMatchesPath $docsOpsOutExport
Copy-Item -Force $auditReportDocPath $docsOpsOutExport

$srcPagesExport = Join-Path $exportFolder 'src/pages'
New-Item -ItemType Directory -Force -Path $srcPagesExport | Out-Null
Copy-Item -Force 'src/pages/OpsChecklist.tsx' $srcPagesExport

$srcDataOpsExport = Join-Path $exportFolder 'src/data/ops'
New-Item -ItemType Directory -Force -Path $srcDataOpsExport | Out-Null
Copy-Item -Force $srcChecklistCopy $srcDataOpsExport
Copy-Item -Force $srcAuditCopy $srcDataOpsExport

$scriptsOpsExport = Join-Path $exportFolder 'scripts/ops'
New-Item -ItemType Directory -Force -Path $scriptsOpsExport | Out-Null
Copy-Item -Force 'scripts/ops/triangles_audit.mjs' $scriptsOpsExport
Copy-Item -Force 'scripts/ops/mojibake_cleaner.mjs' $scriptsOpsExport
Copy-Item -Force $MyInvocation.MyCommand.Path $scriptsOpsExport

$logsExport = Join-Path $exportFolder 'logs'
New-Item -ItemType Directory -Force -Path $logsExport | Out-Null
Copy-Item -Force $buildLog $logsExport
Copy-Item -Force $auditLog $logsExport
Copy-Item -Force $mojibakeLog $logsExport

$gitSummary = @()
$gitSummary += '## git status -sb'
$gitSummary += (& git status -sb)
$gitSummary += ""
$gitSummary += '## git diff --stat HEAD'
$gitSummary += (& git diff --stat HEAD)
$gitSummary | Set-Content -Encoding UTF8 $gitDiffSummary

Copy-Item -Force $gitDiffSummary $exportFolder

Write-Host ''
Write-Host 'Zipping export folder...'
Compress-Archive -Path (Join-Path $exportFolder '*') -DestinationPath $zipPath -Force

Write-Host ''
Write-Host "Export complete: $zipPath"
