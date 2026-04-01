import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import YAML from "yaml";

const ROOT = process.cwd();

const bbChecklistPath = path.join(ROOT, "docs", "project_memory", "implementation", "implementation_checklist.yml");
const ltRoadmapPath   = path.join(ROOT, "docs", "project_memory", "implementation", "lazytopper_roadmap.yml");
const detoursRoadmapPath = path.join(ROOT, "docs", "project_memory", "implementation", "detours_roadmap.yml");
const progressPath    = path.join(ROOT, "docs", "project_memory", "implementation", "tracker_progress.yml");

const OUT_DIR  = path.join(ROOT, ".project_memory", "tracker");
const OUT_JSON = path.join(OUT_DIR, "stage_status.json");
const OUT_MD   = path.join(OUT_DIR, "stage_status.md");

function safeExec(cmd) {
  try { return execSync(cmd, { encoding: "utf8" }).trim(); }
  catch { return ""; }
}

function loadYaml(p) {
  const raw = fs.readFileSync(p, "utf8");
  return YAML.parse(raw);
}

function normalizeRelPath(p) {
  if (!p) return "";
  const normalized = p.split(path.sep).join("/").replace(/\/+/g, "/");
  if (normalized.startsWith("ocs/")) return `docs/${normalized.slice(4)}`;
  return normalized;
}

function computeDrift(statusLines, allowedPrefixes) {
  const allow = (allowedPrefixes || []).map(normalizeRelPath);
  const offenders = [];
  for (const line of statusLines) {
    const file = normalizeRelPath(line.slice(3));
    if (!file) continue;
    const ok = allow.some((p) => file === p || file.startsWith(p));
    if (!ok) offenders.push({ line, file });
  }
  return { offenders, count: offenders.length };
}

function buildTrack(trackId, trackTitle, stages, statesMap) {
  const outStages = stages.map((s) => {
    const state = (statesMap && statesMap[s.id]) ? String(statesMap[s.id]).toUpperCase() : "TODO";
    const pass = state === "DONE" || state === "SKIP";
    return { id: s.id, title: s.title || "", state, pass };
  });

  const firstFail = outStages.find((s) => !s.pass);
  const currentStage = firstFail ? firstFail.id : "COMPLETE";

  return { id: trackId, title: trackTitle, currentStage, stages: outStages };
}

function main() {
  const bbChecklist = fs.existsSync(bbChecklistPath) ? loadYaml(bbChecklistPath)?.blackbox : null;
  const ltRoadmap   = fs.existsSync(ltRoadmapPath) ? loadYaml(ltRoadmapPath)?.lazytopper : null;
  const detoursRoadmap = fs.existsSync(detoursRoadmapPath) ? loadYaml(detoursRoadmapPath)?.detours : null;
  const progress    = fs.existsSync(progressPath) ? loadYaml(progressPath)?.progress : null;

  if (!ltRoadmap) {
    console.error("Missing lazytopper roadmap:", ltRoadmapPath);
    process.exit(1);
  }
  if (!progress) {
    console.error("Missing progress file:", progressPath);
    process.exit(1);
  }

  const bbStages = (bbChecklist?.stages || []).map((s) => ({ id: s.id, title: s.title || s.name || "" }));
  const ltStages = (ltRoadmap?.stages   || []).map((s) => ({ id: s.id, title: s.title || s.name || "" }));
  const detoursStages = (detoursRoadmap?.stages || []).map((s) => ({ id: s.id, title: s.title || s.name || "" }));
  const tutorRagStages = [
    { id: "B0", title: "Tooling Health Pre-Block (build + tracker + doctor)" },
    { id: "B1", title: "Contract canonicalization (Triangles)" },
    { id: "B2", title: "Attempt loop + BSRE" },
    { id: "B3", title: "Hint ladder runtime (H0→H3)" },
    { id: "B4", title: "Mistake map + remediation drills" },
    { id: "B5", title: "Mastery gate + spaced review" },
    { id: "B6", title: "Evaluation harness + regression tests (Triangles-first)" },
    { id: "B7", title: "Public ship MVP (deploy + feedback loop)" },
  ];

  const bbStates = progress?.tracks?.blackbox?.states || {};
  const ltStates = progress?.tracks?.lazytopper?.states || {};
  const detoursStates = progress?.tracks?.detours?.states || {};
  const tutorRagStates = progress?.tracks?.tutor_rag?.states || {};

  const tracks = [
    buildTrack("lazytopper", ltRoadmap?.title || "LazyTopper", ltStages, ltStates),
    buildTrack("detours", detoursRoadmap?.title || "Detours / Experiments", detoursStages, detoursStates),
    buildTrack("tutor_rag", "Tutor RAG (Human Tutor)", tutorRagStages, tutorRagStates),
    buildTrack("blackbox", bbChecklist?.title || "Blackbox", bbStages, bbStates),
  ];

  const gitStatus = safeExec("git status --porcelain");
  const statusLines = gitStatus ? gitStatus.split(/\r?\n/).filter(Boolean) : [];

  const allowedPrefixes = [
    ...(ltRoadmap?.allowedSystemTouchPrefixes || []),
    ...(bbChecklist?.allowedSystemTouchPrefixes || []),
    ...(detoursRoadmap?.allowedSystemTouchPrefixes || []),
  ];

  const drift = computeDrift(statusLines, allowedPrefixes);

  const tutorRagDoing = tutorRagStages.find((s) => {
    const state = tutorRagStates?.[s.id];
    return state && String(state).toUpperCase() === "DOING";
  });
  const overallFirst = tracks.find((t) => t.currentStage !== "COMPLETE");
  const overall = tutorRagDoing
    ? `tutor_rag:${tutorRagDoing.id}`
    : (overallFirst ? `${overallFirst.id}:${overallFirst.currentStage}` : "COMPLETE");

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const out = {
    generatedAt: new Date().toISOString(),
    overallCurrent: overall,
    tracks,
    drift: {
      allowedPrefixes: allowedPrefixes.map(normalizeRelPath),
      ...drift
    }
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2), "utf8");

  const md = [];
  md.push("# LazyTopper Tracker — Status");
  md.push("");
  md.push(`Generated at: ${out.generatedAt}`);
  md.push(`Overall current: **${out.overallCurrent}**`);
  md.push("");

  for (const t of tracks) {
    md.push(`## ${t.title}`);
    md.push(`Current stage: **${t.currentStage}**`);
    md.push("");
    for (const s of t.stages) {
      const icon = s.pass ? "✅" : (s.state === "BLOCKED" ? "🟥" : "⬜");
      md.push(`- ${icon} **${s.id}** — ${s.title} _(state: ${s.state})_`);
    }
    md.push("");
  }

  md.push("## Drift Check (git status)");
  md.push(`Offenders: **${out.drift.count}**`);
  md.push("");
  if (out.drift.count) {
    for (const o of out.drift.offenders.slice(0, 50)) md.push(`- ${o.line}`);
    if (out.drift.count > 50) md.push(`- ...and ${out.drift.count - 50} more`);
  } else {
    md.push("✅ No unexpected changes detected.");
  }
  md.push("");

  fs.writeFileSync(OUT_MD, md.join("\n"), "utf8");

  console.log("Wrote:", path.relative(ROOT, OUT_JSON));
  console.log("Wrote:", path.relative(ROOT, OUT_MD));
}

main();



