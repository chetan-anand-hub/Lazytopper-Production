import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const BASE_REF = "origin/feature/topichub-ui-lock";
const EXT_REGEX = /\.(ts|tsx|js|jsx|mjs|cjs)$/i;

function run(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function getMergeBase() {
  return run(`git merge-base HEAD ${BASE_REF}`);
}

function listChangedFiles(baseRef) {
  const raw = run(`git diff --name-status ${baseRef}..HEAD`);
  if (!raw) return [];

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t+/);
      const status = parts[0];
      if (status.startsWith("D")) return null;
      if (status.startsWith("R") || status.startsWith("C")) return parts[2] || null;
      return parts[1] || null;
    })
    .filter(Boolean);
}

function resolveTargets(files) {
  return files
    .filter((file) => EXT_REGEX.test(file))
    .filter((file) => fs.existsSync(path.resolve(file)));
}

function runMojibakeGuard() {
  const checkScript = path.resolve("scripts", "check-mojibake.cjs");
  if (!fs.existsSync(checkScript)) return;
  const result = spawnSync(process.execPath, [checkScript], {
    stdio: "inherit",
  });
  if (result.error) {
    console.error("lint:ci - mojibake guard failed to run");
    console.error(result.error.message || result.error);
    process.exit(1);
  }
  if ((result.status ?? 1) !== 0) {
    console.error("lint:ci - mojibake guard detected encoding issues.");
    process.exit(result.status ?? 1);
  }
}

runMojibakeGuard();

let baseRef;
try {
  baseRef = getMergeBase();
} catch (err) {
  console.error(`lint:ci - unable to compute merge-base with ${BASE_REF}`);
  console.error(err?.message || err);
  process.exit(1);
}

let changedFiles;
try {
  changedFiles = listChangedFiles(baseRef);
} catch (err) {
  console.error("lint:ci - unable to list changed files");
  console.error(err?.message || err);
  process.exit(1);
}

const targets = resolveTargets(changedFiles);

if (!targets.length) {
  console.log("lint:ci - no changed JS/TS targets detected; skipping eslint.");
  process.exit(0);
}

console.log(`lint:ci - linting ${targets.length} file(s):`);
for (const file of targets) console.log(` - ${file}`);

const eslintBin = path.resolve("node_modules", "eslint", "bin", "eslint.js");
if (!fs.existsSync(eslintBin)) {
  console.error(`lint:ci - eslint binary not found at ${eslintBin}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [eslintBin, ...targets], {
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message || result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
