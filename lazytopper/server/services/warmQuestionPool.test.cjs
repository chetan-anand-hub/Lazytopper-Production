/**
 * warmQuestionPool.test.cjs — the startup pre-warm GATE, and the schema it
 * makes safe to create.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY EVERY "ZERO CALLS" ASSERTION HERE IS PAIRED WITH A CONTROL
 * ─────────────────────────────────────────────────────────────────────────
 * "No Gemini calls were made" passes just as happily when the warm-pool module
 * is broken, when the runner was never wired, or when the spy was never
 * reachable. So the gate-closed case and the gate-open case are driven through
 * the SAME harness — same real `createWarmPoolRunner`, same real
 * `resolveWarmPoolGates`, same real `scheduleWarmPool`, same injected
 * `callGemini` spy — and the only difference between them is the value of
 * WARM_POOL_ENABLED. The control case proves the harness can observe a call;
 * the gated case then proves there wasn't one.
 *
 * The `pg` driver is never loaded: the runner is given a fake Postgres through
 * the `createPgPool` seam, so these suites need no database and no network.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const {
  createWarmPoolRunner,
  resolveWarmPoolGates,
  scheduleWarmPool,
  isTruthyFlag,
  STARTUP_PREWARM_DELAY_MS,
} = require('./warmQuestionPool.cjs');

const {
  ensureGeneratedQuestionsTable,
  DDL_STATEMENTS,
  REQUIRED_COLUMNS,
} = require('../db/ensureGeneratedQuestionsTable.cjs');

/* ══ HARNESS ═══════════════════════════════════════════════════════════════ */

/** A manual clock. Nothing fires until the test says so. */
function fakeClock() {
  const timeouts = [];
  const intervals = [];
  return {
    timeouts,
    intervals,
    setTimeoutFn(fn, ms) {
      const handle = { fn, ms, kind: 'timeout' };
      timeouts.push(handle);
      return handle;
    },
    setIntervalFn(fn, ms) {
      const handle = { fn, ms, kind: 'interval', unref() { handle.unrefed = true; } };
      intervals.push(handle);
      return handle;
    },
    /** Fire every armed timer once. If nothing is armed, nothing happens. */
    fireAll() {
      for (const t of [...timeouts, ...intervals]) t.fn();
    },
  };
}

/** Let queued promise jobs run. The launch path is `.then().catch().finally()`. */
async function drain(rounds = 12) {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}

/** Records every Gemini call and answers with a parseable warm-pool payload. */
function geminiSpy() {
  const calls = [];
  const fn = async (model, contents, cfg) => {
    calls.push({ model, contents, cfg });
    return {
      text: JSON.stringify({
        questions: [
          {
            questionText: 'Find the HCF of 96 and 404 by the prime factorisation method.',
            marks: 3,
            difficulty: 'medium',
            bloomSkill: 'Applying',
            answer: '4',
            solutionSteps: ['96 = 2^5 x 3', '404 = 2^2 x 101', 'HCF = 2^2 = 4'],
            finalAnswer: 'HCF = 4',
          },
        ],
      }),
    };
  };
  return { fn, calls };
}

/**
 * A Postgres stand-in that ENFORCES the rules the real server hits.
 * It throws on a repeated CREATE without IF NOT EXISTS exactly as Postgres
 * does, so an idempotence claim is checked rather than asserted.
 */
function fakePostgres() {
  const state = { tables: new Map(), indexes: new Set() };
  const statements = [];

  const query = async (sql) => {
    statements.push(sql);
    const norm = String(sql).replace(/\s+/g, ' ').trim();

    let m = /^CREATE TABLE (IF NOT EXISTS )?([a-z_]+)\s*\(([\s\S]*)\)$/i.exec(norm);
    if (m) {
      const [, guard, name, body] = m;
      if (state.tables.has(name)) {
        if (!guard) throw new Error(`relation "${name}" already exists`);
        return { rowCount: 0, rows: [] };
      }
      const cols = body.split(',').map((c) => c.trim().split(/\s+/)[0]).filter(Boolean);
      state.tables.set(name, new Set(cols));
      return { rowCount: 0, rows: [] };
    }

    m = /^ALTER TABLE ([a-z_]+) ADD COLUMN (IF NOT EXISTS )?([a-z_]+)/i.exec(norm);
    if (m) {
      const [, table, guard, col] = m;
      const cols = state.tables.get(table);
      if (!cols) throw new Error(`relation "${table}" does not exist`);
      if (cols.has(col)) {
        if (!guard) throw new Error(`column "${col}" of relation "${table}" already exists`);
        return { rowCount: 0, rows: [] };
      }
      cols.add(col);
      return { rowCount: 0, rows: [] };
    }

    m = /^CREATE (?:UNIQUE )?INDEX (IF NOT EXISTS )?([a-z_]+) ON ([a-z_]+)/i.exec(norm);
    if (m) {
      const [, guard, index, table] = m;
      if (!state.tables.has(table)) throw new Error(`relation "${table}" does not exist`);
      if (state.indexes.has(index)) {
        if (!guard) throw new Error(`relation "${index}" already exists`);
        return { rowCount: 0, rows: [] };
      }
      state.indexes.add(index);
      return { rowCount: 0, rows: [] };
    }

    if (/^SELECT COUNT/i.test(norm)) {
      if (!state.tables.has('generated_questions')) {
        throw new Error('relation "generated_questions" does not exist');
      }
      return { rows: [{ cnt: '0' }] };
    }

    throw new Error(`fake-postgres: unsupported statement: ${norm.slice(0, 70)}`);
  };

  return {
    state,
    statements,
    /** Each call yields a DISTINCT pool object over the SAME database. */
    newPool: () => ({ query, on() {} }),
  };
}

/**
 * One boot, end to end: real gates → real scheduler → real runner → spy Gemini.
 * The ONLY thing a caller varies is the environment.
 */
function bootHarness(env, { topUpIntervalMs = 86_400_000, stubMode = false } = {}) {
  const gemini = geminiSpy();
  const db = fakePostgres();
  const clock = fakeClock();
  const logs = [];
  const saved = [];

  const runner = createWarmPoolRunner({
    callGemini: gemini.fn,
    saveToPool: async (...args) => { saved.push(args); },
    GEMINI_MODEL: 'gemini-2.5-flash',
    createPgPool: async () => db.newPool(),
  });

  const gates = resolveWarmPoolGates({ env, stubMode, topUpIntervalMs });
  gates.logLines.forEach((l) => logs.push(l));

  let running = false;
  const timers = scheduleWarmPool({
    gates,
    // index.cjs wraps identically; the test adds only a tiny topic list so the
    // control case is one chapter rather than the whole registry.
    runWarmPool: (opts) => runner.runWarmPool({
      ...opts,
      delayMs: 0,
      topicKeys: { mathsTopicKeys: ['Real Numbers'], scienceTopicKeys: [] },
    }),
    isRunning: () => running,
    setRunning: (v) => { running = v; },
    log: (l) => logs.push(l),
    logError: (l, d) => logs.push(`${l} ${d}`),
    setTimeoutFn: clock.setTimeoutFn,
    setIntervalFn: clock.setIntervalFn,
  });

  return { gemini, db, clock, logs, gates, timers, saved };
}

/* ══ 1 · THE GATE HOLDS — ZERO GEMINI CALLS AT BOOT ════════════════════════ */

test('assertion 1 — DATABASE_URL set, no opt-in: boot makes ZERO Gemini calls', async () => {
  const h = bootHarness({ DATABASE_URL: 'postgres://user:pw@host:5432/db' });

  assert.equal(h.gates.databaseConfigured, true, 'CONTROL: the database IS configured');
  assert.equal(h.gates.stubMode, false, 'CONTROL: Gemini credentials ARE present');
  assert.equal(h.gates.startupPrewarmArmed, false);
  assert.equal(h.gates.recurringTopUpArmed, false);

  // Nothing armed means nothing to fire — and firing anyway must stay silent.
  assert.equal(h.clock.timeouts.length, 0, 'no startup timer was armed');
  assert.equal(h.clock.intervals.length, 0, 'no recurring timer was armed');
  h.clock.fireAll();
  await drain();

  assert.equal(h.gemini.calls.length, 0, 'ZERO Gemini calls at boot');
  assert.equal(h.db.statements.length, 0, 'the warm runner never even touched the database');
  assert.equal(h.saved.length, 0, 'nothing was written to the pool');
});

test('assertion 1b — WARM_POOL_TOP_UP_INTERVAL_MS=0 alone (the 2026-08-05 configuration) is no longer the whole brake, and the master gate closes it', async () => {
  // The exact configuration that ran up a bill: the interval brake applied,
  // nothing else. Under the old code the startup pre-warm fired regardless.
  const h = bootHarness({ DATABASE_URL: 'postgres://x' }, { topUpIntervalMs: 0 });

  h.clock.fireAll();
  await drain();

  assert.equal(h.gemini.calls.length, 0);
  assert.equal(h.gates.startupPrewarmArmed, false, 'the startup path is closed by WARM_POOL_ENABLED, not by the interval');
});

/* ══ 2 · THE CONTROL — WITHOUT IT, ASSERTION 1 IS VACUOUS ══════════════════ */

test('assertion 2 (CONTROL) — with the opt-in set, the SAME harness runs the pre-warm and Gemini IS called', async () => {
  const h = bootHarness({ DATABASE_URL: 'postgres://x', WARM_POOL_ENABLED: 'true' });

  assert.equal(h.gates.startupPrewarmArmed, true);
  assert.equal(h.clock.timeouts.length, 1, 'exactly one startup timer armed');
  assert.equal(h.clock.timeouts[0].ms, STARTUP_PREWARM_DELAY_MS);

  h.clock.timeouts[0].fn();
  // The real runner sleeps between combos, so wait for the run rather than
  // draining microtasks only.
  await new Promise((r) => setTimeout(r, 1200));

  assert.ok(h.gemini.calls.length > 0, `the armed pre-warm called Gemini (${h.gemini.calls.length} calls)`);
  const prompt = JSON.stringify(h.gemini.calls[0].contents);
  assert.match(prompt, /Real Numbers/, 'and it was generating questions for a real chapter');
  assert.ok(h.saved.length > 0, 'and it wrote generated questions to the pool');
  assert.ok(
    h.db.statements.some((s) => /CREATE TABLE IF NOT EXISTS generated_questions/i.test(s)),
    'the run ensured its own schema before counting'
  );
});

/* ══ 3 · THE RECURRING TOP-UP IS INDEPENDENTLY GATED ═══════════════════════ */

test('assertion 3 — the recurring top-up is gated independently of the startup pre-warm', async () => {
  // (a) master ON, interval 0 → startup armed, recurring NOT.
  const a = bootHarness({ DATABASE_URL: 'postgres://x', WARM_POOL_ENABLED: '1' }, { topUpIntervalMs: 0 });
  assert.equal(a.gates.startupPrewarmArmed, true);
  assert.equal(a.gates.recurringTopUpArmed, false);
  assert.equal(a.clock.intervals.length, 0, 'no recurring timer');
  assert.equal(a.clock.timeouts.length, 1, 'CONTROL: the startup timer IS armed in this case');

  // (b) master OFF, interval 24 h → NEITHER. The interval cannot open the gate.
  const b = bootHarness({ DATABASE_URL: 'postgres://x' }, { topUpIntervalMs: 86_400_000 });
  assert.equal(b.gates.recurringTopUpArmed, false);
  assert.equal(b.clock.intervals.length, 0);

  // (c) both → both armed, and firing the interval really starts a run.
  const c = bootHarness({ DATABASE_URL: 'postgres://x', WARM_POOL_ENABLED: 'yes' }, { topUpIntervalMs: 3_600_000 });
  assert.equal(c.gates.recurringTopUpArmed, true);
  assert.equal(c.clock.intervals.length, 1);
  assert.equal(c.clock.intervals[0].ms, 3_600_000);
  assert.equal(c.clock.intervals[0].unrefed, true, 'the recurring timer does not hold the process open');

  c.clock.intervals[0].fn();
  await new Promise((r) => setTimeout(r, 1200));
  assert.ok(c.gemini.calls.length > 0, 'CONTROL: the armed recurring path does call Gemini');
});

test('the opt-in allowlist rejects everything that is not an explicit yes', () => {
  for (const yes of ['1', 'true', 'TRUE', ' yes ', 'on', 'enabled']) {
    assert.equal(isTruthyFlag(yes), true, `${JSON.stringify(yes)} arms`);
  }
  for (const no of [undefined, null, '', '0', 'false', 'off', 'no', 'maybe', '2', 'disabled']) {
    assert.equal(isTruthyFlag(no), false, `${JSON.stringify(no)} does NOT arm`);
  }
});

/* ══ 4 · THE BOOT LOG NAMES EACH PATH AND ITS STATE ════════════════════════ */

const PATHS = ['startup-prewarm', 'recurring-top-up', 'admin-endpoint'];

test('assertion 4 — the boot log names every path that can reach Gemini, with its state', () => {
  const closed = resolveWarmPoolGates({
    env: { DATABASE_URL: 'postgres://x' },
    stubMode: false,
    topUpIntervalMs: 86_400_000,
  });

  for (const name of PATHS) {
    const line = closed.logLines.find((l) => l.includes(name));
    assert.ok(line, `the log names the "${name}" path`);
    assert.match(line, /\bDISABLED\b/, `"${name}" is reported DISABLED`);
    assert.match(line, /—\s+\S/, `"${name}" says WHY it is disabled`);
  }
  assert.ok(
    closed.logLines.some((l) => l.includes('no unattended question generation is scheduled')),
    'and the summary states the conclusion in one line'
  );
  assert.ok(
    !closed.logLines.some((l) => /\bARMED\b/.test(l)),
    'nothing is reported ARMED while nothing is armed'
  );

  // CONTROL — the same lines must flip, or "DISABLED" is just a constant.
  const open = resolveWarmPoolGates({
    env: { DATABASE_URL: 'postgres://x', WARM_POOL_ENABLED: 'true', WARM_POOL_ADMIN_SECRET: 's3cret' },
    stubMode: false,
    topUpIntervalMs: 86_400_000,
  });
  for (const name of PATHS) {
    const line = open.logLines.find((l) => l.includes(name));
    assert.ok(line, `CONTROL: the log still names "${name}"`);
    assert.match(line, /\bARMED\b/, `CONTROL: "${name}" reports ARMED when it is`);
  }
  assert.ok(
    open.logLines.some((l) => l.includes('AI SPEND WARNING') && l.includes('startup-prewarm') && l.includes('recurring-top-up')),
    'CONTROL: an armed boot says so loudly, and lists which paths'
  );
});

test('assertion 4b — the log never announces one gate holding while another fires', () => {
  // The 2026-08-05 shape: recurring disabled, startup running. If that state is
  // ever reachable again the summary line must NAME the startup path.
  const g = resolveWarmPoolGates({
    env: { DATABASE_URL: 'postgres://x', WARM_POOL_ENABLED: 'true' },
    stubMode: false,
    topUpIntervalMs: 0,
  });
  const recurring = g.logLines.find((l) => l.includes('recurring-top-up'));
  assert.match(recurring, /DISABLED/);
  const summary = g.logLines[g.logLines.length - 1];
  assert.match(summary, /AI SPEND WARNING/);
  assert.match(summary, /startup-prewarm/);
  assert.ok(!summary.includes('recurring-top-up'), 'and it does not claim a closed path is armed');
});

/* ══ 5 · THE MIGRATION ═════════════════════════════════════════════════════ */

test('assertion 5 — the migration creates generated_questions with every column the live server uses', async () => {
  const db = fakePostgres();
  const ok = await ensureGeneratedQuestionsTable(db.newPool(), { log() {}, warn() {} });

  assert.equal(ok, true);
  const cols = db.state.tables.get('generated_questions');
  assert.ok(cols, 'the table exists');
  for (const col of REQUIRED_COLUMNS) {
    assert.ok(cols.has(col), `column ${col} exists`);
  }
  assert.ok(
    db.state.indexes.has('generated_questions_topic_subject_hash_uniq'),
    'the unique index saveToPool\'s ON CONFLICT target requires exists'
  );
});

test('assertion 5b — the migration is idempotent: a second run over the same database changes nothing and throws nothing', async () => {
  const db = fakePostgres();

  await ensureGeneratedQuestionsTable(db.newPool(), { log() {}, warn() {} });
  const afterFirst = {
    cols: [...db.state.tables.get('generated_questions')].sort(),
    indexes: [...db.state.indexes].sort(),
  };
  const firstRunStatements = db.statements.length;

  // A DISTINCT pool object, so the WeakSet memo cannot be what makes this pass:
  // the DDL really is re-issued against a database that already has the table.
  const second = await ensureGeneratedQuestionsTable(db.newPool(), { log() {}, warn() {} });

  assert.equal(second, true, 'the second run succeeded');
  assert.equal(db.statements.length, firstRunStatements * 2, 'CONTROL: the DDL really was re-issued, not memoised away');
  assert.deepEqual([...db.state.tables.get('generated_questions')].sort(), afterFirst.cols);
  assert.deepEqual([...db.state.indexes].sort(), afterFirst.indexes);

  for (const statement of DDL_STATEMENTS) {
    assert.match(statement, /IF NOT EXISTS/i, `every DDL statement is guarded: ${statement.slice(0, 48)}`);
  }
});

test('assertion 5c (CONTROL) — the fake Postgres really does reject a non-idempotent repeat', async () => {
  const db = fakePostgres();
  const pool = db.newPool();
  await pool.query('CREATE TABLE IF NOT EXISTS t_control (id SERIAL PRIMARY KEY)');
  await assert.rejects(
    () => pool.query('CREATE TABLE t_control (id SERIAL PRIMARY KEY)'),
    /already exists/,
    'without IF NOT EXISTS the harness fails — so 5b is a real check'
  );
});

/* ══ 6 · A CLEAN BOOT WITH THE GATE CLOSED AND NO DATABASE ═════════════════ */

test('assertion 6 — with no database and no opt-in, boot arms nothing, throws nothing, and holds no timer open', async () => {
  const h = bootHarness({});

  assert.equal(h.gates.startupPrewarmArmed, false);
  assert.equal(h.gates.recurringTopUpArmed, false);
  assert.equal(h.timers.startupTimer, null);
  assert.equal(h.timers.topUpTimer, null);
  h.clock.fireAll();
  await drain();
  assert.equal(h.gemini.calls.length, 0);

  // And the schema helper degrades quietly rather than throwing at boot.
  const warnings = [];
  const delete_ = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const ok = await ensureGeneratedQuestionsTable(undefined, { log() {}, warn: (m) => warnings.push(m) });
    assert.equal(ok, false);
    assert.ok(warnings.some((w) => /no DATABASE_URL/.test(w)), 'and it says why');
  } finally {
    if (delete_ !== undefined) process.env.DATABASE_URL = delete_;
  }
});

/* ══ 7 · THE STUDENT-TRIGGERED PATHS ARE UNTOUCHED ═════════════════════════ */

const SERVER_DIR = path.resolve(__dirname, '..');
const readServer = (rel) => fs.readFileSync(path.join(SERVER_DIR, rel), 'utf8');

test('assertion 7 — nothing student-triggered is affected by the gate', () => {
  const gateSymbols = /WARM_POOL_ENABLED|resolveWarmPoolGates|scheduleWarmPool|ensureGeneratedQuestionsTable/;

  for (const rel of ['routes/checkSolution.cjs', 'routes/stepSolution.cjs']) {
    assert.ok(
      !gateSymbols.test(readServer(rel)),
      `${rel} does not reference the warm-pool gate at all`
    );
  }

  const index = readServer('index.cjs');
  // CONTROL: the matcher CAN fire — index.cjs is the one file that does wire it.
  assert.match(index, gateSymbols, 'CONTROL: the matcher fires on the file that does wire the gate');

  // The dispatch lines themselves, not the CORS allowlist that also names them.
  assert.ok(index.includes("req.url === '/api/check-solution'"), '/api/check-solution still dispatched');
  assert.ok(index.includes("req.url === '/api/step-solution'"), '/api/step-solution still dispatched');

  // The gate is armed from exactly one place, and it is the boot callback.
  const callSites = index.match(/\bscheduleWarmPool\s*\(/g) || [];
  assert.equal(callSites.length, 1, 'scheduleWarmPool is invoked exactly once');
  const listenIdx = index.indexOf('server.listen(');
  assert.ok(listenIdx > 0 && index.indexOf('scheduleWarmPool(') > listenIdx, 'and only inside server.listen');
});
