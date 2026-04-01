import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "topic_grind_contracts_acceptance.json");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
}

async function readText(relPath) {
  return fs.readFile(path.join(repoRoot, relPath), "utf8");
}

async function waitForServer(baseUrl, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/api/mentor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "noop", payload: {} }),
      });
      if (res.status >= 400 || res.status < 600) return;
    } catch {
      // not up yet
    }
    await delay(300);
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

async function postMentor(baseUrl, body) {
  const res = await fetch(`${baseUrl}/api/mentor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    json = { raw };
  }
  return { status: res.status, json };
}

function parseContract(resp) {
  const structured = resp?.json?.data?.structured;
  if (structured && typeof structured === "object") return structured;
  const txt = String(resp?.json?.data?.text || "").trim();
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function isNonEmptyArray(v) {
  return Array.isArray(v) && v.length > 0;
}

function normalizeTopicKey(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "";
  return s
    .replace(/&/g, " and ")
    .replace(/[\/\\]/g, " ")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractObjectBody(source, marker) {
  const markerIdx = source.indexOf(marker);
  if (markerIdx < 0) return "";
  const openIdx = source.indexOf("{", markerIdx);
  if (openIdx < 0) return "";
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;
  for (let i = openIdx; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === quote) {
        inString = false;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = true;
      quote = ch;
      continue;
    }
    if (ch === "{") {
      depth += 1;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openIdx + 1, i);
      }
    }
  }
  return "";
}

function extractMathTrendTopicNames(source) {
  const block = extractObjectBody(source, "topics:");
  if (!block) return [];
  const out = [];
  const re = /^\s*"([^"]+)"\s*:\s*\{/gm;
  let match;
  while ((match = re.exec(block)) !== null) {
    out.push(String(match[1] || "").trim());
  }
  return out;
}

function extractScienceTrendTopicNames(source) {
  const out = [];
  const re = /topicName:\s*"([^"]+)"/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    out.push(String(match[1] || "").trim());
  }
  return out;
}

function buildTrendTopicEntries(mathText, scienceText) {
  const entries = [];
  const seen = new Set();
  const pushEntry = (subject, topicName) => {
    const topicKey = normalizeTopicKey(topicName);
    if (!topicKey) return;
    const dedupeKey = `${subject}:${topicKey}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    entries.push({ subject, topicName, topicKey });
  };
  extractMathTrendTopicNames(mathText).forEach((topicName) => pushEntry("Maths", topicName));
  extractScienceTrendTopicNames(scienceText).forEach((topicName) => pushEntry("Science", topicName));
  return entries;
}

async function run() {
  const checks = [];
  const apiSnapshots = {};
  const port = Number(process.env.MENTOR_TEST_PORT || 3052);
  const baseUrl = `http://localhost:${port}`;

  const topicHubText = await readText("src/pages/TopicHub.tsx");
  const serverText = await readText("server/index.cjs");
  const mathTrendsText = await readText("src/data/class10MathTopicTrends.ts");
  const scienceTrendsText = await readText("src/data/class10ScienceTopicTrends.ts");
  const trendTopicEntries = buildTrendTopicEntries(mathTrendsText, scienceTrendsText);

  addCheck(
    checks,
    "topic_hub_grind_topic_mode_wired",
    topicHubText.includes("grind_topic_v1"),
    "TopicHub Grind drawer should call grind_topic_v1 for non-triangles."
  );
  addCheck(
    checks,
    "topic_hub_priority_grind_keys_removed",
    !topicHubText.includes("PRIORITY_TOPIC_GRIND_KEYS"),
    "TopicHub should not gate grind contracts to a hard-coded priority list."
  );
  addCheck(
    checks,
    "server_topic_grind_contract_handler_present",
    serverText.includes("buildGrindTopicContractFallback") &&
      serverText.includes("grind_topic_v1"),
    "Server should expose deterministic grind_topic_v1 contract handler."
  );
  addCheck(
    checks,
    "server_priority_rejection_removed",
    !serverText.includes("enabled only for priority non-triangles topics"),
    "Server should not reject non-priority topics for grind_topic_v1."
  );
  addCheck(
    checks,
    "trends_topic_inventory_parsed",
    trendTopicEntries.length >= 20,
    `parsed=${trendTopicEntries.length}`
  );

  const serverProc = spawn(process.execPath, ["server/index.cjs"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: String(port),
      AI_PROVIDER: "",
      API_KEY: "",
      NODE_ENV: "test",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const logs = [];
  serverProc.stdout.on("data", (chunk) => logs.push(String(chunk || "")));
  serverProc.stderr.on("data", (chunk) => logs.push(String(chunk || "")));

  try {
    await waitForServer(baseUrl);

    const basePayload = {
      subject: "Maths",
      grade: 10,
      section: "grind",
      subSection: "inline-doubt",
      mindmapNodeId: "core_node",
      mindmapNodeTitle: "Core grind node",
      mindmapNodeText: "Board-writing focused grind node",
      questionText: "Give a board-style skeleton answer.",
      doubtContext: "Student needs exam-format drilling.",
    };

    for (const entry of trendTopicEntries) {
      const req = await postMentor(baseUrl, {
        mode: "grind_topic_v1",
        payload: {
          ...basePayload,
          subject: entry.subject,
          topicKey: entry.topicKey,
          chapter: entry.topicKey,
          topic: entry.topicName,
          mindmapNodeTitle: `${entry.topicName} core node`,
        },
        messages: [{ role: "user", content: `Give me grind contract for ${entry.topicName}.` }],
      });
      const snapshotKey = `${entry.subject.toLowerCase()}_${entry.topicKey}`.replace(/[^a-z0-9_]+/g, "_");
      apiSnapshots[snapshotKey] = req;
      const contract = parseContract(req);
      addCheck(
        checks,
        `${snapshotKey}_status_ok`,
        req.status === 200,
        `status=${req.status}`
      );
      addCheck(
        checks,
        `${snapshotKey}_contract_shape`,
        Boolean(
          contract &&
            contract.type === "grind_topic_v1" &&
            String(contract.topicKey || "").length > 0 &&
            String(contract.node?.id || "").length > 0 &&
            String(contract.node?.title || "").length > 0 &&
            isNonEmptyArray(contract.board?.given) &&
            isNonEmptyArray(contract.board?.steps) &&
            Number.isFinite(Number(contract.rubric?.marks)) &&
            isNonEmptyArray(contract.rubric?.checkpoints) &&
            isNonEmptyArray(contract.commonTraps) &&
            isNonEmptyArray(contract.microDrills)
        ),
        JSON.stringify(contract)
      );
    }
  } finally {
    if (!serverProc.killed) {
      serverProc.kill("SIGTERM");
      await delay(300);
      if (!serverProc.killed) serverProc.kill("SIGKILL");
    }
  }

  const failed = checks.filter((check) => !check.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    checks,
    apiSnapshots,
    logs: logs.slice(-200),
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length) {
    console.error(`Topic grind contracts acceptance FAILED (${failed.length}/${checks.length})`);
    failed.forEach((f) => console.error(`- ${f.name}: ${f.details}`));
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Topic grind contracts acceptance PASSED (${checks.length}/${checks.length}).`);
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("Topic grind contracts acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${path.relative(repoRoot, outPath)}`);
  process.exitCode = 1;
});
