$ErrorActionPreference = 'Stop'

$timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$exportBase = 'C:\Users\Chetan\OneDrive\Desktop\Lazytopper\wayforward\23-01-2026\GPT Codes'
$exportFolderName = "LT_${timestamp}_LEARN_LOCK_AUDIT"
$exportFolder = Join-Path $exportBase $exportFolderName
$zipPath = Join-Path $exportBase "LT_${timestamp}_LEARN_LOCK_AUDIT_CODEX_EXPORT.zip"

$auditLog = Join-Path $exportFolder 'audit.log'
$auditReport = 'docs/ops/out/triangles_audit_report.json'
$runReportPath = 'RUN_REPORT.md'
$sessionLog = 'session_change_log.md'
$changeLog = 'docs/change-log.md'
$trianglesAuditScript = 'scripts/ops/triangles_audit.mjs'

New-Item -ItemType Directory -Force -Path $exportFolder | Out-Null

Write-Host "Running npm run ops:triangles-audit..."
$prevErrorAction = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
  npm run ops:triangles-audit 2>&1 | Tee-Object -FilePath $auditLog
} finally {
  $ErrorActionPreference = $prevErrorAction
}
if ($LASTEXITCODE -ne 0) {
  throw "npm run ops:triangles-audit failed (see $auditLog)."
}

if (-not (Test-Path $auditReport)) {
  throw "Audit report missing at $auditReport."
}

$auditData = Get-Content -Raw $auditReport | ConvertFrom-Json
$learnChecks = $auditData.wiringChecks | Where-Object { $_.id -like 'learn*' }

$runReportLines = @(
  '# RUN REPORT - Learn Lock Audit',
  '',
  "## Summary ($timestamp)",
  '- `npm run ops:triangles-audit` (logs: `audit.log`)',
  "- Build gate: $($(if ($auditData.gates.build.status) { 'PASS' } else { 'FAIL' }))",
  "- Mojibake gate: $($(if ($auditData.gates.mojibake_scan.status) { 'PASS' } else { 'FAIL' }))",
  '',
  '## Learn wiring checks'
)

foreach ($check in $learnChecks) {
  $status = if ($check.status) { 'PASS' } else { 'FAIL' }
  $runReportLines += "- $($check.id): $status ($($check.description))"
}

$runReportLines += ''
$runReportLines += '## Gates'
foreach ($gate in $auditData.gates.PSObject.Properties) {
  $status = if ($gate.Value.status) { 'PASS' } else { 'FAIL' }
  $runReportLines += "- $($gate.Name): $status ($($gate.Value.details))"
}

$runReportLines += ''
$runReportLines += '## Notes'
$runReportLines += '- Audit report path: `docs/ops/out/triangles_audit_report.json`'
$runReportLines += '- Learn lock checks gate the Triangles Learn tab.'

$runReportLines | Set-Content -Encoding UTF8 $runReportPath
Copy-Item -Force $runReportPath $exportFolder

$sessionEntry = @"
## $timestamp - Learn Lock Audit
- Added Learn tab gating checks to scripts/ops/triangles_audit.mjs.
- Reran npm run ops:triangles-audit and captured audit log + report.
- Exported artifacts under $exportFolderName.
"@
Add-Content -Encoding UTF8 $sessionLog $sessionEntry
Copy-Item -Force $sessionLog $exportFolder

$changeEntry = @"
### Learn Lock Audit $timestamp
- Triangles audit now enforces the Learn tab lock (Teach + Board Examples only), inline doubt wiring, and diagram-first messaging.
- Audit report freshness: `docs/ops/out/triangles_audit_report.json`.
"@
Add-Content -Encoding UTF8 $changeLog $changeEntry
Copy-Item -Force $changeLog $exportFolder

$docsOutExport = Join-Path $exportFolder 'docs/ops/out'
New-Item -ItemType Directory -Force -Path $docsOutExport | Out-Null
Copy-Item -Force $auditReport $docsOutExport

$scriptsExport = Join-Path $exportFolder 'scripts/ops'
New-Item -ItemType Directory -Force -Path $scriptsExport | Out-Null
Copy-Item -Force $trianglesAuditScript $scriptsExport

$logsExport = Join-Path $exportFolder 'logs'
New-Item -ItemType Directory -Force -Path $logsExport | Out-Null
Copy-Item -Force $auditLog $logsExport

Write-Host "Zipping $exportFolderName..."
Compress-Archive -Path (Join-Path $exportFolder '*') -DestinationPath $zipPath -Force

Write-Host "Export ready: $zipPath"
