#!/usr/bin/env node
/**
 * Warm up the step-solution cache for every question in the bank.
 *
 * Questions with pre-written solutionSteps are built instantly (no AI call).
 * Questions without solutionSteps trigger a Gemini call whose result is cached.
 * After this script completes, ALL questions load their solutions instantly.
 *
 * Usage (from the lazytopper/ directory):
 *   node --import tsx/esm scripts/warmup-solution-cache.mjs
 *
 * Prerequisites:
 *   1. DATABASE_URL env var must be set (PostgreSQL connection string)
 *   2. The API gateway must be running (GATEWAY_URL, default: http://localhost:3001)
 *
 * Environment variables:
 *   DATABASE_URL      PostgreSQL connection string (required)
 *   GATEWAY_URL       API server base URL (default: http://localhost:3001)
 *   WARMUP_DELAY_MS   Delay between AI-generated requests in ms (default: 1200)
 *
 * CLI flags:
 *   --dry-run             List uncached questions without calling the API
 *   --limit N             Only process the first N questions (uncached, or cached when --force)
 *   --prewritten-only     Only warm questions that have pre-written solutionSteps
 *   --ai-only             Only warm questions that need an AI call
 *   --force               Re-generate and overwrite existing AI-cached solutions
 *                         (uses ON CONFLICT DO UPDATE instead of DO NOTHING).
 *                         Pre-written solutionSteps entries are never force-refreshed
 *                         because they are always correct.  Use this flag after
 *                         improving the Gemini prompt to refresh stale AI answers.
 */

import crypto from 'crypto';
import pg from 'pg';

const GATEWAY_URL = (process.env.GATEWAY_URL || 'http://localhost:3001').replace(/\/+$/, '');
const DELAY_MS = Number(process.env.WARMUP_DELAY_MS || 1200);
const DRY_RUN = process.argv.includes('--dry-run');
const PREWRITTEN_ONLY = process.argv.includes('--prewritten-only');
const AI_ONLY = process.argv.includes('--ai-only');
const FORCE = process.argv.includes('--force');

const LIMIT_ARG = process.argv.indexOf('--limit');
const MAX_QUESTIONS = LIMIT_ARG >= 0 ? Number(process.argv[LIMIT_ARG + 1]) : Infinity;

if (!process.env.DATABASE_URL) {
  console.error('[warmup] ERROR: DATABASE_URL is not set.');
  console.error('[warmup] Set it with: export DATABASE_URL=<your-postgres-url>');
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function computeQuestionHash(questionText, marks) {
  return crypto.createHash('sha256').update(String(questionText) + '|' + marks).digest('hex');
}

async function getExistingHashes() {
  const result = await pool.query('SELECT question_hash FROM step_solutions');
  return new Set(result.rows.map((r) => r.question_hash));
}

async function saveToDb(hash, solutionJson) {
  await pool.query(
    'INSERT INTO step_solutions (question_hash, solution_json) VALUES ($1, $2) ON CONFLICT (question_hash) DO NOTHING',
    [hash, JSON.stringify(solutionJson)]
  );
}

async function saveToDbForce(hash, solutionJson) {
  await pool.query(
    'INSERT INTO step_solutions (question_hash, solution_json) VALUES ($1, $2) ON CONFLICT (question_hash) DO UPDATE SET solution_json = EXCLUDED.solution_json',
    [hash, JSON.stringify(solutionJson)]
  );
}

async function callStepSolutionEndpoint(q) {
  const hasPrewritten = Array.isArray(q.solutionSteps) && q.solutionSteps.length > 0;

  const body = {
    question: String(q.questionText || '').trim(),
    marks: Number(q.marks) || 1,
    subject: String(q.subject || 'Maths'),
    topic: String(q.topicKey || q.subtopic || ''),
    type: String(q.format || q.type || ''),
    section: String(q.section || ''),
    answer: String(q.answer || ''),
    explanation: String(q.explanation || ''),
  };

  if (hasPrewritten) {
    body.solutionSteps = q.solutionSteps.map((s) => String(s).trim()).filter(Boolean);
    if (q.finalAnswer) body.finalAnswer = String(q.finalAnswer);
  }

  const res = await fetch(`${GATEWAY_URL}/api/step-solution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processChunk(questions, useDelay, forceUpdate = false) {
  let warmed = 0;
  let failed = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const questionText = String(q.questionText || '').trim();
    const marks = Number(q.marks) || 1;
    const hash = computeQuestionHash(questionText, marks);
    const hasPrewritten = Array.isArray(q.solutionSteps) && q.solutionSteps.length > 0;
    const tag = hasPrewritten ? '[pre]' : '[ai] ';
    const prefix = `[${i + 1}/${questions.length}] ${tag} ${String(q.id || '?').padEnd(24)}`;

    process.stdout.write(`${prefix} ${questionText.slice(0, 55).replace(/\n/g, ' ')}... `);

    try {
      const solution = await callStepSolutionEndpoint(q);

      if (!solution || !Array.isArray(solution.steps) || solution.steps.length === 0) {
        console.log('SKIP (empty solution)');
        failed++;
      } else {
        if (forceUpdate) {
          await saveToDbForce(hash, solution);
        } else {
          await saveToDb(hash, solution);
        }
        console.log(`OK (${solution.steps.length} steps)`);
        warmed++;
      }
    } catch (err) {
      console.log(`FAIL: ${err.message}`);
      failed++;
    }

    if (useDelay && i < questions.length - 1) {
      await delay(DELAY_MS);
    }
  }

  return { warmed, failed };
}

async function main() {
  console.log('[warmup] Loading canonical question bank...');

  const { canonicalQuestionBank } = await import('../src/data/canonicalQuestionBank.ts');
  const total = canonicalQuestionBank.length;
  console.log(`[warmup] Loaded ${total} questions from all packs`);

  console.log('[warmup] Fetching already-cached hashes from DB...');
  const existingHashes = await getExistingHashes();
  console.log(`[warmup] ${existingHashes.size} / ${total} questions already cached`);

  const hasPrewrittenSteps = (q) => Array.isArray(q.solutionSteps) && q.solutionSteps.length > 0;

  const allUncached = canonicalQuestionBank.filter((q) => {
    const hash = computeQuestionHash(String(q.questionText || '').trim(), Number(q.marks) || 1);
    return !existingHashes.has(hash);
  });

  const prewrittenUncached = allUncached.filter(hasPrewrittenSteps);
  const aiUncached = allUncached.filter((q) => !hasPrewrittenSteps(q));

  // In force mode, also include AI questions that are already cached so they get re-generated.
  // Pre-written entries are excluded from force-refresh — they are always correct.
  const aiAlreadyCached = FORCE
    ? canonicalQuestionBank.filter((q) => {
        if (hasPrewrittenSteps(q)) return false;
        const hash = computeQuestionHash(String(q.questionText || '').trim(), Number(q.marks) || 1);
        return existingHashes.has(hash);
      })
    : [];

  console.log(`[warmup] Uncached: ${allUncached.length} total`);
  console.log(`[warmup]   → ${prewrittenUncached.length} have pre-written solutionSteps (fast, no AI)`);
  console.log(`[warmup]   → ${aiUncached.length} need an AI-generated solution`);
  if (FORCE) {
    console.log(`[warmup] --force: ${aiAlreadyCached.length} already-cached AI solution(s) will be overwritten`);
  }

  let toProcessPrewritten = prewrittenUncached;
  let toProcessAiNew = aiUncached;
  let toProcessAiForce = aiAlreadyCached;

  if (PREWRITTEN_ONLY) {
    toProcessAiNew = [];
    toProcessAiForce = [];
    console.log('[warmup] Mode: --prewritten-only (skipping AI questions)');
  }
  if (AI_ONLY) {
    toProcessPrewritten = [];
    console.log('[warmup] Mode: --ai-only (skipping pre-written questions)');
  }

  if (Number.isFinite(MAX_QUESTIONS)) {
    const combined = [...toProcessPrewritten, ...toProcessAiNew, ...toProcessAiForce].slice(0, MAX_QUESTIONS);
    toProcessPrewritten = combined.filter(hasPrewrittenSteps);
    const aiCombined = combined.filter((q) => !hasPrewrittenSteps(q));
    const forceHashes = new Set(toProcessAiForce.map((q) =>
      computeQuestionHash(String(q.questionText || '').trim(), Number(q.marks) || 1)
    ));
    toProcessAiNew = aiCombined.filter((q) =>
      !forceHashes.has(computeQuestionHash(String(q.questionText || '').trim(), Number(q.marks) || 1))
    );
    toProcessAiForce = aiCombined.filter((q) =>
      forceHashes.has(computeQuestionHash(String(q.questionText || '').trim(), Number(q.marks) || 1))
    );
    console.log(`[warmup] --limit ${MAX_QUESTIONS}: processing ${combined.length} questions`);
  }

  if (DRY_RUN) {
    console.log('\n[warmup] DRY RUN — questions that would be warmed:\n');
    console.log('  Pre-written (no AI call needed):');
    for (const q of toProcessPrewritten) {
      console.log(`    [pre]       ${String(q.id || '?').padEnd(28)} ${String(q.questionText || '').slice(0, 70)}`);
    }
    console.log(FORCE ? '\n  AI-generated (new + force-refresh of cached):' : '\n  AI-generated:');
    for (const q of toProcessAiNew) {
      console.log(`    [ai]        ${String(q.id || '?').padEnd(28)} ${String(q.questionText || '').slice(0, 70)}`);
    }
    for (const q of toProcessAiForce) {
      console.log(`    [ai/force]  ${String(q.id || '?').padEnd(28)} ${String(q.questionText || '').slice(0, 70)}`);
    }
    await pool.end();
    return;
  }

  let totalNewlyInserted = 0;
  let totalOverwritten = 0;
  let totalFailed = 0;

  if (toProcessPrewritten.length > 0) {
    console.log(`\n[warmup] Phase 1: Warming ${toProcessPrewritten.length} pre-written questions (fast, no AI)...`);
    const { warmed, failed } = await processChunk(toProcessPrewritten, false, false);
    totalNewlyInserted += warmed;
    totalFailed += failed;
  }

  if (toProcessAiNew.length > 0) {
    console.log(`\n[warmup] Phase 2a: Warming ${toProcessAiNew.length} new AI questions (${DELAY_MS}ms delay between calls)...`);
    const { warmed, failed } = await processChunk(toProcessAiNew, true, false);
    totalNewlyInserted += warmed;
    totalFailed += failed;
  }

  if (toProcessAiForce.length > 0) {
    console.log(`\n[warmup] Phase 2b: Force-refreshing ${toProcessAiForce.length} cached AI questions (${DELAY_MS}ms delay)...`);
    const { warmed, failed } = await processChunk(toProcessAiForce, true, true);
    totalOverwritten += warmed;
    totalFailed += failed;
  }

  await pool.end();

  // Only newly inserted rows increase the cached count; overwritten rows were already counted.
  const nowCached = existingHashes.size + totalNewlyInserted;
  const pct = total > 0 ? Math.round((nowCached / total) * 100) : 0;

  console.log('');
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│         warmup-solution-cache results        │');
  console.log('├─────────────────────────────────────────────┤');
  console.log(`│  Already cached before run : ${String(existingHashes.size).padStart(6)}            │`);
  console.log(`│  Newly inserted            : ${String(totalNewlyInserted).padStart(6)}            │`);
  if (FORCE) {
  console.log(`│  Force-overwritten (AI)    : ${String(totalOverwritten).padStart(6)}            │`);
  }
  console.log(`│  Failed / skipped          : ${String(totalFailed).padStart(6)}            │`);
  console.log(`│  Total cached now          : ${String(nowCached).padStart(6)} / ${String(total).padEnd(6)}    │`);
  console.log(`│  Coverage                  : ${String(pct + '%').padStart(6)}            │`);
  console.log('└─────────────────────────────────────────────┘');

  if (totalFailed > 0) {
    console.log(`\n[warmup] ${totalFailed} question(s) failed. Re-run the script to retry them.`);
  } else if (nowCached >= total) {
    console.log('\n[warmup] All questions are cached. Solutions will load instantly for every student.');
  }
}

main().catch((err) => {
  console.error('[warmup] Fatal error:', err);
  pool.end().catch(() => {});
  process.exit(1);
});
