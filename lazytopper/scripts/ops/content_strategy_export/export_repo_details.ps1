param(
  [string]$TargetRoot = "C:\Users\Chetan\OneDrive\Desktop\Lazytopper\wayforward\Content Design\Repo_details"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if ($null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)) {
  $PSNativeCommandUseErrorActionPreference = $false
}

function Write-Info {
  param([string]$Message)
  Write-Host "[content-export] $Message"
}

function Ensure-Dir {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Add-ManifestEntry {
  param(
    [string]$Path,
    [string]$Why
  )
  $script:ManifestEntries.Add([pscustomobject]@{
      path = ($Path -replace "\\", "/")
      why  = $Why
    }) | Out-Null
}

function Add-MissingItem {
  param(
    [string]$Label,
    [string[]]$Candidates,
    [string]$Suggestion
  )
  $candidateText = if ($Candidates -and $Candidates.Count -gt 0) {
    ($Candidates | ForEach-Object { "'$_'" }) -join ", "
  } else {
    "(none)"
  }
  $line = "$Label | tried: $candidateText"
  if (-not [string]::IsNullOrWhiteSpace($Suggestion)) {
    $line += " | suggestion: $Suggestion"
  }
  $script:MissingItems.Add($line) | Out-Null
}

function Run-Rg {
  param([string[]]$Args)
  if (-not $script:HasRg) { return @() }
  if ($null -eq $Args -or $Args.Count -eq 0) { return @() }
  try {
    $result = & rg @Args 2>$null
    $exitCode = $LASTEXITCODE
  } catch {
    return @()
  }
  if ($exitCode -eq 0) { return @($result) }
  if ($exitCode -eq 1) { return @() }
  return @()
}

function Resolve-RepoRelativePath {
  param([string[]]$Candidates)
  foreach ($candidate in $Candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
    $normalized = $candidate -replace "\\", "/"
    $abs = Join-Path $script:RepoRoot ($normalized -replace "/", "\")
    if (Test-Path -LiteralPath $abs) {
      return $normalized
    }
  }
  return $null
}

function Copy-RepoFileToBucket {
  param(
    [string]$RelativePath,
    [string]$Bucket,
    [string]$Reason
  )
  if ([string]::IsNullOrWhiteSpace($RelativePath)) { return $false }
  $normalized = $RelativePath -replace "\\", "/"
  $sourcePath = Join-Path $script:RepoRoot ($normalized -replace "/", "\")
  if (-not (Test-Path -LiteralPath $sourcePath)) { return $false }

  $destRel = "files/$Bucket/$normalized"
  $destPath = Join-Path $script:ExportRoot ($destRel -replace "/", "\")
  Ensure-Dir -Path (Split-Path -Path $destPath -Parent)
  Copy-Item -Path $sourcePath -Destination $destPath -Force
  Add-ManifestEntry -Path $destRel -Why $Reason
  return $true
}

function Copy-FirstMatchToBucket {
  param(
    [string]$Label,
    [string[]]$Candidates,
    [string]$Bucket,
    [string]$Reason,
    [string]$Suggestion = ""
  )
  $resolved = Resolve-RepoRelativePath -Candidates $Candidates
  if ($null -eq $resolved) {
    Add-MissingItem -Label $Label -Candidates $Candidates -Suggestion $Suggestion
    return $null
  }
  [void](Copy-RepoFileToBucket -RelativePath $resolved -Bucket $Bucket -Reason $Reason)
  return $resolved
}

function Write-TextFile {
  param(
    [string]$RelativePath,
    [string]$Content,
    [string]$Why
  )
  $outPath = Join-Path $script:ExportRoot ($RelativePath -replace "/", "\")
  Ensure-Dir -Path (Split-Path -Path $outPath -Parent)
  Set-Content -Path $outPath -Value $Content -Encoding UTF8
  Add-ManifestEntry -Path $RelativePath -Why $Why
}

function Write-JsonFile {
  param(
    [string]$RelativePath,
    [object]$Object,
    [string]$Why
  )
  $json = $Object | ConvertTo-Json -Depth 100
  Write-TextFile -RelativePath $RelativePath -Content $json -Why $Why
}

function Extract-ArrayObjectLiterals {
  param(
    [string]$Text,
    [string]$StartPattern,
    [int]$Count = 10
  )
  $m = [regex]::Match($Text, $StartPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if (-not $m.Success) { return @() }

  $startSearch = $m.Index + $m.Length
  $arrStart = $Text.IndexOf("[", $startSearch)
  if ($arrStart -lt 0) { return @() }

  $results = New-Object System.Collections.Generic.List[string]
  $inString = $false
  $quoteChar = ""
  $escape = $false
  $bracketDepth = 0
  $braceDepth = 0
  $objectStart = -1

  for ($i = $arrStart; $i -lt $Text.Length; $i++) {
    $ch = $Text[$i]

    if ($inString) {
      if ($escape) {
        $escape = $false
        continue
      }
      if ($ch -eq "\") {
        $escape = $true
        continue
      }
      if ($ch -eq $quoteChar) {
        $inString = $false
      }
      continue
    }

    if ($ch -eq '"' -or $ch -eq "'") {
      $inString = $true
      $quoteChar = $ch
      continue
    }

    if ($ch -eq "[") {
      $bracketDepth++
      continue
    }

    if ($ch -eq "]") {
      $bracketDepth--
      if ($bracketDepth -eq 0) { break }
      continue
    }

    if ($bracketDepth -lt 1) { continue }

    if ($ch -eq "{") {
      if ($braceDepth -eq 0 -and $bracketDepth -eq 1) {
        $objectStart = $i
      }
      $braceDepth++
      continue
    }

    if ($ch -eq "}") {
      $braceDepth--
      if ($braceDepth -eq 0 -and $objectStart -ge 0 -and $bracketDepth -eq 1) {
        $len = $i - $objectStart + 1
        if ($len -gt 0) {
          $results.Add($Text.Substring($objectStart, $len)) | Out-Null
        }
        $objectStart = -1
        if ($results.Count -ge $Count) { break }
      }
      continue
    }
  }

  return @($results.ToArray())
}

function Convert-JsObjectLiteralToJsonText {
  param([string]$Text)
  if ([string]::IsNullOrWhiteSpace($Text)) { return "{}" }
  $normalized = $Text
  $normalized = [regex]::Replace(
    $normalized,
    '([{\[,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)',
    '$1"$2"$3'
  )
  $normalized = [regex]::Replace($normalized, ",(\s*[}\]])", '$1')
  return $normalized
}

function Convert-LiteralToObject {
  param(
    [string]$Literal,
    [bool]$IsJsLiteral = $false
  )
  $jsonText = if ($IsJsLiteral) {
    Convert-JsObjectLiteralToJsonText -Text $Literal
  } else {
    $Literal
  }
  try {
    return ($jsonText | ConvertFrom-Json -Depth 100)
  } catch {
    return [pscustomobject]@{
      parseError = "Could not parse object literal cleanly."
      preview    = ($Literal.Substring(0, [Math]::Min(400, $Literal.Length)))
    }
  }
}

function Truncate-Node {
  param(
    [object]$Value,
    [int]$MaxString = 320,
    [int]$MaxArray = 8
  )
  if ($null -eq $Value) { return $null }

  if ($Value -is [string]) {
    $s = $Value.Trim()
    if ($s.Length -gt $MaxString) {
      return ($s.Substring(0, $MaxString) + "...<truncated>")
    }
    return $s
  }

  if (
    $Value -is [int] -or
    $Value -is [long] -or
    $Value -is [double] -or
    $Value -is [decimal] -or
    $Value -is [bool]
  ) {
    return $Value
  }

  if ($Value -is [System.Collections.IDictionary]) {
    $obj = [ordered]@{}
    foreach ($k in $Value.Keys) {
      $obj[$k] = Truncate-Node -Value $Value[$k] -MaxString $MaxString -MaxArray $MaxArray
    }
    return [pscustomobject]$obj
  }

  if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
    $arr = New-Object System.Collections.Generic.List[object]
    $idx = 0
    foreach ($item in $Value) {
      if ($idx -ge $MaxArray) {
        $arr.Add("<truncated_array>") | Out-Null
        break
      }
      $arr.Add((Truncate-Node -Value $item -MaxString $MaxString -MaxArray $MaxArray)) | Out-Null
      $idx++
    }
    return @($arr.ToArray())
  }

  $props = @($Value.PSObject.Properties)
  if ($props.Count -gt 0) {
    $obj2 = [ordered]@{}
    foreach ($p in $props) {
      $obj2[$p.Name] = Truncate-Node -Value $p.Value -MaxString $MaxString -MaxArray $MaxArray
    }
    return [pscustomobject]$obj2
  }

  return "$Value"
}

function Get-SchemaKeys {
  param([object[]]$Samples)
  $set = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($sample in $Samples) {
    if ($null -eq $sample) { continue }
    foreach ($prop in $sample.PSObject.Properties) {
      [void]$set.Add($prop.Name)
    }
  }
  return @($set | Sort-Object)
}

function Build-QuestionBankSample {
  param(
    [string]$BankType,
    [string[]]$SourceFiles,
    [string]$FilePath,
    [string]$StartPattern,
    [int]$Count = 10,
    [bool]$IsJsLiteral = $false
  )
  if (-not (Test-Path -LiteralPath $FilePath)) {
    Add-MissingItem -Label "Question bank sample file not found ($BankType)" -Candidates @($FilePath) -Suggestion "Verify source file path."
    return [pscustomobject]@{
      bankType    = $BankType
      sourceFiles = $SourceFiles
      sampleCount = 0
      schemaKeys  = @()
      samples     = @()
      note        = "Source file was not found."
    }
  }

  $text = Get-Content -LiteralPath $FilePath -Raw
  $literals = Extract-ArrayObjectLiterals -Text $text -StartPattern $StartPattern -Count $Count
  $parsed = New-Object System.Collections.Generic.List[object]
  foreach ($literal in $literals) {
    $obj = Convert-LiteralToObject -Literal $literal -IsJsLiteral:$IsJsLiteral
    $parsed.Add((Truncate-Node -Value $obj)) | Out-Null
  }

  $parsedArray = @($parsed.ToArray())
  return [pscustomobject]@{
    bankType    = $BankType
    sourceFiles = $SourceFiles
    sampleCount = $parsedArray.Count
    schemaKeys  = Get-SchemaKeys -Samples $parsedArray
    samples     = $parsedArray
  }
}

function New-MarkdownTable {
  param(
    [object[]]$Rows,
    [string[]]$Headers,
    [string[]]$Props
  )
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("| " + ($Headers -join " | ") + " |") | Out-Null
  $lines.Add("| " + (($Headers | ForEach-Object { "---" }) -join " | ") + " |") | Out-Null
  foreach ($row in $Rows) {
    $cells = @()
    foreach ($prop in $Props) {
      $value = $row.$prop
      if ($null -eq $value) { $value = "" }
      $cells += (("$value") -replace "\|", "\|")
    }
    $lines.Add("| " + ($cells -join " | ") + " |") | Out-Null
  }
  return @($lines.ToArray())
}

Write-Info "Detecting repo context..."

$script:HasRg = $null -ne (Get-Command rg -ErrorAction SilentlyContinue)
$script:ManifestEntries = New-Object System.Collections.Generic.List[object]
$script:MissingItems = New-Object System.Collections.Generic.List[string]

$repoRootRaw = (& git rev-parse --show-toplevel).Trim()
if ([string]::IsNullOrWhiteSpace($repoRootRaw)) {
  throw "Could not detect git repo root."
}
$script:RepoRoot = $repoRootRaw
Set-Location -LiteralPath $script:RepoRoot

$currentBranch = (& git branch --show-current).Trim()
$latestCommit = (& git rev-parse HEAD).Trim()

if (Test-Path -LiteralPath (Join-Path $script:RepoRoot "pnpm-lock.yaml")) {
  $packageManager = "pnpm"
} elseif (Test-Path -LiteralPath (Join-Path $script:RepoRoot "yarn.lock")) {
  $packageManager = "yarn"
} elseif (Test-Path -LiteralPath (Join-Path $script:RepoRoot "package-lock.json")) {
  $packageManager = "npm"
} else {
  $packageManager = "unknown"
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$exportFolderName = "LazyTopper_ContentStrategy_RepoExport_$timestamp"
$zipName = "LazyTopper_ContentStrategy_RepoExport_$timestamp.zip"

Ensure-Dir -Path $TargetRoot
$script:ExportRoot = Join-Path $TargetRoot $exportFolderName
if (Test-Path -LiteralPath $script:ExportRoot) {
  Remove-Item -LiteralPath $script:ExportRoot -Recurse -Force
}
Ensure-Dir -Path $script:ExportRoot

$requiredDirs = @(
  "files/navigation",
  "files/practice",
  "files/topichub",
  "files/mentor",
  "files/syllabus",
  "files/ops_scripts",
  "reports"
)
foreach ($d in $requiredDirs) {
  Ensure-Dir -Path (Join-Path $script:ExportRoot ($d -replace "/", "\"))
}

Write-Info "Generating repo context reports..."

$manifestObj = [ordered]@{
  repoRoot       = $script:RepoRoot
  currentBranch  = $currentBranch
  latestCommit   = $latestCommit
  packageManager = $packageManager
  generatedAt    = (Get-Date).ToString("o")
}
Write-JsonFile -RelativePath "manifest.json" -Object $manifestObj -Why "Repo context for exported audit snapshot."

$nodeVersion = ""
$pmVersion = ""
try { $nodeVersion = (& node -v).Trim() } catch { $nodeVersion = "node not found" }
switch ($packageManager) {
  "npm" {
    try { $pmVersion = (& npm -v).Trim() } catch { $pmVersion = "npm not found" }
  }
  "yarn" {
    try { $pmVersion = (& yarn -v).Trim() } catch { $pmVersion = "yarn not found" }
  }
  "pnpm" {
    try { $pmVersion = (& pnpm -v).Trim() } catch { $pmVersion = "pnpm not found" }
  }
  default {
    $pmVersion = "unknown"
  }
}

$packageVersions = New-Object System.Collections.Generic.List[string]
$packageVersions.Add("repoRoot: $($script:RepoRoot)") | Out-Null
$packageVersions.Add("packageManager: $packageManager") | Out-Null
$packageVersions.Add("node: $nodeVersion") | Out-Null
$packageVersions.Add("${packageManager}: $pmVersion") | Out-Null
$packageVersions.Add("") | Out-Null

$rootPackagePath = Join-Path $script:RepoRoot "package.json"
if (Test-Path -LiteralPath $rootPackagePath) {
  $packageVersions.Add("===== package.json =====") | Out-Null
  foreach ($line in (Get-Content -LiteralPath $rootPackagePath)) {
    $packageVersions.Add($line) | Out-Null
  }
} else {
  Add-MissingItem -Label "Root package.json missing" -Candidates @("package.json") -Suggestion "Expected at repo root."
}

$serverPackagePath = Join-Path $script:RepoRoot "server\package.json"
$packageVersions.Add("") | Out-Null
if (Test-Path -LiteralPath $serverPackagePath) {
  $packageVersions.Add("===== server/package.json =====") | Out-Null
  foreach ($line in (Get-Content -LiteralPath $serverPackagePath)) {
    $packageVersions.Add($line) | Out-Null
  }
} else {
  $packageVersions.Add("===== server/package.json =====") | Out-Null
  $packageVersions.Add("Not found (single-package repo or merged workspace).") | Out-Null
}
Write-TextFile -RelativePath "package_versions.txt" -Content ($packageVersions -join [Environment]::NewLine) -Why "Runtime versions and package manifests."

Write-Info "Building routes map and collecting navigation files..."

$routerFiles = @(
  "src/App.tsx",
  "src/main.tsx"
)
$routeEntries = New-Object System.Collections.Generic.List[object]
foreach ($routerRel in $routerFiles) {
  $routerAbs = Join-Path $script:RepoRoot ($routerRel -replace "/", "\")
  if (-not (Test-Path -LiteralPath $routerAbs)) {
    Add-MissingItem -Label "Router file not found" -Candidates @($routerRel) -Suggestion "Check if router moved to another file."
    continue
  }
  $lines = Get-Content -LiteralPath $routerAbs
  for ($idx = 0; $idx -lt $lines.Count; $idx++) {
    $line = $lines[$idx]
    if ($line -match 'path="([^"]+)"') {
      $route = $matches[1]
      if ($route.StartsWith("/")) {
        $routeEntries.Add([pscustomobject]@{
            route = $route
            file  = $routerRel
            line  = ($idx + 1)
          }) | Out-Null
      }
    }
  }
}

$uniqueRouteMap = @{}
foreach ($entry in $routeEntries) {
  $k = "$($entry.route)|$($entry.file)|$($entry.line)"
  if (-not $uniqueRouteMap.ContainsKey($k)) {
    $uniqueRouteMap[$k] = $entry
  }
}
$routesSorted = @($uniqueRouteMap.Values | Sort-Object route, file, line)

$topicHubRoutes = @($routesSorted | Where-Object { $_.route -match "^/topic-hub" -or $_.route -match "^/topics/" })
$practiceRoutes = @($routesSorted | Where-Object { $_.route -match "^/practice/" })
$playRoutes = @($routesSorted | Where-Object { $_.route -eq "/play/:sessionId" })
$mentorRoutes = @($routesSorted | Where-Object { $_.route -match "^/mentor" -or $_.route -match "^/ai-mentor" })

$routesMd = New-Object System.Collections.Generic.List[string]
$routesMd.Add("# Routes Map") | Out-Null
$routesMd.Add("") | Out-Null
$routesMd.Add("Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")") | Out-Null
$routesMd.Add("") | Out-Null
$routesMd.Add("## Route Inventory (router files)") | Out-Null
$routesMd.Add("") | Out-Null
if ($routesSorted.Count -gt 0) {
  foreach ($line in (New-MarkdownTable -Rows $routesSorted -Headers @("Route", "Source", "Line") -Props @("route", "file", "line"))) {
    $routesMd.Add($line) | Out-Null
  }
} else {
  $routesMd.Add("No route paths were parsed from router files.") | Out-Null
}
$routesMd.Add("") | Out-Null
$routesMd.Add("## Required Surface Identification") | Out-Null
$routesMd.Add("") | Out-Null
$routesMd.Add("- TopicHub routes: " + ($(if ($topicHubRoutes.Count -gt 0) { ($topicHubRoutes.route | Sort-Object -Unique) -join ", " } else { "(none found)" }))) | Out-Null
$routesMd.Add("- Practice routes: " + ($(if ($practiceRoutes.Count -gt 0) { ($practiceRoutes.route | Sort-Object -Unique) -join ", " } else { "(none found)" }))) | Out-Null
$routesMd.Add("- Session playback route (/play/:sessionId): " + ($(if ($playRoutes.Count -gt 0) { "found" } else { "not found" }))) | Out-Null
$routesMd.Add("- Mentor UI routes/surfaces: " + ($(if ($mentorRoutes.Count -gt 0) { ($mentorRoutes.route | Sort-Object -Unique) -join ", " } else { "(none found)" }))) | Out-Null
$routesMd.Add("") | Out-Null
$routesMd.Add("## Mentor Surface Notes") | Out-Null
$routesMd.Add("") | Out-Null
$routesMd.Add("- Primary mentor page route resolves to ``src/pages/AiMentorPage.tsx`` via ``/ai-mentor/*`` and ``/mentor/*``.") | Out-Null
$routesMd.Add("- Embedded mentor surfaces also exist in TopicHub and Practice via ``fetch(""/api/mentor"")`` calls.") | Out-Null
Write-TextFile -RelativePath "reports/routes_map.md" -Content ($routesMd -join [Environment]::NewLine) -Why "Route inventory and surface detection for TopicHub, Practice, playback, and mentor."

$navigationCandidates = @(
  "src/App.tsx",
  "src/main.tsx",
  "src/navigation/practiceNavigation.ts",
  "src/utils/buildUrl.ts",
  "src/pages/TopicHubHome.tsx",
  "src/pages/AiMentorPage.tsx"
)
foreach ($navRel in $navigationCandidates) {
  if (-not (Copy-RepoFileToBucket -RelativePath $navRel -Bucket "navigation" -Reason "Route/navigation surface source.")) {
    Add-MissingItem -Label "Navigation file missing" -Candidates @($navRel) -Suggestion "Search for moved route helper file."
  }
}

Write-Info "Generating practice flow report and collecting practice files..."

$practiceEvidence = Run-Rg -Args @(
  "-n", "--no-heading",
  "buildPracticeQuestionsFromEngine|generatePracticeSet\\(|promptDPracticePacks|desiredSection|generateUnifiedPracticeQuestions|generateMoreLikeThis|practiceFilters|subtopicHint|focusBankIds|recommendedCount|difficultyPreset",
  "src/pages/PracticePage.tsx"
)
$sessionEvidence = Run-Rg -Args @(
  "-n", "--no-heading",
  "interface SessionDoc|items: SessionItem|cursor|completed|answers|metrics|SessionItem|toDailyMixType",
  "src/services/sessionApi.ts",
  "src/services/sessionTypes.ts",
  "src/components/SessionPlayer.tsx"
)

$practiceMd = New-Object System.Collections.Generic.List[string]
$practiceMd.Add("# Practice Flow (Current Behavior)") | Out-Null
$practiceMd.Add("") | Out-Null
$practiceMd.Add("Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")") | Out-Null
$practiceMd.Add("") | Out-Null
$practiceMd.Add("## Input Surface (PracticePage)") | Out-Null
$practiceMd.Add("") | Out-Null
$practiceMd.Add("- Route params: grade + subject (``/practice/:grade/:subject``).") | Out-Null
$practiceMd.Add("- Query params/deep links: topic, section (A-E), and related filters.") | Out-Null
$practiceMd.Add("- Navigation state filters: ``practiceFilters`` including ``subtopicHint``, ``focusBankIds``, ``recommendedCount``, ``difficultyPreset``.") | Out-Null
$practiceMd.Add("- UI controls: count, difficulty, and section selection influence generation request.") | Out-Null
$practiceMd.Add("") | Out-Null
$practiceMd.Add("## Filtering/Selection Pipeline") | Out-Null
$practiceMd.Add("") | Out-Null
$practiceMd.Add("1. Build bank-backed set via ``buildPracticeQuestionsFromEngine()`` -> ``generatePracticeSet()`` with subject/topic/count/difficulty mix + optional section A-E.") | Out-Null
$practiceMd.Add("2. Re-rank candidates by explicit ``focusBankIds`` (move matching IDs to front).") | Out-Null
$practiceMd.Add("3. Re-rank by ``subtopicHint`` (concept/subtopic contains hint first).") | Out-Null
$practiceMd.Add("4. If engine coverage is empty, fallback to Prompt-D topic pack (``promptDPracticePacks``).") | Out-Null
$practiceMd.Add("5. Apply section filter (``normalizeBoardPattern`` + ``inferBoardPatternFromQuestion``) before slicing count.") | Out-Null
$practiceMd.Add("6. If still short, top up with ``generateUnifiedPracticeQuestions()`` in ``generated-first`` mode.") | Out-Null
$practiceMd.Add("7. If still short, call AI ``/api/more-like-this`` (``generateMoreLikeThis``) and merge variants.") | Out-Null
$practiceMd.Add("8. Final safety: ``expandQuestionsForDrill()`` clones/variants to always hit requested count.") | Out-Null
$practiceMd.Add("") | Out-Null
$practiceMd.Add("## Section Model A-E (Current)") | Out-Null
$practiceMd.Add("") | Out-Null
$practiceMd.Add("- ``BoardPattern = ""A"" | ""B"" | ""C"" | ""D"" | ""E""`` in ``practiceSetGenerator.ts``.") | Out-Null
$practiceMd.Add("- Mapping logic uses explicit ``section``, then ``blueprintSlotId``, then marks heuristic (1->A, 2->B, 3->C, 5->D, 4->E).") | Out-Null
$practiceMd.Add("- Practice filtering applies this model both for bank questions and fallback/generated candidates.") | Out-Null
$practiceMd.Add("") | Out-Null
$practiceMd.Add("## Session Object Shape Used for Playback") | Out-Null
$practiceMd.Add("") | Out-Null
$practiceMd.Add("- ``SessionDoc`` (``src/services/sessionApi.ts``): ``sessionId``, timestamps, owner, kind, subjectId, chapterId, vibe, ``items: SessionItem[]``, cursor, completed, answers, metrics.") | Out-Null
$practiceMd.Add("- ``SessionItem`` (``src/services/sessionTypes.ts``): ``id``, ``itemType``, ``title``, optional ``description``, ``refId``, ``payload``.") | Out-Null
$practiceMd.Add("- ``SessionPlayer`` maps each session item to ``DailyMixItem`` for ``/play/:sessionId`` rendering (``practice_question/mastery_quiz -> question``, ``revision_card/exam_tip_card -> card``).") | Out-Null
$practiceMd.Add("") | Out-Null
$practiceMd.Add("## Evidence Snippets") | Out-Null
$practiceMd.Add("") | Out-Null
$practiceMd.Add("``````text") | Out-Null
foreach ($line in ($practiceEvidence | Select-Object -First 80)) {
  $practiceMd.Add($line) | Out-Null
}
foreach ($line in ($sessionEvidence | Select-Object -First 40)) {
  $practiceMd.Add($line) | Out-Null
}
$practiceMd.Add("``````") | Out-Null
Write-TextFile -RelativePath "reports/practice_flow.md" -Content ($practiceMd -join [Environment]::NewLine) -Why "Current practice engine flow and session playback contract."

$practiceFiles = @(
  "src/pages/PracticePage.tsx",
  "src/components/SessionPlayer.tsx",
  "src/pages/SessionPlayPage.tsx",
  "src/data/practiceSetGenerator.ts",
  "src/data/questionGenerator.ts",
  "src/data/practiceFilters.ts",
  "src/data/boardSteps/index.ts",
  "src/data/boardSteps/types.ts",
  "src/data/boardSteps/boardSteps_maths_2025_26.ts",
  "src/data/boardSteps/boardSteps_science_2025_26.ts",
  "src/data/predictedQuestions.ts",
  "src/data/predictedQuestionsScience.ts",
  "src/data/predictionCore.ts",
  "src/services/sessionApi.ts",
  "src/services/sessionTypes.ts",
  "server/sessionHandlers.cjs",
  "server/sessionStore.cjs"
)
foreach ($p in $practiceFiles) {
  if (-not (Copy-RepoFileToBucket -RelativePath $p -Bucket "practice" -Reason "Practice engine/session/section-model source.")) {
    Add-MissingItem -Label "Practice file missing" -Candidates @($p) -Suggestion "Search for renamed practice module."
  }
}

Write-Info "Extracting question schema samples..."

$canonicalBankFile = Join-Path $script:RepoRoot "src\data\canonicalQuestionBank.ts"
$predMathFile = Join-Path $script:RepoRoot "src\data\predictedQuestions.ts"
$predSciFile = Join-Path $script:RepoRoot "src\data\predictedQuestionsScience.ts"
$promptDPackFile = Join-Path $script:RepoRoot "src\data\promptDPracticePacks.ts"

$questionBankSamples = @(
  (Build-QuestionBankSample -BankType "canonical_question_bank" -SourceFiles @("src/data/practiceSetGenerator.ts", "src/data/predictionCore.ts", "src/data/canonicalQuestionBank.ts") -FilePath $canonicalBankFile -StartPattern "export\s+const\s+canonicalQuestionBank\s*:[^=]*=\s*" -Count 10 -IsJsLiteral:$false),
  (Build-QuestionBankSample -BankType "predicted_questions_maths_bank" -SourceFiles @("src/data/questionGenerator.ts", "src/data/predictedQuestions.ts") -FilePath $predMathFile -StartPattern "const\s+predictedQuestionsBase\s*:[^=]*=\s*" -Count 10 -IsJsLiteral:$true),
  (Build-QuestionBankSample -BankType "predicted_questions_science_bank" -SourceFiles @("src/data/questionGenerator.ts", "src/data/predictedQuestionsScience.ts") -FilePath $predSciFile -StartPattern "export\s+const\s+sciencePredictedQuestions\s*:[^=]*=\s*" -Count 10 -IsJsLiteral:$true),
  (Build-QuestionBankSample -BankType "prompt_d_practice_pack_bank" -SourceFiles @("src/pages/PracticePage.tsx", "src/data/promptDPracticePacks.ts") -FilePath $promptDPackFile -StartPattern '"questions"\s*:\s*' -Count 10 -IsJsLiteral:$false)
)

$questionSchemaOutput = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  notes       = @(
    "Each entry includes schemaKeys and up to 10 sample question objects.",
    "Samples are pulled from bank structures referenced by PracticePage and its fallback generators.",
    "Long strings/arrays are truncated for readability."
  )
  banks       = $questionBankSamples
}
Write-JsonFile -RelativePath "reports/question_schema_samples.json" -Object $questionSchemaOutput -Why "Sample question objects per bank type used by the current practice flow."

Write-Info "Collecting TopicHub and content-surface files..."

$topicHubFiles = @(
  "src/pages/TopicHub.tsx",
  "src/pages/TopicHubHome.tsx",
  "src/components/DiagramBlock.tsx",
  "src/components/tutor/TutorDrawerV2.tsx",
  "src/utils/getTopicV2Content.ts",
  "src/utils/topicHubV2Store.ts",
  "src/data/topicHubV2Full.ts",
  "src/data/topicHubV2Enrichment.ts",
  "src/data/topicHubContent.ts",
  "src/data/geminiTopicHubPacks/trianglesTopicHubPack.ts",
  "src/data/trianglesGuidedMindmap.ts",
  "src/data/trianglesGrindMindmap.ts"
)
foreach ($t in $topicHubFiles) {
  if (-not (Copy-RepoFileToBucket -RelativePath $t -Bucket "topichub" -Reason "TopicHub page/components/content-card config source.")) {
    Add-MissingItem -Label "TopicHub file missing" -Candidates @($t) -Suggestion "Search for renamed TopicHub module."
  }
}

Write-Info "Generating mentor contracts report and collecting mentor files..."

$mentorTypesPath = Join-Path $script:RepoRoot "src\types\mentor.ts"
$mentorModes = @()
if (Test-Path -LiteralPath $mentorTypesPath) {
  $mentorTypesText = Get-Content -LiteralPath $mentorTypesPath -Raw
  $modeMatch = [regex]::Match($mentorTypesText, "export\s+type\s+MentorMode\s*=\s*(?<body>[\s\S]*?);")
  if ($modeMatch.Success) {
    $modeHits = [regex]::Matches($modeMatch.Groups["body"].Value, "'([^']+)'")
    $mentorModes = @($modeHits | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
  }
} else {
  Add-MissingItem -Label "mentor.ts missing for mode extraction" -Candidates @("src/types/mentor.ts") -Suggestion "Check mentor type path."
}

$mentorEvidence = Run-Rg -Args @(
  "-n", "--no-heading",
  "POST' && req.url === '/api/mentor'|normalizeMentorRequest|STRUCTURED_MODES|normalizeIncomingMode|isTeachContractRequest|schema_learn_teach_contract|schema_",
  "server/index.cjs"
)

$mentorMd = New-Object System.Collections.Generic.List[string]
$mentorMd.Add("# Mentor Contracts (Current)") | Out-Null
$mentorMd.Add("") | Out-Null
$mentorMd.Add("Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")") | Out-Null
$mentorMd.Add("") | Out-Null
$mentorMd.Add("## Endpoint") | Out-Null
$mentorMd.Add("") | Out-Null
$mentorMd.Add("- Primary handler: ``POST /api/mentor`` in ``server/index.cjs``.") | Out-Null
$mentorMd.Add("- Request normalization supports preferred ``{ mode, payload, persona? }`` and legacy flat fields.") | Out-Null
$mentorMd.Add("") | Out-Null
$mentorMd.Add("## Request Payload Shape") | Out-Null
$mentorMd.Add("") | Out-Null
$mentorMd.Add("``````ts") | Out-Null
$mentorMd.Add("type MentorRequest<TPayload> = {") | Out-Null
$mentorMd.Add("  mode: MentorMode;") | Out-Null
$mentorMd.Add("  payload: TPayload;") | Out-Null
$mentorMd.Add("  persona?: MentorPersona;") | Out-Null
$mentorMd.Add("};") | Out-Null
$mentorMd.Add("``````") | Out-Null
$mentorMd.Add("") | Out-Null
$mentorMd.Add("## Response Shape") | Out-Null
$mentorMd.Add("") | Out-Null
$mentorMd.Add("``````ts") | Out-Null
$mentorMd.Add("type MentorGatewayData = {") | Out-Null
$mentorMd.Add("  text: string;") | Out-Null
$mentorMd.Add("  structured?: MentorStructured; // solve_with_me / board_steps_ms / learn_*") | Out-Null
$mentorMd.Add("};") | Out-Null
$mentorMd.Add("``````") | Out-Null
$mentorMd.Add("") | Out-Null
$mentorMd.Add("## Supported Mentor Modes") | Out-Null
$mentorMd.Add("") | Out-Null
if ($mentorModes.Count -gt 0) {
  foreach ($mode in $mentorModes) {
    $mentorMd.Add("- $mode") | Out-Null
  }
} else {
  $mentorMd.Add("- Could not parse MentorMode literals from ``src/types/mentor.ts``.") | Out-Null
}
$mentorMd.Add("") | Out-Null
$mentorMd.Add("## Prompt/Contract Locations") | Out-Null
$mentorMd.Add("") | Out-Null
$mentorMd.Add("- ``server/index.cjs`` (mode normalization, prompt builders, schema enforcement, ``/api/mentor`` handler).") | Out-Null
$mentorMd.Add("- ``src/contracts/tutorContracts.ts`` (structured schema validators + fallbacks).") | Out-Null
$mentorMd.Add("- ``src/tutor/topicTeachContracts.ts`` (topic-specific teach contracts).") | Out-Null
$mentorMd.Add("- ``src/data/syllabus/scopePolicy.ts`` (topic scope/policy helpers used by mentor contracts).") | Out-Null
$mentorMd.Add("- ``server/tutorOrchestrator.cjs`` (orchestration/repair of structured tutor payloads).") | Out-Null
$mentorMd.Add("") | Out-Null
$mentorMd.Add("## Evidence Snippets") | Out-Null
$mentorMd.Add("") | Out-Null
$mentorMd.Add("``````text") | Out-Null
foreach ($line in ($mentorEvidence | Select-Object -First 120)) {
  $mentorMd.Add($line) | Out-Null
}
$mentorMd.Add("``````") | Out-Null
Write-TextFile -RelativePath "reports/mentor_contracts.md" -Content ($mentorMd -join [Environment]::NewLine) -Why "Mentor endpoint contract, modes, and schema source mapping."

$mentorFiles = @(
  "server/index.cjs",
  "server/tutorOrchestrator.cjs",
  "src/types/mentor.ts",
  "src/types/MentorRequest.ts",
  "src/contracts/tutorContracts.ts",
  "src/tutor/topicTeachContracts.ts",
  "src/data/syllabus/scopePolicy.ts",
  "src/ai/aiClient.ts",
  "src/services/mentorServerGate.ts",
  "src/mentors/centralPersona.ts",
  "src/prompts/grind/trianglesGrindContract.ts"
)
foreach ($m in $mentorFiles) {
  if (-not (Copy-RepoFileToBucket -RelativePath $m -Bucket "mentor" -Reason "Mentor endpoint/types/contracts/prompt policy source.")) {
    Add-MissingItem -Label "Mentor file missing" -Candidates @($m) -Suggestion "Search mentor contract path changes."
  }
}

Write-Info "Generating trigonometry key audit and collecting syllabus files..."

$termResults = [ordered]@{}
$auditTerms = @(
  "trigonometry",
  "Introduction to Trigonometry",
  "Applications of Trigonometry"
)
foreach ($term in $auditTerms) {
  $hits = Run-Rg -Args @("-n", "--no-heading", "--fixed-strings", $term, "src", "server")
  $termResults[$term] = @($hits)
}

$keyAliasEvidence = Run-Rg -Args @(
  "-n", "--no-heading",
  "trigonometry|maths_introduction_trigonometry|maths_applications_trigonometry|maths-applications-trigonometry|Introduction to Trigonometry|Applications of Trigonometry",
  "src/data/syllabus/topicAliasMap.ts",
  "src/utils/topicResolver.ts",
  "src/data/class10ContentConfig.ts",
  "src/data/syllabus/cbse10Canonical.ts",
  "server/index.cjs"
)

$trigMd = New-Object System.Collections.Generic.List[string]
$trigMd.Add("# Trigonometry Key Audit") | Out-Null
$trigMd.Add("") | Out-Null
$trigMd.Add("Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")") | Out-Null
$trigMd.Add("") | Out-Null
$trigMd.Add("## Canonical Key and Aliasing (Inference from source hits)") | Out-Null
$trigMd.Add("") | Out-Null
$trigMd.Add("- Canonical topic key appears to be ``trigonometry`` (seen in syllabus alias map, content config, and canonical chapter slug references).") | Out-Null
$trigMd.Add("- Legacy/fragmented keys present in runtime datasets: ``maths_introduction_trigonometry``, ``maths_applications_trigonometry``, plus display names ``Introduction to Trigonometry`` and ``Applications of Trigonometry``.") | Out-Null
$trigMd.Add("- Aliasing/collapse points: ``src/data/syllabus/topicAliasMap.ts``, ``src/utils/topicResolver.ts``, and server-side aliasing in ``server/index.cjs`` (``PRIORITY_GRIND_TOPIC_ALIASES``).") | Out-Null
$trigMd.Add("") | Out-Null
$trigMd.Add("## Raw Term Occurrences") | Out-Null
$trigMd.Add("") | Out-Null
foreach ($term in $auditTerms) {
  $hitsForTerm = @($termResults[$term])
  $trigMd.Add("### $term") | Out-Null
  $trigMd.Add("") | Out-Null
  if ($hitsForTerm.Count -eq 0) {
    $trigMd.Add("- No matches in ``src``/``server``.") | Out-Null
  } else {
    foreach ($hit in ($hitsForTerm | Select-Object -First 250)) {
      $trigMd.Add("- $hit") | Out-Null
    }
    if ($hitsForTerm.Count -gt 250) {
      $trigMd.Add("- ... truncated, total matches: $($hitsForTerm.Count)") | Out-Null
    }
  }
  $trigMd.Add("") | Out-Null
}
$trigMd.Add("## Key/Alias Evidence Snippets") | Out-Null
$trigMd.Add("") | Out-Null
$trigMd.Add("``````text") | Out-Null
foreach ($line in ($keyAliasEvidence | Select-Object -First 120)) {
  $trigMd.Add($line) | Out-Null
}
$trigMd.Add("``````") | Out-Null
Write-TextFile -RelativePath "reports/trig_key_audit.md" -Content ($trigMd -join [Environment]::NewLine) -Why "Trigonometry key-fragmentation audit and canonical/alias inference."

$syllabusFiles = @(
  "src/data/syllabus/topicAliasMap.ts",
  "src/data/syllabus/cbse10Canonical.ts",
  "src/data/syllabus/cbse10Registry_2025_26.json",
  "src/data/class10ContentConfig.ts",
  "src/data/class10TopicRegistry.ts",
  "src/data/class10MathTopicWeights.ts",
  "src/utils/topicResolver.ts"
)
foreach ($s in $syllabusFiles) {
  if (-not (Copy-RepoFileToBucket -RelativePath $s -Bucket "syllabus" -Reason "Syllabus/curriculum/topic-key resolution source.")) {
    Add-MissingItem -Label "Syllabus file missing" -Candidates @($s) -Suggestion "Search for moved curriculum config."
  }
}

Write-Info "Collecting existing ops/audit scripts..."

$opsFiles = @()
if (Test-Path -LiteralPath (Join-Path $script:RepoRoot "scripts\ops")) {
  $rgOps = @(Run-Rg -Args @("--files", "scripts/ops"))
  if ($rgOps.Count -gt 0) {
    $opsFiles = @(
      $rgOps | Where-Object {
        $_ -match "generate_content_backlog_and_matrix|matrix|prediction|hpq|practice|backlog|coverage|bank_health|drift|triangles"
      } | Sort-Object -Unique
    )
  }
}

# Ensure mandatory script is attempted first.
$mandatoryOps = "scripts/ops/generate_content_backlog_and_matrix.mjs"
if ($opsFiles -notcontains $mandatoryOps) {
  $opsFiles = @($mandatoryOps) + $opsFiles
}
$opsFiles = @($opsFiles | Select-Object -Unique)

if ($opsFiles.Count -eq 0) {
  Add-MissingItem -Label "No ops scripts matched export patterns" -Candidates @("scripts/ops/*") -Suggestion "Review scripts/ops naming conventions."
}

foreach ($op in $opsFiles) {
  if (-not (Copy-RepoFileToBucket -RelativePath $op -Bucket "ops_scripts" -Reason "Existing ops/audit scripts for backlog, matrix, prediction, and practice coverage.")) {
    Add-MissingItem -Label "Ops script missing" -Candidates @($op) -Suggestion "Verify script exists in scripts/ops."
  }
}

Write-Info "Writing README, MANIFEST, and missing-file report..."

$missingReportLines = New-Object System.Collections.Generic.List[string]
$missingReportLines.Add("# Missing Files/Patterns") | Out-Null
$missingReportLines.Add("") | Out-Null
if ($script:MissingItems.Count -eq 0) {
  $missingReportLines.Add("No required files were missing from the configured export list.") | Out-Null
} else {
  foreach ($miss in $script:MissingItems) {
    $missingReportLines.Add("- $miss") | Out-Null
  }
}
Write-TextFile -RelativePath "reports/missing_files.txt" -Content ($missingReportLines -join [Environment]::NewLine) -Why "Missing files list with suggestions."

$readmeLines = New-Object System.Collections.Generic.List[string]
$readmeLines.Add("# LazyTopper Content Strategy Repo Export") | Out-Null
$readmeLines.Add("") | Out-Null
$readmeLines.Add("This export was generated to support implementation planning for a Question-Type-First + Learning Object overlay system (Class 10 Maths Trigonometry) without changing current product behavior.") | Out-Null
$readmeLines.Add("") | Out-Null
$readmeLines.Add("## Folder Layout") | Out-Null
$readmeLines.Add("") | Out-Null
$readmeLines.Add("- ``manifest.json``: repo root/branch/commit/package manager snapshot.") | Out-Null
$readmeLines.Add("- ``package_versions.txt``: package manifest(s) + runtime package manager versions.") | Out-Null
$readmeLines.Add("- ``reports/routes_map.md``: app route inventory and required surfaces.") | Out-Null
$readmeLines.Add("- ``reports/practice_flow.md``: current practice selection/filter pipeline + session playback shape.") | Out-Null
$readmeLines.Add("- ``reports/question_schema_samples.json``: sample question objects per bank type used by practice.") | Out-Null
$readmeLines.Add("- ``reports/mentor_contracts.md``: mentor endpoint payload/response contracts, modes, and schema/prompt locations.") | Out-Null
$readmeLines.Add("- ``reports/trig_key_audit.md``: trigonometry key fragmentation and alias audit with exact hit lines.") | Out-Null
$readmeLines.Add("- ``reports/missing_files.txt``: files not found while exporting and suggested fallback paths.") | Out-Null
$readmeLines.Add("- ``files/navigation|practice|topichub|mentor|syllabus|ops_scripts``: copied source files grouped by functional surface.") | Out-Null
$readmeLines.Add("") | Out-Null
$readmeLines.Add("## Notes") | Out-Null
$readmeLines.Add("") | Out-Null
$readmeLines.Add("- No endpoints, routes, feature behavior, or dependencies were modified.") | Out-Null
$readmeLines.Add("- No ``.env``, service keys, ``node_modules``, ``dist``, or build outputs are included.") | Out-Null
$readmeLines.Add("- This export is intended for audit/planning and traceability, not direct runtime execution.") | Out-Null
Write-TextFile -RelativePath "README.md" -Content ($readmeLines -join [Environment]::NewLine) -Why "How to interpret the export package."

$manifestMd = New-Object System.Collections.Generic.List[string]
$manifestMd.Add("# Export Manifest") | Out-Null
$manifestMd.Add("") | Out-Null
$manifestMd.Add("Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")") | Out-Null
$manifestMd.Add("") | Out-Null
$manifestMd.Add("## Included Files") | Out-Null
$manifestMd.Add("") | Out-Null
$manifestRows = @($script:ManifestEntries | Sort-Object path)
if ($manifestRows.Count -gt 0) {
  foreach ($line in (New-MarkdownTable -Rows $manifestRows -Headers @("Path", "Why Included") -Props @("path", "why"))) {
    $manifestMd.Add($line) | Out-Null
  }
} else {
  $manifestMd.Add("No files were recorded in manifest entries.") | Out-Null
}
Write-TextFile -RelativePath "MANIFEST.md" -Content ($manifestMd -join [Environment]::NewLine) -Why "File listing with inclusion reasons."

Write-Info "Creating zip package..."

$zipPath = Join-Path $TargetRoot $zipName
if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path $script:ExportRoot -DestinationPath $zipPath -Force

# Keep target folder clean: leave only zip artifact for this run.
if (Test-Path -LiteralPath $script:ExportRoot) {
  Remove-Item -LiteralPath $script:ExportRoot -Recurse -Force
}

Write-Host ""
Write-Host "FINAL_ZIP_PATH: $zipPath"
Write-Host "MISSING_COUNT: $($script:MissingItems.Count)"
if ($script:MissingItems.Count -gt 0) {
  Write-Host "MISSING_ITEMS:"
  foreach ($miss in $script:MissingItems) {
    Write-Host " - $miss"
  }
}

