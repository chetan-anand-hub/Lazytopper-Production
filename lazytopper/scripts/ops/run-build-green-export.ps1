$ErrorActionPreference = 'Stop'

$timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$exportBase = 'C:\Users\Chetan\OneDrive\Desktop\Lazytopper\wayforward\23-01-2026\GPT Codes'
$exportFolderName = "LT_${timestamp}_TRIANGLES_CLOSE_BUILD_GREEN"
$exportFolder = Join-Path $exportBase $exportFolderName
$zipPath = Join-Path $exportBase "LT_${timestamp}_TRIANGLES_CLOSE_BUILD_GREEN_CODEX_EXPORT.zip"

$buildLog = Join-Path $exportFolder 'build.log'
$auditLog = Join-Path $exportFolder 'audit.log'
$auditReport = 'docs/ops/out/triangles_audit_report.json'
$runReportPath = 'RUN_REPORT.md'
$sessionLog = 'session_change_log.md'
$changeLog = 'docs/change-log.md'
$checklist = 'docs/ops/checklists/triangles.closure.checklist.json'

New-Item -ItemType Directory -Force -Path $exportFolder | Out-Null

Write-Host 'Running npm run build...'
$prevEA = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
  npm run build 2>&1 | Tee-Object -FilePath $buildLog
} finally {
  $ErrorActionPreference = $prevEA
}
$buildResult = $LASTEXITCODE
if ($buildResult -ne 0) {
  throw 'npm run build failed (see build.log)'
}

Write-Host 'Running npm run ops:triangles-audit (OPS_BUILD_OK=1)...'
$previousEnv = $env:OPS_BUILD_OK
$env:OPS_BUILD_OK = '1'
$prevEA = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
  npm run ops:triangles-audit 2>&1 | Tee-Object -FilePath $auditLog
} finally {
  $ErrorActionPreference = $prevEA
  $env:OPS_BUILD_OK = $previousEnv
}
if ($LASTEXITCODE -ne 0) {
  throw 'npm run ops:triangles-audit failed (see audit.log)'
}

if (-not (Test-Path $auditReport)) {
  throw 'Audit report missing'
}

$auditData = Get-Content -Raw $auditReport | ConvertFrom-Json
$gates = @()
foreach ($gate in $auditData.gates.PSObject.Properties) {
  $status = if ($gate.Value.status) { 'PASS' } else { 'FAIL' }
  $gates += "- $($gate.Name): $status ($($gate.Value.details))"
}

$runReport = @(
  '# RUN REPORT - Triangles Close Build Green',
  '',
  "## Summary ($timestamp)",
  '- npm run build (logs: `build.log`)',
  '- npm run ops:triangles-audit (logs: `audit.log`, OPS_BUILD_OK=1)',
  "- Build gate: $($(if ($auditData.gates.build.status) { 'PASS' } else { 'FAIL' }))",
  "- Mojibake gate: $($(if ($auditData.gates.mojibake_scan.status) { 'PASS' } else { 'FAIL' }))",
  '',
  '## Gates',
  $gates,
  '',
  '## Notes',
  '- Audit report refreshed at docs/ops/out/triangles_audit_report.json',
  '- Checklist and audit JSON remain in sync with the gate states.'
)
$runReport | Set-Content -Encoding UTF8 $runReportPath
Copy-Item -Force $runReportPath $exportFolder

$sessionEntry = @"
## $timestamp - Build Green + Learn Lock
- Reran npm run build + npm run ops:triangles-audit (OPS_BUILD_OK=1) so the build gate passes.
- Captured `build.log`, `audit.log`, and reran audit report.
- Exporting artifacts under $exportFolderName.
"@
Add-Content -Encoding UTF8 $sessionLog $sessionEntry
Copy-Item -Force $sessionLog $exportFolder

$changeEntry = @"
### Build Green Triangles Audit $timestamp
- Build gate now passed; audit report rewritten with the new Learn lock checks.
- Export folder $exportFolderName contains logs, report JSON, and checklist state.
"@
Add-Content -Encoding UTF8 $changeLog $changeEntry
Copy-Item -Force $changeLog $exportFolder

$docsOut = Join-Path $exportFolder 'docs/ops/out'
New-Item -ItemType Directory -Force -Path $docsOut | Out-Null
Copy-Item -Force $auditReport $docsOut

New-Item -ItemType Directory -Force -Path (Join-Path $exportFolder 'docs/ops/checklists') | Out-Null
Copy-Item -Force $checklist (Join-Path $exportFolder 'docs/ops/checklists')

$logsDir = Join-Path $exportFolder 'logs'
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
Copy-Item -Force $buildLog $logsDir
Copy-Item -Force $auditLog $logsDir

Write-Host "Zipping $exportFolderName..."
Compress-Archive -Path (Join-Path $exportFolder '*') -DestinationPath $zipPath -Force

Write-Host "Export ready: $zipPath"
