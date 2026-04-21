function createGeminiClient(cfg) {
  const {
    GEMINI_API_KEY,
    HAS_REPLIT_PROXY,
    REPLIT_GEMINI_BASE_URL,
    REPLIT_GEMINI_API_KEY,
    DIRECT_GEMINI_API_KEY,
    GEMINI_TUTOR_MODEL,
    GEMINI_TIMEOUT_MS,
  } = cfg;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function withRetry(fn, maxAttempts = 5) {
    const baseDelayMs = 1000;
    let lastErr;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const status = err && (err.status || err.statusCode);
        if (status === 429) {
          lastErr = err;
          if (attempt < maxAttempts - 1) {
            let delayMs = baseDelayMs * Math.pow(2, attempt);
            const retryAfter = err.retryAfter;
            if (retryAfter) {
              const parsed = parseInt(retryAfter, 10);
              if (!isNaN(parsed)) delayMs = parsed * 1000;
            }
            await sleep(delayMs);
            continue;
          }
        }
        throw err;
      }
    }
    throw lastErr;
  }

  async function callGemini(model, finalContents, config) {
    if (!GEMINI_API_KEY) {
      throw new Error(
        'No Gemini auth available. Set AI_INTEGRATIONS_GEMINI_BASE_URL + AI_INTEGRATIONS_GEMINI_API_KEY (Replit proxy), or AI_PROVIDER=gemini and API_KEY in server/.env.'
      );
    }

    const buildBody = (includeMimeType) => {
      const body = {
        contents: finalContents,
        generationConfig: {
          temperature:
            config && typeof config.temperature === 'number'
              ? config.temperature
              : 0.6,
          maxOutputTokens:
            config && typeof config.maxOutputTokens === 'number'
              ? config.maxOutputTokens
              : 900,
        },
      };
      if (
        includeMimeType &&
        config &&
        typeof config.responseMimeType === 'string' &&
        config.responseMimeType.trim()
      ) {
        body.generationConfig.responseMimeType = config.responseMimeType.trim();
      }
      return body;
    };

    const doRequest = async (includeMimeType, reqUrl, apiKey) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
      try {
        const response = await fetch(reqUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(buildBody(includeMimeType)),
          signal: controller.signal,
        });
        const rawText = await response.text();
        if (response.status === 429) {
          const err = new Error(`Gemini rate limited (429): ${rawText}`);
          err.status = 429;
          err.retryAfter = response.headers.get('Retry-After');
          err.body = rawText;
          throw err;
        }
        return { response, rawText };
      } catch (err) {
        if (err && err.name === 'AbortError') {
          const timeoutErr = new Error(
            `Gemini request timed out after ${GEMINI_TIMEOUT_MS}ms`
          );
          timeoutErr.status = 504;
          throw timeoutErr;
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const proxyUrl = HAS_REPLIT_PROXY
      ? `${REPLIT_GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`
      : null;
    const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const primaryUrl = DIRECT_GEMINI_API_KEY ? directUrl : proxyUrl;
    const primaryKey = DIRECT_GEMINI_API_KEY ? DIRECT_GEMINI_API_KEY : REPLIT_GEMINI_API_KEY;
    const fallbackUrl = DIRECT_GEMINI_API_KEY && HAS_REPLIT_PROXY ? proxyUrl : null;
    const fallbackKey = DIRECT_GEMINI_API_KEY && HAS_REPLIT_PROXY ? REPLIT_GEMINI_API_KEY : null;

    const retryMimeRegex =
      /responseMimeType|response_mime_type|Unknown name.*responseMimeType/i;

    const runWithFallback = async (includeMimeType) => {
      let response, rawText;
      let primaryThrewNon429 = false;

      try {
        ({ response, rawText } = await withRetry(() =>
          doRequest(includeMimeType, primaryUrl, primaryKey)
        ));
      } catch (primaryErr) {
        if (primaryErr.status === 429 || !fallbackUrl) {
          throw primaryErr;
        }
        primaryThrewNon429 = true;
        console.warn(
          `[callGemini] Primary threw (${primaryErr.status || primaryErr.message}), falling back to proxy`
        );
        ({ response, rawText } = await doRequest(includeMimeType, fallbackUrl, fallbackKey));
        return { response, rawText, usedFallback: true };
      }

      return { response, rawText, usedFallback: false };
    };

    let { response, rawText, usedFallback } = await runWithFallback(true);

    if (
      !response.ok &&
      config &&
      typeof config.responseMimeType === 'string' &&
      config.responseMimeType.trim() &&
      retryMimeRegex.test(rawText)
    ) {
      const activeUrl = usedFallback ? fallbackUrl : primaryUrl;
      const activeKey = usedFallback ? fallbackKey : primaryKey;
      if (usedFallback) {
        ({ response, rawText } = await doRequest(false, activeUrl, activeKey));
      } else {
        try {
          ({ response, rawText } = await withRetry(() => doRequest(false, primaryUrl, primaryKey)));
        } catch (retryErr) {
          if (retryErr.status === 429 || !fallbackUrl) throw retryErr;
          console.warn(
            `[callGemini] Primary mime-retry threw, falling back to proxy`
          );
          ({ response, rawText } = await doRequest(false, fallbackUrl, fallbackKey));
          usedFallback = true;
        }
      }
    }

    if (!response.ok && !usedFallback && fallbackUrl) {
      console.warn(
        `[callGemini] Primary returned (${response.status}), falling back to proxy`
      );
      ({ response, rawText } = await doRequest(true, fallbackUrl, fallbackKey));
      if (
        !response.ok &&
        config &&
        typeof config.responseMimeType === 'string' &&
        config.responseMimeType.trim() &&
        retryMimeRegex.test(rawText)
      ) {
        ({ response, rawText } = await doRequest(false, fallbackUrl, fallbackKey));
      }
    }

    if (!response.ok) {
      const err = new Error(
        `Gemini request failed: ${response.status} ${response.statusText} - ${rawText}`
      );
      err.status = response.status;
      err.body = rawText;
      throw err;
    }

    const data = JSON.parse(rawText || '{}');

    const parts =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      Array.isArray(data.candidates[0].content.parts)
        ? data.candidates[0].content.parts
        : [];

    const text = parts
      .map((p) => (p && p.text ? String(p.text) : ''))
      .filter(Boolean)
      .join('\n')
      .trim();

    return { text, raw: data };
  }

  async function* callGeminiStream(model, finalContents, config) {
    if (!GEMINI_API_KEY) {
      throw new Error('No Gemini auth available for streaming.');
    }

    const body = {
      contents: finalContents,
      generationConfig: {
        temperature: config && typeof config.temperature === 'number' ? config.temperature : 0.7,
        maxOutputTokens: config && typeof config.maxOutputTokens === 'number' ? config.maxOutputTokens : 4096,
      },
    };

    const proxyStreamUrl = HAS_REPLIT_PROXY
      ? `${REPLIT_GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`
      : null;
    const directStreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

    const primaryStreamUrl = DIRECT_GEMINI_API_KEY ? directStreamUrl : proxyStreamUrl;
    const primaryStreamKey = DIRECT_GEMINI_API_KEY ? DIRECT_GEMINI_API_KEY : REPLIT_GEMINI_API_KEY;
    const fallbackStreamUrl = DIRECT_GEMINI_API_KEY && HAS_REPLIT_PROXY ? proxyStreamUrl : null;
    const fallbackStreamKey = DIRECT_GEMINI_API_KEY && HAS_REPLIT_PROXY ? REPLIT_GEMINI_API_KEY : null;

    const doStreamFetch = async (url, key) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timeoutId);
        if (err && err.name === 'AbortError') {
          const e = new Error(`Gemini stream timed out after ${GEMINI_TIMEOUT_MS}ms`);
          e.status = 504;
          throw e;
        }
        throw err;
      }
      return { response, controller, timeoutId };
    };

    let primaryResult;
    let usedFallback = false;

    try {
      primaryResult = await withRetry(async () => {
        const result = await doStreamFetch(primaryStreamUrl, primaryStreamKey);
        if (result.response.status === 429) {
          clearTimeout(result.timeoutId);
          const errText = await result.response.text().catch(() => '');
          const err = new Error(`Gemini stream rate limited (429): ${errText}`);
          err.status = 429;
          err.retryAfter = result.response.headers.get('Retry-After');
          throw err;
        }
        return result;
      });
    } catch (primaryErr) {
      if (primaryErr.status === 429 || !fallbackStreamUrl) {
        throw primaryErr;
      }
      console.warn(
        `[callGeminiStream] Primary threw (${primaryErr.status || primaryErr.message}), falling back to proxy`
      );
      primaryResult = await doStreamFetch(fallbackStreamUrl, fallbackStreamKey);
      usedFallback = true;
    }

    let { response, controller, timeoutId } = primaryResult;

    if (!response.ok) {
      clearTimeout(timeoutId);
      const errText = await response.text().catch(() => '');
      if (!usedFallback && fallbackStreamUrl) {
        console.warn(`[callGeminiStream] Primary returned (${response.status}), falling back to proxy`);
        const fallbackResult = await doStreamFetch(fallbackStreamUrl, fallbackStreamKey);
        if (!fallbackResult.response.ok) {
          clearTimeout(fallbackResult.timeoutId);
          const fallbackErrText = await fallbackResult.response.text().catch(() => '');
          const e = new Error(`Gemini stream failed: ${fallbackResult.response.status} - ${fallbackErrText}`);
          e.status = fallbackResult.response.status;
          throw e;
        }
        yield* _drainGeminiSSE(fallbackResult.response.body, fallbackResult.controller, fallbackResult.timeoutId);
        return;
      }
      const e = new Error(`Gemini stream failed: ${response.status} - ${errText}`);
      e.status = response.status;
      throw e;
    }

    yield* _drainGeminiSSE(response.body, controller, timeoutId);
  }

  async function* _drainGeminiSSE(body, controller, timeoutId) {
    const decoder = new TextDecoder();
    const reader = body.getReader();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6).trim();
            if (jsonStr === '[DONE]') return;
            try {
              const parsed = JSON.parse(jsonStr);
              const parts =
                parsed &&
                parsed.candidates &&
                parsed.candidates[0] &&
                parsed.candidates[0].content &&
                Array.isArray(parsed.candidates[0].content.parts)
                  ? parsed.candidates[0].content.parts
                  : [];
              for (const part of parts) {
                if (part && part.text) {
                  yield String(part.text);
                }
              }
            } catch {
              /* skip malformed chunks */
            }
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
      try { reader.releaseLock(); } catch { /* ignore */ }
    }
  }

  return { callGemini, callGeminiStream };
}

module.exports = { createGeminiClient };
