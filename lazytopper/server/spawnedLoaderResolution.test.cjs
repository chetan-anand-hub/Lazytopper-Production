/**
 * spawnedLoaderResolution.test — a package a CHILD PROCESS loads with `--import`
 * must be declared by the package that child's CWD points at.
 *
 * ★★ THE FAILURE THIS SUITE EXISTS TO PREVENT, stated first because everything
 * below is downstream of it:
 *
 *     Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'tsx'
 *                                   imported from /app/lazytopper/
 *
 * `artifacts/api-server/src/index.ts` spawns the solution-cache warmup as
 * `node --import tsx/esm <script>` with `cwd: lazytopperDir`. Node resolves an
 * `--import` specifier against the process CWD — note the trailing slash in the
 * error: the resolution base is a DIRECTORY, not a file. pnpm gives every
 * workspace package an isolated `node_modules`, so `tsx` being declared in
 * `artifacts/api-server` and `scripts` put it in THEIR trees and nowhere else.
 * From `lazytopper/` it was unresolvable, and the warmup child died every time it
 * ran — silently, because the parent pipes the child's stderr to `logger.warn`
 * and never exits.
 *
 * ★★ WHY NOTHING CAUGHT IT. This is a CROSS-PACKAGE, SPAWN-TIME coupling: the
 * flag lives in `artifacts/`, the cwd points at `lazytopper/`, and the dependency
 * has to be declared in a third file. No import graph contains that edge, so
 * `tsc`, `madge`, `dependency-cruiser` and every static gate are blind to it by
 * construction — and nothing in CI builds the container, so no gate here can see
 * a boot-time failure at all. The only thing that finds it is RUNNING the
 * invocation, which is what this file does.
 *
 * ★ THIS SUITE READS `artifacts/api-server/src/index.ts` ON PURPOSE. A test that
 * only asserted "lazytopper declares tsx" would keep passing after someone
 * changed the loader or the cwd, i.e. it would guard a fact that had stopped
 * being the relevant one. The drift check below fails LOUDLY in that case and
 * tells the reader to come back here.
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

/** lazytopper/ — the cwd the warmup child is actually given. */
const LAZYTOPPER_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(LAZYTOPPER_DIR, '..');
const API_SERVER_INDEX = path.join(REPO_ROOT, 'artifacts', 'api-server', 'src', 'index.ts');
const WARMUP_SCRIPT = path.join(LAZYTOPPER_DIR, 'scripts', 'warmup-solution-cache.mjs');

/** Run `node --import <specifier> ...` from `cwd` and hand back the raw result. */
function runWithLoader(specifier, cwd, code) {
  return spawnSync(
    process.execPath,
    ['--import', specifier, '--input-type=module', '-e', code || ''],
    { cwd, encoding: 'utf8' }
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   1 · THE PRODUCTION INVOCATION — executed, not inferred
   ══════════════════════════════════════════════════════════════════════════════ */

test('the warmup loader `tsx/esm` RESOLVES from lazytopper/ — the exact production invocation', () => {
  const res = runWithLoader('tsx/esm', LAZYTOPPER_DIR, '');
  assert.equal(
    res.status,
    0,
    `node --import tsx/esm failed with cwd=${LAZYTOPPER_DIR}.\n` +
      `This is the production crash. Declare tsx in lazytopper/package.json.\n` +
      `stderr:\n${res.stderr}`
  );
});

test('CONTROL: the probe reports a FAILURE when the loader is unresolvable', () => {
  // ★ Without this, the assertion above is indistinguishable from a dead probe:
  //   a spawn that always returned 0 would look exactly like a pass.
  //   A deliberately bogus specifier makes the failure path observable and is
  //   environment-independent — no real package can accidentally satisfy it.
  const res = runWithLoader('tsx-not-a-real-package-9f3a2c/esm', LAZYTOPPER_DIR, '');
  assert.notEqual(res.status, 0, 'a bogus loader must NOT exit 0 — the probe cannot fail');
  assert.match(
    res.stderr,
    /ERR_MODULE_NOT_FOUND/,
    `the probe must surface the same error class as production. stderr:\n${res.stderr}`
  );
});

test('the loader can actually TRANSPILE a repo .ts from lazytopper/ — resolution is not enough', () => {
  // Resolving the loader package and being able to load TypeScript through it are
  // two different claims. The warmup script's whole reason for carrying `--import`
  // is a `.ts` dynamic import, so exercise that, not just the package lookup.
  const res = runWithLoader(
    'tsx/esm',
    LAZYTOPPER_DIR,
    "const m = await import('./src/services/studentDataMap.ts');" +
      'if (!Array.isArray(m.STUDENT_DATA_MAP) || m.STUDENT_DATA_MAP.length === 0)' +
      " throw new Error('map did not load through the ESM loader');"
  );
  assert.equal(res.status, 0, `tsx/esm could not transpile a repo .ts.\nstderr:\n${res.stderr}`);
});

/* ══════════════════════════════════════════════════════════════════════════════
   2 · DRIFT — keep this suite pointed at the invocation that actually ships
   ══════════════════════════════════════════════════════════════════════════════ */

test('every `--import` loader the api-server spawns is declared by the package at that spawn cwd', () => {
  assert.ok(
    fs.existsSync(API_SERVER_INDEX),
    `cannot read ${API_SERVER_INDEX} — this suite guards a coupling defined there, ` +
      'so an unreadable spawn site is a FAILURE, never a skip'
  );
  const src = fs.readFileSync(API_SERVER_INDEX, 'utf8');

  // Enumerate the loader specifiers rather than spot-checking one: a SECOND
  // loader added tomorrow must turn this red instead of shipping unguarded.
  const specifiers = [...src.matchAll(/["']--import["']\s*,\s*["']([^"']+)["']/g)].map((m) => m[1]);
  assert.deepEqual(
    [...new Set(specifiers)].sort(),
    ['tsx/esm'],
    'the set of --import loaders spawned by the api-server changed. Each one must be ' +
      'declared in the package.json of the directory its spawn uses as cwd — add a case above.'
  );

  // The cwd half of the coupling. If this moves, the resolution base moves with
  // it and the test above is asserting the wrong directory.
  assert.match(
    src,
    /cwd:\s*lazytopperDir/,
    'the warmup spawn no longer uses `cwd: lazytopperDir` — re-derive which package ' +
      'must declare the loader before trusting this suite'
  );

  const pkg = JSON.parse(fs.readFileSync(path.join(LAZYTOPPER_DIR, 'package.json'), 'utf8'));
  const declared = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  assert.ok(
    Object.prototype.hasOwnProperty.call(declared, 'tsx'),
    'lazytopper/package.json must DECLARE tsx. Resolution that works only by accidental ' +
      'hoisting is not a contract, and pnpm isolation means it will not work at all.'
  );
});

test('the warmup script still needs a TypeScript loader — otherwise the dependency can go', () => {
  // ★ The honest inverse of the fix: if nobody imports a .ts from that ESM script
  //   any more, `--import tsx/esm` and this whole dependency are dead weight and
  //   should be REMOVED rather than kept declared forever.
  assert.ok(fs.existsSync(WARMUP_SCRIPT), `missing ${WARMUP_SCRIPT}`);
  const src = fs.readFileSync(WARMUP_SCRIPT, 'utf8');
  assert.match(
    src,
    /await import\([^)]*\.ts['"]\)/,
    'warmup-solution-cache.mjs no longer imports a .ts — if that is deliberate, drop ' +
      '`--import tsx/esm` from the api-server spawn and tsx from lazytopper/package.json'
  );
});
