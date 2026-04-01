Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
Set-Location -Path $repoRoot

$packPath = Join-Path $repoRoot "src\data\questionBanks\class10\maths\trigonometry.pack1.ts"
$loPath = Join-Path $repoRoot "src\data\contentStrategy\trigonometry\trigonometryLearningObjects.ts"

if (-not (Test-Path -LiteralPath $packPath)) {
  Write-Host "FAIL: Pack file missing at $packPath"
  exit 1
}

$tempScript = Join-Path $env:TEMP ("validate_trig_pack1_" + [Guid]::NewGuid().ToString("N") + ".mjs")

$nodeSource = @'
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.argv[2];
const packPath = path.join(repoRoot, "src", "data", "questionBanks", "class10", "maths", "trigonometry.pack1.ts");
const loPath = path.join(repoRoot, "src", "data", "contentStrategy", "trigonometry", "trigonometryLearningObjects.ts");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lt-trig-pack1-"));
const tsModuleUrl = pathToFileURL(path.join(repoRoot, "node_modules", "typescript", "lib", "typescript.js")).href;
const ts = (await import(tsModuleUrl)).default;

async function importTsStandalone(tsPath) {
  const source = fs.readFileSync(tsPath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: tsPath,
  }).outputText;
  const outPath = path.join(tmpDir, path.basename(tsPath).replace(/\.ts$/, ".mjs"));
  fs.writeFileSync(outPath, transpiled, "utf8");
  return import(pathToFileURL(outPath).href);
}

const packMod = await importTsStandalone(packPath);
const loMod = await importTsStandalone(loPath);

const pack = Array.isArray(packMod.TRIG_PACK1_QUESTIONS) ? packMod.TRIG_PACK1_QUESTIONS : [];
const learningObjects = Array.isArray(loMod.trigonometryLearningObjects) ? loMod.trigonometryLearningObjects : [];

const failures = [];
const expectedDistribution = { A: 45, B: 25, C: 25, D: 15, E: 10 };

if (pack.length !== 120) {
  failures.push(`Expected 120 questions but found ${pack.length}.`);
}

const idPattern = /^2026-TRIG-P1-[A-E]-\d{3}$/;
const ids = pack.map((q) => String(q?.questionId ?? q?.id ?? ""));
const uniqueIds = new Set(ids);
if (uniqueIds.size !== pack.length) {
  failures.push(`Expected unique IDs but found ${pack.length - uniqueIds.size} duplicates.`);
}

for (const id of ids) {
  if (!idPattern.test(id)) {
    failures.push(`Invalid Pack1 ID: ${id}`);
  }
}

const distribution = { A: 0, B: 0, C: 0, D: 0, E: 0 };
for (const q of pack) {
  const fmt = String(q?.cbseFormat ?? "");
  if (Object.prototype.hasOwnProperty.call(distribution, fmt)) {
    distribution[fmt] += 1;
  }
}
for (const key of Object.keys(expectedDistribution)) {
  if (distribution[key] !== expectedDistribution[key]) {
    failures.push(`Distribution mismatch for ${key}: expected ${expectedDistribution[key]}, found ${distribution[key]}.`);
  }
}

const requiredFields = [
  "id",
  "questionId",
  "cbseFormat",
  "skillFamily",
  "loIds",
  "difficulty",
  "questionText",
  "answer",
  "explanation",
  "solutionSteps",
  "finalAnswer",
];

for (const q of pack) {
  for (const field of requiredFields) {
    const value = q?.[field];
    const isMissing =
      value == null ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0);
    if (isMissing) {
      failures.push(`Question ${q?.questionId ?? q?.id ?? "UNKNOWN"} is missing required field ${field}.`);
    }
  }
}

const loCoverage = new Map();
for (const lo of learningObjects) {
  loCoverage.set(String(lo?.loId ?? ""), 0);
}
for (const q of pack) {
  const loIds = Array.isArray(q?.loIds) ? q.loIds : [];
  for (const loId of loIds) {
    const key = String(loId ?? "");
    loCoverage.set(key, Number(loCoverage.get(key) ?? 0) + 1);
  }
}
for (const lo of learningObjects) {
  const loId = String(lo?.loId ?? "");
  const count = Number(loCoverage.get(loId) ?? 0);
  if (count < 8) {
    failures.push(`Learning object ${loId} has only ${count} mapped questions (minimum 8).`);
  }
}

if (failures.length > 0) {
  console.log("FAIL: validate_trig_pack1");
  for (const failure of failures) {
    console.log(` - ${failure}`);
  }
  process.exit(1);
}

console.log("PASS: validate_trig_pack1");
console.log(`QUESTION_COUNT: ${pack.length}`);
console.log(`DISTRIBUTION: A${distribution.A} B${distribution.B} C${distribution.C} D${distribution.D} E${distribution.E}`);
for (const lo of learningObjects) {
  const loId = String(lo?.loId ?? "");
  console.log(`LO_COUNT ${loId}: ${Number(loCoverage.get(loId) ?? 0)}`);
}
'@

Set-Content -Path $tempScript -Value $nodeSource -Encoding UTF8

try {
  node $tempScript $repoRoot
  exit $LASTEXITCODE
} finally {
  if (Test-Path -LiteralPath $tempScript) {
    Remove-Item -LiteralPath $tempScript -Force
  }
}
