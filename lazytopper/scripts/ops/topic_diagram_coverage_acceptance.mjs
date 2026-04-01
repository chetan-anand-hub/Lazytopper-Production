import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "topic_diagram_coverage_acceptance.json");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      // server not ready yet
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

function parseStructured(resp) {
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

function extractDiagramPayload(structured) {
  const root = structured && typeof structured === "object" ? structured : {};
  const teach = root.teach && typeof root.teach === "object" ? root.teach : {};
  const tutor = root.tutor && typeof root.tutor === "object" ? root.tutor : {};
  const teachDiagram =
    teach.diagram && typeof teach.diagram === "object" ? teach.diagram : {};

  const diagramRequired = Boolean(
    teachDiagram.required ??
      teachDiagram.diagramRequired ??
      root.diagramRequired ??
      tutor.diagramRequired ??
      false
  );
  const diagramType = String(
    teachDiagram.type ||
      teachDiagram.diagramType ||
      root.diagramType ||
      tutor.diagramType ||
      ""
  )
    .trim()
    .toLowerCase();
  const diagramSpec =
    teachDiagram.spec ||
    teachDiagram.diagramSpec ||
    root.diagram ||
    root.diagramSpec ||
    tutor.diagramSpec ||
    null;

  return { diagramRequired, diagramType, diagramSpec };
}

function isRenderableTutorDiagramSpec(spec) {
  if (!spec || typeof spec !== "object") return false;
  if (String(spec.kind || "") !== "tutor_diagram_v1") return false;
  if (!Array.isArray(spec.points) || spec.points.length < 3) return false;
  if (!Array.isArray(spec.edges) || spec.edges.length < 2) return false;
  return true;
}

async function run() {
  const checks = [];
  const snapshots = {};
  const port = Number(process.env.MENTOR_TEST_PORT || 3053);
  const baseUrl = `http://localhost:${port}`;

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
      chapter: "triangles",
      questionText: "Teach similar triangles with a labelled figure.",
      expectedTypeContains: "triangle",
    },
    {
      id: "trigonometry",
      subject: "Maths",
      topicKey: "trigonometry",
      chapter: "trigonometry",
      questionText: "Teach heights and distances with theta.",
      expectedTypeContains: "trigonometric_triangle",
    },
    {
      id: "heights_distances",
      subject: "Maths",
      topicKey: "maths-applications-trigonometry",
      chapter: "maths-applications-trigonometry",
      questionText: "Solve heights and distances using angle of elevation and a labelled diagram.",
      expectedTypeContains: "trigonometric_triangle",
    },
    {
      id: "coordinate_geometry",
      subject: "Maths",
      topicKey: "coordinate-geometry",
      chapter: "coordinate-geometry",
      questionText: "Teach plotting points on a graph.",
      expectedTypeContains: "coordinate_plane",
    },
    {
      id: "mensuration",
      subject: "Maths",
      topicKey: "surface-areas-and-volumes",
      chapter: "surface-areas-and-volumes",
      questionText: "Teach area and volume with labelled dimensions.",
      expectedTypeContains: "mensuration_solid",
    },
    {
      id: "electricity",
      subject: "Science",
      topicKey: "electricity",
      chapter: "electricity",
      questionText: "Teach Ohm law using a circuit diagram.",
      expectedTypeContains: "circuit",
    },
    {
      id: "life_processes",
      subject: "Science",
      topicKey: "life-processes",
      chapter: "life-processes",
      questionText: "Teach life processes with a labelled biology flow diagram.",
      expectedTypeContains: "biology_process",
    },
    {
      id: "magnetic_effects",
      subject: "Science",
      topicKey: "magnetic-effects-of-electric-current",
      chapter: "magnetic-effects-of-electric-current",
      questionText: "Teach magnetic field around conductor using a diagram.",
      expectedTypeContains: "magnetic_field",
    },
    {
      id: "light",
      subject: "Science",
      topicKey: "light-reflection-refraction",
      chapter: "light-reflection-refraction",
      questionText: "Teach reflection and refraction with ray diagram.",
      expectedTypeContains: "ray_diagram",
    },
  ];

  try {
    await waitForServer(baseUrl);

    for (const c of cases) {
      const resp = await postMentor(baseUrl, {
        mode: "learn_teach",
        payload: {
          subject: c.subject,
          grade: 10,
          topicKey: c.topicKey,
          chapter: c.chapter,
          section: "learn",
          subSection: "teach",
          selectedTab: "teach",
          mindmapNodeId: `${c.id}_node`,
          mindmapNodeTitle: `${c.id} basics`,
          questionText: c.questionText,
          contextText: `CBSE Class 10 ${c.subject} ${c.topicKey}`,
        },
        messages: [{ role: "user", content: c.questionText }],
      });

      snapshots[c.id] = resp;
      addCheck(checks, `${c.id}_status_ok`, resp.status === 200, `status=${resp.status}`);

      const structured = parseStructured(resp);
      const diagram = extractDiagramPayload(structured);
      addCheck(
        checks,
        `${c.id}_diagram_required`,
        diagram.diagramRequired,
        JSON.stringify(diagram)
      );
      addCheck(
        checks,
        `${c.id}_diagram_type_contextual`,
        diagram.diagramType.includes(c.expectedTypeContains),
        `actual=${diagram.diagramType} expected~=${c.expectedTypeContains}`
      );
      addCheck(
        checks,
        `${c.id}_diagram_spec_renderable`,
        isRenderableTutorDiagramSpec(diagram.diagramSpec),
        JSON.stringify(diagram.diagramSpec)
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
    snapshots,
    logs: logs.slice(-200),
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length) {
    console.error(`Topic diagram coverage acceptance FAILED (${failed.length}/${checks.length}).`);
    failed.forEach((f) => console.error(`- ${f.name}: ${f.details}`));
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Topic diagram coverage acceptance PASSED (${checks.length}/${checks.length}).`);
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("Topic diagram coverage acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${path.relative(repoRoot, outPath)}`);
  process.exitCode = 1;
});
