'use strict';

/**
 * ensureGeneratedQuestionsTable.cjs — the `generated_questions` schema.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS
 * ─────────────────────────────────────────────────────────────────────────
 * On 2026-08-05 `DATABASE_URL` was provisioned in Railway and the startup
 * pre-warm began a full chapter x marks x difficulty Gemini generation run.
 * What actually stopped it was NOT a brake — it was
 *
 *     [warm] countInPool error: relation "generated_questions" does not exist
 *
 * i.e. a MISSING TABLE was doing the job of a gate. That is not a safety
 * property, it is an accident, and it disappears the moment the table exists.
 * The gate now lives in warmQuestionPool.cjs (`resolveWarmPoolGates`), and
 * ONLY because that gate is in place is it safe to create this table.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * MIGRATION CONVENTION MATCHED
 * ─────────────────────────────────────────────────────────────────────────
 * The live server (`lazytopper/server/**`) has exactly one table-creation
 * convention: an idempotent `CREATE TABLE IF NOT EXISTS` issued from an
 * `ensureTable()` helper inside the module that owns the table, memoised so
 * it runs once per pool. See `routes/questionReport.cjs` → `ensureTable()`
 * for `question_reports`, which this file mirrors statement-for-statement in
 * shape. There are NO `.sql` files and NO migrations directory anywhere in
 * the repo.
 *
 * ⚠ There IS a second, DECLARATIVE mechanism — Drizzle, at
 * `lib/db/src/schema/generatedQuestions.ts`, pushed with `drizzle-kit push`
 * (`pnpm --filter @workspace/db push`). It is NOT the live server's: the only
 * consumer of `@workspace/db` is `artifacts/api-server`, and the live server
 * talks to Postgres through raw `pg` everywhere. It is also INCOMPLETE for
 * this table — it declares neither `answer`, `solution_steps` nor
 * `final_answer` (all three written by `services/generatedQuestionPool.cjs`
 * → `saveToPool`, all four read by `pickFromPool`), and it declares no unique
 * index on `(topic_key, subject, question_hash)`, which `saveToPool`'s
 * `ON CONFLICT (topic_key, subject, question_hash) DO NOTHING` REQUIRES —
 * without it every insert raises "there is no unique or exclusion constraint
 * matching the ON CONFLICT specification". A `drizzle-kit push` on its own
 * would therefore create a `generated_questions` the live server cannot write
 * to. See [FU-WARMGATE-DRIZZLE-SCHEMA-DRIFT].
 *
 * ─────────────────────────────────────────────────────────────────────────
 * IDEMPOTENCE
 * ─────────────────────────────────────────────────────────────────────────
 * Every statement below carries its own existence guard (`IF NOT EXISTS`),
 * so running this against a fresh database, a partially-migrated one, or an
 * already-complete one all converge on the same shape and none of them throw.
 * The ALTERs exist for the third case: an older `generated_questions` created
 * before the answer/solutionSteps/finalAnswer columns were added.
 *
 * This module issues DDL ONLY. It never calls Gemini and never schedules
 * anything.
 */

/**
 * The exact statements, in order. Exported so a test can assert every one of
 * them is guarded rather than trusting a comment that says they are.
 */
const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS generated_questions (
      id             SERIAL PRIMARY KEY,
      topic_key      TEXT NOT NULL DEFAULT '',
      subject        TEXT NOT NULL DEFAULT '',
      marks          INTEGER,
      difficulty     TEXT,
      question_text  TEXT NOT NULL,
      bloom_skill    TEXT,
      hit_count      INTEGER NOT NULL DEFAULT 0,
      created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
      question_hash  TEXT NOT NULL DEFAULT '',
      answer         TEXT,
      solution_steps JSONB,
      final_answer   TEXT
   )`,
  // For a database whose generated_questions predates the graded-answer columns.
  `ALTER TABLE generated_questions ADD COLUMN IF NOT EXISTS answer TEXT`,
  `ALTER TABLE generated_questions ADD COLUMN IF NOT EXISTS solution_steps JSONB`,
  `ALTER TABLE generated_questions ADD COLUMN IF NOT EXISTS final_answer TEXT`,
  // REQUIRED by saveToPool's ON CONFLICT target. Without it every pool insert throws.
  `CREATE UNIQUE INDEX IF NOT EXISTS generated_questions_topic_subject_hash_uniq
     ON generated_questions (topic_key, subject, question_hash)`,
];

/** Columns the live server reads or writes. Asserted by the schema test. */
const REQUIRED_COLUMNS = [
  'id',
  'topic_key',
  'subject',
  'marks',
  'difficulty',
  'question_text',
  'bloom_skill',
  'hit_count',
  'created_at',
  'question_hash',
  'answer',
  'solution_steps',
  'final_answer',
];

let _pool = null;

/** Lazily build a pg pool from DATABASE_URL — same shape as generatedQuestionPool.cjs. */
function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (_pool) return _pool;
  try {
    const pg = require('pg');
    const Pool = pg.Pool || pg.default?.Pool;
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _pool.on('error', (err) => console.warn('[gen-q-schema] pool error:', err.message));
    return _pool;
  } catch (e) {
    console.warn('[gen-q-schema] pg unavailable:', e.message);
    return null;
  }
}

/**
 * Pools already migrated in this process. A WeakSet rather than a module-level
 * boolean so that a caller passing its own pool (the warm runner does) is
 * migrated too, and so a test can drive two distinct pools over one database.
 */
const _migrated = new WeakSet();

/**
 * Create / upgrade `generated_questions`. Idempotent, DDL only, never throws.
 *
 * @param {{ query: Function }} [pool] optional pg pool; falls back to DATABASE_URL.
 * @param {{ log?: Function, warn?: Function }} [io]
 * @returns {Promise<boolean>} true when the table is known to be ready.
 */
async function ensureGeneratedQuestionsTable(pool, io = {}) {
  const log = io.log || console.info;
  const warn = io.warn || console.warn;

  const target = pool || getPool();
  if (!target) {
    warn('[gen-q-schema] no DATABASE_URL — generated_questions not ensured.');
    return false;
  }
  if (_migrated.has(target)) return true;

  try {
    for (const statement of DDL_STATEMENTS) {
      await target.query(statement);
    }
    _migrated.add(target);
    log('[gen-q-schema] generated_questions ready (table + unique index).');
    return true;
  } catch (e) {
    warn('[gen-q-schema] ensureGeneratedQuestionsTable failed:', e.message);
    return false;
  }
}

module.exports = {
  ensureGeneratedQuestionsTable,
  DDL_STATEMENTS,
  REQUIRED_COLUMNS,
};
