# Category: Tracked Tooling; Purpose: Run gates in a detached worktree and export logs outside the repo.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$MainPath,
  [Parameter(Mandatory = $true)]
  [string]$GatePath,
  [Parameter(Mandatory = $true)]
  [string]$OutDir,
  [Parameter(Mandatory = $false)]
  [string]$Commit
)

$ErrorActionPreference = 'Stop'

function Resolve-FullPath([string]$PathValue) {
  $resolved = Resolve-Path -LiteralPath $PathValue -ErrorAction SilentlyContinue
  if ($resolved) { return $resolved.Path }
  return [System.IO.Path]::GetFullPath($PathValue)
}

$mainRoot = Resolve-FullPath $MainPath
$gateRoot = Resolve-FullPath $GatePath
$outRoot = Resolve-FullPath $OutDir

if ($outRoot.StartsWith($mainRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "OutDir must be outside the repo. Provided: $outRoot"
}

$dirty = (git -C $mainRoot status --porcelain)
if ($dirty) {
  throw "Main worktree is dirty. Clean it before running gates."
}

if (-not $Commit) {
  $Commit = (git -C $mainRoot rev-parse HEAD).Trim()
}

if (Test-Path $gateRoot) {
  try {
    git -C $mainRoot worktree remove --force $gateRoot | Out-Null
  } catch {
    Write-Output "Failed to remove existing gate worktree at: $gateRoot"
    Write-Output "Action: git -C $mainRoot worktree remove --force $gateRoot"
    Write-Output "If that fails, close processes using the folder and remove it manually."
    throw
  }
}

New-Item -ItemType Directory -Force -Path $outRoot | Out-Null

try {
  git -C $mainRoot worktree add --detach $gateRoot $Commit | Out-Null
} catch {
  Write-Output "Failed to create gate worktree at: $gateRoot"
  throw
}

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'

function Invoke-GateStep {
  param(
    [string]$Name,
    [string]$Command,
    [string[]]$Args,
    [string]$LogPath
  )
  $header = "# Category: Generated Evidence; Purpose: Gate log for $Name; Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
  Set-Content -Path $LogPath -Value $header
  Push-Location $gateRoot
  try {
    & $Command @Args *>&1 | Tee-Object -FilePath $LogPath -Append
    if ($LASTEXITCODE -ne 0) {
      throw "$Name failed with exit code $LASTEXITCODE."
    }
  } finally {
    Pop-Location
  }
}

$npmCiLog = Join-Path $outRoot "gate_npm_ci_$timestamp.log"
Invoke-GateStep -Name 'npm ci' -Command 'npm' -Args @('ci') -LogPath $npmCiLog

$buildLog = Join-Path $outRoot "gate_build_$timestamp.log"
Invoke-GateStep -Name 'npm run build' -Command 'npm' -Args @('run', 'build') -LogPath $buildLog
$env:BUILD_SUCCEEDED = '1'
$env:BUILD_LOG_PATH = $buildLog

$lintLog = Join-Path $outRoot "gate_lint_$timestamp.log"
Invoke-GateStep -Name 'npm run lint' -Command 'npm' -Args @('run', 'lint') -LogPath $lintLog

$tutorLog = Join-Path $outRoot "gate_tutor_eval_$timestamp.log"
Invoke-GateStep -Name 'npm run tutor:eval' -Command 'npm' -Args @('run', 'tutor:eval') -LogPath $tutorLog

$trianglesLog = Join-Path $outRoot "gate_triangles_audit_$timestamp.log"
Invoke-GateStep -Name 'node scripts/ops/triangles_audit.mjs' -Command 'node' -Args @('scripts/ops/triangles_audit.mjs') -LogPath $trianglesLog

Write-Output "Gate worktree completed at $gateRoot"
Write-Output "Logs exported to $outRoot"
