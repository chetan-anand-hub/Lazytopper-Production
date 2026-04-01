import { promises as fs } from "fs";
import { existsSync } from "fs";
import path from "path";
import { execSync } from "child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const YAML = require("yaml");

const ROOT = process.cwd();
const BLACKBOX_DIR = path.join(ROOT, ".project_memory", "blackbox");
const OUT_JSON = path.join(BLACKBOX_DIR, "stage_status.json");
const OUT_MD = path.join(BLACKBOX_DIR, "stage_status.md");
const CHECKLIST = path.join(
  ROOT,
  "docs",
  "project_memory",
  "implementation",
  "implementation_checklist.yml"
);

function safeExec(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readChecklist() {
  const raw = await fs.readFile(CHECKLIST, "utf8");
  const parsed = YAML.parse(raw);
  return parsed?.blackbox ?? null;
}

function normalizeRelPath(p) {
  const normalized = p.split(path.sep).join("/").replace(/\/+/g, "/");
  if (normalized.startsWith("ocs/")) return `docs/${normalized.slice(4)}`;
  return normalized;
}

async function evaluateStage(stage) {
  const results = [];
  for (const ev of stage.evidence ?? []) {
    const rel = ev.file;
    const abs = path.join(ROOT, rel);
    const ok = await exists(abs);
    results.push({ file: normalizeRelPath(rel), pass: ok });
  }
  const pass = results.every((r) => r.pass);
  return { id: stage.id, title: stage.title, pass, evidence: results };
}

function computeDrift(statusLines, allowedPrefixes) {
  const touched = statusLines
    .map((l) => l.slice(3).trim())
    .filter(Boolean)
    .map((p) => normalizeRelPath(p));

  const allowed = allowedPrefixes.map((p) => normalizeRelPath(p));
  const offScope = touched
    .filter((p) => !allowed.some((pref) => p.startsWith(pref)))
    .filter((p) => existsSync(path.join(ROOT, p)));
  return { touched, offScope };
}

async function writeFileAtomic(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp.${Date.now()}`;
  await fs.writeFile(tmp, content, "utf8");
  await fs.rename(tmp, filePath);
}

async function main() {
  const checklist = await readChecklist().catch(() => null);
  if (!checklist) {
    console.warn("stageTracker: checklist missing or unreadable:", CHECKLIST);
    process.exit(1);
  }

  await fs.mkdir(BLACKBOX_DIR, { recursive: true });

  const gitStatus = safeExec("git status --porcelain");
  const statusLines = gitStatus ? gitStatus.split(/\r?\n/).filter(Boolean) : [];
  const allowed = checklist.allowedSystemTouchPrefixes ?? [];

  const drift = computeDrift(statusLines, allowed);

  const stages = [];
  for (const s of checklist.stages ?? []) {
    stages.push(await evaluateStage(s));
  }

  const firstFail = stages.find((s) => !s.pass);
  const currentStage = firstFail ? firstFail.id : "COMPLETE";

  const out = {
    generatedAt: new Date().toISOString(),
    currentStage,
    stages,
    drift: {
      allowedPrefixes: allowed,
      touchedCount: drift.touched.length,
      offScopeCount: drift.offScope.length,
      offScopeFiles: drift.offScope.slice(0, 50),
    },
  };

  const md = [];
  md.push("# Blackbox Stage Status");
  md.push("");
  md.push(`Generated at: ${out.generatedAt}`);
  md.push(`Current stage: **${out.currentStage}**`);
  md.push("");
  md.push("## Stages");
  md.push("");
  for (const s of stages) md.push(`- ${s.pass ? "✅" : "❌"} ${s.id} — ${s.title}`);
  md.push("");
  md.push("## Drift Check (git status)");
  md.push("");
  md.push(`- Touched files: ${out.drift.touchedCount}`);
  md.push(`- Off-scope files: ${out.drift.offScopeCount}`);
  if (out.drift.offScopeCount > 0) {
    md.push("");
    md.push("### Off-scope file list (first 50)");
    out.drift.offScopeFiles.forEach((f) => md.push(`- ${f}`));
  }
  md.push("");

  await writeFileAtomic(OUT_JSON, JSON.stringify(out, null, 2));
  await writeFileAtomic(OUT_MD, md.join("\n"));

  console.log(
    `stageTracker: wrote ${normalizeRelPath(path.relative(ROOT, OUT_JSON))} and ${normalizeRelPath(path.relative(ROOT, OUT_MD))}`
  );
}

main().catch((err) => {
  console.error("stageTracker failed:", err);
  process.exit(1);
});
