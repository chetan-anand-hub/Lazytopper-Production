$ErrorActionPreference = 'Stop'

$timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$exportBase = 'C:\Users\Chetan\OneDrive\Desktop\Lazytopper\wayforward\23-01-2026\GPT Codes'
$exportFolder = Join-Path $exportBase "LT_${timestamp}_OPS_CHECKLIST_V1"
$zipPath = Join-Path $exportBase "LT_${timestamp}_OPS_CHECKLIST_V1_CODEX_EXPORT.zip"

New-Item -ItemType Directory -Force -Path $exportFolder | Out-Null

$buildLog = Join-Path $exportFolder 'build.log'
$auditLog = Join-Path $exportFolder 'audit.log'
$gitDiffSummary = Join-Path $exportFolder 'git_diff_summary.txt'
$runReportPath = Join-Path $PWD 'RUN_REPORT.md'
$sessionLogPath = Join-Path $PWD 'session_change_log.md'
$changelogPath = Join-Path $PWD 'docs/change-log.md'
$checklistPath = Join-Path $PWD 'docs/ops/checklists/triangles.closure.checklist.json'
$auditReportPath = Join-Path $PWD 'docs/ops/out/triangles_audit_report.json'

New-Item -ItemType Directory -Force -Path (Split-Path $auditReportPath) | Out-Null

$buildErrorMessage = ''
Write-Host 'Running npm run build...'
$buildPrevErrorAction = $ErrorActionPreference
try {
    $ErrorActionPreference = 'Continue'
    npm run build 2>&1 | Tee-Object -FilePath $buildLog
    $buildExitCode = $LASTEXITCODE
}
catch {
    $buildExitCode = $LASTEXITCODE
    $buildErrorMessage = $_.Exception.Message
    Write-Host "npm run build failed: $buildErrorMessage"
}
finally {
    $ErrorActionPreference = $buildPrevErrorAction
}
$buildSucceeded = $buildExitCode -eq 0
$buildStatusText = if ($buildSucceeded) { 'pass' } else { 'FAIL' }

$auditRan = $false
$auditExitCode = $null
$auditStatusText = 'not run'

$auditErrorMessage = ''
if ($buildSucceeded) {
    Write-Host 'Running npm run ops:triangles-audit...'
    $auditPrevErrorAction = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        npm run ops:triangles-audit 2>&1 | Tee-Object -FilePath $auditLog
        $auditExitCode = $LASTEXITCODE
    }
    catch {
        $auditExitCode = $LASTEXITCODE
        $auditErrorMessage = $_.Exception.Message
        Write-Host "npm run ops:triangles-audit failed: $auditErrorMessage"
    }
    finally {
        $ErrorActionPreference = $auditPrevErrorAction
    }
    $auditRan = $true
    $auditStatusText = if ($auditExitCode -eq 0) { 'pass' } else { 'FAIL' }
} else {
    Write-Host 'Skipping ops:triangles-audit because build failed.'
}

$auditData = $null
if (Test-Path $auditReportPath) {
    $auditData = Get-Content -Raw $auditReportPath | ConvertFrom-Json
}

Write-Host ''
$runReportLines = @(
    '# RUN REPORT - Triangles Ops Checklist',
    '',
    "## Stage summary ($timestamp)",
    "- Build status: $buildStatusText (build.log)",
    "- Audit status: $auditStatusText",
    ''
)

if ($buildErrorMessage) {
    $runReportLines += "- Build error detail: $buildErrorMessage"
}

if ($auditErrorMessage) {
    $runReportLines += "- Audit error detail: $auditErrorMessage"
}

$runReportLines += ''
$runReportLines += '### What changed / was recorded'
$runReportLines += '- Captured npm build output in build.log.'
$runReportLines += '- Captured npm audit output in audit.log (if run).'
$runReportLines += '- Updated session progress + changelog entries for this run.'
$runReportLines += '- Exported key artifacts under the approved OPS checklist folder.'
$runReportLines += ''
$runReportLines += '### Audit gate results'

if ($auditData -and $auditData.gates) {
    foreach ($gateProp in $auditData.gates.PSObject.Properties) {
        $detail = $gateProp.Value.details -replace '\r?\n', ' '
        $runReportLines += "- $($gateProp.Name): $($gateProp.Value.status) - $detail"
    }
} else {
    $runReportLines += '- Gate snapshot unavailable (audit not run or report missing).'
}

$runReportLines | Set-Content -Encoding UTF8 $runReportPath
Copy-Item -Force $runReportPath $exportFolder

$sessionEntry = @"
## $timestamp - OPS Checklist Run
- Ran npm run build (status: $buildStatusText).
- Ran npm run ops:triangles-audit (status: $auditStatusText).
- Recorded export artifacts in $exportFolder.
"@
Add-Content -Encoding UTF8 $sessionLogPath $sessionEntry
Copy-Item -Force $sessionLogPath $exportFolder

$changelogEntry = @"
### OPS Checklist Run $timestamp
- Captured npm run build + npm run ops:triangles-audit outputs for Triangles.
- Updated the session progress log + audit report state.
"@
Add-Content -Encoding UTF8 $changelogPath $changelogEntry
Copy-Item -Force $changelogPath $exportFolder

Copy-Item -Force $checklistPath $exportFolder

if (Test-Path $auditReportPath) {
    Copy-Item -Force $auditReportPath $exportFolder
}

if (-not (Test-Path $gitDiffSummary)) {
    New-Item -ItemType File -Path $gitDiffSummary | Out-Null
}

$gitSummary = @()
$gitSummary += '## git status -sb'
$gitSummary += (& git status -sb)
$gitSummary += ''
$gitSummary += '## git diff --stat HEAD'
$gitSummary += (& git diff --stat HEAD)
$gitSummary | Set-Content -Encoding UTF8 $gitDiffSummary

Write-Host ''
Write-Host 'Zipping export folder...'
Compress-Archive -Path (Join-Path $exportFolder '*') -DestinationPath $zipPath -Force

Write-Host ''
Write-Host "Export complete: $zipPath"
