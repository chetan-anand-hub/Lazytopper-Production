#!/usr/bin/env node
/**
 * Pre-generate & cache step-by-step solutions for all canonical questions.
 *
 * Usage (from lazytopper/ directory):
 *   node --import tsx/esm scripts/pregen-step-solutions.mjs
 *
 * Requires:
 *   - DATABASE_URL env var (PostgreSQL)
 *   - Gateway server running (or AI_INTEGRATIONS_GEMINI_BASE_URL + AI_INTEGRATIONS_GEMINI_API_KEY)
 *   - GATEWAY_URL env var (default: http://localhost:3001)
 *
 * Options:
 *   --dry-run    Print which questions would be generated without calling the API
 *   --limit N    Only process the first N uncached questions (useful for testing)
 */

import crypto from 'crypto';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GATEWAY_URL = (process.env.GATEWAY_URL || 'http://localhost:3001').replace(/\/+$/, '');
const DELAY_MS = Number(process.env.PREGEN_DELAY_MS || 1200);
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.indexOf('--limit');
const MAX_QUESTIONS = LIMIT_ARG >= 0 ? Number(process.argv[LIMIT_ARG + 1]) : Infinity;

if (!process.env.DATABASE_URL) {
  console.error('[pregen] ERROR: DATABASE_URL is not set');
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function computeQuestionHash(question, marks) {
  return crypto.createHash('sha256').update(question + '|' + marks).digest('hex');
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

async function callStepSolutionEndpoint(question) {
  const body = {
    question: question.questionText,
    marks: question.marks,
    subject: question.subject,
    topic: question.topicKey || '',
    type: question.format || '',
    section: question.section || '',
    answer: question.answer || '',
    explanation: question.explanation || '',
  };

  const res = await fetch(`${GATEWAY_URL}/api/step-solution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  return await res.json();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('[pregen] Loading canonical question bank...');

  const { canonicalQuestionBank } = await import('../src/data/canonicalQuestionBank.ts');
  const total = canonicalQuestionBank.length;
  console.log(`[pregen] Loaded ${total} questions`);

  console.log('[pregen] Fetching already-cached hashes from DB...');
  const existingHashes = await getExistingHashes();
  console.log(`[pregen] ${existingHashes.size} questions already cached`);

  const uncached = canonicalQuestionBank.filter((q) => {
    const hash = computeQuestionHash(String(q.questionText || '').trim(), Number(q.marks) || 1);
    return !existingHashes.has(hash);
  });

  console.log(`[pregen] ${uncached.length} questions need generation`);

  if (DRY_RUN) {
    console.log('[pregen] DRY RUN — listing questions that would be generated:');
    for (const q of uncached) {
      console.log(`  [${q.id || '?'}] ${String(q.questionText || '').slice(0, 80)}`);
    }
    await pool.end();
    return;
  }

  const toProcess = uncached.slice(0, Number.isFinite(MAX_QUESTIONS) ? MAX_QUESTIONS : uncached.length);

  let generated = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const q = toProcess[i];
    const questionText = String(q.questionText || '').trim();
    const marks = Number(q.marks) || 1;
    const hash = computeQuestionHash(questionText, marks);
    const label = `[${i + 1}/${toProcess.length}] id=${q.id || '?'}`;

    process.stdout.write(`${label} ${questionText.slice(0, 60).replace(/\n/g, ' ')}... `);

    try {
      const solution = await callStepSolutionEndpoint(q);

      if (!solution || !Array.isArray(solution.steps) || solution.steps.length === 0) {
        console.log('SKIP (empty solution)');
        failed++;
      } else {
        await saveToDb(hash, solution);
        console.log(`OK (${solution.steps.length} steps)`);
        generated++;
      }
    } catch (err) {
      console.log(`FAIL: ${err.message}`);
      failed++;
    }

    if (i < toProcess.length - 1) {
      await delay(DELAY_MS);
    }
  }

  await pool.end();

  console.log('');
  console.log(`[pregen] Done. Generated: ${generated}, Failed/Skipped: ${failed}, Already cached: ${existingHashes.size}`);
}

main().catch((err) => {
  console.error('[pregen] Fatal error:', err);
  process.exit(1);
});
