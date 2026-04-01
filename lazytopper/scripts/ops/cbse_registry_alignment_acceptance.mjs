import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "cbse_registry_alignment_acceptance.json");

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
}

function slugify(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[\\/]/g, " ")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseTopicKeysFromV2(text) {
  const matches = [...text.matchAll(/"topicKey"\s*:\s*"([^"]+)"/g)];
  return Array.from(new Set(matches.map((m) => String(m[1] || "").trim()).filter(Boolean)));
}

function parseTopicKeysFromConfig(text) {
  const matches = [...text.matchAll(/topicKey:\s*"([^"]+)"/g)];
  return Array.from(new Set(matches.map((m) => String(m[1] || "").trim()).filter(Boolean)));
}

const aliasMap = {
  "pair-of-linear-equations-in-two-variables": ["pair-of-linear-equations"],
  "arithmetic-progressions": ["arithmetic-progression", "maths_arithmetic_progressions"],
  "real-numbers": ["maths_real_numbers"],
  polynomials: ["maths_polynomials"],
  "coordinate-geometry": ["maths_coordinate_geometry"],
  circles: ["maths_circles"],
  trigonometry: ["maths_introduction_trigonometry"],
  "areas-related-to-circles": ["maths_areas_circles"],
  "surface-areas-and-volumes": ["maths_surface_areas_volumes"],
  "acids-bases-and-salts": ["acids-bases-salts", "science_acids_bases_salts"],
  "chemical-reactions-and-equations": ["chemical-reactions-equations"],
  "metals-and-non-metals": ["metals-non-metals", "science_metals_nonmetals"],
  reproduction: ["how-do-organisms-reproduce", "science_reproduction"],
  "control-and-co-ordination": ["science_control_coordination"],
  "heredity-and-evolution": ["science_heredity_evolution"],
  "our-environment": ["science_our_environment"],
  "light-reflection-and-refraction-incl-human-eye-prism": [
    "light-reflection-refraction",
    "human-eye-colourful-world",
    "science_light_reflection_refraction",
    "science_human_eye_colourful_world",
  ],
};

const supplemental = [
  "constructions",
  "maths-applications-trigonometry",
  "science-periodic-classification",
  "science-natural-resources-management",
];

function candidatesFor(slug) {
  const aliases = aliasMap[slug] || [];
  const seeds = [slug, ...aliases, slug.replace(/-/g, "_")];
  const out = new Set();
  for (const seed of seeds) {
    const s = String(seed || "").trim();
    if (!s) continue;
    out.add(s);
    out.add(slugify(s));
    out.add(slugify(s).replace(/-/g, "_"));
  }
  return Array.from(out);
}

async function run() {
  const checks = [];

  const registryPath = path.join(repoRoot, "src", "data", "syllabus", "cbse10Registry_2025_26.json");
  const v2Path = path.join(repoRoot, "src", "data", "topicHubV2Full.ts");
  const cfgPath = path.join(repoRoot, "src", "data", "class10ContentConfig.ts");

  const [registryRaw, v2Raw, cfgRaw] = await Promise.all([
    fs.readFile(registryPath, "utf8"),
    fs.readFile(v2Path, "utf8"),
    fs.readFile(cfgPath, "utf8"),
  ]);

  const registry = JSON.parse(registryRaw);
  const subjects = Array.isArray(registry?.subjects) ? registry.subjects : [];
  const chapters = subjects.flatMap((s) =>
    Array.isArray(s?.chapters)
      ? s.chapters.map((ch) => ({
          subject: String(s.subject_id || "").trim(),
          title: String(ch?.title || "").trim(),
          slug: slugify(ch?.title || ""),
        }))
      : []
  );

  const runtimeKeys = new Set([
    ...parseTopicKeysFromV2(v2Raw),
    ...parseTopicKeysFromConfig(cfgRaw),
  ]);

  addCheck(checks, "registry_subjects_count", subjects.length === 2, `count=${subjects.length}`);
  addCheck(checks, "registry_chapters_count", chapters.length === 25, `count=${chapters.length}`);
  addCheck(
    checks,
    "runtime_topickey_inventory_nontrivial",
    runtimeKeys.size >= 20,
    `runtime_keys=${runtimeKeys.size}`
  );

  const unresolved = [];
  for (const chapter of chapters) {
    const candidates = candidatesFor(chapter.slug);
    const resolved = candidates.find((c) => runtimeKeys.has(c));
    addCheck(
      checks,
      `chapter_${chapter.slug}_resolves`,
      Boolean(resolved),
      JSON.stringify({ chapter: chapter.title, candidates, resolved: resolved || null })
    );
    if (!resolved) unresolved.push(chapter.slug);
  }

  for (const key of supplemental) {
    const hasKey = candidatesFor(key).some((candidate) => runtimeKeys.has(candidate));
    addCheck(
      checks,
      `supplemental_${key}_present`,
      hasKey,
      JSON.stringify({ key, candidates: candidatesFor(key) })
    );
  }

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      unresolvedCanonicalSlugs: unresolved,
    },
    checks,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length) {
    console.error(`CBSE registry alignment acceptance FAILED (${failed.length}/${checks.length}).`);
    failed.forEach((f) => console.error(`- ${f.name}: ${f.details}`));
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`CBSE registry alignment acceptance PASSED (${checks.length}/${checks.length}).`);
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("CBSE registry alignment acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${path.relative(repoRoot, outPath)}`);
  process.exitCode = 1;
});
