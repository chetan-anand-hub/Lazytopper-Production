import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(REPO_ROOT, ".project_memory", "deploy_smoke");
fs.mkdirSync(OUT_DIR, { recursive: true });

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf8", cwd: REPO_ROOT, ...opts }).trim();
}

function logStep(lines, label, content) {
  lines.push(`## ${label}`);
  if (content) lines.push(content);
  lines.push("");
}

function httpGet(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function waitForPort(port, timeoutMs = 10000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`Port ${port} not ready after ${timeoutMs}ms`));
      }
      const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
        let d = "";
        res.on("data", (c) => { d += c; });
        res.on("end", () => resolve({ status: res.statusCode, body: d }));
      });
      req.on("error", () => setTimeout(check, 500));
      req.setTimeout(2000, () => { req.destroy(); setTimeout(check, 500); });
    };
    check();
  });
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
  run("pnpm run build", { stdio: "pipe" });
  logStep(reportLines, "Build", "pnpm run build: OK");
} catch (e) {
  ok = false;
  logStep(reportLines, "Build", e.stdout || e.message);
}

try {
  const distIndex = path.join(REPO_ROOT, "artifacts", "api-server", "dist", "index.mjs");
  const distPublic = path.join(REPO_ROOT, "artifacts", "api-server", "dist", "public", "index.html");
  const frontendDist = path.join(REPO_ROOT, "artifacts", "lazytopper-app", "dist", "public", "index.html");

  const checks = [];
  if (fs.existsSync(distIndex)) {
    checks.push("api-server/dist/index.mjs: OK");
  } else {
    checks.push("api-server/dist/index.mjs: MISSING");
    ok = false;
  }
  if (fs.existsSync(distPublic)) {
    checks.push("api-server/dist/public/index.html: OK");
  } else {
    checks.push("api-server/dist/public/index.html: MISSING");
    ok = false;
  }
  if (fs.existsSync(frontendDist)) {
    checks.push("lazytopper-app/dist/public/index.html: OK");
  } else {
    checks.push("lazytopper-app/dist/public/index.html: MISSING");
    ok = false;
  }
  logStep(reportLines, "Build Artifacts", checks.join("\n"));
} catch (e) {
  ok = false;
  logStep(reportLines, "Build Artifacts", `Failed: ${e.message}`);
}

try {
  const replitPath = path.join(REPO_ROOT, ".replit");
  const replitContent = fs.readFileSync(replitPath, "utf8");
  const checks = [];

  if (replitContent.includes('deploymentTarget = "autoscale"')) {
    checks.push("deploymentTarget = autoscale: OK");
  } else {
    checks.push("deploymentTarget = autoscale: MISSING");
    ok = false;
  }

  if (replitContent.includes('[deployment.build]')) {
    checks.push("deployment.build: OK");
  } else {
    checks.push("deployment.build: MISSING");
    ok = false;
  }

  if (replitContent.includes('[deployment.postBuild]')) {
    checks.push("deployment.postBuild (store prune): OK");
  } else {
    checks.push("deployment.postBuild: MISSING");
    ok = false;
  }

  logStep(reportLines, "Replit Deployment Config", checks.join("\n"));
} catch (e) {
  ok = false;
  logStep(reportLines, "Replit Deployment Config", `Failed: ${e.message}`);
}

try {
  const artifactToml = path.join(REPO_ROOT, "artifacts", "api-server", ".replit-artifact", "artifact.toml");
  if (fs.existsSync(artifactToml)) {
    const content = fs.readFileSync(artifactToml, "utf8");
    const hasRun = content.includes("[services.production.run]");
    const hasBuild = content.includes("[services.production.build]");
    const hasHealth = content.includes("[services.production.health");
    logStep(reportLines, "API Server Artifact Config", [
      `artifact.toml exists: OK`,
      `production.run: ${hasRun ? "OK" : "MISSING"}`,
      `production.build: ${hasBuild ? "OK" : "MISSING"}`,
      `production.health: ${hasHealth ? "OK" : "MISSING"}`,
    ].join("\n"));
    if (!hasRun || !hasBuild || !hasHealth) ok = false;
  } else {
    ok = false;
    logStep(reportLines, "API Server Artifact Config", "artifact.toml: MISSING");
  }
} catch (e) {
  ok = false;
  logStep(reportLines, "API Server Artifact Config", `Failed: ${e.message}`);
}

try {
  const requiredEnvVars = [
    "AI_INTEGRATIONS_GEMINI_BASE_URL",
    "AI_INTEGRATIONS_GEMINI_API_KEY",
  ];
  const envChecks = [];
  for (const v of requiredEnvVars) {
    if (process.env[v]) {
      envChecks.push(`${v}: present`);
    } else {
      envChecks.push(`${v}: MISSING`);
      ok = false;
    }
  }
  const optionalEnvVars = ["DATABASE_URL", "SESSION_SECRET"];
  for (const v of optionalEnvVars) {
    envChecks.push(`${v}: ${process.env[v] ? "present" : "not set (optional)"}`);
  }
  logStep(reportLines, "Environment Variables", envChecks.join("\n"));
} catch (e) {
  ok = false;
  logStep(reportLines, "Environment Variables", `Failed: ${e.message}`);
}

let gatewayProc = null;
try {
  const smokePort = 19876;
  gatewayProc = spawn("node", ["server/index.cjs"], {
    cwd: path.join(REPO_ROOT, "lazytopper"),
    env: { ...process.env, PORT: String(smokePort), NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const healthRes = await waitForPort(smokePort, 15000);
  const checks = [];
  if (healthRes.status === 200) {
    checks.push(`GET /health => ${healthRes.status}: OK`);
  } else {
    checks.push(`GET /health => ${healthRes.status}: UNEXPECTED`);
    ok = false;
  }

  try {
    const apiRes = await httpGet(`http://127.0.0.1:${smokePort}/api/health`, 5000);
    if (apiRes.status === 200) {
      checks.push(`GET /api/health => ${apiRes.status}: OK`);
    } else {
      checks.push(`GET /api/health => ${apiRes.status}: UNEXPECTED`);
      ok = false;
    }
  } catch (e) {
    checks.push(`GET /api/health => Failed: ${e.message}`);
    ok = false;
  }

  try {
    const rootRes = await httpGet(`http://127.0.0.1:${smokePort}/`, 5000);
    const isHtml = (rootRes.body || "").includes("<!DOCTYPE html>") || (rootRes.body || "").includes("<html");
    if (rootRes.status === 200 && isHtml) {
      checks.push(`GET / => ${rootRes.status} (HTML): OK`);
    } else {
      checks.push(`GET / => ${rootRes.status} (html=${isHtml}): UNEXPECTED`);
      ok = false;
    }
  } catch (e) {
    checks.push(`GET / (static frontend) => Failed: ${e.message}`);
    ok = false;
  }

  logStep(reportLines, "Gateway Server Smoke", checks.join("\n"));
} catch (e) {
  ok = false;
  logStep(reportLines, "Gateway Server Smoke", `Failed: ${e.message}`);
} finally {
  if (gatewayProc) {
    gatewayProc.kill("SIGTERM");
  }
}

const reportPath = path.join(OUT_DIR, "deploy_smoke_report.md");
fs.writeFileSync(reportPath, reportLines.join("\n"));

if (!ok) {
  console.error("Deploy smoke checks failed. See .project_memory/deploy_smoke/deploy_smoke_report.md");
  process.exit(1);
}

console.log("Deploy smoke checks passed.");
