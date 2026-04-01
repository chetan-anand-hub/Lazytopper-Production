import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "triangles_human_tutor_acceptance.json");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readText(relPath) {
  return fs.readFile(path.join(repoRoot, relPath), "utf8");
}

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
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

function startsWithPrefix(line, prefix) {
  return String(line || "").trim().startsWith(prefix);
}

async function run() {
  const checks = [];
  const apiSnapshots = {};
  const port = Number(process.env.MENTOR_TEST_PORT || 3051);
  const baseUrl = `http://localhost:${port}`;

  // Static UX wiring checks across Learn / Grind / Resources.
  const topicHubText = await readText("src/pages/TopicHub.tsx");
  const tutorText = await readText("src/components/tutor/TutorDrawerV2.tsx");
  const serverText = await readText("server/index.cjs");
  const masteryText = await readText("src/services/topicHubMastery.ts");

  addCheck(
    checks,
    "topic_tabs_locked_to_learn_grind_resources",
    topicHubText.includes("setActiveTab('learn')") &&
      topicHubText.includes("setActiveTab('grind')") &&
      topicHubText.includes("setActiveTab('resources')"),
    "Expected only Learn/Grind/Resources top-level tabs."
  );
  addCheck(
    checks,
    "learn_uses_human_tutor_drawer",
    topicHubText.includes("SharedTutorDrawerV2") &&
      topicHubText.includes("openTutorDrawer({ tab: \"teach\""),
    "Learn should open shared tutor drawer in teach mode."
  );
  addCheck(
    checks,
    "teach_soft_gate_present",
    tutorText.includes("Checkpoint not yet passed for this node.") &&
      tutorText.includes("Continue anyway"),
    "Soft gating must warn but allow continue."
  );
  addCheck(
    checks,
    "grind_inline_doubt_hardened",
    topicHubText.includes("parseMentorPayload") &&
      topicHubText.includes("Mentor is rate-limited. Showing fallback guidance."),
    "Grind doubt flow should tolerate non-JSON and 429."
  );
  addCheck(
    checks,
    "resources_revision_cockpit_present",
    topicHubText.includes("resources-revision-cockpit") &&
      topicHubText.includes("resources-exam-day-pack") &&
      topicHubText.includes("resources-progression-hints"),
    "Resources cockpit cards should exist."
  );
  addCheck(
    checks,
    "resources_human_tutor_ctas_present",
    topicHubText.includes("Human tutor quick drill") &&
      topicHubText.includes("Teach this") &&
      topicHubText.includes("Grind this") &&
      topicHubText.includes("Practice this"),
    "Resources should keep Teach/Grind/Practice handoff."
  );
  addCheck(
    checks,
    "mastery_storage_key_present",
    masteryText.includes("lazytopper.topicHub.triangles.mastery.v1"),
    "Triangles local mastery key should remain stable."
  );
  addCheck(
    checks,
    "server_deterministic_teacher_enforcement_present",
    serverText.includes("enforceTeacherGoal") &&
      serverText.includes("normalizeTeachKeyIdeas") &&
      serverText.includes("enforceCheckpointAnswer"),
    "Server should enforce deterministic CBSE teacher voice."
  );

  // API acceptance checks (stub-backed, deterministic).
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
      topicKey: "triangles",
      chapter: "triangles",
      section: "learn",
      subSection: "teach",
      selectedTab: "teach",
      selectedMode: "learn_teach",
      mindmapNodeId: "gAA",
      mindmapNodeTitle: "AA similarity",
      mindmapNodeText: "If two angles are equal, triangles are similar.",
      contextText: "Teach AA similarity in CBSE board-writing format.",
      cardTitle: "AA similarity",
      cardName: "AA similarity",
      stepIndex: 0,
      vibe: "beast",
    };

    const teachReq = await postMentor(baseUrl, {
      mode: "learn_teach",
      payload: basePayload,
      messages: [{ role: "user", content: "Teach AA similarity in CBSE board format." }],
    });
    apiSnapshots.teach = teachReq;

    const structured = teachReq?.json?.data?.structured || {};
    const keyIdeas = Array.isArray(structured?.teach?.keyIdeas) ? structured.teach.keyIdeas : [];
    const checkpoint = structured?.checkpoint || {};

    addCheck(checks, "api_teach_status_ok", teachReq.status === 200, `status=${teachReq.status}`);
    addCheck(
      checks,
      "api_teach_kind_contract",
      structured.kind === "learn_teach",
      `kind=${String(structured.kind || "")}`
    );
    addCheck(
      checks,
      "api_teacher_goal_prefix",
      startsWithPrefix(structured?.teach?.goal, "Teacher goal:"),
      String(structured?.teach?.goal || "")
    );
    addCheck(
      checks,
      "api_key_ideas_ordered",
      keyIdeas.length === 4 &&
        startsWithPrefix(keyIdeas[0], "Definition:") &&
        startsWithPrefix(keyIdeas[1], "Criterion:") &&
        startsWithPrefix(keyIdeas[2], "Correspondence:") &&
        startsWithPrefix(keyIdeas[3], "Conclusion:"),
      JSON.stringify(keyIdeas)
    );
    addCheck(
      checks,
      "api_checkpoint_question_board_style",
      /\bboard\b|\bcbse\b/i.test(String(checkpoint.question || "")) &&
        /\bgiven\b/i.test(String(checkpoint.question || "")) &&
        /\bto prove\b/i.test(String(checkpoint.question || "")),
      String(checkpoint.question || "")
    );
    addCheck(
      checks,
      "api_checkpoint_answer_exam_format",
      /^Expected answer:/i.test(String(checkpoint.answer || "")) &&
        /\bgiven\b\s*:/i.test(String(checkpoint.answer || "")) &&
        /\bto prove\b\s*:/i.test(String(checkpoint.answer || "")) &&
        /\bcriterion\b|\btheorem\b/i.test(String(checkpoint.answer || "")) &&
        /\btherefore\b|\bhence\b/i.test(String(checkpoint.answer || "")),
      String(checkpoint.answer || "")
    );
    addCheck(
      checks,
      "api_common_mistake_marks_risk",
      /\bmark\b|\bdeduct\b|\blose marks\b|\bstep marks\b/i.test(
        String(structured?.commonMistake || "")
      ),
      String(structured?.commonMistake || "")
    );

    const attemptReq = await postMentor(baseUrl, {
      mode: "learn_teach",
      payload: basePayload,
      messages: [
        {
          role: "user",
          content:
            "Given: ∠A = ∠D and ∠B = ∠E. To Prove: △ABC ~ △DEF. Criterion/Theorem: AA similarity. Therefore triangles are similar.",
        },
      ],
    });
    apiSnapshots.attempt = attemptReq;
    const attemptLoop = attemptReq?.json?.data?.structured?.attempt_loop;
    addCheck(
      checks,
      "api_attempt_loop_attached",
      Boolean(attemptLoop && typeof attemptLoop === "object"),
      JSON.stringify(attemptLoop || null)
    );
    addCheck(
      checks,
      "api_attempt_loop_has_diagnosis_and_next_action",
      Boolean(
        attemptLoop &&
          attemptLoop.diagnosis &&
          String(attemptLoop.diagnosis.status || "").trim() &&
          attemptLoop.next_action &&
          String(attemptLoop.next_action.prompt || "").trim()
      ),
      JSON.stringify({
        status: attemptLoop?.diagnosis?.status,
        prompt: attemptLoop?.next_action?.prompt,
      })
    );

    const grindReq = await postMentor(baseUrl, {
      mode: "grind_triangles_v1",
      payload: {
        subject: "Maths",
        grade: 10,
        topicKey: "triangles",
        chapter: "triangles",
        section: "grind",
        subSection: "inline-doubt",
        mindmapNodeId: "S2",
        mindmapNodeTitle: "AA similarity",
        mindmapNodeText: "AA similarity node",
        questionText: "Give a board-style skeleton.",
      },
      messages: [{ role: "user", content: "Give a board-style skeleton for AA similarity." }],
    });
    apiSnapshots.grind = grindReq;
    const grindText = String(grindReq?.json?.data?.text || "").trim();
    const grindStructured = grindReq?.json?.data?.structured;
    const grindParsed =
      (grindText && (() => {
        try {
          return JSON.parse(grindText);
        } catch {
          return null;
        }
      })()) ||
      grindStructured ||
      null;
    addCheck(checks, "api_grind_status_ok", grindReq.status === 200, `status=${grindReq.status}`);
    addCheck(
      checks,
      "api_grind_returns_contract_or_guidance",
      Boolean(
        (grindParsed && String(grindParsed.type || "").includes("grind_triangles_v1")) ||
          grindText.length > 0
      ),
      grindText ? grindText.slice(0, 180) : JSON.stringify(grindParsed)
    );
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
    apiSnapshots: {
      teachStatus: apiSnapshots.teach?.status,
      attemptStatus: apiSnapshots.attempt?.status,
      grindStatus: apiSnapshots.grind?.status,
    },
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length) {
    console.error(`Triangles human tutor acceptance FAILED (${failed.length} check(s)).`);
    failed.forEach((check) => {
      console.error(` - ${check.name}: ${check.details}`);
    });
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exit(1);
  }

  console.log(`Triangles human tutor acceptance PASSED (${report.summary.passed}/${report.summary.total}).`);
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch((err) => {
  console.error("Triangles human tutor acceptance runner failed:", err?.message || err);
  process.exit(1);
});
