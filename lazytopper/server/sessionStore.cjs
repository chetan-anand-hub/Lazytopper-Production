const crypto = require("crypto");

const sessionsById = new Map();

function toSubjectId(raw) {
  return String(raw || "").toLowerCase().includes("science") ? "science" : "maths";
}

function createSessionId() {
  try {
    return `sess_${crypto.randomUUID()}`;
  } catch {
    return `sess_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }
}

function buildSessionItems(input) {
  const kind = String(input.kind || "daily_mix").trim();
  const chapterId = String(input.chapterId || "").trim();
  const topicKey = chapterId.replace(/^\d+-\w+-/, "") || "triangles";
  const chapterLabel = topicKey.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const vibe = String(input.vibe || "high").toLowerCase() === "low" ? "low" : "high";
  const hardMode = vibe === "high";
  const questionDifficulty = hardMode ? "Medium/Hard" : "Easy/Medium";
  const subjectId = toSubjectId(input.subjectId);
  const subject = subjectId === "science" ? "Science" : "Maths";

  const items = [
    {
      id: `concept-${topicKey}`,
      itemType: "concept_micro",
      title: `Concept: ${chapterLabel}`,
      description: `Understand ${chapterLabel} with one quick explanation before practice.`,
      payload: { chapterId, topicKey, subject, vibe, mode: "concept" },
    },
    {
      id: `q1-${topicKey}`,
      itemType: "practice_question",
      title: `${questionDifficulty} Practice 1: ${chapterLabel}`,
      description: `Solve a board-style ${chapterLabel} question. Show all steps.`,
      payload: {
        topic: chapterLabel,
        topicKey,
        subject,
        stem: `Solve a board-style ${chapterLabel} question and write the final answer in exam format.`,
        tier: "must-crack",
        mode: "must-crack",
      },
    },
    {
      id: `q2-${topicKey}`,
      itemType: "practice_question",
      title: `${questionDifficulty} Practice 2: ${chapterLabel}`,
      description: `Another board-style ${chapterLabel} question.`,
      payload: {
        topic: chapterLabel,
        topicKey,
        subject,
        stem: `Practice one more board-style ${chapterLabel} question.`,
        tier: "must-crack",
        mode: "must-crack",
      },
    },
    {
      id: `q3-${topicKey}`,
      itemType: "practice_question",
      title: `${questionDifficulty} Practice 3: ${chapterLabel}`,
      description: `Final practice question for ${chapterLabel}.`,
      payload: {
        topic: chapterLabel,
        topicKey,
        subject,
        stem: `Complete one final ${chapterLabel} practice question.`,
        tier: kind === "hpq" ? "must-crack" : "high-roi",
        mode: kind === "hpq" ? "must-crack" : "practice",
      },
    },
    {
      id: `revision-${topicKey}`,
      itemType: "revision_card",
      title: `Revision Card: ${chapterLabel}`,
      description: `Revise key formulas, diagram labels, and exam patterns for ${chapterLabel}.`,
      payload: { chapterId, topicKey, subject, mode: "revision" },
    },
  ];

  return items;
}

function createSession(input) {
  const sessionId = createSessionId();
  const now = Date.now();
  const doc = {
    sessionId,
    createdAt: now,
    updatedAt: now,
    owner: String(input.owner || "anon"),
    kind: String(input.kind || "daily_mix"),
    subjectId: toSubjectId(input.subjectId),
    chapterId: String(input.chapterId || ""),
    vibe: String(input.vibe || "high").toLowerCase() === "low" ? "low" : "high",
    items: buildSessionItems(input),
    cursor: 0,
    completed: false,
    answers: {},
    metrics: {
      attempts: 0,
      correct: 0,
    },
  };
  sessionsById.set(sessionId, doc);
  return doc;
}

function getSession(sessionId) {
  const key = String(sessionId || "").trim();
  if (!key) return null;
  return sessionsById.get(key) || null;
}

function updateSession(sessionId, patch) {
  const existing = getSession(sessionId);
  if (!existing) return null;
  const next = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };
  sessionsById.set(sessionId, next);
  return next;
}

function evaluateAnswer(item, answer) {
  const text = String(answer || "").toLowerCase();
  const keywords = Array.isArray(item?.payload?.keywords)
    ? item.payload.keywords.map((k) => String(k || "").toLowerCase())
    : [];
  if (!keywords.length) {
    return {
      correct: text.trim().length >= 8,
      score: text.trim().length >= 8 ? 1 : 0,
      expected: String(item?.payload?.expectedAnswer || ""),
      missingKeywords: [],
    };
  }
  const missingKeywords = keywords.filter((keyword) => !text.includes(keyword));
  const hit = keywords.length - missingKeywords.length;
  const score = keywords.length ? hit / keywords.length : 0;
  return {
    correct: score >= 0.5,
    score,
    expected: String(item?.payload?.expectedAnswer || ""),
    missingKeywords,
  };
}

function submitSessionAnswer(sessionId, itemId, answer) {
  const session = getSession(sessionId);
  if (!session) return null;
  const id = String(itemId || "").trim();
  const cursor = Number(session.cursor || 0);
  const current = session.items[cursor] || session.items.find((item) => item.id === id) || null;
  if (!current) {
    return {
      session,
      result: {
        ok: false,
        error: "Session item not found.",
      },
    };
  }

  const evalResult = evaluateAnswer(current, answer);
  const answers = {
    ...(session.answers || {}),
    [current.id]: {
      answer: String(answer || ""),
      correct: evalResult.correct,
      score: evalResult.score,
      expected: evalResult.expected,
      missingKeywords: evalResult.missingKeywords,
      at: Date.now(),
    },
  };

  const nextCursor = Math.min(cursor + 1, Math.max(0, session.items.length - 1));
  const completed = nextCursor >= session.items.length - 1;
  const metrics = {
    attempts: Number(session.metrics?.attempts || 0) + 1,
    correct:
      Number(session.metrics?.correct || 0) + (evalResult.correct ? 1 : 0),
  };
  const updated = updateSession(sessionId, {
    answers,
    cursor: nextCursor,
    completed,
    metrics,
  });

  return {
    session: updated,
    result: {
      ok: true,
      correct: evalResult.correct,
      score: evalResult.score,
      expected: evalResult.expected,
      missingKeywords: evalResult.missingKeywords,
      nextCursor,
      completed,
    },
  };
}

module.exports = {
  createSession,
  getSession,
  submitSessionAnswer,
};
