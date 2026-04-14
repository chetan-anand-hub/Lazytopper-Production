function createClaudeClient(cfg) {
  const {
    HAS_ANTHROPIC_PROXY,
    REPLIT_ANTHROPIC_BASE_URL,
    REPLIT_ANTHROPIC_API_KEY,
    ANTHROPIC_TIMEOUT_MS,
    CLAUDE_MODEL_SONNET,
    CLAUDE_MODEL_HAIKU,
    HAS_REPLIT_PROXY,
    GEMINI_MODEL,
    MAX_HISTORY_TURNS,
  } = cfg;

  async function callClaude(model, messages, systemPrompt, config) {
    if (!HAS_ANTHROPIC_PROXY) {
      throw new Error(
        'No Anthropic auth available. Set AI_INTEGRATIONS_ANTHROPIC_BASE_URL + AI_INTEGRATIONS_ANTHROPIC_API_KEY (Replit proxy).'
      );
    }

    const body = {
      model,
      max_tokens:
        config && typeof config.maxTokens === 'number'
          ? config.maxTokens
          : 1024,
      system: systemPrompt || '',
      messages: (messages || [])
        .map((m) => ({
          role: m.role === 'model' ? 'assistant' : m.role || 'user',
          content:
            typeof m.content === 'string'
              ? m.content
              : m.parts
                ? m.parts.map((p) => p.text).join('\n')
                : '',
        }))
        .filter((m) => m.content.trim()),
    };
    if (config && typeof config.temperature === 'number') {
      body.temperature = config.temperature;
    }

    const url = `${REPLIT_ANTHROPIC_BASE_URL}/v1/messages`;
    const controller = new AbortController();
    const effectiveTimeout =
      config && typeof config.timeoutMs === 'number' && config.timeoutMs > 0
        ? config.timeoutMs
        : ANTHROPIC_TIMEOUT_MS;
    const timeoutId = setTimeout(
      () => controller.abort(),
      effectiveTimeout
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': REPLIT_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const rawText = await response.text();

      if (!response.ok) {
        const err = new Error(
          `Claude request failed: ${response.status} ${response.statusText} - ${rawText}`
        );
        err.status = response.status;
        err.body = rawText;
        throw err;
      }

      const data = JSON.parse(rawText || '{}');
      const text = (data.content || [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('\n')
        .trim();

      return { text, raw: data };
    } catch (err) {
      if (err && err.name === 'AbortError') {
        const timeoutErr = new Error(
          `Claude request timed out after ${effectiveTimeout}ms`
        );
        timeoutErr.status = 504;
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function toClaudeMessages(messages) {
    const out = [];
    if (!Array.isArray(messages)) return out;
    const truncated =
      messages.length > MAX_HISTORY_TURNS * 2
        ? messages.slice(-(MAX_HISTORY_TURNS * 2))
        : messages;
    for (const m of truncated) {
      if (!m || !m.role) continue;
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      const text = typeof m.content === 'string' ? m.content : '';
      if (!text.trim()) continue;
      out.push({ role, content: text });
    }
    return out;
  }

  function selectModelForRequest(mode, userQuery) {
    const sonnetModes = [
      'visual',
      'generate_visual',
      'concept_teach_visual',
      'concept_teach',
      'diagram',
    ];
    if (sonnetModes.includes(mode) && HAS_ANTHROPIC_PROXY) {
      return { provider: 'claude', model: CLAUDE_MODEL_SONNET };
    }

    // All non-visual tutor text routes to Gemini (gemini-2.5-pro).
    // The prior Claude Haiku branch for short "simple factual" queries was
    // intentionally removed (Task #85) — Gemini Pro handles all chat queries.
    return { provider: 'gemini', model: GEMINI_MODEL };
  }

  return { callClaude, toClaudeMessages, selectModelForRequest };
}

module.exports = { createClaudeClient };
