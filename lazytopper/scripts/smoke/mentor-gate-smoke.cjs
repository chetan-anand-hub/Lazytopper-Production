const MIN_GAP_MS = 800;

function getRetryAfterMsFromInputs(header, data) {
  if (header != null) {
    const sec = Number(header);
    if (Number.isFinite(sec) && sec > 0) return sec * 1000;
  }
  const jsonMs = Number(data?.retryAfterMs ?? data?.data?.retryAfterMs);
  if (Number.isFinite(jsonMs) && jsonMs > 0) return jsonMs;
  const jsonSec = Number(data?.retryAfterSec ?? data?.data?.retryAfterSec ?? data?.retry_after_sec);
  if (Number.isFinite(jsonSec) && jsonSec > 0) return jsonSec * 1000;
  return null;
}

function getRandomBackoffMs() {
  return 10_000 + Math.floor(Math.random() * 20_001);
}

function createGate() {
  return {
    inFlightKeys: new Set(),
    inFlightIntent: null,
    lastRequestAt: 0,
    cooldownUntil: null,
  };
}

function shouldStartRequest(state, intent, key, now) {
  if (state.inFlightKeys.has(key)) return false;
  if (state.inFlightIntent === intent) return false;
  if (now - state.lastRequestAt < MIN_GAP_MS) return false;
  if (state.cooldownUntil && now < state.cooldownUntil) return false;
  state.inFlightKeys.add(key);
  state.inFlightIntent = intent;
  state.lastRequestAt = now;
  return true;
}

function finishRequest(state, intent, key) {
  state.inFlightKeys.delete(key);
  if (state.inFlightIntent === intent) state.inFlightIntent = null;
}

function run() {
  const state = createGate();
  const now = Date.now();
  const key = 'teach:gAA';

  if (!shouldStartRequest(state, 'teach', key, now)) {
    console.error('FAIL: first request should start');
    process.exit(1);
  }

  if (shouldStartRequest(state, 'teach', key, now + 100)) {
    console.error('FAIL: duplicate in-flight request should be blocked');
    process.exit(1);
  }

  finishRequest(state, 'teach', key);

  const headerMs = getRetryAfterMsFromInputs('15', null);
  if (headerMs !== 15000) {
    console.error('FAIL: Retry-After header parsing failed');
    process.exit(1);
  }

  const jsonMs = getRetryAfterMsFromInputs(null, { retryAfterSec: 12 });
  if (jsonMs !== 12000) {
    console.error('FAIL: retryAfterSec parsing failed');
    process.exit(1);
  }

  const backoff = getRandomBackoffMs();
  if (backoff < 10_000 || backoff > 30_000) {
    console.error('FAIL: random backoff outside 10-30s range');
    process.exit(1);
  }

  state.cooldownUntil = now + backoff;
  if (shouldStartRequest(state, 'teach', key, now + 500)) {
    console.error('FAIL: cooldown should block new requests');
    process.exit(1);
  }

  console.log('PASS mentor-gate-smoke');
}

run();
