/**
 * ensureStepSolutionsTable.test.cjs — the `step_solutions` boot-time schema
 * (FU-STEP-SOLUTION-CACHE-TABLE).
 *
 * Production logged `relation "step_solutions" does not exist` on every
 * "Show steps": the cache read missed, the model regenerated, the write failed,
 * and the next request did it all again. These suites pin:
 *   1. the DDL is the schema reference's §1b DDL, byte-for-byte;
 *   2. every column any live statement names exists, and the ON CONFLICT target
 *      is the PRIMARY KEY (a table without it passes every SELECT, fails every INSERT);
 *   3. idempotence (distinct pools, same database — the memo cannot fake it);
 *   4. fail-open on a throwing pool, no-op without DATABASE_URL;
 *   5. the real stepSolution.cjs cache round-trips once the table exists — and,
 *      as the CONTROL, does NOT round-trip without it (the production symptom);
 *   6. index.cjs requires it and calls it at startup in the DATABASE_URL branch.
 *
 * No `pg`, no database, no network: a fake Postgres stands in.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const {
  ensureStepSolutionsTable,
  DDL_STATEMENTS,
  REQUIRED_COLUMNS,
} = require('./ensureStepSolutionsTable.cjs');

const SERVER_DIR = path.resolve(__dirname, '..');
const APP_DIR = path.resolve(SERVER_DIR, '..');
const read = (abs) => fs.readFileSync(abs, 'utf8');

const quiet = { log() {}, warn() {} };

/**
 * A fake Postgres that understands exactly the statements this table sees.
 * It throws 42P01-shaped errors on a missing relation and on an unguarded
 * repeat CREATE, exactly as Postgres does, and enforces that an ON CONFLICT
 * target is a PRIMARY KEY column.
 */
function fakePostgres() {
  const state = { tables: new Map() }; // name -> { cols:Set, pk:string|null, rows:Map }
  const statements = [];

  const need = (name) => {
    const t = state.tables.get(name);
    if (!t) throw new Error(`relation "${name}" does not exist`);
    return t;
  };

  const query = async (sql, params = []) => {
    statements.push(sql);
    const norm = String(sql).replace(/\s+/g, ' ').trim();

    let m = /^CREATE TABLE (IF NOT EXISTS )?([a-z_]+) \((.*)\)$/i.exec(norm);
    if (m) {
      const [, guard, name, body] = m;
      if (state.tables.has(name)) {
        if (!guard) throw new Error(`relation "${name}" already exists`);
        return { rowCount: 0, rows: [] };
      }
      const defs = body.split(',').map((c) => c.trim()).filter(Boolean);
      const cols = new Set(defs.map((d) => d.split(/\s+/)[0]));
      const pkDef = defs.find((d) => /PRIMARY KEY/i.test(d));
      state.tables.set(name, { cols, pk: pkDef ? pkDef.split(/\s+/)[0] : null, rows: new Map() });
      return { rowCount: 0, rows: [] };
    }

    m = /^SELECT solution_json FROM step_solutions WHERE question_hash = \$1/i.exec(norm);
    if (m) {
      const t = need('step_solutions');
      const row = t.rows.get(params[0]);
      return { rows: row ? [{ solution_json: JSON.parse(row) }] : [] };
    }

    m = /^INSERT INTO step_solutions \(question_hash, solution_json\) VALUES \(\$1, \$2\) ON CONFLICT \(([a-z_]+)\) DO (NOTHING|UPDATE)/i.exec(norm);
    if (m) {
      const t = need('step_solutions');
      if (t.pk !== m[1]) {
        throw new Error('there is no unique or exclusion constraint matching the ON CONFLICT specification');
      }
      const exists = t.rows.has(params[0]);
      if (!exists || m[2].toUpperCase() === 'UPDATE') t.rows.set(params[0], params[1]);
      return { rowCount: exists && m[2].toUpperCase() === 'NOTHING' ? 0 : 1, rows: [] };
    }

    m = /^DELETE FROM step_solutions WHERE question_hash = \$1/i.exec(norm);
    if (m) {
      const t = need('step_solutions');
      return { rowCount: t.rows.delete(params[0]) ? 1 : 0, rows: [] };
    }

    throw new Error(`fake-postgres: unsupported statement: ${norm.slice(0, 70)}`);
  };

  return { state, statements, newPool: () => ({ query, on() {} }) };
}

/* ══ 1 · THE DDL IS THE REFERENCE'S DDL ═══════════════════════════════════ */

test('1 — the DDL is POSTGRES_SCHEMA_REFERENCE.md §1b, byte-for-byte', () => {
  const ref = read(path.join(__dirname, 'POSTGRES_SCHEMA_REFERENCE.md'));
  const block = /### 1b\. Derived DDL\s+```sql\n([\s\S]*?)\n```/.exec(ref);
  assert.ok(block, 'CONTROL: the §1b sql block was found');
  assert.equal(DDL_STATEMENTS.length, 1);
  assert.equal(DDL_STATEMENTS[0] + ';', block[1].replace(/\r/g, ''));
});

/* ══ 2 · EVERY COLUMN ANY CALL SITE NAMES EXISTS ══════════════════════════ */

const CALL_SITES = [
  path.join(SERVER_DIR, 'routes/stepSolution.cjs'),
  path.join(APP_DIR, 'scripts/pregen-step-solutions.mjs'),
  path.join(APP_DIR, 'scripts/warmup-solution-cache.mjs'),
];

/** Pull every SQL string literal that names step_solutions, and the columns in it. */
function columnsUsedByCallSites() {
  const used = new Set();
  let statements = 0;
  for (const file of CALL_SITES) {
    const src = read(file);
    for (const lit of src.match(/(['`])(?:SELECT|INSERT|UPDATE|DELETE)[^'`]*step_solutions[^'`]*\1/g) || []) {
      statements++;
      for (const id of lit.match(/\b[a-z]+_[a-z_]+\b/g) || []) {
        if (id !== 'step_solutions') used.add(id);
      }
    }
  }
  return { used, statements };
}

test('2 — every column a live statement names is created, and the ON CONFLICT target is the PRIMARY KEY', async () => {
  const { used, statements } = columnsUsedByCallSites();
  assert.ok(statements >= 8, `CONTROL: the parser really found the call-site SQL (found ${statements})`);
  assert.ok(used.has('question_hash') && used.has('solution_json'), 'CONTROL: the parser extracts column names');

  const db = fakePostgres();
  assert.equal(await ensureStepSolutionsTable(db.newPool(), quiet), true);
  const t = db.state.tables.get('step_solutions');
  assert.ok(t, 'the table exists');
  for (const col of used) assert.ok(t.cols.has(col), `column ${col} (named by a call site) exists`);
  for (const col of REQUIRED_COLUMNS) assert.ok(t.cols.has(col), `required column ${col} exists`);
  assert.equal(t.pk, 'question_hash', 'question_hash is the PRIMARY KEY the ON CONFLICT target needs');
});

/* ══ 3 · IDEMPOTENT ═══════════════════════════════════════════════════════ */

test('3 — idempotent: a second run over the same database re-issues the DDL, changes nothing, throws nothing', async () => {
  const db = fakePostgres();
  assert.equal(await ensureStepSolutionsTable(db.newPool(), quiet), true);
  const first = db.statements.length;
  const colsBefore = [...db.state.tables.get('step_solutions').cols].sort();

  assert.equal(await ensureStepSolutionsTable(db.newPool(), quiet), true);
  assert.equal(db.statements.length, first * 2, 'CONTROL: the DDL really was re-issued, not memoised away');
  assert.deepEqual([...db.state.tables.get('step_solutions').cols].sort(), colsBefore);
  for (const s of DDL_STATEMENTS) assert.match(s, /IF NOT EXISTS/i, 'every DDL statement is guarded');
  for (const s of DDL_STATEMENTS) assert.doesNotMatch(s, /\b(DROP|ALTER|TRUNCATE|DELETE)\b/i, 'no destructive DDL');
});

test('3b (CONTROL) — the fake Postgres really rejects an unguarded repeat CREATE', async () => {
  const pool = fakePostgres().newPool();
  await pool.query('CREATE TABLE IF NOT EXISTS t_control (id TEXT PRIMARY KEY)');
  await assert.rejects(() => pool.query('CREATE TABLE t_control (id TEXT PRIMARY KEY)'), /already exists/);
});

/* ══ 4 · FAIL-OPEN, NO-OP WITHOUT A DATABASE ══════════════════════════════ */

test('4 — fail-open: a throwing pool is logged once and resolves false, never throws', async () => {
  const warnings = [];
  const pool = { query: async () => { throw new Error('connection refused'); }, on() {} };
  const ok = await ensureStepSolutionsTable(pool, { log() {}, warn: (...a) => warnings.push(a.join(' ')) });
  assert.equal(ok, false);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /connection refused/);
});

test('4b — no DATABASE_URL: no pool is built, no SQL is issued, resolves false and says why', async () => {
  const saved = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const warnings = [];
  try {
    const ok = await ensureStepSolutionsTable(undefined, { log() {}, warn: (m) => warnings.push(m) });
    assert.equal(ok, false);
    assert.ok(warnings.some((w) => /no DATABASE_URL/.test(w)));
  } finally {
    if (saved !== undefined) process.env.DATABASE_URL = saved;
  }
});

/* ══ 5 · THE REAL CACHE ROUND-TRIPS ONCE THE TABLE EXISTS ═════════════════ */

const stepSolution = require('../routes/stepSolution.cjs');

async function showStepsTwice(db) {
  stepSolution.__setPoolForTests(db.newPool());
  const hash = stepSolution.computeQuestionHash('Prove that √2 is irrational.', 3);
  const first = await stepSolution.getCachedSolution(hash); // 1st "Show steps": miss
  await stepSolution.saveSolution(hash, { totalMarks: 3, steps: [{ text: 'x' }] });
  const second = await stepSolution.getCachedSolution(hash); // 2nd "Show steps"
  return { first, second };
}

test('5 — after ensure, the 1st "Show steps" writes and the 2nd is a cache hit', async (t) => {
  t.after(() => stepSolution.__setPoolForTests(null));
  const db = fakePostgres();
  await ensureStepSolutionsTable(db.newPool(), quiet);
  const { first, second } = await showStepsTwice(db);
  assert.equal(first, null);
  assert.deepEqual(second, { totalMarks: 3, steps: [{ text: 'x' }] });
});

test('5b (CONTROL) — without the table, the same two calls both miss: the production symptom', async (t) => {
  t.after(() => stepSolution.__setPoolForTests(null));
  const origWarn = console.warn;
  const warned = [];
  console.warn = (...a) => warned.push(a.join(' '));
  try {
    const { first, second } = await showStepsTwice(fakePostgres());
    assert.equal(first, null);
    assert.equal(second, null);
  } finally {
    console.warn = origWarn;
  }
  assert.ok(warned.some((w) => /relation "step_solutions" does not exist/.test(w)));
});

/* ══ 6 · STARTUP WIRES IT ═════════════════════════════════════════════════ */

test('6 — index.cjs requires the helper and calls it at startup inside the DATABASE_URL branch', () => {
  const index = read(path.join(SERVER_DIR, 'index.cjs'));
  assert.match(
    index,
    /const \{ ensureStepSolutionsTable \} = require\('\.\/db\/ensureStepSolutionsTable\.cjs'\);/
  );
  const listen = index.indexOf('server.listen(');
  assert.ok(listen > 0, 'CONTROL: the startup callback was found');
  const tail = index.slice(listen);
  const branch = /if \(!config\.STUB_MODE && process\.env\.DATABASE_URL\) \{([\s\S]*?)\} else \{/.exec(tail);
  assert.ok(branch, 'CONTROL: the DATABASE_URL startup branch was found');
  assert.match(branch[1], /ensureGeneratedQuestionsTable\(\)\.catch\(/, 'CONTROL: the matcher sees the sibling call');
  assert.match(branch[1], /ensureStepSolutionsTable\(\)\.catch\(/, 'the call is fail-open (.catch) and in this branch');
});
