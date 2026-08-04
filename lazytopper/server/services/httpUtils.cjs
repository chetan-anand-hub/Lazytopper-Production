/**
 * ────────────────────────────────────────────────────────────────────────────
 * ERROR-DETAIL REDACTION  (CodeQL js/stack-trace-exposure)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ★ THE LEAK, TRACED — not guessed. CodeQL's flow for this alert runs:
 *     index.cjs `err` -> `String(err)` -> `err?.message || String(err)`
 *       -> `{ ok, error, details }` -> httpUtils `body` -> `JSON.stringify(body)`
 * i.e. a caught error's own text is serialised straight into a 500 body under a
 * `details` key. Node's error text routinely carries absolute paths (`ENOENT
 * ... /app/lazytopper/server/...`), module specifiers and dependency names, so
 * the response hands an attacker the file layout for free.
 *
 * ★ WHY THE FIX IS HERE, AT THE SINK, AND NOT AT THAT CALL SITE. Two reasons,
 * and the second is the one that matters. First, `sendJson` is the single exit
 * every route body passes through, so one guard covers all of them. Second, a
 * per-call-site fix is only ever as complete as the grep behind it: the same
 * `details:` shape is emitted from FOUR places today (`index.cjs` x2,
 * `diagrams.cjs`, `moreLikeThis.cjs`), and the next one added would ship
 * unguarded. A sink-side guard cannot be forgotten by a new caller.
 *
 * ★★ THE RESPONSE CONTRACT IS PRESERVED EXACTLY. `aiClient.ts` parses this body
 * and reads `error`, `message`, `feature`, `tier`, `trialEndedAt`, `class`,
 * `resetAt`. NONE of those are touched — only the diagnostic keys below are, and
 * `details` is read by no client in the repo (verified by grep over
 * `lazytopper/src/`). A 402 therefore still carries `error: "premium_required"`
 * and its student-facing `message`, which is what the paywall copy renders.
 */
const DIAGNOSTIC_KEYS = new Set(['details', 'detail', 'stack', 'stackTrace', 'trace', 'errorStack']);

/** What replaces a diagnostic value. Names nothing: no path, no module, no version. */
const REDACTED_DETAIL = 'Details omitted. See server logs.';

/** A V8 stack frame: `\n    at fn (/abs/path/file.cjs:1:2)`. */
const STACK_FRAME = /\n\s+at\s+.*/g;

/**
 * Strip stack frames from any string that carries them.
 *
 * This is the belt to the `DIAGNOSTIC_KEYS` braces: it catches a stack that
 * arrives under a key nobody thought to list. A genuine student-facing string
 * can never contain a V8 frame, so this cannot corrupt real copy.
 */
function stripStackFrames(text) {
  // `.replace` with a /g regex always scans from 0 and resets `lastIndex`;
  // `.test` with a /g regex does NOT, and would alternate true/false across
  // calls. Hence replace-then-compare rather than test-then-replace.
  const cleaned = text.replace(STACK_FRAME, '');
  return cleaned === text ? text : cleaned.trim();
}

/**
 * Walk a response body and neutralise error internals.
 * Structure and every non-diagnostic key are returned untouched.
 */
function redactErrorDetails(value, depth = 0) {
  if (depth > 8) return value;
  if (typeof value === 'string') return stripStackFrames(value);
  if (Array.isArray(value)) return value.map((item) => redactErrorDetails(item, depth + 1));
  if (!value || typeof value !== 'object') return value;

  const out = {};
  for (const [key, child] of Object.entries(value)) {
    out[key] = DIAGNOSTIC_KEYS.has(key) ? REDACTED_DETAIL : redactErrorDetails(child, depth + 1);
  }
  return out;
}

function createHttpUtils(corsOrigin) {
  function sendJson(res, status, body) {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigin,
    });
    res.end(JSON.stringify(redactErrorDetails(body)));
  }

  function sendJsonWithHeaders(res, status, body, extraHeaders) {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigin,
      ...(extraHeaders || {}),
    });
    res.end(JSON.stringify(redactErrorDetails(body)));
  }

  return { sendJson, sendJsonWithHeaders };
}

function extractJsonObjectFromText(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const parseObject = (value) => {
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const direct = parseObject(trimmed);
  if (direct) return direct;

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const sliced = trimmed.slice(firstBrace, lastBrace + 1);
    const slicedParsed = parseObject(sliced);
    if (slicedParsed) return slicedParsed;
  }

  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch && fencedMatch[1]) {
    const fencedParsed = parseObject(fencedMatch[1].trim());
    if (fencedParsed) return fencedParsed;
  }

  return null;
}

function readJson(req, maxBytes = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        reject(e);
      }
    });
  });
}

module.exports = {
  createHttpUtils,
  extractJsonObjectFromText,
  readJson,
  redactErrorDetails,
  DIAGNOSTIC_KEYS,
  REDACTED_DETAIL,
};
