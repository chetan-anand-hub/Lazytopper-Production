const fs = require('fs');

function tryParseJsonStrict(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function normalizeLines(value) {
  const raw = Array.isArray(value) ? value : [];
  const seen = new Set();
  const lines = [];
  raw.forEach((item) => {
    const text = String(item || '').replace(/\s+/g, ' ').trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    lines.push(text);
  });
  return lines;
}

function mergeLines(primary, fallback, min) {
  const merged = normalizeLines([...(primary || []), ...(fallback || [])]);
  if (merged.length >= min) return merged;
  const fallbackLines = normalizeLines(fallback || []);
  const combined = normalizeLines([...merged, ...fallbackLines]);
  if (combined.length >= min) return combined;
  const pad = [
    'Use a clear similarity criterion (AA/SAS/SSS).',
    'Match corresponding sides and angles carefully.',
    'State the final similarity conclusion explicitly.',
  ];
  return normalizeLines([...combined, ...pad]).slice(0, Math.max(min, combined.length));
}

function isObjectiveType(qType, section) {
  const t = (qType || '').toLowerCase();
  const s = (section || '').toUpperCase();
  return t === 'mcq' || t === 'assertionreason' || t === 'assertion-reason' || t === 'ar' || t === 'objective' || t === 'fillblank' || s === 'A';
}

function persistTutorFeedback(payload, feedbackDir, feedbackFile) {
  const helpful = payload?.helpful;
  if (typeof helpful !== 'boolean') throw new Error('helpful must be boolean');

  const commentRaw = typeof payload?.comment === 'string' ? payload.comment : '';
  const comment = commentRaw.slice(0, 1000);
  const record = {
    ts: new Date().toISOString(),
    helpful,
    comment,
    context: {
      topicKey: payload?.topicKey || null,
      nodeId: payload?.nodeId || null,
      responseId: payload?.responseId || null,
      tab: payload?.tab || null,
      mode: payload?.mode || null,
      grade: payload?.grade || null,
      subject: payload?.subject || null,
    },
    meta: {
      userAgent: payload?.userAgent || null,
      clientTs: payload?.clientTs || null,
    },
  };

  fs.mkdirSync(feedbackDir, { recursive: true });
  fs.appendFileSync(feedbackFile, JSON.stringify(record) + '\n');
  return record;
}

function isNoProviderEnabled() {
  const flag = String(process.env.LT_NO_PROVIDER || '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(flag);
}

let mentorSeedCache = undefined;
function loadTrianglesMentorSeed() {
  if (mentorSeedCache !== undefined) return mentorSeedCache;
  const path = require('path');
  const jsonPath = path.join(__dirname, '../../src/data/_final/maths-triangles/mentor.json');
  const tsPath = path.join(__dirname, '../../src/data/_finalGenerated/triangles.mentor.ts');
  try {
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, 'utf8');
      mentorSeedCache = JSON.parse(raw);
      return mentorSeedCache;
    }
  } catch (err) {
    console.warn('[stub] Failed to read mentor.json:', err?.message || err);
  }
  try {
    if (fs.existsSync(tsPath)) {
      const mod = require(tsPath);
      mentorSeedCache = mod?.trianglesMentor || mod?.default || null;
      return mentorSeedCache;
    }
  } catch (err) {
    console.warn('[stub] Failed to load triangles.mentor.ts:', err?.message || err);
  }
  mentorSeedCache = null;
  return mentorSeedCache;
}

module.exports = {
  tryParseJsonStrict,
  normalizeLines,
  mergeLines,
  isObjectiveType,
  persistTutorFeedback,
  isNoProviderEnabled,
  loadTrianglesMentorSeed,
};
