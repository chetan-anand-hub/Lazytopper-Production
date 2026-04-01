const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const tsModulePath = path.join(repoRoot, "node_modules", "typescript", "lib", "typescript.js");

async function loadTypeScript() {
  return (await import(pathToFileURL(tsModulePath).href)).default;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function rewriteRelativeSpecifiers(code) {
  return code.replace(/((?:from|import)\s*["'])(\.{1,2}\/[^"']+)(["'])/g, (match, prefix, specifier, suffix) => {
    if (/\.(?:[cm]?js|json)$/.test(specifier)) return `${prefix}${specifier}${suffix}`;
    if (specifier.endsWith(".ts")) return `${prefix}${specifier.replace(/\.ts$/, ".mjs")}${suffix}`;
    return `${prefix}${specifier}.mjs${suffix}`;
  });
}

async function transpileTutorModules(ts, tmpDir) {
  const sourceFiles = [
    "src/data/tutor/tutorFlowTypes.ts",
    "src/data/tutor/topics/trigonometryTutorPath.ts",
    "src/data/tutor/topics/trianglesTutorPath.ts",
    "src/data/tutor/chapterTutorRegistry.ts",
  ];

  for (const relativePath of sourceFiles) {
    const absPath = path.join(repoRoot, relativePath);
    const source = fs.readFileSync(absPath, "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: absPath,
    }).outputText;
    const outPath = path.join(tmpDir, relativePath).replace(/\.ts$/, ".mjs");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, rewriteRelativeSpecifiers(transpiled), "utf8");
  }

  const registryUrl = pathToFileURL(path.join(tmpDir, "src/data/tutor/chapterTutorRegistry.mjs")).href;
  return import(registryUrl);
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function fileContains(relativePath, needle) {
  const absPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absPath)) return false;
  const source = fs.readFileSync(absPath, "utf8");
  return source.includes(String(needle || ""));
}

(async () => {
  const failures = [];
  const allowedSourceStates = new Set([
    "authoritative",
    "supporting",
    "not-used",
    "not-yet-available",
  ]);
  const allowedStepTypes = new Set([
    "start",
    "concept",
    "misconception",
    "example",
    "practice",
    "hpq",
    "mentor",
    "next-step",
  ]);
  const allowedRefKinds = new Set(["file", "topicKey", "questionId", "stringSearch"]);
  const requiredTopLevelFields = [
    "topicKey",
    "canonicalTopicKey",
    "subject",
    "status",
    "studentJourney",
    "sourceOfTruth",
    "mentorSupport",
    "qtfSupport",
    "gapFlags",
    "nextExpansionNotes",
  ];
  const requiredSourceFields = [
    "topicHubV2",
    "topicHubEnrichment",
    "predictedQuestions",
    "highlyProbableQuestions",
    "qtfOverlay",
    "canonicalQuestionBank",
    "mentorAssets",
  ];

  const ts = await loadTypeScript();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lt-tutor-arch-"));

  try {
    const mod = await transpileTutorModules(ts, tmpDir);
    const registry = mod.chapterTutorRegistry;
    if (!registry || typeof registry !== "object") {
      failures.push("chapterTutorRegistry did not load as an object.");
    }

    const requiredChapters = ["trigonometry", "triangles"];
    for (const chapterKey of requiredChapters) {
      if (!registry || !registry[chapterKey]) {
        failures.push(`Missing chapter tutor path for ${chapterKey}.`);
      }
    }

    const entries = registry && typeof registry === "object" ? Object.entries(registry) : [];

    for (const [registryKey, chapterPath] of entries) {
      for (const field of requiredTopLevelFields) {
        const value = chapterPath?.[field];
        const missing =
          value == null ||
          (typeof value === "string" && value.trim() === "") ||
          (Array.isArray(value) && value.length === 0);
        if (missing) {
          failures.push(`${registryKey}: missing required field ${field}.`);
        }
      }

      if (chapterPath?.canonicalTopicKey !== registryKey) {
        failures.push(`${registryKey}: canonicalTopicKey must match the registry key.`);
      }

      for (const field of requiredSourceFields) {
        const sourceState = chapterPath?.sourceOfTruth?.[field];
        if (!allowedSourceStates.has(sourceState)) {
          failures.push(`${registryKey}: sourceOfTruth.${field} must use an allowed value.`);
        }
      }

      const journey = ensureArray(chapterPath?.studentJourney);
      const stepTypes = new Set(journey.map((step) => step?.stepType));
      if (!stepTypes.has("concept")) {
        failures.push(`${registryKey}: studentJourney must include at least one concept step.`);
      }
      if (!stepTypes.has("practice")) {
        failures.push(`${registryKey}: studentJourney must include at least one practice step.`);
      }
      if (!stepTypes.has("mentor") && !stepTypes.has("next-step")) {
        failures.push(`${registryKey}: studentJourney must include at least one mentor or next-step step.`);
      }

      for (const step of journey) {
        const requiredStepFields = [
          "id",
          "title",
          "studentGoal",
          "stepType",
          "sourceRefs",
          "recommendedCTA",
          "expectedStudentOutcome",
        ];
        for (const field of requiredStepFields) {
          const value = step?.[field];
          const missing =
            value == null ||
            (typeof value === "string" && value.trim() === "") ||
            (Array.isArray(value) && value.length === 0);
          if (missing) {
            failures.push(`${registryKey}/${step?.id || "unknown-step"}: missing ${field}.`);
          }
        }
        if (!allowedStepTypes.has(step?.stepType)) {
          failures.push(`${registryKey}/${step?.id || "unknown-step"}: invalid stepType ${step?.stepType}.`);
        }

        for (const ref of ensureArray(step?.sourceRefs)) {
          if (!allowedRefKinds.has(ref?.kind)) {
            failures.push(`${registryKey}/${step?.id}: invalid sourceRef kind ${ref?.kind}.`);
            continue;
          }
          if (!ref?.path || typeof ref.path !== "string") {
            failures.push(`${registryKey}/${step?.id}: sourceRef path is required.`);
            continue;
          }
          if (!fileExists(ref.path)) {
            failures.push(`${registryKey}/${step?.id}: missing sourceRef path ${ref.path}.`);
            continue;
          }
          if (ref.kind !== "file") {
            if (!ref?.value || typeof ref.value !== "string") {
              failures.push(`${registryKey}/${step?.id}: sourceRef ${ref.path} requires a value for kind ${ref.kind}.`);
              continue;
            }
            if (!fileContains(ref.path, ref.value)) {
              failures.push(`${registryKey}/${step?.id}: sourceRef value not found in ${ref.path}: ${ref.value}`);
            }
          }
        }
      }
    }

    if (failures.length > 0) {
      console.log("FAIL: tutor content architecture validator");
      for (const failure of failures) {
        console.log(` - ${failure}`);
      }
      process.exit(1);
    }

    const loadedKeys = entries.map(([key]) => key).join(", ");
    console.log("PASS: tutor content architecture validator");
    console.log(`CHAPTERS: ${loadedKeys}`);
    for (const [registryKey, chapterPath] of entries) {
      console.log(`STEP_COUNT ${registryKey}: ${ensureArray(chapterPath.studentJourney).length}`);
      console.log(`STATUS ${registryKey}: ${chapterPath.status}`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.log("FAIL: tutor content architecture validator");
  console.log(` - ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
