'use strict';
// lib/redact.cjs — every string the golden harness prints or writes passes through here.
// The key values are read from the process environment at call time and NEVER returned,
// logged or stored; only their replacement marker is.

const KEY_ENV_NAMES = ['API_KEY', 'AI_INTEGRATIONS_GEMINI_API_KEY', 'GEMINI_API_KEY'];

function secretValues() {
  return KEY_ENV_NAMES.map((k) => String(process.env[k] || '')).filter((v) => v.length >= 8);
}

function redact(input) {
  let t = typeof input === 'string' ? input : JSON.stringify(input);
  if (t === undefined) return t;
  for (const v of secretValues()) {
    t = t.split(v).join('<REDACTED>');
    const b = Buffer.from(v).toString('base64');
    t = t.split(b).join('<REDACTED>');
  }
  return t;
}

module.exports = { redact, KEY_ENV_NAMES };
