import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const outDir = path.join(repoRoot, "docs", "project_memory", "audits");
const matrixCsvPath = path.join(outDir, "content_completeness_matrix.csv");
const backlogCsvPath = path.join(outDir, "chapter_topic_execution_backlog.csv");
const backlogMdPath = path.join(outDir, "chapter_topic_execution_backlog.md");

const registryPath = path.join(repoRoot, "src", "data", "syllabus", "cbse10Registry_2025_26.json");

const sourceFiles = {
  trendsMath: path.join(repoRoot, "src", "data", "class10MathTopicTrends.ts"),
  trendsScience: path.join(repoRoot, "src", "data", "class10ScienceTopicTrends.ts"),
  contentConfig: path.join(repoRoot, "src", "data", "class10ContentConfig.ts"),
  topicHubV2Full: path.join(repoRoot, "src", "data", "topicHubV2Full.ts"),
  topicHubContent: path.join(repoRoot, "src", "data", "topicHubContent.ts"),
  predictedMath: path.join(repoRoot, "src", "data", "predictedQuestions.ts"),
  predictedMathAdditions: path.join(repoRoot, "src", "data", "predictedQuestionsAdditions.ts"),
  predictedScience: path.join(repoRoot, "src", "data", "predictedQuestionsScience.ts"),
  predictedScienceLegacy: path.join(repoRoot, "src", "data", "predictedScienceQuestions.ts"),
  hpq: path.join(repoRoot, "src", "data", "highlyProbableQuestions.ts"),
  hpqDailyMix: path.join(repoRoot, "src", "data", "hpqAdditionsAndDailyMixSeeds.ts"),
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[–—-]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function csvEscape(value) {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
    return `"${raw.replace(/"/g, "\"\"")}"`;
  }
  return raw;
}

function toCsv(headers, rows) {
  const lines = [];
  lines.push(headers.map(csvEscape).join(","));
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\n") + "\n";
}

function extractValues(text, regex) {
  const out = [];
  let m;
  while ((m = regex.exec(text))) {
    const value = String(m[1] || "").trim();
    if (value) out.push(value);
  }
  return out;
}

function matchAlias(valueNormalized, aliasNormalized) {
  if (!valueNormalized || !aliasNormalized) return false;
  if (valueNormalized === aliasNormalized) return true;
  const minLen = Math.min(valueNormalized.length, aliasNormalized.length);
  if (minLen < 8) return false;
  return (
    valueNormalized.includes(aliasNormalized) ||
    aliasNormalized.includes(valueNormalized)
  );
}

function countMatches(valuesNormalized, aliasNormalizedList) {
  let count = 0;
  for (const value of valuesNormalized) {
    if (aliasNormalizedList.some((alias) => matchAlias(value, alias))) {
      count += 1;
    }
  }
  return count;
}

function subjectOwner(subjectId) {
  return subjectId === "maths" ? "Maths Content Lead" : "Science Content Lead";
}

function supportOwner(components) {
  const needsAssessment = !components.predicted_bank || !components.hpq_bank;
  const needsLearning = !components.content_config || !components.topichub_pack;
  const needsDistribution = !components.trends_map || !components.daily_mix_seed;
  if (needsAssessment && needsLearning) return "Assessment QA Lead + TopicHub Content Engineer";
  if (needsAssessment) return "Assessment QA Lead";
  if (needsLearning) return "TopicHub Content Engineer";
  if (needsDistribution) return "Growth Content Ops";
  return "Quality Gate Reviewer";
}

function priorityFor(chapter, components) {
  const coreMissing = ["content_config", "topichub_pack", "predicted_bank", "hpq_bank"].filter(
    (k) => !components[k]
  ).length;
  const secondaryMissing = ["trends_map", "daily_mix_seed"].filter((k) => !components[k]).length;
  const conceptLoad = Number(chapter.recommended_concept_packs || 0);

  if (coreMissing >= 2) return "P0";
  if (coreMissing === 1 && conceptLoad >= 12) return "P0";
  if (coreMissing === 1) return "P1";
  if (secondaryMissing >= 2 && conceptLoad >= 10) return "P1";
  if (secondaryMissing >= 2) return "P2";
  if (secondaryMissing === 1) return "P2";
  return "P3";
}

function statusFor(priority, missingCount) {
  if (missingCount === 0) return "READY";
  if (priority === "P0") return "TODO";
  return "IN_PROGRESS";
}

function acceptanceCriteria(components) {
  const criteria = [];
  if (!components.content_config) {
    criteria.push("Create chapter content config in src/data/class10ContentConfig.ts with exam-usable concept notes + examples.");
  }
  if (!components.topichub_pack) {
    criteria.push("Add chapter coverage in TopicHub pack/data (topicHubV2Full/topicHubContent) with overview, patterns, marking and score tips.");
  }
  if (!components.predicted_bank) {
    criteria.push("Add predicted question coverage (minimum 5 tagged items across section mix) for this chapter.");
  }
  if (!components.hpq_bank) {
    criteria.push("Add HPQ bucket with board-style MCQ/short/case coverage and confidence metadata.");
  }
  if (!components.daily_mix_seed) {
    criteria.push("Map chapter to dailyMixSeeds with must-crack question IDs.");
  }
  if (!components.trends_map) {
    criteria.push("Ensure chapter appears in trends map with tier + weightage + conceptWeightage.");
  }
  if (!criteria.length) {
    criteria.push("Maintain coverage: keep TopicHub + predicted + HPQ + daily mix in sync on every content update.");
  }
  return criteria.join(" ");
}

function aliasesForChapter(chapter) {
  const title = String(chapter.chapter_title || chapter.title || "");
  const slug = normalizeText(title);
  const aliases = new Set([title, slug]);

  const add = (value) => {
    if (!value) return;
    aliases.add(String(value));
    aliases.add(normalizeText(value));
  };

  // General variants
  add(title.replace(/\band\b/gi, "&"));
  add(title.replace(/&/g, "and"));

  // Manual equivalences for known chapter naming drift
  const titleNorm = normalizeText(title);
  if (titleNorm === "pair of linear equations in two variables") {
    add("Pair of Linear Equations");
    add("pair-of-linear-equations");
  }
  if (titleNorm === "arithmetic progressions") {
    add("Arithmetic Progression");
    add("arithmetic-progression");
    add("arithmetic-progressions");
  }
  if (titleNorm === "acids bases and salts") {
    add("Acids, Bases & Salts");
    add("AcidsBasesSalts");
  }
  if (titleNorm === "metals and non metals") {
    add("Metals & Non-metals");
    add("MetalsNonMetals");
  }
  if (titleNorm === "carbon and its compounds") {
    add("Carbon & its Compounds");
    add("CarbonCompounds");
  }
  if (titleNorm === "control and co ordination") {
    add("Control & Coordination");
    add("ControlAndCoordination");
  }
  if (titleNorm === "heredity and evolution") {
    add("Heredity & Evolution");
    add("HeredityEvolution");
  }
  if (titleNorm === "light reflection and refraction incl human eye prism") {
    add("Light");
    add("Light – Reflection & Refraction");
    add("Light - Reflection and Refraction");
    add("HumanEyeAndColourfulWorld");
    add("The Human Eye & the Colourful World");
  }
  if (titleNorm === "magnetic effects of electric current") {
    add("MagneticEffects");
  }
  if (titleNorm === "chemical reactions and equations") {
    add("Chemical Reactions & Equations");
    add("ChemicalReactions");
  }
  if (titleNorm === "our environment") {
    add("OurEnvironment");
    add("Our Environment / Sources of Energy");
    add("Sources of Energy");
    add("Management of Natural Resources");
  }

  return [...aliases]
    .map((x) => normalizeText(x))
    .filter(Boolean);
}

function componentCoverageForChapter(chapter, datasets) {
  const aliases = aliasesForChapter(chapter);

  const trendsCount = countMatches(datasets.trendsValues, aliases);
  const contentCount = countMatches(datasets.contentValues, aliases);
  const topicHubCount = countMatches(datasets.topicHubValues, aliases);
  const predictedCount = countMatches(datasets.predictedValues, aliases);
  const hpqCount = countMatches(datasets.hpqValues, aliases);
  const dailyMixCount = countMatches(datasets.dailyMixValues, aliases);

  return {
    trends_map: trendsCount > 0,
    content_config: contentCount > 0,
    topichub_pack: topicHubCount > 0,
    predicted_bank: predictedCount > 0,
    hpq_bank: hpqCount > 0,
    daily_mix_seed: dailyMixCount > 0,
    counts: {
      trends: trendsCount,
      content: contentCount,
      topicHub: topicHubCount,
      predicted: predictedCount,
      hpq: hpqCount,
      dailyMix: dailyMixCount,
    },
  };
}

function loadSubjectTierMap(trendsMathText, trendsScienceText) {
  const mathsTiers = {};
  const scienceTiers = {};

  const mathBlockRe = /"([^"]+)"\s*:\s*\{[\s\S]*?tier:\s*"([^"]+)"/g;
  let m;
  while ((m = mathBlockRe.exec(trendsMathText))) {
    mathsTiers[normalizeText(m[1])] = m[2];
  }

  const sciTopicRe = /topicName:\s*"([^"]+)"[\s\S]*?tier:\s*"([^"]+)"/g;
  while ((m = sciTopicRe.exec(trendsScienceText))) {
    scienceTiers[normalizeText(m[1])] = m[2];
  }

  return { mathsTiers, scienceTiers };
}

function resolveTier(chapter, tierMap) {
  const aliases = aliasesForChapter(chapter);
  const domain = chapter.subject_id === "maths" ? tierMap.mathsTiers : tierMap.scienceTiers;
  for (const alias of aliases) {
    if (domain[alias]) return domain[alias];
  }
  const packs = Number(chapter.recommended_concept_packs || 0);
  if (packs >= 14) return "must-crack";
  if (packs >= 9) return "high-roi";
  return "good-to-do";
}

async function main() {
  const registryRaw = await fs.readFile(registryPath, "utf8");
  const registry = JSON.parse(registryRaw);

  const sourceText = {};
  for (const [key, absPath] of Object.entries(sourceFiles)) {
    sourceText[key] = await fs.readFile(absPath, "utf8");
  }

  const tierMap = loadSubjectTierMap(sourceText.trendsMath, sourceText.trendsScience);

  const trendsValues = [
    ...extractValues(sourceText.trendsMath, /"([^"]+)"\s*:\s*\{[\s\S]*?weightagePercent/g),
    ...extractValues(sourceText.trendsScience, /topicKey:\s*"([^"]+)"/g),
    ...extractValues(sourceText.trendsScience, /topicName:\s*"([^"]+)"/g),
  ].map(normalizeText);

  const contentValues = [
    ...extractValues(sourceText.contentConfig, /topicName:\s*"([^"]+)"/g),
    ...extractValues(sourceText.contentConfig, /"([^"]+)"\s*:\s*[A-Za-z0-9_]+Config/g),
    ...extractValues(sourceText.contentConfig, /topicKey:\s*"([^"]+)"/g),
  ].map(normalizeText);

  const topicHubValues = [
    ...extractValues(sourceText.topicHubV2Full, /"topicName"\s*:\s*"([^"]+)"/g),
    ...extractValues(sourceText.topicHubV2Full, /"topicKey"\s*:\s*"([^"]+)"/g),
    ...extractValues(sourceText.topicHubContent, /topicName:\s*"([^"]+)"/g),
    ...extractValues(sourceText.topicHubContent, /topicKey:\s*"([^"]+)"/g),
  ].map(normalizeText);

  const predictedValues = [
    ...extractValues(sourceText.predictedMath, /topicKey:\s*"([^"]+)"/g),
    ...extractValues(sourceText.predictedMathAdditions, /topicKey:\s*"([^"]+)"/g),
    ...extractValues(sourceText.predictedScience, /topicKey:\s*"([^"]+)"/g),
    ...extractValues(sourceText.predictedScienceLegacy, /topicKey:\s*"([^"]+)"/g),
    ...extractValues(sourceText.predictedScienceLegacy, /topic:\s*"([^"]+)"/g),
  ].map(normalizeText);

  const hpqValues = [
    ...extractValues(sourceText.hpq, /topic:\s*"([^"]+)"/g),
    ...extractValues(sourceText.hpq, /topicKey:\s*"([^"]+)"/g),
    ...extractValues(sourceText.hpqDailyMix, /topic:\s*"([^"]+)"/g),
    ...extractValues(sourceText.hpqDailyMix, /topicKey:\s*"([^"]+)"/g),
  ].map(normalizeText);

  const dailyMixValues = [
    ...extractValues(sourceText.hpqDailyMix, /"([^"]+)"\s*:\s*\{\s*mustCrackQuestionIds/g),
  ].map(normalizeText);

  const datasets = {
    trendsValues,
    contentValues,
    topicHubValues,
    predictedValues,
    hpqValues,
    dailyMixValues,
  };

  const chapters = [];
  for (const subject of registry.subjects || []) {
    for (const chapter of subject.chapters || []) {
      const unit = (subject.units || []).find((u) => u.unit_id === chapter.unit_id);
      chapters.push({
        subject_id: subject.subject_id,
        subject_name: subject.display_name,
        unit_id: chapter.unit_id,
        unit_name: unit?.name || "",
        chapter_id: chapter.chapter_id,
        chapter_title: chapter.title,
        recommended_concept_packs: Number(chapter.recommended_concept_packs || 0),
        visual_min: Number(chapter.visual_min || 0),
      });
    }
  }

  const matrixRows = [];
  const backlogRows = [];

  for (const chapter of chapters) {
    const coverage = componentCoverageForChapter(chapter, datasets);
    const components = {
      trends_map: coverage.trends_map,
      content_config: coverage.content_config,
      topichub_pack: coverage.topichub_pack,
      predicted_bank: coverage.predicted_bank,
      hpq_bank: coverage.hpq_bank,
      daily_mix_seed: coverage.daily_mix_seed,
    };

    const total = Object.keys(components).length;
    const covered = Object.values(components).filter(Boolean).length;
    const missing = Object.keys(components).filter((k) => !components[k]);
    const completenessScore = Number(((covered / total) * 100).toFixed(2));
    const tier = resolveTier(chapter, tierMap);
    const priority = priorityFor(chapter, components);
    const status = statusFor(priority, missing.length);

    matrixRows.push({
      ...chapter,
      tier,
      ...components,
      completeness_score_pct: completenessScore,
      missing_components: missing.join("|"),
      predicted_match_count: coverage.counts.predicted,
      hpq_match_count: coverage.counts.hpq,
      topichub_match_count: coverage.counts.topicHub,
      content_match_count: coverage.counts.content,
      trends_match_count: coverage.counts.trends,
      dailymix_match_count: coverage.counts.dailyMix,
    });

    backlogRows.push({
      ...chapter,
      tier,
      priority,
      status,
      owner_primary: subjectOwner(chapter.subject_id),
      owner_support: supportOwner(components),
      completeness_score_pct: completenessScore,
      gap_summary: missing.length ? `Missing: ${missing.join(", ")}` : "No critical gaps detected.",
      acceptance_criteria: acceptanceCriteria(components),
    });
  }

  matrixRows.sort((a, b) => {
    if (a.subject_id !== b.subject_id) return a.subject_id.localeCompare(b.subject_id);
    if (a.unit_id !== b.unit_id) return a.unit_id.localeCompare(b.unit_id);
    return a.chapter_title.localeCompare(b.chapter_title);
  });

  backlogRows.sort((a, b) => {
    const rank = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const byPriority = (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
    if (byPriority !== 0) return byPriority;
    if (a.subject_id !== b.subject_id) return a.subject_id.localeCompare(b.subject_id);
    return a.chapter_title.localeCompare(b.chapter_title);
  });

  const matrixHeaders = [
    "subject_id",
    "subject_name",
    "unit_id",
    "unit_name",
    "chapter_id",
    "chapter_title",
    "tier",
    "recommended_concept_packs",
    "visual_min",
    "trends_map",
    "content_config",
    "topichub_pack",
    "predicted_bank",
    "hpq_bank",
    "daily_mix_seed",
    "predicted_match_count",
    "hpq_match_count",
    "topichub_match_count",
    "content_match_count",
    "trends_match_count",
    "dailymix_match_count",
    "completeness_score_pct",
    "missing_components",
  ];

  const backlogHeaders = [
    "priority",
    "status",
    "owner_primary",
    "owner_support",
    "subject_id",
    "unit_id",
    "chapter_id",
    "chapter_title",
    "tier",
    "recommended_concept_packs",
    "visual_min",
    "completeness_score_pct",
    "gap_summary",
    "acceptance_criteria",
  ];

  const matrixCsv = toCsv(
    matrixHeaders,
    matrixRows.map((row) => matrixHeaders.map((h) => row[h]))
  );
  const backlogCsv = toCsv(
    backlogHeaders,
    backlogRows.map((row) => backlogHeaders.map((h) => row[h]))
  );

  const md = [];
  md.push("# Chapter/Topic Execution Backlog");
  md.push("");
  md.push(`Generated: ${new Date().toISOString()}`);
  md.push("");
  md.push("## Prioritization Logic");
  md.push("");
  md.push("- `P0`: high-priority chapters with core content gaps (TopicHub/config/predicted/HPQ).");
  md.push("- `P1`: one core gap or multiple secondary gaps.");
  md.push("- `P2`: mostly complete with minor gaps.");
  md.push("- `P3`: ready; maintain and monitor.");
  md.push("");
  md.push("## Backlog Table");
  md.push("");
  md.push("| Priority | Status | Subject | Chapter | Owners | Completeness % | Gap Summary | Acceptance Criteria |");
  md.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const row of backlogRows) {
    md.push(
      `| ${row.priority} | ${row.status} | ${row.subject_id} | ${row.chapter_title} | ${row.owner_primary} / ${row.owner_support} | ${row.completeness_score_pct} | ${row.gap_summary} | ${row.acceptance_criteria} |`
    );
  }
  md.push("");
  md.push("## Files");
  md.push("");
  md.push("- `docs/project_memory/audits/chapter_topic_execution_backlog.csv`");
  md.push("- `docs/project_memory/audits/content_completeness_matrix.csv`");

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(matrixCsvPath, matrixCsv, "utf8");
  await fs.writeFile(backlogCsvPath, backlogCsv, "utf8");
  await fs.writeFile(backlogMdPath, md.join("\n") + "\n", "utf8");

  const p0 = backlogRows.filter((r) => r.priority === "P0").length;
  const p1 = backlogRows.filter((r) => r.priority === "P1").length;
  const p2 = backlogRows.filter((r) => r.priority === "P2").length;
  const p3 = backlogRows.filter((r) => r.priority === "P3").length;

  console.log(
    `content_backlog_matrix: chapters=${chapters.length}, P0=${p0}, P1=${p1}, P2=${p2}, P3=${p3}`
  );
  console.log(`matrix=${path.relative(repoRoot, matrixCsvPath).replace(/\\/g, "/")}`);
  console.log(`backlog=${path.relative(repoRoot, backlogCsvPath).replace(/\\/g, "/")}`);
}

main().catch((err) => {
  console.error("generate_content_backlog_and_matrix failed");
  console.error(String(err?.stack || err));
  process.exit(1);
});
