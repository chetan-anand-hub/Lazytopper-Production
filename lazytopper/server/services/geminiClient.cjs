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

    const primaryUrl = proxyUrl || directUrl;
    const primaryKey = HAS_REPLIT_PROXY
      ? REPLIT_GEMINI_API_KEY
      : GEMINI_API_KEY;

    let { response, rawText } = await doRequest(true, primaryUrl, primaryKey);
    if (
      !response.ok &&
      config &&
      typeof config.responseMimeType === 'string' &&
      config.responseMimeType.trim()
    ) {
      const retryMimeRegex =
        /responseMimeType|response_mime_type|Unknown name.*responseMimeType/i;
      if (retryMimeRegex.test(rawText)) {
        ({ response, rawText } = await doRequest(
          false,
          primaryUrl,
          primaryKey
        ));
      }
    }

    if (!response.ok && HAS_REPLIT_PROXY && DIRECT_GEMINI_API_KEY) {
      console.warn(
        `[callGemini] Proxy failed (${response.status}), falling back to direct Gemini key`
      );
      ({ response, rawText } = await doRequest(
        true,
        directUrl,
        DIRECT_GEMINI_API_KEY
      ));
      if (
        !response.ok &&
        config &&
        typeof config.responseMimeType === 'string' &&
        config.responseMimeType.trim()
      ) {
        const retryMimeRegex =
          /responseMimeType|response_mime_type|Unknown name.*responseMimeType/i;
        if (retryMimeRegex.test(rawText)) {
          ({ response, rawText } = await doRequest(
            false,
            directUrl,
            DIRECT_GEMINI_API_KEY
          ));
        }
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

    const streamUrl = proxyStreamUrl || directStreamUrl;
    const streamKey = HAS_REPLIT_PROXY ? REPLIT_GEMINI_API_KEY : GEMINI_API_KEY;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(streamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': streamKey },
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

    if (!response.ok) {
      clearTimeout(timeoutId);
      const errText = await response.text().catch(() => '');
      if (HAS_REPLIT_PROXY && DIRECT_GEMINI_API_KEY && proxyStreamUrl) {
        console.warn(`[callGeminiStream] Proxy failed (${response.status}), falling back to direct`);
        const directController = new AbortController();
        const directTimeoutId = setTimeout(() => directController.abort(), GEMINI_TIMEOUT_MS);
        let directResp;
        try {
          directResp = await fetch(directStreamUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': DIRECT_GEMINI_API_KEY },
            body: JSON.stringify(body),
            signal: directController.signal,
          });
        } catch (fallbackErr) {
          clearTimeout(directTimeoutId);
          throw fallbackErr;
        }
        if (!directResp.ok) {
          clearTimeout(directTimeoutId);
          const fallbackErrText = await directResp.text().catch(() => '');
          const e = new Error(`Gemini stream failed: ${directResp.status} - ${fallbackErrText}`);
          e.status = directResp.status;
          throw e;
        }
        yield* _drainGeminiSSE(directResp.body, directController, directTimeoutId);
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
