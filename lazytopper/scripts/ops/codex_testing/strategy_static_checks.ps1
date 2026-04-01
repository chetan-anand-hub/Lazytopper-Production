Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$failed = $false

function Check-Step {
  param(
    [bool]$Condition,
    [string]$Message
  )
  if ($Condition) {
    Write-Host ("[PASS] " + $Message)
  } else {
    Write-Host ("[FAIL] " + $Message)
    $script:failed = $true
  }
}

$aliasPath = Join-Path $repoRoot "src\data\syllabus\topicAliasMap.ts"
Check-Step -Condition (Test-Path -LiteralPath $aliasPath) -Message "topicAliasMap.ts exists"

if (Test-Path -LiteralPath $aliasPath) {
  $aliasContent = Get-Content -Path $aliasPath -Raw
  $trigMatch = [regex]::Match($aliasContent, "(?s)trigonometry\s*:\s*\[(?<body>.*?)\]")
  Check-Step -Condition $trigMatch.Success -Message "trigonometry alias block exists"
  if ($trigMatch.Success) {
    $trigBody = $trigMatch.Groups["body"].Value
    Check-Step -Condition ($trigBody -match '"maths_introduction_trigonometry"') -Message "contains maths_introduction_trigonometry alias"
    Check-Step -Condition ($trigBody -match '"maths_applications_trigonometry"') -Message "contains maths_applications_trigonometry alias"
  }
}

$requiredFiles = @(
  "src\services\questionTypeFirstResolver.ts",
  "src\data\contentStrategy\types.ts",
  "src\data\contentStrategy\trigonometry\trigonometryLearningObjects.ts",
  "src\data\contentStrategy\trigonometry\trigonometryQuestionTypeTiles.ts",
  "src\data\contentStrategy\trigonometry\trigonometryQuestionTagIndex.ts",
  "src\data\contentStrategy\trigonometry\index.ts"
)

foreach ($rel in $requiredFiles) {
  $abs = Join-Path $repoRoot $rel
  Check-Step -Condition (Test-Path -LiteralPath $abs) -Message ("exists: " + $rel)
}

if ($failed) {
  Write-Host "strategy_static_checks: FAIL"
  exit 1
}

Write-Host "strategy_static_checks: PASS"
exit 0
