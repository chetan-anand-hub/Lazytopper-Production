param(
  [string]$OutputPath = "C:\\Users\\Chetan\\OneDrive\\Desktop\\Lazytopper\\wayforward\\20-01-2026\\GPT Codes\\LazyTopper_SECURITY_HOTFIX_NoSecrets_2026-01-20.zip"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$excludeDirNames = @(".git", "node_modules", "dist", "build")
$excludeDirPrefixes = @(
  "docs\\ai_reference",
  "codex_transcript",
  "docs\\codex_transcript"
)

$stack = New-Object System.Collections.Generic.Stack[string]
$stack.Push($repoRoot)
$included = New-Object System.Collections.Generic.List[System.IO.FileInfo]

while ($stack.Count -gt 0) {
  $current = $stack.Pop()
  foreach ($entry in [System.IO.Directory]::EnumerateFileSystemEntries($current)) {
    $name = [System.IO.Path]::GetFileName($entry)
    if ([System.IO.Directory]::Exists($entry)) {
      if ($excludeDirNames -contains $name) { continue }
      $relDir = $entry.Substring($repoRoot.Length + 1)
      $skipPrefix = $false
      foreach ($prefix in $excludeDirPrefixes) {
        if ($relDir -ieq $prefix -or $relDir -ilike "$prefix\\*") {
          $skipPrefix = $true
          break
        }
      }
      if ($skipPrefix) { continue }
      $stack.Push($entry)
      continue
    }

    if ($excludeDirNames -contains $name) { continue }
    if ($name -eq ".env" -or $name -like ".env.*") { continue }
    $relFile = $entry.Substring($repoRoot.Length + 1)
    if ($relFile -like "server\\.env*") { continue }
    $included.Add((Get-Item -LiteralPath $entry)) | Out-Null
  }
}

$secretHits = $included | Where-Object { $_.Name -eq ".env" -or $_.Name -like ".env.*" }
if ($secretHits.Count -gt 0) {
  $hitList = $secretHits | ForEach-Object { $_.FullName.Substring($repoRoot.Length + 1) }
  Write-Error ("Secret .env files detected in export selection:`n" + ($hitList -join "`n"))
  exit 1
}

Write-Host ("Preflight: no .env files in selection (" + $included.Count + " files).")

$outDir = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $outDir)) {
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

if (Test-Path -LiteralPath $OutputPath) {
  throw "Output zip already exists: $OutputPath"
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($OutputPath, "Create")
try {
  foreach ($file in $included) {
    $rel = $file.FullName.Substring($repoRoot.Length + 1)
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip,
      $file.FullName,
      $rel,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
} finally {
  $zip.Dispose()
}

Write-Host "ZIP created: $OutputPath"
