function createHttpUtils(corsOrigin) {
  function sendJson(res, status, body) {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigin,
    });
    res.end(JSON.stringify(body));
  }

  function sendJsonWithHeaders(res, status, body, extraHeaders) {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigin,
      ...(extraHeaders || {}),
    });
    res.end(JSON.stringify(body));
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

module.exports = { createHttpUtils, extractJsonObjectFromText, readJson };
