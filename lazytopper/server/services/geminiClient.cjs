function createGeminiClient(cfg) {
  const {
    GEMINI_API_KEY,
    HAS_REPLIT_PROXY,
    REPLIT_GEMINI_BASE_URL,
    REPLIT_GEMINI_API_KEY,
    DIRECT_GEMINI_API_KEY,
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

  return { callGemini };
}

module.exports = { createGeminiClient };
