const fs = require('fs');
const path = require('path');

function createDiagramRoutes(deps) {
  const {
    sendJson,
    readJson,
    callGemini,
    callClaude,
    GEMINI_MODEL,
    GEMINI_TUTOR_MODEL,
    CLAUDE_MODEL_SONNET,
    STUB_MODE,
    HAS_ANTHROPIC_PROXY,
    VISUALS_DIR,
    MANIFEST_PATH,
  } = deps;

  function toSlug(str) {
    return String(str || '').toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function isValidHtml(html) {
    const s = (html || '').trim();
    const hasDoctype = /^<!DOCTYPE\s+html/i.test(s) || s.startsWith('<html');
    const hasClosingHtml = /<\/html>/i.test(s);
    const minLength = s.length > 500;
    return hasDoctype && hasClosingHtml && minLength;
  }

  function saveVisualToDatabase({ html, subject, topic, concept, provider, model }) {
    if (!VISUALS_DIR || !MANIFEST_PATH) return false;

    if (!isValidHtml(html)) {
      console.warn('[generate-visual] HTML failed validity check (missing doctype/</html>/min-length), not saving');
      return false;
    }

    try {
      const safeRoot = path.resolve(VISUALS_DIR);
      const subjectSlug = toSlug(subject) || 'maths';
      const topicSlug = toSlug(topic) || 'general';
      const conceptSlug = toSlug(concept || topic) || 'concept';
      const fsPath = path.resolve(safeRoot, subjectSlug, topicSlug, `${conceptSlug}.html`);

      const relFromVisuals = path.relative(safeRoot, fsPath);
      const filePathUrl = '/app/visuals/' + relFromVisuals.split(path.sep).join('/');
      const parts = relFromVisuals.replace('.html', '').split(path.sep);
      const slug = parts[parts.length - 1] || 'concept';
      const chapterSlug = parts.length > 1 ? parts[1] : '';

      let manifest = { version: 1, generatedAt: new Date().toISOString(), concepts: {} };
      try {
        const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
        manifest = JSON.parse(raw);
        if (!manifest.concepts) manifest.concepts = {};
      } catch (_) {}

      const existing = manifest.concepts[slug];
      if (existing && existing.aiGenerated !== true && fs.existsSync(fsPath)) {
        console.log(`[generate-visual] skip: pre-built visual exists, will not overwrite: ${fsPath}`);
        return false;
      }

      fs.mkdirSync(path.dirname(fsPath), { recursive: true });

      const tmpHtml = fsPath + '.tmp';
      fs.writeFileSync(tmpHtml, html, 'utf8');
      fs.renameSync(tmpHtml, fsPath);

      const sizeBytes = Buffer.byteLength(html, 'utf8');

      manifest.concepts[slug] = {
        subject: subjectSlug,
        chapter: chapterSlug,
        conceptName: concept || topic,
        slug,
        filePath: filePathUrl,
        sizeBytes,
        generatedAt: new Date().toISOString(),
        topic,
        provider,
        model,
        aiGenerated: true,
      };

      const tmpManifest = MANIFEST_PATH + '.tmp';
      fs.writeFileSync(tmpManifest, JSON.stringify(manifest, null, 2), 'utf8');
      fs.renameSync(tmpManifest, MANIFEST_PATH);

      console.log(`[generate-visual] saved to database: ${fsPath} (${Math.round(sizeBytes / 1024)}KB)`);
      return filePathUrl;
    } catch (err) {
      console.warn('[generate-visual] failed to save to database:', err?.message);
      return false;
    }
  }

  async function handleGenerateDiagram(req, res) {
    let reqJson;
    try {
      reqJson = await readJson(req);
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    }
    const questionText = String(reqJson?.questionText || '').trim();
    if (!questionText || questionText.length < 10) {
      return sendJson(res, 400, { ok: false, error: 'questionText too short' });
    }
    const compareMode =
      String(req.url || '').includes('compare=true') ||
      String(reqJson?.compare || '') === 'true';

    if (STUB_MODE) {
      return sendJson(res, 200, { ok: true, svg: null });
    }

    const diagramPrompt = `You are a CBSE Class 10 educational diagram generator. Given a question, produce a clean SVG diagram that helps a student visualize the concept.

RULES:
- Output ONLY valid SVG markup, nothing else. No markdown, no backticks, no explanation.
- The SVG must have viewBox="0 0 400 280", width="100%", height="auto".
- Use these colors: stroke="#3c3c3c", accent="#0ea5e9", red="#dc2626", green="#22c55e", faint="#94a3b8".
- Label all important parts clearly with <text> elements.
- Keep it simple and educational — like a textbook diagram.
- Do NOT include <script>, <style>, or any interactive elements.
- If the question doesn't warrant a diagram, output exactly: NO_DIAGRAM

Question: ${questionText}`;

    function extractSvg(text) {
      const t = String(text || '');
      if (!t || t.includes('NO_DIAGRAM') || !t.includes('<svg')) return null;
      const m = t.match(/<svg[\s\S]*?<\/svg>/i);
      if (!m) return null;
      let svg = m[0];
      svg = svg.replace(/<script[\s\S]*?<\/script>/gi, '');
      svg = svg.replace(/on\w+="[^"]*"/gi, '');
      return svg || null;
    }

    const geminiModel = GEMINI_TUTOR_MODEL || GEMINI_MODEL;

    async function callGeminiForSvg() {
      const contents = [{ role: 'user', parts: [{ text: diagramPrompt }] }];
      const result = await callGemini(geminiModel, contents, {
        temperature: 0.3,
        maxOutputTokens: 2000,
      });
      return extractSvg(result?.text);
    }

    async function callClaudeForSvg() {
      if (!HAS_ANTHROPIC_PROXY) return null;
      const messages = [{ role: 'user', content: diagramPrompt }];
      const result = await callClaude(CLAUDE_MODEL_SONNET, messages, '', {
        maxTokens: 2000,
        temperature: 0.3,
      });
      return extractSvg(result?.text);
    }

    try {
      if (compareMode) {
        const [claudeSvg, geminiSvg] = await Promise.all([
          callClaudeForSvg().catch((err) => {
            console.warn('[generate-diagram] Claude compare error:', err?.message);
            return null;
          }),
          callGeminiForSvg().catch((err) => {
            console.warn('[generate-diagram] Gemini compare error:', err?.message);
            return null;
          }),
        ]);
        return sendJson(res, 200, {
          ok: true,
          compare: true,
          claude: { svg: claudeSvg, model: CLAUDE_MODEL_SONNET, provider: 'claude' },
          gemini: { svg: geminiSvg, model: geminiModel, provider: 'gemini' },
        });
      }

      if (HAS_ANTHROPIC_PROXY) {
        const claudeSvg = await callClaudeForSvg().catch((err) => {
          console.warn('[generate-diagram] Claude error, falling back to Gemini:', err?.message);
          return null;
        });
        if (claudeSvg) {
          return sendJson(res, 200, {
            ok: true,
            svg: claudeSvg,
            provider: 'claude',
            model: CLAUDE_MODEL_SONNET,
          });
        }
      }

      const geminiSvg = await callGeminiForSvg();
      return sendJson(res, 200, {
        ok: true,
        svg: geminiSvg,
        provider: 'gemini',
        model: geminiModel,
      });
    } catch (err) {
      console.error('[generate-diagram] Error:', err?.message || err);
      return sendJson(res, 200, { ok: true, svg: null });
    }
  }

  async function handleGenerateVisual(req, res) {
    let reqJson;
    try {
      reqJson = await readJson(req);
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    }
    const topic = String(reqJson?.topic || '').trim();
    const concept = String(reqJson?.concept || '').trim();
    const subject = String(reqJson?.subject || 'Maths').trim();
    const grade = Number(reqJson?.grade) || 10;

    if (!topic && !concept) {
      return sendJson(res, 400, { ok: false, error: 'topic or concept is required' });
    }

    if (STUB_MODE && !HAS_ANTHROPIC_PROXY) {
      return sendJson(res, 200, {
        ok: true,
        html: `<div style="padding:20px;font-family:sans-serif;"><h3>${concept || topic}</h3><p>Visual explainer stub — AI provider not configured.</p></div>`,
        provider: 'stub',
      });
    }

    const visualSystemPrompt = `You are a CBSE Class ${grade} ${subject} visual explainer.
Create a single, self-contained HTML document that teaches a concept through an interactive visual.

CRITICAL RULES:
- Output ONLY valid HTML. No markdown, no backticks, no explanation outside the HTML.
- The HTML must be fully self-contained: inline CSS via <style>, inline JS via <script>.
- DO NOT fetch any external resources (no CDN links, no images, no fonts, no external JS/CSS).
- Use clean, modern CSS with a white background.
- Make it interactive where appropriate (sliders, toggles, hover effects, click-to-reveal).
- Use SVG or Canvas for diagrams — no external images.
- Include clear labels, step-by-step explanations, and CBSE exam tips.
- Keep the total output under 4000 tokens.
- The visual should be educational, accurate, and exam-focused.
- Use these accent colors: primary=#3b82f6, success=#22c55e, warning=#f59e0b, error=#ef4444.
- All text must be readable (min 14px body, 18px headings).
- Include a title bar showing the concept name.`;

    const userPrompt = `Create an interactive visual explainer for:
Topic: ${topic}
Concept: ${concept || topic}
Subject: ${subject}
Grade: Class ${grade} CBSE

The visual should help a student understand this concept deeply and remember it for board exams.`;

    try {
      let result;
      if (HAS_ANTHROPIC_PROXY) {
        const messages = [{ role: 'user', content: userPrompt }];
        result = await callClaude(CLAUDE_MODEL_SONNET, messages, visualSystemPrompt, {
          maxTokens: 8192,
          temperature: 0.4,
          timeoutMs: 120000,
        });
      } else {
        const contents = [
          { role: 'user', parts: [{ text: visualSystemPrompt + '\n\n' + userPrompt }] },
        ];
        result = await callGemini(GEMINI_MODEL, contents, {
          temperature: 0.4,
          maxOutputTokens: 4096,
        });
      }

      let html = String(result?.text || '').trim();

      const htmlMatch = html.match(/<!DOCTYPE html[\s\S]*<\/html>/i) || html.match(/<html[\s\S]*<\/html>/i);
      if (htmlMatch) {
        html = htmlMatch[0];
      } else if (!html.includes('<') || html.length < 50) {
        return sendJson(res, 200, { ok: false, error: 'AI did not return valid HTML visual', html: null });
      }

      html = html.replace(/<script[^>]*src\s*=\s*["'][^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');
      html = html.replace(/<link[^>]*href\s*=\s*["']https?:\/\/[^"']*["'][^>]*\/?>/gi, '');
      html = html.replace(/@import\s+url\(['"]?https?:\/\/[^)'"]+['"]?\)\s*;?/gi, '');
      html = html.replace(/fetch\s*\(\s*['"`]https?:\/\/[^)]*\)/gi, '/* blocked external fetch */');
      html = html.replace(/new\s+XMLHttpRequest/gi, '/* blocked XHR */');
      html = html.replace(/new\s+WebSocket/gi, '/* blocked WebSocket */');
      html = html.replace(/new\s+EventSource/gi, '/* blocked EventSource */');
      html = html.replace(/navigator\s*\.\s*sendBeacon/gi, '/* blocked sendBeacon */');
      html = html.replace(/document\s*\.\s*createElement\s*\(\s*['"`]script['"`]\s*\)/gi, '/* blocked dynamic script */');
      html = html.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
      html = html.replace(/<iframe[^>]*\/?>/gi, '');

      const providerLabel = HAS_ANTHROPIC_PROXY ? 'claude' : 'gemini';
      const modelLabel = HAS_ANTHROPIC_PROXY ? CLAUDE_MODEL_SONNET : GEMINI_MODEL;

      const savedPath = saveVisualToDatabase({
        html,
        subject,
        topic,
        concept,
        provider: providerLabel,
        model: modelLabel,
      });

      return sendJson(res, 200, {
        ok: true,
        html,
        provider: providerLabel,
        model: modelLabel,
        savedToDatabase: Boolean(savedPath),
        savedPath: savedPath || undefined,
      });
    } catch (err) {
      console.error('[generate-visual] Error:', err?.message || err);
      return sendJson(res, 500, {
        ok: false,
        error: 'Failed to generate visual explainer',
        details: err?.message || String(err),
      });
    }
  }

  return { handleGenerateDiagram, handleGenerateVisual };
}

module.exports = { createDiagramRoutes };
