param(
  [Parameter(Mandatory = $true)]
  [string]$TaskName,

  [ValidateSet("fast", "full")]
  [string]$Suite = "fast",

  [string[]]$Extra,

  [string]$TaskId
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-SafeName {
  param([string]$Raw)
  $safe = [regex]::Replace([string]$Raw, "[^A-Za-z0-9._-]+", "_")
  $safe = $safe.Trim("_")
  if ([string]::IsNullOrWhiteSpace($safe)) { return "task" }
  return $safe
}

function Write-LogLine {
  param(
    [string]$Path,
    [string]$Line
  )
  for ($attempt = 1; $attempt -le 8; $attempt++) {
    try {
      [System.IO.File]::AppendAllText(
        $Path,
        ([string]$Line + [Environment]::NewLine),
        [System.Text.UTF8Encoding]::new($false)
      )
      return
    } catch [System.IO.IOException] {
      if ($attempt -eq 8) { throw }
      Start-Sleep -Milliseconds 120
    }
  }
}

function Invoke-LoggedCommand {
  param(
    [string]$CommandLine,
    [string]$LogPath
  )

  $start = Get-Date
  Write-LogLine -Path $LogPath -Line ""
  Write-LogLine -Path $LogPath -Line ("=" * 92)
  Write-LogLine -Path $LogPath -Line (">>> START  : " + $start.ToString("yyyy-MM-dd HH:mm:ss"))
  Write-LogLine -Path $LogPath -Line (">>> COMMAND: " + $CommandLine)
  Write-LogLine -Path $LogPath -Line ("=" * 92)

  $output = & cmd.exe /d /c "$CommandLine 2>&1"
  $exitCode = $LASTEXITCODE

  if ($null -ne $output) {
    if ($output -is [System.Array]) {
      foreach ($line in $output) {
        Write-LogLine -Path $LogPath -Line ([string]$line)
      }
    } else {
      Write-LogLine -Path $LogPath -Line ([string]$output)
    }
  }

  $end = Get-Date
  $durationSec = [Math]::Round(($end - $start).TotalSeconds, 2)
  Write-LogLine -Path $LogPath -Line ("--- END    : " + $end.ToString("yyyy-MM-dd HH:mm:ss"))
  Write-LogLine -Path $LogPath -Line ("--- EXIT   : " + $exitCode)
  Write-LogLine -Path $LogPath -Line ("--- DURATION_SEC: " + $durationSec)

  return [pscustomobject]@{
    Command     = $CommandLine
    ExitCode    = [int]$exitCode
    StartedAt   = $start
    EndedAt     = $end
    DurationSec = $durationSec
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
Set-Location -Path $repoRoot

$testRunsDir = Join-Path $repoRoot "docs\project_memory\test_runs"
if (-not (Test-Path -LiteralPath $testRunsDir)) {
  New-Item -ItemType Directory -Path $testRunsDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$safeTaskName = Get-SafeName -Raw $TaskName
$safeTaskId = Get-SafeName -Raw $TaskId

if (-not [string]::IsNullOrWhiteSpace($safeTaskId)) {
  $taskRunDir = Join-Path $testRunsDir $safeTaskId
  if (-not (Test-Path -LiteralPath $taskRunDir)) {
    New-Item -ItemType Directory -Path $taskRunDir -Force | Out-Null
  }
  $logPath = Join-Path $taskRunDir ("{0}_verify.log" -f $safeTaskId)
  $summaryPath = Join-Path $taskRunDir ("{0}_verify_summary.md" -f $safeTaskId)
} else {
  $logPath = Join-Path $testRunsDir ("{0}_{1}.log" -f $timestamp, $safeTaskName)
  $summaryPath = Join-Path $testRunsDir ("{0}_{1}_summary.md" -f $timestamp, $safeTaskName)
}

$commands = New-Object System.Collections.Generic.List[string]
$commands.Add("node -v") | Out-Null
$commands.Add("npm -v") | Out-Null
$commands.Add("npm run lint:ci") | Out-Null
$commands.Add("npm run build") | Out-Null

if ($Suite -eq "full") {
  $commands.Add("npm run test:repo-boundary") | Out-Null
  $commands.Add("npm run test:dependency:risk") | Out-Null
  $commands.Add("npm run test:syllabus:scope-guard") | Out-Null
  $commands.Add("npm run test:topichub:doc-alignment") | Out-Null
  $commands.Add("npm run test:pro-tips:acceptance") | Out-Null
}

if ($Extra) {
  foreach ($item in $Extra) {
    $trimmed = [string]$item
    $trimmed = $trimmed.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed)) { continue }
    if ($trimmed -match "^\s*npm\s+run\s+") {
      $commands.Add($trimmed) | Out-Null
    } else {
      $commands.Add("npm run $trimmed") | Out-Null
    }
  }
}

Write-LogLine -Path $logPath -Line ("CODEX VERIFY")
Write-LogLine -Path $logPath -Line ("TaskName: " + $TaskName)
if (-not [string]::IsNullOrWhiteSpace($safeTaskId)) {
  Write-LogLine -Path $logPath -Line ("TaskId  : " + $safeTaskId)
}
Write-LogLine -Path $logPath -Line ("Suite   : " + $Suite)
Write-LogLine -Path $logPath -Line ("Repo    : " + $repoRoot)
Write-LogLine -Path $logPath -Line ("Started : " + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"))

$results = New-Object System.Collections.Generic.List[object]
$failed = $null
foreach ($cmd in $commands) {
  $result = Invoke-LoggedCommand -CommandLine $cmd -LogPath $logPath
  $results.Add($result) | Out-Null
  if ($result.ExitCode -ne 0) {
    $failed = $result
    break
  }
}

$status = if ($failed) { "FAIL" } else { "PASS" }

$summary = New-Object System.Collections.Generic.List[string]
$summary.Add("# CODEX Verify Summary") | Out-Null
$summary.Add("") | Out-Null
$summary.Add("- Task: $TaskName") | Out-Null
if (-not [string]::IsNullOrWhiteSpace($safeTaskId)) {
  $summary.Add("- Task Id: $safeTaskId") | Out-Null
}
$summary.Add("- Suite: $Suite") | Out-Null
$summary.Add("- Timestamp: $timestamp") | Out-Null
$summary.Add("- Log File: $logPath") | Out-Null
$summary.Add("- Summary File: $summaryPath") | Out-Null
$summary.Add("- Final Status: **$status**") | Out-Null

if ($failed) {
  $summary.Add("- Failing Step: $($failed.Command) (exit code $($failed.ExitCode))") | Out-Null
}

$summary.Add("") | Out-Null
$summary.Add("## Commands Executed") | Out-Null
$summary.Add("") | Out-Null

$i = 1
foreach ($row in $results) {
  $summary.Add(("{0}. {1} -> exit {2} ({3}s)" -f $i, $row.Command, $row.ExitCode, $row.DurationSec)) | Out-Null
  $i++
}

Set-Content -Path $summaryPath -Value ($summary -join [Environment]::NewLine) -Encoding UTF8

Write-Host ("LOG_PATH: " + $logPath)
Write-Host ("SUMMARY_PATH: " + $summaryPath)
Write-Host ("FINAL_STATUS: " + $status)

if ($failed) {
  exit 1
}

exit 0
