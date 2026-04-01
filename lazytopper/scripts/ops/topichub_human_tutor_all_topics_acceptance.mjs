import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "topichub_human_tutor_all_topics_acceptance.json");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
}

function startsWithPrefix(line, prefix) {
  return String(line || "").trim().startsWith(prefix);
}

function isRenderableTutorDiagramSpec(spec) {
  if (!spec || typeof spec !== "object") return false;
  if (String(spec.kind || "") !== "tutor_diagram_v1") return false;
  if (!Array.isArray(spec.points) || spec.points.length < 3) return false;
  if (!Array.isArray(spec.edges) || spec.edges.length < 2) return false;
  return true;
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
      // server not ready
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

function extractStructured(resp) {
  const structured = resp?.json?.data?.structured;
  if (structured && typeof structured === "object") return structured;
  const txt = String(resp?.json?.data?.text || "").trim();
  if (!txt) return null;
  try {
    const parsed = JSON.parse(txt);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function extractDiagramData(structured) {
  const teach = structured?.teach && typeof structured.teach === "object" ? structured.teach : {};
  const tutor = structured?.tutor && typeof structured.tutor === "object" ? structured.tutor : {};
  const diagram = teach?.diagram && typeof teach.diagram === "object" ? teach.diagram : {};
  return {
    required: Boolean(
      diagram.required ??
        diagram.diagramRequired ??
        structured?.diagramRequired ??
        tutor?.diagramRequired ??
        false
    ),
    type: String(diagram.type || diagram.diagramType || structured?.diagramType || tutor?.diagramType || "")
      .trim()
      .toLowerCase(),
    spec:
      diagram.spec ||
      diagram.diagramSpec ||
      structured?.diagram ||
      structured?.diagramSpec ||
      tutor?.diagramSpec ||
      null,
  };
}

async function run() {
  const checks = [];
  const snapshots = {};
  const port = Number(process.env.MENTOR_TEST_PORT || 3054);
  const baseUrl = `http://localhost:${port}`;

  const topicHubText = await readText("src/pages/TopicHub.tsx");
  addCheck(
    checks,
    "resources_fallback_mindmap_present",
    topicHubText.includes("const resourceMindMap = hasMindMapContent(rawMindMap) ? rawMindMap : fallbackResourceMindMap"),
    "Resource concept-map fallback should exist."
  );
  addCheck(
    checks,
    "resources_fallback_formulae_present",
    topicHubText.includes("const resourceFormulae = rawFormulae.length ? rawFormulae : fallbackFormulae"),
    "Resource formula sheet fallback should exist."
  );
  addCheck(
    checks,
    "resources_fallback_videos_present",
    topicHubText.includes("const resourceVideos = useMemo(") &&
      topicHubText.includes("mergeResourceVideos(rawVideos, fallbackVideos)"),
    "Resource video fallback should include contextual Khan/YouTube links."
  );
  addCheck(
    checks,
    "resources_render_uses_fallbacks",
    topicHubText.includes("mindMap={resourceMindMap}") &&
      topicHubText.includes("safeArray<any>(resourceFormulae)") &&
      topicHubText.includes("safeArray<any>(resourceVideos)"),
    "Resources tab should render fallback-backed datasets."
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

  const cases = [
    {
      id: "triangles",
      subject: "Maths",
      topicKey: "triangles",
      expectedTypeContains: "triangle",
      requiredTokens: ["similar", "criterion", "correspond"],
      forbiddenTokens: [],
    },
    {
      id: "trigonometry",
      subject: "Maths",
      topicKey: "trigonometry",
      expectedTypeContains: "trigonometric_triangle",
      requiredTokens: ["ratio", "identity", "angle"],
      forbiddenTokens: [],
    },
    {
      id: "heights_distances",
      subject: "Maths",
      topicKey: "maths-applications-trigonometry",
      expectedTypeContains: "trigonometric_triangle",
      requiredTokens: ["angle", "formula", "result"],
      forbiddenTokens: [],
    },
    {
      id: "coordinate_geometry",
      subject: "Maths",
      topicKey: "coordinate-geometry",
      expectedTypeContains: "coordinate_plane",
      requiredTokens: ["coordinate", "distance", "section"],
      forbiddenTokens: [],
    },
    {
      id: "electricity",
      subject: "Science",
      topicKey: "electricity",
      expectedTypeContains: "circuit",
      requiredTokens: ["ohm", "current", "voltage", "resistance"],
      forbiddenTokens: ["aa", "sas", "sss", "cpst", "similar triangles"],
    },
    {
      id: "light",
      subject: "Science",
      topicKey: "light-reflection-refraction",
      expectedTypeContains: "ray_diagram",
      requiredTokens: ["ray", "reflection", "refraction", "image"],
      forbiddenTokens: ["aa", "sas", "sss", "cpst", "similar triangles"],
    },
    {
      id: "life_processes",
      subject: "Science",
      topicKey: "life-processes",
      expectedTypeContains: "biology_process",
      requiredTokens: ["process", "function", "biolog", "system"],
      forbiddenTokens: ["aa", "sas", "sss", "cpst", "similar triangles"],
    },
  ];

  try {
    await waitForServer(baseUrl);

    for (const c of cases) {
      const payload = {
        subject: c.subject,
        grade: 10,
        topicKey: c.topicKey,
        chapter: c.topicKey,
        section: "learn",
        subSection: "teach",
        selectedTab: "teach",
        selectedMode: "learn_teach",
        mindmapNodeId: `${c.id}_node`,
        mindmapNodeTitle: `${c.id} basics`,
        mindmapNodeText: `Teach ${c.id} in CBSE board-writing format.`,
        contextText: `Class 10 ${c.subject} ${c.topicKey}`,
        questionText: `Teach ${c.id} like a strict-but-kind CBSE teacher with exam format.`,
        cardTitle: `${c.id} core`,
        cardName: `${c.id} core`,
        stepIndex: 0,
        vibe: "beast",
      };

      const teachReq = await postMentor(baseUrl, {
        mode: "learn_teach",
        payload,
        messages: [{ role: "user", content: payload.questionText }],
      });
      snapshots[`${c.id}_teach`] = teachReq;
      const structured = extractStructured(teachReq) || {};
      const keyIdeas = Array.isArray(structured?.teach?.keyIdeas) ? structured.teach.keyIdeas : [];
      const checkpoint = structured?.checkpoint || {};
      const diagram = extractDiagramData(structured);
      const semanticBlob = [
        String(structured?.teach?.goal || ""),
        ...keyIdeas.map((line) => String(line || "")),
        String(checkpoint.question || ""),
        String(checkpoint.answer || ""),
        String(structured?.commonMistake || ""),
      ]
        .join(" ")
        .toLowerCase();
      const requiredTokenHit = c.requiredTokens.every((token) =>
        semanticBlob.includes(String(token || "").toLowerCase())
      );
      const forbiddenTokenHit = c.forbiddenTokens.some((token) =>
        semanticBlob.includes(String(token || "").toLowerCase())
      );

      addCheck(checks, `${c.id}_teach_status_ok`, teachReq.status === 200, `status=${teachReq.status}`);
      addCheck(
        checks,
        `${c.id}_kind_learn_teach`,
        structured.kind === "learn_teach",
        String(structured.kind || "")
      );
      addCheck(
        checks,
        `${c.id}_contract_source_topic`,
        String(structured?.contract_source || structured?.teach?.contract_source || "").toLowerCase() === "topic",
        String(structured?.contract_source || structured?.teach?.contract_source || "")
      );
      addCheck(
        checks,
        `${c.id}_teacher_goal_prefix`,
        startsWithPrefix(structured?.teach?.goal, "Teacher goal:"),
        String(structured?.teach?.goal || "")
      );
      addCheck(
        checks,
        `${c.id}_key_ideas_cbse_order`,
        keyIdeas.length === 4 &&
          startsWithPrefix(keyIdeas[0], "Definition:") &&
          startsWithPrefix(keyIdeas[1], "Criterion:") &&
          startsWithPrefix(keyIdeas[2], "Correspondence:") &&
          startsWithPrefix(keyIdeas[3], "Conclusion:"),
        JSON.stringify(keyIdeas)
      );
      addCheck(
        checks,
        `${c.id}_semantic_required_token`,
        requiredTokenHit,
        JSON.stringify({ required: c.requiredTokens, semanticBlob })
      );
      addCheck(
        checks,
        `${c.id}_semantic_forbidden_token_absent`,
        !forbiddenTokenHit,
        JSON.stringify({ forbidden: c.forbiddenTokens, semanticBlob })
      );
      addCheck(
        checks,
        `${c.id}_checkpoint_question_board_style`,
        /\bboard\b|\bcbse\b/i.test(String(checkpoint.question || "")) &&
          /\bgiven\b/i.test(String(checkpoint.question || "")) &&
          /\bto prove\b|\bto find\b/i.test(String(checkpoint.question || "")),
        String(checkpoint.question || "")
      );
      addCheck(
        checks,
        `${c.id}_checkpoint_answer_exam_format`,
        /^Expected answer:/i.test(String(checkpoint.answer || "")) &&
          /\bgiven\b\s*:/i.test(String(checkpoint.answer || "")) &&
          /(\bto prove\b(?:\/find)?\s*:)|(\bto find\b\s*:)/i.test(String(checkpoint.answer || "")) &&
          /\bcriterion\b|\btheorem\b|\bformula\b|\bprinciple\b|\blaw\b/i.test(String(checkpoint.answer || "")) &&
          /\btherefore\b|\bhence\b/i.test(String(checkpoint.answer || "")),
        String(checkpoint.answer || "")
      );
      addCheck(
        checks,
        `${c.id}_common_mistake_marks_risk`,
        /\bmark\b|\bdeduct\b|\blose marks\b|\bstep marks\b/i.test(String(structured?.commonMistake || "")),
        String(structured?.commonMistake || "")
      );
      addCheck(
        checks,
        `${c.id}_diagram_required`,
        diagram.required,
        JSON.stringify(diagram)
      );
      addCheck(
        checks,
        `${c.id}_diagram_type_contextual`,
        diagram.type.includes(c.expectedTypeContains),
        `actual=${diagram.type} expected~=${c.expectedTypeContains}`
      );
      addCheck(
        checks,
        `${c.id}_diagram_spec_renderable`,
        isRenderableTutorDiagramSpec(diagram.spec),
        JSON.stringify(diagram.spec)
      );

      const attemptReq = await postMentor(baseUrl, {
        mode: "learn_teach",
        payload,
        messages: [
          { role: "user", content: payload.questionText },
          {
            role: "user",
            content:
              "Given: data from question. To Prove/Find: target. Criterion/Theorem/Formula: correct one. Therefore final line.",
          },
        ],
      });
      snapshots[`${c.id}_attempt`] = attemptReq;
      const attemptStructured = extractStructured(attemptReq) || {};
      const attemptLoop = attemptStructured?.attempt_loop;
      const tutorDiagnosisStatus = String(
        attemptStructured?.tutor?.diagnosis?.status ||
          attemptStructured?.diagnosis?.status ||
          ""
      ).trim();
      const tutorNextPrompt = String(
        attemptStructured?.tutor?.hint_ladder?.next_action ||
          attemptStructured?.hint_ladder?.next_action ||
          ""
      ).trim();
      const attemptStatus =
        String(attemptLoop?.diagnosis?.status || "").trim() ||
        tutorDiagnosisStatus;
      const attemptAction =
        String(attemptLoop?.next_action?.prompt || "").trim() ||
        tutorNextPrompt;
      addCheck(
        checks,
        `${c.id}_attempt_feedback_present`,
        Boolean((attemptLoop && typeof attemptLoop === "object") || attemptAction),
        JSON.stringify({
          attemptLoop: attemptLoop || null,
          tutorDiagnosisStatus,
          tutorNextPrompt,
        })
      );
      addCheck(
        checks,
        `${c.id}_attempt_feedback_has_next_action`,
        Boolean(
          attemptAction &&
            (attemptStatus || /\bhint\b|\bretry\b|\bnext\b|\bstep\b/i.test(attemptAction))
        ),
        JSON.stringify({
          status: attemptStatus,
          prompt: attemptAction,
          tutorDiagnosisStatus,
          tutorNextPrompt,
        })
      );
    }
  } finally {
    if (!serverProc.killed) {
      serverProc.kill("SIGTERM");
      await delay(300);
      if (!serverProc.killed) serverProc.kill("SIGKILL");
    }
  }

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    checks,
    snapshots: Object.fromEntries(
      Object.entries(snapshots).map(([k, v]) => [k, { status: v.status }])
    ),
    logs: logs.slice(-200),
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length) {
    console.error(`TopicHub human tutor all-topics acceptance FAILED (${failed.length}/${checks.length}).`);
    failed.forEach((f) => console.error(`- ${f.name}: ${f.details}`));
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`TopicHub human tutor all-topics acceptance PASSED (${checks.length}/${checks.length}).`);
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("TopicHub human tutor all-topics acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${path.relative(repoRoot, outPath)}`);
  process.exitCode = 1;
});
