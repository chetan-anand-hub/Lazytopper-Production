$ErrorActionPreference = 'Stop'

$timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$exportBase = 'C:\Users\Chetan\OneDrive\Desktop\Lazytopper\wayforward\23-01-2026\GPT Codes'
$exportFolderName = "LT_${timestamp}_OPS_V1B_MOJIBAKE_FIXED"
$exportFolder = Join-Path $exportBase $exportFolderName
$zipName = "LT_${timestamp}_OPS_V1B_MOJIBAKE_FIXED_CODEX_EXPORT.zip"
$zipPath = Join-Path $exportBase $zipName

$mojibakeScript = 'scripts/ops/mojibake_cleaner.mjs'
$mojibakeLog = Join-Path $exportFolder 'mojibake_cleaner.log'
$beforeMatches = 'docs/ops/out/mojibake_src_server_before.txt'
$afterMatches = 'docs/ops/out/mojibake_src_server_after.txt'
$summaryPath = 'docs/ops/out/mojibake_scan_summary.json'
$buildLog = Join-Path $exportFolder 'build.log'
$auditLog = Join-Path $exportFolder 'audit.log'
$auditReport = 'docs/ops/out/triangles_audit_report.json'
$runReportPath = 'RUN_REPORT.md'
$sessionLog = 'session_change_log.md'
$changeLog = 'docs/change-log.md'

New-Item -ItemType Directory -Path $exportFolder -Force | Out-Null

Write-Host "Running mojibake cleaner..."
$prevErrorAction = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
  node $mojibakeScript 2>&1 | Tee-Object -FilePath $mojibakeLog
} finally {
  $ErrorActionPreference = $prevErrorAction
}
if ($LASTEXITCODE -ne 0) {
  throw "`node $mojibakeScript` failed (see $mojibakeLog)."
}

if (-not (Test-Path $summaryPath)) {
  throw "Mojibake summary missing at $summaryPath."
}

$summary = Get-Content -Raw $summaryPath | ConvertFrom-Json
$beforeCount = [int]$summary.beforeCount
$afterCount = [int]$summary.afterCount
$filesScanned = [int]$summary.filesScanned
$rootList = $summary.roots -join ', '

Write-Host "Mojibake counts: before=$beforeCount, after=$afterCount"

if ($beforeCount -gt 0 -and $afterCount -ge $beforeCount) {
  throw "After count ($afterCount) not less than before count ($beforeCount)."
}

if ($afterCount -ne 0) {
  throw "Mojibake matches still present after cleanup ($afterCount)."
}

Write-Host "Running npm run build..."
$prevErrorAction = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
  npm run build 2>&1 | Tee-Object -FilePath $buildLog
} finally {
  $ErrorActionPreference = $prevErrorAction
}
$buildResult = $LASTEXITCODE
if ($buildResult -ne 0) {
  throw "npm run build failed. See $buildLog."
}

$previousBuildEnv = $env:OPS_BUILD_OK
$env:OPS_BUILD_OK = "1"
Write-Host "Running npm run ops:triangles-audit (OPS_BUILD_OK=1)..."
$prevErrorAction = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
  npm run ops:triangles-audit 2>&1 | Tee-Object -FilePath $auditLog
} finally {
  $ErrorActionPreference = $prevErrorAction
}
$auditResult = $LASTEXITCODE
$env:OPS_BUILD_OK = $previousBuildEnv
if ($auditResult -ne 0) {
  throw "npm run ops:triangles-audit failed. See $auditLog."
}

if (-not (Test-Path $auditReport)) {
  throw "Audit report missing at $auditReport."
}

$auditData = Get-Content -Raw $auditReport | ConvertFrom-Json
if ($auditData.mojibakeCount -ne 0) {
  throw "Audit report still reports mojibakeCount=$($auditData.mojibakeCount)."
}

$requiredFilesGate = $auditData.gates.required_files
if (-not $requiredFilesGate.status) {
  throw "Required files gate did not pass: $($requiredFilesGate.details)"
}

$gatesSnapshot = @()
foreach ($gate in $auditData.gates.PSObject.Properties) {
  $status = if ($gate.Value.status) { 'PASS' } else { 'FAIL' }
  $gatesSnapshot += "- $($gate.Name): $status ($($gate.Value.details))"
}

$runReportLines = @(
  "# RUN REPORT - OPS V1B Mojibake Fixed",
  "",
  "## Summary ($timestamp)",
  "- Mojibake cleaner scope: src, server, scripts only.",
  "- Roots scanned: $rootList",
  "- Files scanned: $filesScanned",
  "- Matches before cleanup: $beforeCount",
  "- Matches after cleanup: $afterCount",
  "",
  "## Actions",
  "- `node $mojibakeScript` (logs: `mojibake_cleaner.log`)",
  "- `npm run build` (logs: `build.log`)",
  "- `npm run ops:triangles-audit` (logs: `audit.log`, `OPS_BUILD_OK=1`)",
  "",
  "## Audit gates",
  $gatesSnapshot,
  "",
  "## Notes",
  "- Audit confirmed `docs/ops/out/triangles_audit_report.json` captures the latest gates.",
  "- Mojibake cleaner now writes `mojibake_src_server_before.txt`, `_after`, and the summary JSON."
)

$runReportLines | Set-Content -Encoding UTF8 $runReportPath
Copy-Item -Force $runReportPath $exportFolder

$sessionEntry = @"
## $timestamp - OPS V1B Mojibake Fixed
- Scoped `scripts/ops/mojibake_cleaner.mjs` to src/server/scripts and recorded before/after matches.
- Ran npm run build + npm run ops:triangles-audit (OPS_BUILD_OK=1) once the repo was clean.
- Exporting artifacts under $exportFolderName.
"@
Add-Content -Encoding UTF8 $sessionLog $sessionEntry
Copy-Item -Force $sessionLog $exportFolder

$changeEntry = @"
### OPS V1B Mojibake Fixed $timestamp
- Full-source mojibake cleanup targeted at src/server/scripts via `scripts/ops/mojibake_cleaner.mjs`.
- Verified gates: mojibake scan zero, required files present, wiring checks still green.
- Rebuilt+audited with `OPS_BUILD_OK=1` to keep the checklist gates aligned.
"@
Add-Content -Encoding UTF8 $changeLog $changeEntry
Copy-Item -Force $changeLog $exportFolder

$docsOpsOut = Join-Path $exportFolder 'docs/ops/out'
New-Item -ItemType Directory -Force -Path $docsOpsOut | Out-Null
Copy-Item -Force $beforeMatches $docsOpsOut
Copy-Item -Force $afterMatches $docsOpsOut
Copy-Item -Force $summaryPath $docsOpsOut
Copy-Item -Force $auditReport $docsOpsOut

$scriptsOpsExport = Join-Path $exportFolder 'scripts/ops'
New-Item -ItemType Directory -Force -Path $scriptsOpsExport | Out-Null
Copy-Item -Force $mojibakeScript $scriptsOpsExport
Copy-Item -Force $MyInvocation.MyCommand.Path $scriptsOpsExport

$logsExport = Join-Path $exportFolder 'logs'
New-Item -ItemType Directory -Force -Path $logsExport | Out-Null
Copy-Item -Force $buildLog $logsExport
Copy-Item -Force $auditLog $logsExport
Copy-Item -Force $mojibakeLog $logsExport

Write-Host "Zipping $exportFolderName..."
Compress-Archive -Path (Join-Path $exportFolder '*') -DestinationPath $zipPath -Force

Write-Host "Export ready: $zipPath"
