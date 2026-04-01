import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const BLACKBOX_DIR = path.join(ROOT, '.project_memory', 'blackbox');
const LATEST_JSON = path.join(BLACKBOX_DIR, 'latest.json');
const CONTEXT_MD = path.join(BLACKBOX_DIR, 'contextpack.md');
const CONTEXT_JSON = path.join(BLACKBOX_DIR, 'contextpack.json');

async function readJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function safeExec(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

async function writeFileSafe(filePath, content) {
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, content);
  await fs.rename(tmp, filePath);
}

async function gatherContext(errors) {
  const latest = await readJSON(LATEST_JSON);
  const snapshotPath = (await fs.stat(LATEST_JSON).catch(() => null))
    ? path.relative(ROOT, LATEST_JSON)
    : null;

  const pkgJson = await readJSON(path.join(ROOT, 'package.json'));
  const pkg = pkgJson
    ? { name: pkgJson.name, version: pkgJson.version }
    : { name: 'unknown', version: 'unknown' };

  const gitBranch = safeExec('git rev-parse --abbrev-ref HEAD');
  const gitCommit = safeExec('git rev-parse --short HEAD');
  const gitStatus = safeExec('git status --porcelain');

  if (!latest) {
    errors.push('latest.json missing or unreadable');
  }

  return {
    timestamp: new Date().toISOString(),
    package: pkg,
    latestSnapshot: snapshotPath,
    summary: latest?.summary ?? {
      todoCount: 0,
      criticalViolations: 0,
      invariantFailures: 0,
      missingCriticalFiles: [],
    },
    git: {
      branch: gitBranch ?? 'unknown',
      commit: gitCommit ?? 'unknown',
      status: gitStatus ?? 'not available',
    },
    errors,
  };
}

function formatMarkdown(context, digestContent) {
  const lines = [];
  lines.push('# LazyTopper Context Pack');
  lines.push('');
  lines.push(`Generated at: ${context.timestamp}`);
  lines.push('');
  lines.push('## Package');
  lines.push(`- Name: ${context.package.name}`);
  lines.push(`- Version: ${context.package.version}`);
  lines.push('');
  lines.push('## Blackbox summary');
  lines.push(`- TODO hits: ${context.summary.todoCount}`);
  lines.push(`- Critical violations: ${context.summary.criticalViolations}`);
  lines.push(`- Invariant failures: ${context.summary.invariantFailures}`);
  lines.push(
    `- Missing critical files: ${
      (context.summary.missingCriticalFiles ?? []).length === 0
        ? 'none'
        : (context.summary.missingCriticalFiles ?? []).join(', ')
    }`
  );
  lines.push('');
  lines.push(`## Latest snapshot path`);
  lines.push(`- ${context.latestSnapshot ?? 'snapshot missing'}`);
  lines.push('');
  lines.push('## Git state');
  lines.push(`- Branch: ${context.git.branch}`);
  lines.push(`- Commit: ${context.git.commit}`);
  lines.push(`- Status:\n\`\`\`\n${context.git.status}\n\`\`\``);
  lines.push('');
  if (context.errors.length > 0) {
    lines.push('## Errors');
    context.errors.forEach((error) => {
      lines.push(`- ${error}`);
    });
    lines.push('');
  }
  lines.push('## Handoff notes');
  lines.push('- For a new ChatGPT session upload `contextpack.md` and `latest.json`.');
  lines.push('- Do NOT upload the whole repo unless absolutely necessary.');
  lines.push('');
  lines.push('## Startup Prompt Template');
  lines.push('---');
  lines.push('Use the attached contextpack + latest.json as the source of truth.');
  lines.push('- Preserve the memoryContracts invariants.');
  lines.push('- Do not propose broad refactors.');
  lines.push('- Always run `npm run blackbox` and `npm run build` after edits.');
  lines.push('---');
  if (digestContent) {
    lines.push('');
    lines.push('## Governance Digest');
    lines.push('');
    lines.push('```text');
    lines.push(digestContent.trim());
    lines.push('```');
  }
  return lines.join('\n');
}

async function safeReadDigest() {
  try {
    return await fs.readFile(path.join(BLACKBOX_DIR, 'rules_digest.md'), 'utf8');
  } catch {
    return null;
  }
}

async function main() {
  const errors = [];
  await ensureDir(BLACKBOX_DIR);
  const context = await gatherContext(errors);
  const digestContent = await safeReadDigest();
  const jsonContent = JSON.stringify(context, null, 2);
  await writeFileSafe(CONTEXT_JSON, jsonContent);
  await writeFileSafe(CONTEXT_MD, formatMarkdown(context, digestContent));
}

main().catch((error) => {
  console.error('contextpack failed:', error);
});
