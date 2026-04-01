import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';

const ROOT = process.cwd();
const CONTRACT_PATH = path.join(ROOT, 'scripts', 'memoryContracts.ts');
const BLACKBOX_DIR = path.join(ROOT, '.project_memory', 'blackbox');
const HISTORY_DIR = path.join(BLACKBOX_DIR, 'history');
const MAX_HISTORY = 20;
const TODO_DISPLAY_LIMIT = 10;
const isFullRun = process.argv.includes('--full');

async function loadMemoryContract() {
  const source = await fs.readFile(CONTRACT_PATH, 'utf8');
  const { outputText } = transpileModule(source, {
    compilerOptions: {
      module: ModuleKind.ESNext,
      target: ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: CONTRACT_PATH,
  });
  const base64 = Buffer.from(outputText, 'utf8').toString('base64');
  const module = await import(`data:text/javascript;base64,${base64}`);
  if (!module.MEMORY_CONTRACT) {
    throw new Error('MEMORY_CONTRACT not exported by memoryContracts.ts');
  }
  return module.MEMORY_CONTRACT;
}

function shouldIgnore(filePath, fragments) {
  return fragments.some((frag) => filePath.includes(frag));
}

function sanitizeRel(filePath) {
  const rel = path.relative(ROOT, filePath);
  return rel.split(path.sep).join('/');
}

async function walkFiles(startDir, contract, todos) {
  const entries = await fs.readdir(startDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(startDir, entry.name);
    if (shouldIgnore(entryPath, contract.ignorePathFragments)) {
      continue;
    }
    if (entry.isDirectory()) {
      await walkFiles(entryPath, contract, todos);
      continue;
    }
    const ext = path.extname(entry.name);
    if (!contract.todoFileExtensions.includes(ext)) {
      continue;
    }
    const content = await fs.readFile(entryPath, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/\bTODO\b/.test(line)) {
        todos.push({
          file: sanitizeRel(entryPath),
          line: index + 1,
          text: line.trim(),
        });
      }
    });
  }
}

async function scanCriticalViolations(contract) {
  const violations = [];
  for (const file of contract.criticalFiles) {
    const abs = path.join(ROOT, file);
    if (!(await exists(abs))) {
      continue;
    }
    const content = await fs.readFile(abs, 'utf8');
    for (const pattern of contract.forbiddenExactMatches) {
      if (content.includes(pattern)) {
        violations.push({ file, match: pattern });
      }
    }
  }
  return violations;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runInvariants(contract) {
  const failures = [];
  const missing = [];
  for (const invariant of contract.invariants) {
    const abs = path.join(ROOT, invariant.file);
    if (!(await exists(abs))) {
      missing.push(invariant.file);
      continue;
    }
    const content = await fs.readFile(abs, 'utf8');
    if (!invariant.regex.test(content)) {
      failures.push({
        file: invariant.file,
        name: invariant.name,
        expected: invariant.regex.source,
        reason: 'no match',
      });
    }
  }
  return { failures, missing };
}

async function loadPreviousReport() {
  try {
    const raw = await fs.readFile(path.join(BLACKBOX_DIR, 'latest.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function computeInvariantStatuses(contract, failures, missing) {
  const missingFiles = new Set(missing);
  return contract.invariants.map((invariant) => {
    if (missingFiles.has(invariant.file)) {
      return {
        name: invariant.name,
        file: invariant.file,
        pass: false,
        reason: 'missing file',
      };
    }
    const failure = failures.find((f) => f.name === invariant.name);
    if (failure) {
      return {
        name: invariant.name,
        file: invariant.file,
        pass: false,
        reason: failure.reason ?? 'regex mismatch',
      };
    }
    return {
      name: invariant.name,
      file: invariant.file,
      pass: true,
      reason: 'match',
    };
  });
}

function computeInvariantChanges(current, previous = []) {
  const prevMap = new Map(previous.map((inv) => [inv.name, inv.pass ? 'PASS' : 'FAIL']));
  const changes = [];
  current.forEach((inv) => {
    const prevStatus = prevMap.get(inv.name);
    const currentStatus = inv.pass ? 'PASS' : 'FAIL';
    if (prevStatus && prevStatus !== currentStatus) {
      changes.push({
        name: inv.name,
        from: prevStatus,
        to: currentStatus,
      });
    }
  });
  return changes;
}

function getGitInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    return {
      branch,
      commit,
      commitShort: commit.slice(0, 7),
    };
  } catch {
    return {
      branch: 'unknown',
      commit: 'unknown',
      commitShort: 'unknown',
    };
  }
}

async function writeSnapshot(report) {
  await fs.mkdir(BLACKBOX_DIR, { recursive: true });
  await fs.mkdir(HISTORY_DIR, { recursive: true });

  const latestPath = path.join(BLACKBOX_DIR, 'latest.json');
  const tmpLatest = path.join(BLACKBOX_DIR, `latest.tmp.${Date.now()}`);
  await fs.writeFile(tmpLatest, JSON.stringify(report, null, 2));
  await fs.rename(tmpLatest, latestPath);

  const stamp = report.timestamp.replace(/[:]/g, '-');
  const historyPath = path.join(HISTORY_DIR, `${stamp}.json`);
  await fs.writeFile(historyPath, JSON.stringify(report, null, 2));

  const files = await fs.readdir(HISTORY_DIR);
  const sorted = files
    .filter((name) => name.endsWith('.json'))
    .sort();
  const toRemove = sorted.slice(0, Math.max(0, sorted.length - MAX_HISTORY));
  await Promise.all(toRemove.map((name) => fs.unlink(path.join(HISTORY_DIR, name))));
}

function formatStatusSymbol(pass) {
  return pass ? 'PASS' : 'FAIL';
}

async function writeMarkdownReport(report, previousReport, invariantStatuses, invariantChanges) {
  const lines = [];
  lines.push('# Memory Blackbox Snapshot');
  lines.push('');
  lines.push('## Status Summary');
  lines.push(`- Generated at: ${report.generatedAt}`);
  lines.push(`- TODO hits counted: ${report.summary.todoCount}`);
  lines.push(`- Critical violations: ${report.summary.criticalViolations} (${report.summary.criticalViolations === 0 ? 'PASS' : 'FAIL'})`);
  lines.push(`- Invariant failures: ${report.summary.invariantFailures} (${report.summary.invariantFailures === 0 ? 'PASS' : 'FAIL'})`);
  lines.push(
    `- Missing critical files: ${
      report.summary.missingCriticalFiles.length === 0
        ? 'none'
        : report.summary.missingCriticalFiles.join(', ')
    }`
  );
  lines.push('');
  lines.push('## What changed since last snapshot?');
  const prevTodoCount = previousReport?.summary?.todoCount ?? null;
  if (prevTodoCount !== null) {
    const delta = report.summary.todoCount - prevTodoCount;
    const sign = delta >= 0 ? '+' : '';
    lines.push(`- TODO delta vs last snapshot: ${sign}${delta} (current ${report.summary.todoCount})`);
  } else {
    lines.push('- No previous snapshot available to compare TODO counts.');
  }
  if (invariantChanges.length > 0) {
    lines.push('- Invariant changes:');
    invariantChanges.forEach((change) => {
      lines.push(`  - ${change.name}: ${change.from} -> ${change.to}`);
    });
  } else {
    lines.push('- Invariant changes: none (all stable).');
  }
  lines.push('');
  lines.push(`## Top TODO hits (first ${TODO_DISPLAY_LIMIT} non-ignored)`);
  if (report.todos.length === 0) {
    lines.push('- No TODO hits outside ignored paths.');
  } else {
    report.todos.slice(0, TODO_DISPLAY_LIMIT).forEach((todo) => {
      lines.push(`- ${todo.file}:${todo.line} ${todo.text}`);
    });
  }
  lines.push('');
  lines.push('## Repo invariants (must remain true)');
  invariantStatuses.forEach((status) => {
    lines.push(
      `- ${formatStatusSymbol(status.pass)} [${status.name}] (${status.file}) — ${status.reason}`
    );
  });
  lines.push('');
  lines.push('## How to use this in a new ChatGPT session');
  lines.push('STARTUP PROMPT TEMPLATE');
  lines.push('---');
  lines.push('You are my LazyTopper repo copilot. Read the Blackbox snapshot below and treat it as the source of truth about current repo state.');
  lines.push('- Do not suggest broad refactors.');
  lines.push('- Preserve existing behavior and layout.');
  lines.push('- When proposing changes, specify exact files and minimal diffs.');
  lines.push('Blackbox snapshot:');
  const snapshotSnippet = JSON.stringify(
    {
      timestamp: report.timestamp,
      generatedAt: report.generatedAt,
      git: report.git,
      summary: report.summary,
    },
    null,
    2
  );
  lines.push('```json');
  lines.push(snapshotSnippet);
  lines.push('```');
  lines.push('---');

  const markdownPath = path.join(BLACKBOX_DIR, 'blackbox.md');
  const tmpMarkdown = path.join(BLACKBOX_DIR, `blackbox.tmp.${Date.now()}`);
  await fs.writeFile(tmpMarkdown, lines.join('\n'));
  await fs.rename(tmpMarkdown, markdownPath);
}

function printSummary(report, summary) {
  console.log('Blackbox summary');
  console.log('----------------');
  console.table({
    todos: summary.todoCount,
    'critical violations': summary.criticalViolations,
    'invariant failures': summary.invariantFailures,
    'missing critical files': summary.missingCriticalFiles.length,
  });
  if (!summary.success) {
    if (report.todos.length > 0) {
      console.log('TODO hits (first 20):');
      report.todos.slice(0, 20).forEach((todo) => {
        console.log(` - ${todo.file}:${todo.line} ${todo.text}`);
      });
    }
    if (report.criticalViolations.length > 0) {
      console.log('Critical violations:');
      report.criticalViolations.forEach((v) => {
        console.log(` - ${v.file}: ${v.match}`);
      });
    }
    if (report.invariantFailures.length > 0) {
      console.log('Invariant failures:');
      report.invariantFailures.forEach((v) => {
        console.log(` - ${v.file} [${v.name}]: ${v.reason} (expected ${v.expected})`);
      });
    }
    if (summary.missingCriticalFiles.length > 0) {
      console.log('Missing critical files:');
      summary.missingCriticalFiles.forEach((file) => console.log(` - ${file}`));
    }
  }
}

async function main() {
  const contract = await loadMemoryContract();
  const previousReport = await loadPreviousReport();
  const todos = [];
  await walkFiles(ROOT, contract, todos);

  const criticalViolations = await scanCriticalViolations(contract);
  const { failures: invariantFailures, missing: missingInvariants } = await runInvariants(contract);
  const missingCriticalFiles = [];
  for (const file of contract.criticalFiles) {
    if (!(await exists(path.join(ROOT, file)))) {
      missingCriticalFiles.push(file);
    }
  }

  const governanceConfig = contract?.governance;
  const governanceSources = [];
  let newestGovernanceTimestamp = 0;
  if (governanceConfig) {
    for (const relPath of governanceConfig.governanceInputs ?? []) {
      const absolutePath = path.join(ROOT, relPath);
      try {
        const stat = await fs.stat(absolutePath);
        governanceSources.push({
          rel: relPath,
          mtimeMs: stat.mtimeMs,
        });
        newestGovernanceTimestamp = Math.max(newestGovernanceTimestamp, stat.mtimeMs);
      } catch {
        // ignore missing inputs
      }
    }
  }

  if (
    governanceConfig?.governanceRequired &&
    governanceSources.length > 0 &&
    governanceConfig.governanceDigestOut
  ) {
    const digestPath = path.join(ROOT, governanceConfig.governanceDigestOut);
    const digestStat = await fs.stat(digestPath).catch(() => null);
    const digestMissing = !digestStat;
    const digestStale = digestStat && digestStat.mtimeMs < newestGovernanceTimestamp;

    if (digestMissing || digestStale) {
      const reason = digestMissing ? 'governance digest missing' : 'governance digest stale';
      if (!isFullRun) {
        invariantFailures.push({
          file: governanceConfig.governanceDigestOut,
          name: 'governance digest freshness',
          expected: 'digest exists and is newer than governance input files',
          reason,
        });
      } else {
        console.log(`Governance digest check skipped for --full run (${reason}).`);
      }
    }
  }

  const invariantStatuses = computeInvariantStatuses(contract, invariantFailures, missingInvariants);
  const invariantChanges = computeInvariantChanges(invariantStatuses, previousReport?.invariantStatuses ?? []);

  const summary = {
    todoCount: todos.length,
    criticalViolations: criticalViolations.length,
    invariantFailures: invariantFailures.length,
    missingCriticalFiles,
    success:
      criticalViolations.length === 0 &&
      invariantFailures.length === 0 &&
      missingCriticalFiles.length === 0,
  };

  const gitInfo = getGitInfo();
  const now = new Date().toISOString();
  const report = {
    timestamp: now,
    generatedAt: now,
    git: {
      branch: gitInfo.branch,
      commit: gitInfo.commitShort,
      longCommit: gitInfo.commit,
    },
    summary,
    todos,
    criticalViolations,
    invariantFailures,
    invariantStatuses,
    missingFiles: [...missingInvariants, ...missingCriticalFiles],
  };

  await writeSnapshot(report);
  await writeMarkdownReport(report, previousReport, invariantStatuses, invariantChanges);
  printSummary(report, summary);

  if (!summary.success) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('blackbox failed:', error);
  process.exit(1);
});
