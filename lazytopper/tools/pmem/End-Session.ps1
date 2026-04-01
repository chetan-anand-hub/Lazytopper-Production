$ErrorActionPreference = 'Stop'
$repoRoot = 'C:\Projects\lazytopper\lazytopper_MAIN_WORKTREE'
$crashDir = 'C:\Users\Chetan\OneDrive\Desktop\Lazytopper\wayforward\GPT Memory'
$cliPath = 'C:\Projects\lazytopper\tools\project-memory-blackbox-ext\dist\cli\endSessionCli.js'
Write-Host "Launching Project Memory Blackbox End Session CLI..."
try {
  & node $cliPath --repo $repoRoot --crashDir $crashDir
  $exitCode = $LASTEXITCODE
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
if ($exitCode -ne 0) {
  Write-Error "End Session CLI failed with exit code $exitCode"
  exit $exitCode
}
