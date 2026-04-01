$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$targets = @('desktop.ini', 'Thumbs.db', 'ehthumbs.db')
$skipPattern = '([\\/])node_modules([\\/])|([\\/])dist([\\/])|([\\/])\.git([\\/])'

$items = Get-ChildItem -Path $root -Recurse -Force -File -ErrorAction SilentlyContinue -Include $targets |
  Where-Object { $_.FullName -notmatch $skipPattern }

if (-not $items) {
  exit 0
}

foreach ($item in $items) {
  try {
    Remove-Item -LiteralPath $item.FullName -Force -ErrorAction SilentlyContinue
  } catch {
    Write-Warning "Failed to remove $($item.FullName): $($_.Exception.Message)"
  }
}
