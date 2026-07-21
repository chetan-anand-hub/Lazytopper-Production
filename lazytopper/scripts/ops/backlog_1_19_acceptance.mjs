import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "backlog_1_19_acceptance.json");

function addCheck(checks, id, name, ok, details = "") {
  checks.push({
    id,
    name,
    ok: Boolean(ok),
    details: String(details || ""),
  });
}

async function readText(relPath) {
  return fs.readFile(path.join(repoRoot, relPath), "utf8");
}

function parseCanonicalPairs(canonicalTsText) {
  const pairs = [];
  const re = /\{[\s\S]*?subjectId:\s*"([^"]+)"[\s\S]*?canonicalSlug:\s*"([^"]+)"[\s\S]*?\}/g;
  for (const m of canonicalTsText.matchAll(re)) {
    const subjectId = String(m[1] || "").trim().toLowerCase();
    const slug = String(m[2] || "").trim();
    if (!slug) continue;
    pairs.push({
      subject: subjectId === "science" ? "Science" : "Maths",
      slug,
    });
  }
  return pairs;
}

async function waitForServer(baseUrl, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not start within ${timeoutMs}ms`);
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const raw = await res.text();
  let json = {};
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    json = { raw };
  }
  return { status: res.status, json };
}

async function getJson(url) {
  const res = await fetch(url);
  const raw = await res.text();
  let json = {};
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    json = { raw };
  }
  return { status: res.status, json };
}

function extractMentorStructured(resp) {
  return resp?.json?.data?.structured || null;
}

async function run() {
  const checks = [];

  const registryRaw = await readText("src/data/syllabus/cbse10Registry_2025_26.json");
  const registry = JSON.parse(registryRaw);
  const allChapters = (Array.isArray(registry?.subjects) ? registry.subjects : [])
    .flatMap((subject) => (Array.isArray(subject?.chapters) ? subject.chapters : []));
  const triangles = allChapters.find((chapter) => String(chapter?.chapter_id || "") === "M10_CH_TRIANGLES");
  const trianglesBullets = Array.isArray(triangles?.cbse_scope_bullets) ? triangles.cbse_scope_bullets : [];
  const trianglesBlob = trianglesBullets.join(" ").toLowerCase();
  const notesBlob = (Array.isArray(registry?.meta?.notes) ? registry.meta.notes : []).join(" ").toLowerCase();

  addCheck(
    checks,
    "1",
    "CUR-01 registry v2 lock",
    notesBlob.includes("v2 fix") && !trianglesBlob.includes("pythagoras theorem"),
    JSON.stringify({
      chapterCount: allChapters.length,
      hasV2FixNote: notesBlob.includes("v2 fix"),
      trianglesHasPythagoras: trianglesBlob.includes("pythagoras theorem"),
    })
  );

  const scopePolicyText = await readText("src/data/syllabus/scopePolicy.ts");
  addCheck(
    checks,
    "2",
    "CUR-02 assessed vs enrichment policy layer",
    scopePolicyText.includes("excludedTermsInAssessed") &&
      scopePolicyText.includes("triangles") &&
      scopePolicyText.includes("Scope guard"),
    "scopePolicy.ts must define chapter policy and scope guard behavior."
  );

  const onboardingText = await readText("src/pages/Onboarding.tsx");
  addCheck(
    checks,
    "3",
    "CUR-03 class coverage truth alignment",
    !onboardingText.includes('option value="12"'),
    "Onboarding should not expose Class 12 while flow is Class 10-first."
  );
  addCheck(
    checks,
    "4",
    "CUR-04 diagnostic placeholder removal",
    !onboardingText.includes("Quick Diagnostic Test") &&
      !onboardingText.includes("For now, we use target + hours/day"),
    "Diagnostic placeholder UI should be removed from onboarding."
  );


  const sessionTypesText = await readText("src/services/sessionTypes.ts");
  addCheck(
    checks,
    "9",
    "SES-01 session item contract present",
    ["concept_micro", "worked_example", "practice_question", "mistake_fix_micro", "exam_tip_card", "mastery_quiz"]
      .every((token) => sessionTypesText.includes(token)),
    "Session item union should contain core item types."
  );

  const dashboardText = await readText("src/pages/Dashboard.tsx");
  addCheck(
    checks,
    "12",
    "SES-04 dashboard launches session player",
    dashboardText.includes("startSession") && dashboardText.includes("/play/"),
    "Dashboard should start sessions and route to /play/:sessionId."
  );

  const progressText = await readText("src/services/studentProgressStore.ts");
  addCheck(
    checks,
    "13",
    "PRG-01 unified per-user progress store",
    ["topic_mastery", "attempt_stats", "recent_activity", "streak"].every((token) =>
      progressText.toLowerCase().includes(token.toLowerCase())
    ),
    "Progress store should track mastery, attempts, activity, and streak."
  );

  addCheck(
    checks,
    "15",
    "PRG-03 dashboard progress fidelity",
    dashboardText.includes("Performance Matrix") &&
      dashboardText.includes("Attempted") &&
      dashboardText.includes("Accuracy"),
    "Dashboard should render per-topic progress matrix."
  );

  const appText = await readText("src/App.tsx");
  addCheck(
    checks,
    "17",
    "ENG-01 frontend modularization (lazy routes)",
    appText.includes("lazy(() => import(") && appText.includes("Suspense"),
    "App routes should use React.lazy + Suspense for large pages."
  );

  const serverText = await readText("server/index.cjs");
  addCheck(
    checks,
    "18",
    "ENG-02 backend modularization lane",
    serverText.includes('require("./sessionHandlers.cjs")') &&
      serverText.includes("/api/session/start"),
    "Server should delegate session APIs via modular handlers."
  );

  const packageJsonText = await readText("package.json");
  addCheck(
    checks,
    "19",
    "ENG-03 persona gate script wired",
    packageJsonText.includes("test:persona:audit"),
    "package.json should expose persona audit gate."
  );

  // Runtime integration checks (5,6,7,10,11,16) using live server.
  const port = Number(process.env.BACKLOG_TEST_PORT || 3061);
  const baseUrl = `http://localhost:${port}`;
  const canonicalPairs = parseCanonicalPairs(await readText("src/data/syllabus/cbse10Canonical.ts"));

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

    // RETIREMENT PR-2: TUT-01 (canonical topic contract coverage) and TUT-02
    // (scope-aware tutor behavior) both POSTed to /api/mentor, deleted with the old
    // tutor. Removed rather than repointed at /api/tutor - the new tutor has a
    // different contract, so a rewrite would be new coverage, not a port.

    const tutorContractsText = await readText("src/contracts/tutorContracts.ts");
    addCheck(
      checks,
      "7",
      "TUT-03 examiner-style scoring structure",
      tutorContractsText.includes("presentation_exam_style") &&
        tutorContractsText.includes("recommended_next"),
      "Tutor contracts should include rubric dimensions and next-step recommendation."
    );

    const startHigh = await postJson(`${baseUrl}/api/session/start`, {
      kind: "daily_mix",
      subjectId: "maths",
      chapterId: "triangles",
      vibe: "high",
    });
    const startLow = await postJson(`${baseUrl}/api/session/start`, {
      kind: "daily_mix",
      subjectId: "maths",
      chapterId: "triangles",
      vibe: "low",
    });

    const highSessionId = String(startHigh?.json?.sessionId || "");
    const lowSessionId = String(startLow?.json?.sessionId || "");
    const highSession = startHigh?.json?.session || {};
    const lowSession = startLow?.json?.session || {};
    const highQuestionTitle = String(highSession?.items?.[2]?.title || "");
    const lowQuestionTitle = String(lowSession?.items?.[2]?.title || "");

    addCheck(
      checks,
      "10",
      "SES-02 session API start/get/submit flow",
      startHigh.status === 200 &&
        Boolean(highSessionId) &&
        Array.isArray(highSession?.items) &&
        highSession.items.length >= 5,
      `status=${startHigh.status}, sessionId=${highSessionId}`
    );

    const getHigh = await getJson(`${baseUrl}/api/session/${encodeURIComponent(highSessionId)}`);
    const firstQuestionId = String(getHigh?.json?.session?.items?.[2]?.id || "");
    const submitHigh = await postJson(
      `${baseUrl}/api/session/${encodeURIComponent(highSessionId)}/submit`,
      {
        itemId: firstQuestionId,
        answer: "Given and To Prove with theorem and therefore hence.",
      }
    );

    addCheck(
      checks,
      "11",
      "SES-03 vibe-aware session composition",
      highQuestionTitle !== lowQuestionTitle &&
        /hard|medium/i.test(highQuestionTitle) &&
        /easy|medium/i.test(lowQuestionTitle),
      JSON.stringify({ highQuestionTitle, lowQuestionTitle })
    );

    addCheck(
      checks,
      "16",
      "PRG-04 model-vs-student delta signal",
      submitHigh.status === 200 &&
        Array.isArray(submitHigh?.json?.feedback?.missingKeywords) &&
        typeof submitHigh?.json?.feedback?.expected === "string",
      JSON.stringify(submitHigh?.json?.feedback || {})
    );
  } finally {
    serverProc.kill();
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
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length) {
    console.error(`Backlog 1-19 acceptance FAILED (${failed.length}/${checks.length}).`);
    failed.forEach((check) => {
      console.error(`- [${check.id}] ${check.name}: ${check.details}`);
    });
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Backlog 1-19 acceptance PASSED (${checks.length}/${checks.length}).`);
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("Backlog 1-19 acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${path.relative(repoRoot, outPath)}`);
  process.exitCode = 1;
});
