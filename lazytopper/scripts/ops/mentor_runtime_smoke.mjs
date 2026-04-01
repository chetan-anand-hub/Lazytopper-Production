import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "mentor_runtime_smoke.json");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
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
    json = raw ? JSON.parse(raw) : {};
  } catch {
    json = { raw };
  }
  return { status: res.status, json };
}

async function postMentorWithRetry(baseUrl, body, attempts = 3) {
  let lastError;
  for (let index = 0; index < attempts; index += 1) {
    try {
      return await postMentor(baseUrl, body);
    } catch (error) {
      lastError = error;
      await delay(1500);
    }
  }
  throw lastError;
}

async function run() {
  const checks = [];
  const snapshots = {};
  const port = Number(process.env.MENTOR_TEST_PORT || 3057);
  const baseUrl = `http://localhost:${port}`;

  const serverProc = spawn(process.execPath, ["server/index.cjs"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: String(port),
      AI_PROVIDER: "",
      API_KEY: "",
      GEMINI_API_KEY: "",
      NODE_ENV: "test",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const logs = [];
  serverProc.stdout.on("data", (chunk) => logs.push(String(chunk || "")));
  serverProc.stderr.on("data", (chunk) => logs.push(String(chunk || "")));

  try {
    await delay(28000);

    const body = {
      mode: "solve_with_me",
      payload: {
        subject: "Maths",
        grade: 10,
        topicKey: "triangles",
        chapter: "triangles",
        questionText: "In triangles ABC and DEF, angle A = angle D and angle B = angle E. Which theorem should help first?",
        studentQuestion: "I am stuck. Which theorem should I use first?",
        studentIntent: "hint",
        studentProfile: "weak_foundation",
        mentorHelpMode: "next_step",
        solveStyle: "socratic",
        questionFamilyId: "TRI_FAMILY_SIMILARITY_CHOICE",
        questionFamilyLabel: "Similarity rule choice",
        questionTypeId: "TRI_QTYPE_02_SIMILARITY",
        chapterStep: "similarity-choice",
        practiceSectionFilter: "C",
        suggestedPracticeIds: ["2026-TRI-P1-B-003", "2026-TRI-P1-C-002"],
        theoremFocus: ["AA similarity", "correspondence"],
        recommendedDiagramType: "geometry_similarity",
        vibe: "beast",
      },
      messages: [{ role: "user", content: "I am stuck. Which theorem should I use first?" }],
    };

    const mentorResp = await postMentorWithRetry(baseUrl, body);
    snapshots.mentor = mentorResp;

    const structured = mentorResp?.json?.data?.structured || {};
    const trace = mentorResp?.json?.data?.trace || {};
    const tutor = structured?.tutor && typeof structured.tutor === "object" ? structured.tutor : null;
    const diagnosis = tutor?.diagnosis && typeof tutor.diagnosis === "object" ? tutor.diagnosis : null;
    const practiceNext =
      tutor?.practice_next && typeof tutor.practice_next === "object" ? tutor.practice_next : null;
    const adaptiveStyle =
      tutor?.adaptive_style && typeof tutor.adaptive_style === "object" ? tutor.adaptive_style : null;

    addCheck(checks, "mentor_route_status_ok", mentorResp.status === 200, `status=${mentorResp.status}`);
    addCheck(checks, "mentor_trace_stub_used", Boolean(trace?.stub_used), JSON.stringify(trace));
    addCheck(
      checks,
      "mentor_trace_mode_present",
      String(trace?.normalized_mode || "").trim() === "solve_with_me",
      JSON.stringify(trace)
    );
    addCheck(checks, "mentor_structured_payload_present", mentorResp.status === 200 && Boolean(structured && typeof structured === "object"), JSON.stringify(mentorResp?.json || {}));
    addCheck(checks, "mentor_structured_text_present", typeof mentorResp?.json?.data?.text === "string" && mentorResp.json.data.text.trim().length > 0);
    addCheck(checks, "mentor_tutor_block_present", Boolean(tutor), JSON.stringify(structured));
    addCheck(
      checks,
      "mentor_diagnosis_family_present",
      String(diagnosis?.family_id || "").trim() === "TRI_FAMILY_SIMILARITY_CHOICE",
      JSON.stringify(diagnosis || {})
    );
    addCheck(
      checks,
      "mentor_diagnosis_student_profile_present",
      String(diagnosis?.student_profile || "").trim() === "weak_foundation",
      JSON.stringify(diagnosis || {})
    );
    addCheck(
      checks,
      "mentor_help_mode_present",
      String(diagnosis?.help_mode || "").trim() === "next_step",
      JSON.stringify(diagnosis || {})
    );
    addCheck(
      checks,
      "mentor_practice_next_present",
      String(practiceNext?.topic_key || "").trim() === "triangles" &&
        String(practiceNext?.family_id || "").trim() === "TRI_FAMILY_SIMILARITY_CHOICE",
      JSON.stringify(practiceNext || {})
    );
    addCheck(
      checks,
      "mentor_adaptive_style_present",
      String(adaptiveStyle?.profile || "").trim() === "weak_foundation",
      JSON.stringify(adaptiveStyle || {})
    );
    addCheck(
      checks,
      "mentor_diagram_signal_present",
      typeof tutor?.diagramRequired === "boolean" &&
        String(tutor?.diagramType || "").trim().length > 0,
      JSON.stringify({ diagramRequired: tutor?.diagramRequired, diagramType: tutor?.diagramType })
    );

    const failed = checks.filter((check) => !check.ok);
    const report = {
      generatedAt: new Date().toISOString(),
      verdict: failed.length === 0 ? "PASS" : "FAIL",
      summary: {
        totalChecks: checks.length,
        failedChecks: failed.length,
      },
      checks,
      scope: {
        proves: [
          "mentor backend route is reachable",
          "mentor request/response flow returns usable JSON",
          "structured tutor enrichment path works for a controlled Triangles case",
          "chapter/family/student-state/practice-next fields survive the runtime path",
        ],
        doesNotProve: [
          "full semantic pedagogy quality",
          "live provider behavior under Gemini",
          "image-upload flow",
          "load/performance or mobile QA",
        ],
      },
      snapshots,
      serverLogTail: logs.join("").split(/\r?\n/).filter(Boolean).slice(-30),
    };

    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    console.log(
      `mentor_runtime_smoke checks=${report.summary.totalChecks} failed=${report.summary.failedChecks} verdict=${report.verdict}`
    );
    console.log(`report=${outPath.replaceAll("\\", "/")}`);
    if (failed.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    serverProc.kill("SIGTERM");
    await delay(400);
    if (!serverProc.killed) {
      serverProc.kill("SIGKILL");
    }
  }
}

run().catch(async (error) => {
  const payload = {
    generatedAt: new Date().toISOString(),
    verdict: "FAIL",
    error: String(error?.stack || error),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.error(String(error?.stack || error));
  process.exitCode = 1;
});
