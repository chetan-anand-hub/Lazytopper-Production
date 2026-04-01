# Category: Tracked Tooling; Purpose: One-minute startup proof for repo identity, cleanliness, and hard-boundary safety.
[CmdletBinding()]
param(
  [switch]$AllowDirty
)

$ErrorActionPreference = 'Stop'

function Write-Section([string]$Title) {
  Write-Output ""
  Write-Output "=== $Title ==="
}

$failures = New-Object System.Collections.Generic.List[string]

Write-Section "Repo Identity"
$pwdPath = (Get-Location).Path
$topLevel = (& git rev-parse --show-toplevel).Trim()
$branch = (& git branch --show-current).Trim()
Write-Output "pwd: $pwdPath"
Write-Output "repo: $topLevel"
Write-Output "branch: $branch"

Write-Section "Working Tree"
$status = @(& git status --porcelain=v2 2>$null)
$status = $status | Where-Object { "$_".Trim() -ne "" }
if ($status.Count -eq 0) {
  Write-Output "clean: yes"
} else {
  Write-Output "clean: no"
  $status | ForEach-Object { Write-Output $_ }
  if (-not $AllowDirty) {
    $failures.Add("Working tree is dirty.")
  }
}

Write-Section "Hard Boundary Proof"
$checks = @(
  @{ Label = "docs/session"; Path = "docs/session" },
  @{ Label = ".project_memory"; Path = ".project_memory" },
  @{ Label = "docs/ops/out"; Path = "docs/ops/out" },
  @{ Label = "reports"; Path = "reports" },
  @{ Label = ".codex_runs"; Path = ".codex_runs" },
  @{ Label = "tools/.local_ops"; Path = "tools/.local_ops" }
)

foreach ($check in $checks) {
  $tracked = @(& git ls-files $check.Path 2>$null)
  $tracked = $tracked | Where-Object { "$_".Trim() -ne "" }
  if ($tracked.Count -eq 0) {
    Write-Output "$($check.Label): OK (no tracked files)"
  } else {
    Write-Output "$($check.Label): FAIL (tracked files found)"
    $tracked | ForEach-Object { Write-Output " - $_" }
    $failures.Add("$($check.Label) contains tracked files.")
  }
}

Write-Section "Local Diff Snapshot"
$diffFiles = @(& git diff --name-only 2>$null)
$diffFiles = $diffFiles | Where-Object { "$_".Trim() -ne "" }
if ($diffFiles.Count -eq 0) {
  Write-Output "diff: none"
} else {
  $diffFiles | ForEach-Object { Write-Output $_ }
}

Write-Section "Summary"
if ($failures.Count -eq 0) {
  Write-Output "SESSION_START_CHECK_OK"
  exit 0
}

Write-Output "SESSION_START_CHECK_FAIL"
$failures | ForEach-Object { Write-Output " - $_" }
exit 1
