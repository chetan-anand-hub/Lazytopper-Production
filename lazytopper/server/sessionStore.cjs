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
  const chapterLabel = chapterId || "selected chapter";
  const vibe = String(input.vibe || "high").toLowerCase() === "low" ? "low" : "high";
  const hardMode = vibe === "high";
  const questionDifficulty = hardMode ? "Medium/Hard" : "Easy/Medium";

  const base = [
    {
      id: "lesson_1",
      itemType: "concept_micro",
      title: `Learn: ${chapterLabel}`,
      description: "Read one focused concept card before solving.",
      payload: { chapterId, vibe },
    },
    {
      id: "worked_1",
      itemType: "worked_example",
      title: "Worked Example",
      description: "Follow the board-writing sequence and identify each reason.",
      payload: { chapterId },
    },
    {
      id: "question_1",
      itemType: "practice_question",
      title: `${questionDifficulty} Practice`,
      description: "Write Given, To Find/Prove, criterion/law, and final conclusion.",
      payload: {
        expectedAnswer:
          "Given, To Find/Prove, Criterion/Theorem/Law, Therefore/Hence",
        keywords: ["given", "to", "criterion", "theorem", "law", "therefore", "hence"],
      },
    },
    {
      id: "mistake_1",
      itemType: "mistake_fix_micro",
      title: "Mistake Fix",
      description: "Review your last mistake and attempt one corrected step.",
      payload: { chapterId },
    },
    {
      id: "tip_1",
      itemType: "exam_tip_card",
      title: "Exam Tip",
      description: "Score safely by naming the exact theorem/law before applying it.",
      payload: { chapterId },
    },
    {
      id: "done_1",
      itemType: "mastery_quiz",
      title: "Session Complete",
      description: "Quick recap: what improved and what to do next.",
      payload: { chapterId },
    },
  ];

  if (kind === "chapter") return base;
  if (kind === "hpq") {
    return base.map((item, idx) =>
      idx === 2
        ? {
            ...item,
            title: "HPQ Drill",
            description: "Solve one high-probability board-style question.",
          }
        : item
    );
  }
  return base;
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
