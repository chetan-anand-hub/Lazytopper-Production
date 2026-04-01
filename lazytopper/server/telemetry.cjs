const counts = new Map();

function increment(event, value = 1) {
  if (!event) return;
  const current = counts.get(event) || 0;
  const next = current + (Number.isFinite(Number(value)) ? Number(value) : 1);
  counts.set(event, next);
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[telemetry] ${event}=${next}`);
  }
}

function snapshot() {
  const result = {};
  counts.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

module.exports = {
  increment,
  snapshot,
};
