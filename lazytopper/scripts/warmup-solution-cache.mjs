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
 * Environment variables:
 *   DATABASE_URL          PostgreSQL connection string (required)
 *   GATEWAY_URL           API server base URL (default: http://localhost:3001)
 *   WARMUP_DELAY_MS       Delay between AI requests in ms (default: 1200)
 *   WARMUP_CONCURRENCY    Parallel requests for pre-written-step questions (default: 5)
 *
 * CLI flags:
 *   --dry-run             List uncached questions without calling the API
 *   --limit N             Only process the first N uncached questions
 *   --prewritten-only     Only warm questions that have pre-written solutionSteps
 *   --ai-only             Only warm questions that need an AI call
 */

import crypto from 'crypto';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GATEWAY_URL = (process.env.GATEWAY_URL || 'http://localhost:3001').replace(/\/+$/, '');
const DELAY_MS = Number(process.env.WARMUP_DELAY_MS || 1200);
const CONCURRENCY = Math.max(1, Number(process.env.WARMUP_CONCURRENCY || 5));
const DRY_RUN = process.argv.includes('--dry-run');
const PREWRITTEN_ONLY = process.argv.includes('--prewritten-only');
const AI_ONLY = process.argv.includes('--ai-only');

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

async function processChunk(questions, existingHashes, label, useDelay) {
  let warmed = 0;
  let failed = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const questionText = String(q.questionText || '').trim();
    const marks = Number(q.marks) || 1;
    const hash = computeQuestionHash(questionText, marks);
    const hasPrewritten = Array.isArray(q.solutionSteps) && q.solutionSteps.length > 0;
    const tag = hasPrewritten ? '[pre]' : '[ai]';
    const prefix = `${label}[${i + 1}/${questions.length}]${tag} ${String(q.id || '?').padEnd(24)}`;

    process.stdout.write(`${prefix} ${questionText.slice(0, 55).replace(/\n/g, ' ')}... `);

    try {
      const solution = await callStepSolutionEndpoint(q);

      if (!solution || !Array.isArray(solution.steps) || solution.steps.length === 0) {
        console.log('SKIP (empty solution)');
        failed++;
      } else {
        await saveToDb(hash, solution);
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

  const allUncached = canonicalQuestionBank.filter((q) => {
    const hash = computeQuestionHash(String(q.questionText || '').trim(), Number(q.marks) || 1);
    return !existingHashes.has(hash);
  });

  const prewrittenUncached = allUncached.filter(
    (q) => Array.isArray(q.solutionSteps) && q.solutionSteps.length > 0
  );
  const aiUncached = allUncached.filter(
    (q) => !Array.isArray(q.solutionSteps) || q.solutionSteps.length === 0
  );

  console.log(`[warmup] Uncached: ${allUncached.length} total`);
  console.log(`[warmup]   → ${prewrittenUncached.length} have pre-written solutionSteps (fast, no AI)`);
  console.log(`[warmup]   → ${aiUncached.length} need an AI-generated solution`);

  let toProcessPrewritten = prewrittenUncached;
  let toProcessAi = aiUncached;

  if (PREWRITTEN_ONLY) {
    toProcessAi = [];
    console.log('[warmup] Mode: --prewritten-only (skipping AI questions)');
  }
  if (AI_ONLY) {
    toProcessPrewritten = [];
    console.log('[warmup] Mode: --ai-only (skipping pre-written questions)');
  }

  if (Number.isFinite(MAX_QUESTIONS)) {
    const combined = [...toProcessPrewritten, ...toProcessAi].slice(0, MAX_QUESTIONS);
    toProcessPrewritten = combined.filter((q) => Array.isArray(q.solutionSteps) && q.solutionSteps.length > 0);
    toProcessAi = combined.filter((q) => !Array.isArray(q.solutionSteps) || q.solutionSteps.length === 0);
    console.log(`[warmup] --limit ${MAX_QUESTIONS}: processing ${combined.length} questions`);
  }

  if (DRY_RUN) {
    console.log('\n[warmup] DRY RUN — questions that would be warmed:\n');
    console.log('  Pre-written (no AI call needed):');
    for (const q of toProcessPrewritten) {
      console.log(`    [pre] ${String(q.id || '?').padEnd(28)} ${String(q.questionText || '').slice(0, 70)}`);
    }
    console.log('\n  AI-generated:');
    for (const q of toProcessAi) {
      console.log(`    [ai]  ${String(q.id || '?').padEnd(28)} ${String(q.questionText || '').slice(0, 70)}`);
    }
    await pool.end();
    return;
  }

  let totalWarmed = 0;
  let totalFailed = 0;

  if (toProcessPrewritten.length > 0) {
    console.log(`\n[warmup] Phase 1: Warming ${toProcessPrewritten.length} pre-written questions (fast, no AI)...`);
    const { warmed, failed } = await processChunk(toProcessPrewritten, existingHashes, '', false);
    totalWarmed += warmed;
    totalFailed += failed;
  }

  if (toProcessAi.length > 0) {
    console.log(`\n[warmup] Phase 2: Warming ${toProcessAi.length} AI questions (${DELAY_MS}ms delay between calls)...`);
    const { warmed, failed } = await processChunk(toProcessAi, existingHashes, '', true);
    totalWarmed += warmed;
    totalFailed += failed;
  }

  await pool.end();

  const nowCached = existingHashes.size + totalWarmed;
  const pct = total > 0 ? Math.round((nowCached / total) * 100) : 0;

  console.log('');
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│         warmup-solution-cache results        │');
  console.log('├─────────────────────────────────────────────┤');
  console.log(`│  Already cached before run : ${String(existingHashes.size).padStart(6)}            │`);
  console.log(`│  Newly warmed              : ${String(totalWarmed).padStart(6)}            │`);
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
