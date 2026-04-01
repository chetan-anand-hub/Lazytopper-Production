import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, ".project_memory", "deploy_smoke");
fs.mkdirSync(OUT_DIR, { recursive: true });

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf8", ...opts }).trim();
}

function logStep(lines, label, content) {
  lines.push(`## ${label}`);
  if (content) lines.push(content);
  lines.push("");
}

const reportLines = [];
let ok = true;

try {
  const branch = run("git rev-parse --abbrev-ref HEAD");
  const head = run("git rev-parse HEAD");
  logStep(reportLines, "Git", `Branch: ${branch}\nHEAD: ${head}`);
} catch (e) {
  ok = false;
  logStep(reportLines, "Git", `Failed: ${e.message}`);
}

try {
  const buildOut = run("npm run build", { stdio: "pipe" });
  logStep(reportLines, "Build", buildOut);
} catch (e) {
  ok = false;
  logStep(reportLines, "Build", e.stdout || e.message);
}

try {
  const evalOut = run("npm run tutor:eval", { stdio: "pipe" });
  logStep(reportLines, "Tutor Eval", evalOut);
} catch (e) {
  ok = false;
  logStep(reportLines, "Tutor Eval", e.stdout || e.message);
}

try {
  const trackerPath = path.join(ROOT, ".project_memory", "tracker", "stage_status.md");
  const tracker = fs.existsSync(trackerPath) ? fs.readFileSync(trackerPath, "utf8") : "";
  const match = tracker.match(/Overall current:.*\*\*(.+?)\*\*/);
  const overall = match ? match[1] : "";
  const hasB7 = overall === "tutor_rag:B7";
  if (!hasB7) ok = false;
  logStep(reportLines, "Tracker", `Overall current: ${overall || "(missing)"}`);
} catch (e) {
  ok = false;
  logStep(reportLines, "Tracker", `Failed: ${e.message}`);
}

const reportPath = path.join(OUT_DIR, "deploy_smoke_report.md");
fs.writeFileSync(reportPath, reportLines.join("\n"));

if (!ok) {
  console.error("Deploy smoke checks failed. See .project_memory/deploy_smoke/deploy_smoke_report.md");
  process.exit(1);
}

console.log("Deploy smoke checks passed.");
