import { promises as fs } from "fs";
import path from "path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";

const require = createRequire(import.meta.url);
const mammoth = require("mammoth");

const ROOT = process.cwd();
const CONTRACT_PATH = path.join(ROOT, "scripts", "memoryContracts.ts");

async function loadMemoryContract() {
  const source = await fs.readFile(CONTRACT_PATH, "utf8");
  const { outputText } = transpileModule(source, {
    compilerOptions: {
      module: ModuleKind.ESNext,
      target: ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: CONTRACT_PATH,
  });

  const base64 = Buffer.from(outputText, "utf8").toString("base64");
  const mod = await import(`data:text/javascript;base64,${base64}`);
  if (!mod.MEMORY_CONTRACT) throw new Error("MEMORY_CONTRACT not exported by memoryContracts.ts");
  return mod.MEMORY_CONTRACT;
}

async function statSafe(p) {
  try { return await fs.stat(p); } catch { return null; }
}

async function walkDir(dir, out) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walkDir(full, out);
    else out.push(full);
  }
}

function extOf(p) { return path.extname(p).toLowerCase(); }
function isDocx(p) { return extOf(p) === ".docx"; }
function isText(p) { const e = extOf(p); return e === ".md" || e === ".txt"; }

function normalizeLines(raw) {
  return raw
    .split(/\r?\n/)
    .map(l => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function pickKeywordLines(lines, keywords, limit, seen) {
  const ks = (keywords ?? []).map(k => String(k).toLowerCase()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    const low = line.toLowerCase();
    if (ks.some(k => low.includes(k))) {
      if (seen.has(line)) continue;
      seen.add(line);
      out.push(line);
      if (out.length >= limit) break;
    }
  }
  return out;
}

async function expandGovernanceInputs(governanceInputs) {
  const sources = []; // { relLabel, absPath, mtimeMs, mtimeIso }
  for (const rel of governanceInputs ?? []) {
    const abs = path.join(ROOT, rel);
    const st = await statSafe(abs);
    if (!st) continue;

    if (st.isDirectory()) {
      const files = [];
      await walkDir(abs, files);
      for (const f of files) {
        if (!(isDocx(f) || isText(f))) continue;
        const sf = await statSafe(f);
        if (!sf || !sf.isFile()) continue;
        sources.push({
          relLabel: path.relative(ROOT, f).split(path.sep).join("/"),
          absPath: f,
          mtimeMs: sf.mtimeMs,
          mtimeIso: sf.mtime.toISOString(),
        });
      }
    } else if (st.isFile()) {
      if (!(isDocx(abs) || isText(abs))) continue;
      sources.push({
        relLabel: rel.split(path.sep).join("/"),
        absPath: abs,
        mtimeMs: st.mtimeMs,
        mtimeIso: st.mtime.toISOString(),
      });
    }
  }
  return sources;
}

async function readSourceLines(absPath) {
  if (isDocx(absPath)) {
    const { value } = await mammoth.extractRawText({ path: absPath });
    return normalizeLines(value);
  }
  if (isText(absPath)) {
    const txt = await fs.readFile(absPath, "utf8");
    return normalizeLines(txt);
  }
  return [];
}

function operationalDefaults() {
  return [
    "Always run `npm run blackbox:full` before a handoff.",
    "Keep governance inputs updated in `docs/project_memory/governance/inputs`.",
    "Upload `contextpack.md` + `latest.json` at the start of a new ChatGPT session.",
    "SCOPE LOCK: stop if unexpected file changes appear outside allowed Blackbox scope.",
    "Evidence ZIPs/logs must stay outside the repo.",
  ];
}

async function main() {
  const contract = await loadMemoryContract();
  const gov = contract?.governance;
  if (!gov) {
    console.log("rulesDigest: governance not configured.");
    return;
  }

  const outRel = gov.governanceDigestOut;
  if (!outRel) {
    console.log("rulesDigest: governanceDigestOut not set.");
    return;
  }
  const outAbs = path.join(ROOT, outRel);

  const sources = await expandGovernanceInputs(gov.governanceInputs);
  if (sources.length === 0) {
    await fs.mkdir(path.dirname(outAbs), { recursive: true });
    await fs.writeFile(outAbs, "# Governance Digest\n\n(No governance sources found)\n", "utf8");
    console.log("rulesDigest: wrote empty digest (no sources).");
    return;
  }

  const allLines = [];
  for (const s of sources) {
    try {
      const lines = await readSourceLines(s.absPath);
      allLines.push(...lines);
    } catch (err) {
      console.warn(`rulesDigest: failed to read ${s.relLabel}:`, err);
    }
  }

  const seen = new Set();
  const ruleKeywords = gov.governanceKeywords ?? [];

  // More practical learning keywords (covers your recent failures)
  const learningKeywords = [
    "learnings",
    "do not repeat",
    "dont repeat",
    "mistake",
    "what went wrong",
    "regression",
    "root cause",
    "corrective",
    "action items",
    "powershell",
    "codex",
    "timeout",
    "eisdir",
    "mojibake",
    "utf-8",
    "wrong folder",
    "missing script",
    "unexpected end of input",
    "scope lock",
    "drift"
  ];

  const rules = pickKeywordLines(allLines, ruleKeywords, 80, seen);
  const learnings = pickKeywordLines(allLines, learningKeywords, 160, seen);

  const md = [];
  md.push("# Governance Digest");
  md.push("");
  md.push(`Generated at: ${new Date().toISOString()}`);
  md.push("");
  md.push("## Sources present");
  md.push("");
  sources
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, 50)
    .forEach(s => md.push(`- ${s.relLabel} (last updated ${s.mtimeIso})`));
  if (sources.length > 50) md.push(`- … plus ${sources.length - 50} more files`);
  md.push("");

  md.push("## Key Rules (extracted)");
  md.push("");
  if (rules.length === 0) md.push("- No lines matched the governance keywords.");
  else rules.forEach(l => md.push(`- ${l}`));
  md.push("");

  md.push("## Key Learnings (extracted)");
  md.push("");
  if (learnings.length === 0) md.push("- No lines matched the learning keywords.");
  else learnings.forEach(l => md.push(`- ${l}`));
  md.push("");

  md.push("## Operational Defaults (stable)");
  md.push("");
  operationalDefaults().forEach(l => md.push(`- ${l}`));
  md.push("");

  await fs.mkdir(path.dirname(outAbs), { recursive: true });
  await fs.writeFile(outAbs, md.join("\n"), "utf8");
  console.log(`rulesDigest: wrote governance digest to ${outAbs}`);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(err => {
    console.error("rulesDigest failed:", err);
    process.exit(1);
  });
}
