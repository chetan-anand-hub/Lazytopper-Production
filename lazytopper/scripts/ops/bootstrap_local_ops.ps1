# Category: Tracked Tooling; Purpose: Ensure local-only tooling is ignored per-worktree and the local ops folder exists.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$gitDirRaw = (git rev-parse --git-dir).Trim()
if (-not $gitDirRaw) {
  throw 'Unable to resolve git dir via git rev-parse --git-dir.'
}

$repoRoot = (Get-Location).Path
if ([System.IO.Path]::IsPathRooted($gitDirRaw)) {
  $gitDir = (Resolve-Path -LiteralPath $gitDirRaw).Path
} else {
  $gitDir = (Resolve-Path -LiteralPath (Join-Path $repoRoot $gitDirRaw)).Path
}

$excludePath = Join-Path $gitDir 'info\exclude'
$excludeDir = Split-Path $excludePath -Parent
if (-not (Test-Path $excludeDir)) {
  New-Item -ItemType Directory -Force -Path $excludeDir | Out-Null
}

$createdExclude = $false
if (-not (Test-Path $excludePath)) {
  "# Category: Local-only Tooling; Purpose: Per-worktree ignore rules for LazyTopper." | Set-Content -Path $excludePath
  $createdExclude = $true
}

$ignoreLine = 'tools/.local_ops/'
$excludeContent = Get-Content -Path $excludePath -ErrorAction SilentlyContinue
if ($excludeContent -notcontains $ignoreLine) {
  Add-Content -Path $excludePath -Value $ignoreLine
}

$ignorePresent = (Get-Content -Path $excludePath -ErrorAction SilentlyContinue) -contains $ignoreLine
$localOpsPath = Join-Path $repoRoot 'tools\.local_ops'
if (-not (Test-Path $localOpsPath)) {
  New-Item -ItemType Directory -Force -Path $localOpsPath | Out-Null
}

Write-Output "exclude_path=$excludePath"
Write-Output "exclude_created=$createdExclude"
Write-Output "ignore_present=$ignorePresent"
Write-Output "local_ops_path=$localOpsPath"
