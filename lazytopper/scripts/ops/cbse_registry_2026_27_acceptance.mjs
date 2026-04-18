import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "cbse_registry_2026_27_acceptance.json");

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

const EXCLUDED_CHAPTER_TITLES = [
  "Periodic Classification of Elements",
  "Management of Natural Resources",
  "Sources of Energy",
];

const EXCLUDED_CHAPTER_KEYWORDS = [
  ["periodic classification", "periodic-classification"],
  ["management of natural resources", "natural-resources-management"],
  ["sources of energy"],
];

const REPRODUCTIVE_HEALTH_KEYWORDS = [
  "reproductive health",
  "family planning",
  "safe sex",
  "hiv",
  "aids",
  "child bearing",
];

const EVOLUTION_KEYWORDS = [
  "evolution",
  "fossil",
  "speciation",
  "homologous",
  "analogous",
  "natural selection",
];

function bulletsContainKeyword(bullets, keywords) {
  const joined = (Array.isArray(bullets) ? bullets : [])
    .join(" ")
    .toLowerCase();
  return keywords.find((kw) => joined.includes(kw.toLowerCase())) || null;
}

async function run() {
  const checks = [];

  const registryPath = path.join(
    repoRoot,
    "src",
    "data",
    "syllabus",
    "cbse10Registry_2026_27.json"
  );

  const registryRaw = await fs.readFile(registryPath, "utf8");
  const registry = JSON.parse(registryRaw);

  const subjects = Array.isArray(registry?.subjects) ? registry.subjects : [];

  const chapters = subjects.flatMap((s) =>
    Array.isArray(s?.chapters)
      ? s.chapters.map((ch) => ({
          subject: String(s.subject_id || "").trim(),
          title: String(ch?.title || "").trim(),
          slug: slugify(ch?.title || ""),
          scopeBullets: Array.isArray(ch?.cbse_scope_bullets)
            ? ch.cbse_scope_bullets
            : [],
          excludedScopeBullets: Array.isArray(ch?.excluded_scope_bullets)
            ? ch.excluded_scope_bullets
            : [],
        }))
      : []
  );

  const scienceChapters = chapters.filter((c) => c.subject === "science");
  const mathsChapters = chapters.filter((c) => c.subject === "maths");

  addCheck(checks, "registry_session", registry?.meta?.academic_session === "2026-27", `session=${registry?.meta?.academic_session}`);
  addCheck(checks, "registry_subjects_count", subjects.length === 2, `count=${subjects.length}`);
  addCheck(checks, "registry_chapters_total", chapters.length === 25, `count=${chapters.length}`);
  addCheck(checks, "registry_maths_chapters_count", mathsChapters.length === 13, `count=${mathsChapters.length}`);
  addCheck(checks, "registry_science_chapters_count", scienceChapters.length === 12, `count=${scienceChapters.length}`);

  for (const excludedTitle of EXCLUDED_CHAPTER_TITLES) {
    const slug = slugify(excludedTitle);
    const found = chapters.find((c) => c.slug === slug || c.title === excludedTitle);
    addCheck(
      checks,
      `excluded_chapter_absent_${slug}`,
      !found,
      found
        ? `FAIL: excluded chapter '${excludedTitle}' is present in the registry`
        : `ok: '${excludedTitle}' not found in assessed scope`
    );
  }

  for (const excludedTitle of EXCLUDED_CHAPTER_TITLES) {
    const slug = slugify(excludedTitle);
    const inExcludedMeta = Array.isArray(registry?.meta?.excluded_chapters)
      ? registry.meta.excluded_chapters.some(
          (e) => slugify(e?.chapter || "") === slug
        )
      : false;
    addCheck(
      checks,
      `excluded_chapter_listed_in_meta_${slug}`,
      inExcludedMeta,
      inExcludedMeta
        ? `ok: '${excludedTitle}' listed in meta.excluded_chapters`
        : `FAIL: '${excludedTitle}' missing from meta.excluded_chapters`
    );
  }

  const reproChapter = scienceChapters.find((c) =>
    c.slug === "reproduction" || c.title.toLowerCase() === "reproduction"
  );
  addCheck(
    checks,
    "reproduction_chapter_present",
    Boolean(reproChapter),
    reproChapter ? `found: ${reproChapter.title}` : "FAIL: Reproduction chapter not found"
  );
  if (reproChapter) {
    const hit = bulletsContainKeyword(reproChapter.scopeBullets, REPRODUCTIVE_HEALTH_KEYWORDS);
    addCheck(
      checks,
      "reproduction_scope_excludes_reproductive_health",
      !hit,
      hit
        ? `FAIL: scope bullet contains '${hit}' — reproductive health content must be excluded`
        : "ok: no reproductive health keywords in assessed scope bullets"
    );

    const inExcluded = bulletsContainKeyword(reproChapter.excludedScopeBullets, REPRODUCTIVE_HEALTH_KEYWORDS);
    addCheck(
      checks,
      "reproduction_excluded_bullets_mention_reproductive_health",
      true,
      inExcluded
        ? `info: excluded_scope_bullets correctly notes '${inExcluded}'`
        : "info: excluded_scope_bullets does not reference reproductive health topics (non-blocking)"
    );
  }

  const heredityChapter = scienceChapters.find((c) => {
    const s = c.slug;
    return (
      s === "heredity" ||
      s === "heredity-and-evolution" ||
      c.title.toLowerCase().startsWith("heredity")
    );
  });
  addCheck(
    checks,
    "heredity_chapter_present",
    Boolean(heredityChapter),
    heredityChapter ? `found: ${heredityChapter.title}` : "FAIL: Heredity chapter not found"
  );
  if (heredityChapter) {
    const hit = bulletsContainKeyword(heredityChapter.scopeBullets, EVOLUTION_KEYWORDS);
    addCheck(
      checks,
      "heredity_scope_excludes_evolution",
      !hit,
      hit
        ? `FAIL: scope bullet contains '${hit}' — evolution content must be excluded`
        : "ok: no evolution keywords in assessed scope bullets"
    );

    const inExcluded = bulletsContainKeyword(heredityChapter.excludedScopeBullets, EVOLUTION_KEYWORDS);
    addCheck(
      checks,
      "heredity_excluded_bullets_mention_evolution",
      true,
      inExcluded
        ? `info: excluded_scope_bullets correctly notes '${inExcluded}'`
        : "info: excluded_scope_bullets does not reference evolution topics (non-blocking)"
    );

    addCheck(
      checks,
      "heredity_chapter_title_does_not_include_evolution",
      !heredityChapter.title.toLowerCase().includes("evolution"),
      `title='${heredityChapter.title}'`
    );
  }

  const ourEnvChapter = scienceChapters.find((c) =>
    c.slug === "our-environment" || c.title.toLowerCase() === "our environment"
  );
  addCheck(
    checks,
    "our_environment_chapter_present_in_scope",
    Boolean(ourEnvChapter),
    ourEnvChapter
      ? `found: ${ourEnvChapter.title}`
      : "FAIL: Our Environment chapter not found in assessed scope"
  );

  const allScopeBullets = chapters.flatMap((c) => c.scopeBullets).join(" ").toLowerCase();
  for (let i = 0; i < EXCLUDED_CHAPTER_TITLES.length; i++) {
    const title = EXCLUDED_CHAPTER_TITLES[i];
    const keywords = EXCLUDED_CHAPTER_KEYWORDS[i];
    const hit = keywords.find((kw) => allScopeBullets.includes(kw.toLowerCase())) || null;
    addCheck(
      checks,
      `excluded_chapter_topic_absent_from_all_scope_bullets_${slugify(title)}`,
      !hit,
      hit
        ? `FAIL: scope bullets contain '${hit}' — topic of excluded chapter '${title}' must not appear in assessed scope`
        : `ok: no scope bullet references topic of '${title}'`
    );
  }

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    registry: "cbse10Registry_2026_27.json",
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
    console.error(
      `CBSE 2026-27 registry acceptance FAILED (${failed.length}/${checks.length}).`
    );
    failed.forEach((f) => console.error(`- ${f.name}: ${f.details}`));
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `CBSE 2026-27 registry acceptance PASSED (${checks.length}/${checks.length}).`
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
  console.error("CBSE 2026-27 registry acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${path.relative(repoRoot, outPath)}`);
  process.exitCode = 1;
});
