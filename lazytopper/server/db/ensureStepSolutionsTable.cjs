'use strict';

/**
 * ensureStepSolutionsTable.cjs — the `step_solutions` schema.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS
 * ─────────────────────────────────────────────────────────────────────────
 * Production logs, 2026-10-07:
 *
 *     [step-solution-cache] cache read/write failed:
 *       relation "step_solutions" does not exist
 *
 * `routes/stepSolution.cjs` reads, writes, force-writes and deletes this table,
 * and every statement is wrapped in a try/catch that turns 42P01 into a cache
 * MISS. So nothing broke — every "Show steps" just silently regenerated through
 * the model and the write was thrown away. POSTGRES_SCHEMA_REFERENCE.md §4
 * recorded that no boot-time CREATE TABLE existed for this table anywhere in the
 * repo; this module is that CREATE TABLE.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DDL SOURCE
 * ─────────────────────────────────────────────────────────────────────────
 * Byte-for-byte the "Derived DDL" of POSTGRES_SCHEMA_REFERENCE.md §1b, which is
 * derived from the Drizzle declaration `lib/db/src/schema/stepSolutions.ts`
 * (that directory was deleted by #669; the reference file preserves it)
 * (question_hash TEXT PRIMARY KEY · solution_json JSONB NOT NULL · created_at
 * TIMESTAMP NOT NULL DEFAULT NOW()). The PRIMARY KEY is load-bearing: all three
 * upserts use `ON CONFLICT (question_hash)`, which needs a unique constraint on
 * that column. No secondary index is declared in the source, so none is added.
 *
 * Convention: mirrors `ensureGeneratedQuestionsTable.cjs` — guarded DDL only,
 * memoised per pool, never throws, no-op without DATABASE_URL. It never DROPs or
 * ALTERs anything and migrates no data.
 *
 * `tutor_cache` (reference §2) is deliberately NOT created here: the
 * `createTutorCache()` instance in index.cjs has no consumer — no route calls its
 * lookup/save/getStats — so a table would arm nothing today, and would silently
 * arm a 0.38-Jaccard semantic answer cache the day someone wires it.
 */

/** The exact statements, in order. Exported so a test can assert each is guarded. */
const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS step_solutions (
    question_hash  TEXT PRIMARY KEY,
    solution_json  JSONB NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
)`,
];

/** Columns the live server and scripts read or write. Asserted by the schema test. */
const REQUIRED_COLUMNS = ['question_hash', 'solution_json', 'created_at'];

let _pool = null;

/** Lazily build a pg pool from DATABASE_URL — same shape as routes/stepSolution.cjs. */
function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (_pool) return _pool;
  try {
    const pg = require('pg');
    const Pool = pg.Pool || pg.default?.Pool;
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _pool.on('error', (err) => console.warn('[step-solutions-schema] pool error:', err.message));
    return _pool;
  } catch (e) {
    console.warn('[step-solutions-schema] pg unavailable:', e.message);
    return null;
  }
}

const _migrated = new WeakSet();

/**
 * Create `step_solutions` if it is absent. Idempotent, DDL only, never throws.
 *
 * @param {{ query: Function }} [pool] optional pg pool; falls back to DATABASE_URL.
 * @param {{ log?: Function, warn?: Function }} [io]
 * @returns {Promise<boolean>} true when the table is known to be ready.
 */
async function ensureStepSolutionsTable(pool, io = {}) {
  const log = io.log || console.info;
  const warn = io.warn || console.warn;

  const target = pool || getPool();
  if (!target) {
    warn('[step-solutions-schema] no DATABASE_URL — step_solutions not ensured.');
    return false;
  }
  if (_migrated.has(target)) return true;

  try {
    for (const statement of DDL_STATEMENTS) {
      await target.query(statement);
    }
    _migrated.add(target);
    log('[step-solutions-schema] step_solutions ready.');
    return true;
  } catch (e) {
    warn('[step-solutions-schema] ensureStepSolutionsTable failed:', e.message);
    return false;
  }
}

module.exports = {
  ensureStepSolutionsTable,
  DDL_STATEMENTS,
  REQUIRED_COLUMNS,
};
