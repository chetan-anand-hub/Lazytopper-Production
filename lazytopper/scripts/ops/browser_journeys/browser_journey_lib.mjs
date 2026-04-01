import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import {
  getTaskEvidencePaths,
  normalizeRepoPath,
  opsOutDir,
  parseTaskIdArg,
  repoRoot,
  writeTaskScopedJsonReport,
} from "../../../tools/codex/task_evidence_utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const outDir = opsOutDir;
export const baseUrl = process.env.LT_BROWSER_BASE_URL || "http://127.0.0.1:4175";
export const apiBaseUrl = process.env.LT_BROWSER_API_URL || "http://127.0.0.1:3001";

const viteScript = path.join(repoRoot, "node_modules", "vite", "bin", "vite.js");
const serverScript = path.join(repoRoot, "server", "index.cjs");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function trimLogLines(lines, nextChunk) {
  const nextLines = String(nextChunk || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
  lines.push(...nextLines);
  if (lines.length > 120) {
    lines.splice(0, lines.length - 120);
  }
}

function spawnManagedProcess(label, command, args, env = {}) {
  const logLines = [];
  const proc = spawn(command, args, {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  proc.stdout?.on("data", (chunk) => trimLogLines(logLines, chunk));
  proc.stderr?.on("data", (chunk) => trimLogLines(logLines, chunk));

  return { label, proc, logLines };
}

async function waitForUrl(url, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "unreachable";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok || response.status < 500) {
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = String(error?.message || error);
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

async function isReachable(url) {
  try {
    const response = await fetch(url, { method: "GET" });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

export async function ensureOutDir() {
  await fs.mkdir(outDir, { recursive: true });
}

export function currentBrowserTaskId(argv = process.argv) {
  return parseTaskIdArg(argv);
}

export function makeJourneyCheck(name, ok, details, severity = "P2") {
  return {
    name,
    ok: Boolean(ok),
    details: String(details || ""),
    severity,
  };
}

export async function writeJourneyReport({ id, area, title, startUrl, checks, meta = {}, taskId = "", scenarioId = "", studentState = "", artifacts = [] }) {
  await ensureOutDir();
  const failedChecks = checks.filter((check) => !check.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    taskId: taskId || null,
    id,
    scenarioId: scenarioId || null,
    studentState: studentState || null,
    area,
    title,
    startUrl,
    verdict: failedChecks.length === 0 ? "PASS" : "FAIL",
    summary: {
      total: checks.length,
      passed: checks.length - failedChecks.length,
      failed: failedChecks.length,
      p0: failedChecks.filter((check) => check.severity === "P0").length,
      p1: failedChecks.filter((check) => check.severity === "P1").length,
      p2: failedChecks.filter((check) => check.severity === "P2").length,
    },
    checks,
    artifacts,
    meta,
  };

  const fileName = scenarioId ? `browser_${id}__${scenarioId}.json` : `browser_${id}.json`;
  const { primaryPath } = await writeTaskScopedJsonReport(fileName, report, taskId);
  return { report, outPath: primaryPath };
}

export async function startJourneyStack() {
  const managed = [];

  if (!(await isReachable(`${apiBaseUrl}/api/health`))) {
    const server = spawnManagedProcess("mentor-server", process.execPath, [serverScript], {
      PORT: "3001",
      LT_NO_PROVIDER: "1",
      NODE_ENV: "development",
      CORS_ORIGIN: baseUrl,
    });
    managed.push(server);
    await waitForUrl(`${apiBaseUrl}/api/health`);
  }

  if (!(await isReachable(baseUrl))) {
    const frontend = spawnManagedProcess("vite-dev", process.execPath, [viteScript, "--host", "127.0.0.1", "--port", "4175"], {
      NODE_ENV: "development",
      VITE_QTYPE_FIRST_TRIGONOMETRY: "true",
      VITE_ENABLE_LOCAL_SESSION_FALLBACK: "true",
      VITE_E2E_AUTO_ANON_AUTH: "true",
    });
    managed.push(frontend);
    await waitForUrl(baseUrl);
  }

  return { managed, baseUrl, apiBaseUrl };
}

export async function stopJourneyStack(runtime) {
  for (const entry of [...(runtime?.managed || [])].reverse()) {
    try {
      if (!entry?.proc || entry.proc.killed) continue;
      entry.proc.kill("SIGTERM");
      await sleep(400);
      if (!entry.proc.killed) {
        entry.proc.kill("SIGKILL");
      }
    } catch {
      // Best effort cleanup only.
    }
  }
}

export async function launchJourneyBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch {
    if (process.platform === "win32") {
      return chromium.launch({ channel: "msedge", headless: true });
    }
    throw new Error("Unable to launch a Playwright browser.");
  }
}

export async function continueLocalSessionIfNeeded(page) {
  const loginHeading = page.getByRole("heading", { name: /student sign in/i }).first();
  const loginVisible = await loginHeading.isVisible().catch(() => false);
  if (!loginVisible) return false;

  const continueControl = await pickFirstVisible(
    [
      page.getByRole("button", { name: /continue in local session/i }),
      page.getByText(/continue in local session/i),
    ],
    10000
  );
  if (!continueControl) return false;

  await continueControl.scrollIntoViewIfNeeded().catch(() => {});
  await continueControl.click({ force: true });
  await page.waitForTimeout(1200);
  await page.waitForLoadState("networkidle").catch(() => {});
  return true;
}

export async function waitForPageSettle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(500);
  await page
    .waitForFunction(
      () => {
        const text = String(document.body?.innerText || "").toLowerCase();
        return (
          !text.includes("loading your dashboard") &&
          !text.includes("loading session") &&
          !text.includes("checking your session")
        );
      },
      { timeout: 25000 }
    )
    .catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(500);
}

export async function openAuthenticatedPath(page, targetPath, options = {}) {
  const rootUrl = options.baseUrl || baseUrl;
  const targetUrl = targetPath.startsWith("http") ? targetPath : `${rootUrl}${targetPath}`;
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await waitForPageSettle(page);
  const continued = await continueLocalSessionIfNeeded(page);
  if (continued) {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  }
  await waitForPageSettle(page);
  return targetUrl;
}

export async function bodyText(page) {
  return String(await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
}

export async function captureJourneyScreenshot(page, { taskId = "", journeyId = "", scenarioId = "", label = "surface" } = {}) {
  const fileName = `browser_${journeyId}${scenarioId ? `__${scenarioId}` : ""}__${label}.png`;
  const targetPath = taskId
    ? path.join(getTaskEvidencePaths(taskId).opsTaskOutDir, fileName)
    : path.join(outDir, fileName);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await page.screenshot({ path: targetPath, fullPage: false });
  return normalizeRepoPath(targetPath);
}

export async function collectSurfaceSignals(page) {
  return page.evaluate(() => {
    const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const text = clean(document.body?.innerText || "");
    const elements = Array.from(document.querySelectorAll("button, a, [role='button']"));
    const visible = elements
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const label = clean(element.textContent || element.getAttribute("aria-label") || "");
        const inView = rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0;
        return {
          label,
          inView,
        };
      })
      .filter((entry) => entry.inView && entry.label);
    const keyVisibleCtas = Array.from(new Set(visible.map((entry) => entry.label))).slice(0, 8);
    const primaryCtaCount = keyVisibleCtas.length;
    const guidedCueVisible = /start here|guided start|recommended order|study flow|step-by-step/i.test(text);
    const helpCueVisible = /ask mentor|get help|hint \/ next step|explain|check my solution/i.test(text);
    return {
      primaryCtaCount,
      keyVisibleCtas,
      guidedCueVisible,
      helpCueVisible,
      visibleDecisionCount: primaryCtaCount,
      looksCluttered: primaryCtaCount >= 10,
      bodySnippet: text.slice(0, 900),
    };
  });
}

export async function isVisible(locator, timeoutMs = 8000) {
  try {
    await locator.waitFor({ state: "visible", timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

export async function pickFirstVisible(locators, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  for (const locator of locators) {
    const count = await locator.count().catch(() => 0);
    const candidateCount = Math.max(1, count);
    for (let index = 0; index < candidateCount; index += 1) {
      const candidate = count > 0 ? locator.nth(index) : locator.first();
      const timeLeft = deadline - Date.now();
      if (timeLeft <= 0) break;
      if (await isVisible(candidate, Math.min(1200, timeLeft))) {
        return candidate;
      }
    }
  }
  return null;
}

export async function clickIfVisible(locator, timeoutMs = 8000) {
  if (!(await isVisible(locator, timeoutMs))) return false;
  await locator.click();
  return true;
}
