Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
Set-Location -Path $repoRoot

$reportsDir = Join-Path $repoRoot "docs\project_memory\strategy_reports"
if (-not (Test-Path -LiteralPath $reportsDir)) {
  New-Item -ItemType Directory -Path $reportsDir -Force | Out-Null
}

$allIdsPath = Join-Path $reportsDir "trig_all_ids.txt"
$tagIndexPath = Join-Path $repoRoot "src\data\contentStrategy\trigonometry\trigonometryQuestionTagIndex.ts"
$tilesPath = Join-Path $repoRoot "src\data\contentStrategy\trigonometry\trigonometryQuestionTypeTiles.ts"
$reportPath = Join-Path $reportsDir "trig_strategy_coverage.md"

if (-not (Test-Path -LiteralPath $allIdsPath)) {
  throw "Missing trig_all_ids.txt at $allIdsPath. Run extract_trig_ids.ps1 first."
}
if (-not (Test-Path -LiteralPath $tagIndexPath)) {
  throw "Missing tag index file at $tagIndexPath."
}
if (-not (Test-Path -LiteralPath $tilesPath)) {
  throw "Missing tile file at $tilesPath."
}

$allIds = @(Get-Content -Path $allIdsPath |
  Where-Object { $_ -and $_.Trim() -ne "" } |
  ForEach-Object { $_.Trim() } |
  Sort-Object -Unique)

$tagContent = Get-Content -Path $tagIndexPath -Raw
$tileContent = Get-Content -Path $tilesPath -Raw

$entryPattern = [regex]::new(
  '"(?<id>2026-TRIG-[A-Za-z0-9-]+)"\s*:\s*\{(?<body>[\s\S]*?)\n\s*\},?',
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)
$entries = New-Object System.Collections.Generic.List[object]
foreach ($match in $entryPattern.Matches($tagContent)) {
  $id = [string]$match.Groups["id"].Value
  $body = [string]$match.Groups["body"].Value

  $loMatch = [regex]::Match($body, 'loIds\s*:\s*\[(?<list>[^\]]*)\]')
  $loIds = @()
  if ($loMatch.Success) {
    foreach ($m in [regex]::Matches($loMatch.Groups["list"].Value, '"(?<lo>[^"]+)"')) {
      $loIds += [string]$m.Groups["lo"].Value
    }
  }

  $fmtMatch = [regex]::Match($body, 'cbseFormat\s*:\s*"(?<fmt>[A-E])"')
  $skillMatch = [regex]::Match($body, 'skillFamily\s*:\s*"(?<skill>[^"]+)"')

  $entries.Add([pscustomobject]@{
      Id          = $id
      LoIds       = @($loIds | Sort-Object -Unique)
      CbseFormat  = if ($fmtMatch.Success) { [string]$fmtMatch.Groups["fmt"].Value } else { "" }
      SkillFamily = if ($skillMatch.Success) { [string]$skillMatch.Groups["skill"].Value } else { "" }
    }) | Out-Null
}

$mappedIds = @($entries | Select-Object -ExpandProperty Id -Unique | Sort-Object)
$mappedSet = New-Object System.Collections.Generic.HashSet[string]
foreach ($id in $mappedIds) { [void]$mappedSet.Add([string]$id) }

$mappedInRepo = @($allIds | Where-Object { $mappedSet.Contains($_) })
$unmapped = @($allIds | Where-Object { -not $mappedSet.Contains($_) })
$coveragePct = if ($allIds.Count -gt 0) {
  [Math]::Round(($mappedInRepo.Count / $allIds.Count) * 100, 2)
} else {
  0
}

$tilePattern = [regex]::new(
  '\{\s*qtypeId:\s*"(?<qid>[^"]+)"[\s\S]*?title:\s*"(?<title>[^"]+)"[\s\S]*?cbseFormat:\s*"(?<fmt>[A-E])"[\s\S]*?skillFamily:\s*"(?<skill>[^"]+)"[\s\S]*?loIds:\s*\[(?<lo>[^\]]*)\]',
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)
$tiles = New-Object System.Collections.Generic.List[object]
foreach ($match in $tilePattern.Matches($tileContent)) {
  $loIds = @()
  foreach ($m in [regex]::Matches($match.Groups["lo"].Value, '"(?<lo>[^"]+)"')) {
    $loIds += [string]$m.Groups["lo"].Value
  }
  $tiles.Add([pscustomobject]@{
      QTypeId     = [string]$match.Groups["qid"].Value
      Title       = [string]$match.Groups["title"].Value
      CbseFormat  = [string]$match.Groups["fmt"].Value
      SkillFamily = [string]$match.Groups["skill"].Value
      LoIds       = @($loIds | Sort-Object -Unique)
    }) | Out-Null
}

function Get-ResolverIdsForTile {
  param(
    [pscustomobject]$Tile,
    [object[]]$EntryList
  )

  $tileLoSet = New-Object System.Collections.Generic.HashSet[string]
  foreach ($lo in $Tile.LoIds) { [void]$tileLoSet.Add([string]$lo) }

  $primary = @($EntryList |
    Where-Object { @($_.LoIds) | Where-Object { $tileLoSet.Contains([string]$_) } } |
    Select-Object -ExpandProperty Id)

  if ($primary.Count -ge 8) {
    return @($primary)
  }

  $byFormat = @($EntryList |
    Where-Object { [string]$_.CbseFormat -eq [string]$Tile.CbseFormat } |
    Select-Object -ExpandProperty Id)

  $tileSkill = [string]$Tile.SkillFamily
  $bySkill = @($EntryList |
    Where-Object {
      [string]$_.SkillFamily -and
      [string]$_.SkillFamily -eq $tileSkill
    } |
    Select-Object -ExpandProperty Id)

  $ordered = @($primary + $byFormat + $bySkill + @($EntryList | Select-Object -ExpandProperty Id))
  $seen = New-Object System.Collections.Generic.HashSet[string]
  $deduped = New-Object System.Collections.Generic.List[string]
  foreach ($id in $ordered) {
    $key = [string]$id
    if (-not $key) { continue }
    if ($seen.Add($key)) { $deduped.Add($key) | Out-Null }
  }

  if ($deduped.Count -le 8) { return @($deduped) }
  return @($deduped.GetRange(0, 8))
}

$tileRows = New-Object System.Collections.Generic.List[object]
foreach ($tile in $tiles) {
  $ids = Get-ResolverIdsForTile -Tile $tile -EntryList $entries
  $tileRows.Add([pscustomobject]@{
      Title = $tile.Title
      QTypeId = $tile.QTypeId
      YieldCount = $ids.Count
      Ids = $ids -join ", "
    }) | Out-Null
}

$md = New-Object System.Collections.Generic.List[string]
$md.Add("# Trigonometry Strategy Coverage") | Out-Null
$md.Add("") | Out-Null
$md.Add("- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')") | Out-Null
$md.Add("- Total trig IDs found: $($allIds.Count)") | Out-Null
$md.Add("- Total IDs mapped in tagIndex: $($mappedIds.Count)") | Out-Null
$md.Add("- Coverage %: $coveragePct") | Out-Null
$md.Add("- Mapped IDs present in repo list: $($mappedInRepo.Count)") | Out-Null
$md.Add("") | Out-Null
$md.Add("## Unmapped IDs (Top 50)") | Out-Null
$md.Add("") | Out-Null

if ($unmapped.Count -eq 0) {
  $md.Add("- None") | Out-Null
} else {
  foreach ($id in ($unmapped | Select-Object -First 50)) {
    $md.Add("- $id") | Out-Null
  }
}

$md.Add("") | Out-Null
$md.Add("## Tile Yield (Resolver Logic)") | Out-Null
$md.Add("") | Out-Null
$md.Add("| Tile | qtypeId | Yield count | IDs |") | Out-Null
$md.Add("|---|---|---:|---|") | Out-Null
foreach ($row in $tileRows) {
  $idsCell = [string]$row.Ids
  if (-not $idsCell) { $idsCell = "-" }
  $md.Add("| $($row.Title) | $($row.QTypeId) | $($row.YieldCount) | $idsCell |") | Out-Null
}

Set-Content -Path $reportPath -Value ($md -join [Environment]::NewLine) -Encoding UTF8

Write-Host ("coverage_report_path: " + $reportPath)
Write-Host ("total trig IDs found: " + $allIds.Count)
Write-Host ("total IDs mapped in tagIndex: " + $mappedIds.Count)
Write-Host ("coverage %: " + $coveragePct)
Write-Host "tile yields:"
foreach ($row in $tileRows) {
  Write-Host (" - " + $row.QTypeId + ": " + $row.YieldCount + " IDs")
}
