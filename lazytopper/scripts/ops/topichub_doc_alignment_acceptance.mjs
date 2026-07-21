import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "topichub_doc_alignment_acceptance.json");

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
}

async function readText(relPath) {
  return fs.readFile(path.join(repoRoot, relPath), "utf8");
}

function runScript(relPath, checks, name) {
  const abs = path.join(repoRoot, relPath);
  const result = spawnSync(process.execPath, [abs], {
    cwd: repoRoot,
    env: { ...process.env },
    stdio: "inherit",
  });
  addCheck(
    checks,
    `suite_${name}`,
    (result.status ?? 1) === 0,
    `status=${result.status ?? "null"}`
  );
}

async function run() {
  const checks = [];

  const appText = await readText("src/App.tsx");
  const contentText = await readText("src/data/topicHubV2Full.ts");

  // RETIREMENT PR-2: the 12 document-alignment checks that lived here all read
  // src/pages/TopicHub.tsx or src/components/tutor/TutorDrawerV2.tsx, both deleted
  // with the old tutor. They asserted the retired Learn/Grind/Resources lesson flow
  // and the old mentor drawer's soft-gate/stepper/full-screen chrome - none of which
  // the product still has. Removed rather than stubbed: an assertion that survives
  // the deletion of its subject is a vacuous green.
  addCheck(
    checks,
    "topic_launcher_route_present",
    appText.includes('<Route path="/topic-hub" element={<TopicHubHome />} />'),
    "Dedicated TopicHub landing page should exist."
  );
  addCheck(
    checks,
    "topichub_dataset_present",
    contentText.includes("export const topicHubV2Content:"),
    "TopicHub should have baked content registry to scale across topics."
  );

  const mathsTopicMatches = [...contentText.matchAll(/"subject"\s*:\s*"Maths"/g)].length;
  const scienceTopicMatches = [...contentText.matchAll(/"subject"\s*:\s*"Science"/g)].length;
  addCheck(
    checks,
    "class10_subject_coverage_nontrivial",
    mathsTopicMatches >= 10 && scienceTopicMatches >= 10,
    `Maths=${mathsTopicMatches}, Science=${scienceTopicMatches}`
  );

  // Execute existing behavior suites that already validate the human tutor contracts deeply.
  runScript("scripts/ops/triangles_human_tutor_acceptance.mjs", checks, "triangles_human_tutor");
  runScript("scripts/ops/topic_grind_contracts_acceptance.mjs", checks, "topic_grind_contracts");
  runScript("scripts/ops/topic_diagram_coverage_acceptance.mjs", checks, "topic_diagram_coverage");
  runScript(
    "scripts/ops/topichub_human_tutor_all_topics_acceptance.mjs",
    checks,
    "topichub_human_tutor_all_topics"
  );
  runScript(
    "scripts/ops/topichub_intended_functionality_acceptance.mjs",
    checks,
    "topichub_intended_functionality"
  );

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    metrics: {
      mathsTopicMatches,
      scienceTopicMatches,
    },
    checks,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length) {
    console.error(
      `TopicHub doc-alignment acceptance FAILED (${failed.length}/${checks.length}).`
    );
    failed.forEach((f) => console.error(`- ${f.name}: ${f.details}`));
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `TopicHub doc-alignment acceptance PASSED (${checks.length}/${checks.length}).`
  );
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("TopicHub doc-alignment acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${path.relative(repoRoot, outPath)}`);
  process.exitCode = 1;
});
