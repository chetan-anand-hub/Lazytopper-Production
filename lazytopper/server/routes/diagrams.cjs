function createDiagramRoutes(deps) {
  const {
    sendJson,
    readJson,
    callGemini,
    callClaude,
    GEMINI_MODEL,
    CLAUDE_MODEL_SONNET,
    STUB_MODE,
    HAS_ANTHROPIC_PROXY,
  } = deps;

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
    if (STUB_MODE) {
      return sendJson(res, 200, { ok: true, svg: null });
    }
    try {
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

      const contents = [{ role: 'user', parts: [{ text: diagramPrompt }] }];
      const geminiResult = await callGemini(GEMINI_MODEL, contents, {
        temperature: 0.3,
        maxOutputTokens: 2000,
      });
      const text = String(geminiResult?.text || '');
      if (!text || text.includes('NO_DIAGRAM') || !text.includes('<svg')) {
        return sendJson(res, 200, { ok: true, svg: null });
      }
      const svgMatch = text.match(/<svg[\s\S]*?<\/svg>/i);
      if (!svgMatch) {
        return sendJson(res, 200, { ok: true, svg: null });
      }
      let svg = svgMatch[0];
      svg = svg.replace(/<script[\s\S]*?<\/script>/gi, '');
      svg = svg.replace(/on\w+="[^"]*"/gi, '');
      return sendJson(res, 200, { ok: true, svg });
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
          maxTokens: 4096,
          temperature: 0.4,
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

      return sendJson(res, 200, {
        ok: true,
        html,
        provider: HAS_ANTHROPIC_PROXY ? 'claude' : 'gemini',
        model: HAS_ANTHROPIC_PROXY ? CLAUDE_MODEL_SONNET : GEMINI_MODEL,
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
