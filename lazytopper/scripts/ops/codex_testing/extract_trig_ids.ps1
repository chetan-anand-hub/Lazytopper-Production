Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
Set-Location -Path $repoRoot

$pattern = "2026-TRIG-[A-Za-z0-9-]+"
$found = New-Object System.Collections.Generic.List[string]

function Add-RgMatches {
  param(
    [string[]]$ArgsList
  )
  $output = & rg @ArgsList
  $code = $LASTEXITCODE
  if ($code -ne 0 -and $code -ne 1) {
    throw "rg failed with exit code $code for args: $($ArgsList -join ' ')"
  }
  if ($code -eq 0 -and $null -ne $output) {
    if ($output -is [System.Array]) {
      foreach ($line in $output) {
        $value = ([string]$line).Trim()
        if ($value) { $found.Add($value) | Out-Null }
      }
    } else {
      $value = ([string]$output).Trim()
      if ($value) { $found.Add($value) | Out-Null }
    }
  }
}

# Search in src/data/
Add-RgMatches -ArgsList @(
  "--no-heading",
  "--no-line-number",
  "--no-filename",
  "-o",
  $pattern,
  "src/data/"
)

# Search in specific source buckets that commonly hold question IDs.
Add-RgMatches -ArgsList @(
  "--no-heading",
  "--no-line-number",
  "--no-filename",
  "-o",
  $pattern,
  "src/",
  "--glob",
  "**/predictedQuestions*.ts",
  "--glob",
  "**/highlyProbable*.ts",
  "--glob",
  "**/canonicalQuestionBank*.ts",
  "--glob",
  "**/practicePacks*.ts"
)

$uniqueIds = $found |
  Where-Object { $_ -and $_.Trim() -ne "" } |
  Sort-Object -Unique

$reportsDir = Join-Path $repoRoot "docs\project_memory\strategy_reports"
if (-not (Test-Path -LiteralPath $reportsDir)) {
  New-Item -ItemType Directory -Path $reportsDir -Force | Out-Null
}

$outPath = Join-Path $reportsDir "trig_all_ids.txt"
Set-Content -Path $outPath -Value $uniqueIds -Encoding UTF8

Write-Host ("trig_all_ids_path: " + $outPath)
Write-Host ("total IDs found: " + $uniqueIds.Count)
Write-Host "first 20 IDs:"
$uniqueIds | Select-Object -First 20 | ForEach-Object { Write-Host (" - " + $_) }
