const {
  createSession,
  getSession,
  submitSessionAnswer,
} = require("./sessionStore.cjs");

function resolveOwner(req) {
  const explicit = String(req?.headers?.["x-lazytopper-uid"] || "").trim();
  if (explicit) return explicit;
  return "anon";
}

function ensureOwnerAccess(session, owner) {
  if (!session) return false;
  if (!session.owner || session.owner === "anon") return true;
  if (owner === "anon") return true;
  return String(session.owner) === String(owner);
}

function startSessionHandler(req, body) {
  const owner = resolveOwner(req);
  const doc = createSession({
    owner,
    kind: body?.kind,
    subjectId: body?.subjectId,
    chapterId: body?.chapterId,
    vibe: body?.vibe,
  });
  return {
    status: 200,
    body: {
      ok: true,
      sessionId: doc.sessionId,
      session: doc,
    },
  };
}

function getSessionHandler(req, sessionId) {
  const owner = resolveOwner(req);
  const session = getSession(sessionId);
  if (!session) {
    return {
      status: 404,
      body: { ok: false, error: "Session not found." },
    };
  }
  if (!ensureOwnerAccess(session, owner)) {
    return {
      status: 403,
      body: { ok: false, error: "Session access denied." },
    };
  }
  return {
    status: 200,
    body: {
      ok: true,
      session,
    },
  };
}

function submitSessionHandler(req, sessionId, body) {
  const owner = resolveOwner(req);
  const session = getSession(sessionId);
  if (!session) {
    return {
      status: 404,
      body: { ok: false, error: "Session not found." },
    };
  }
  if (!ensureOwnerAccess(session, owner)) {
    return {
      status: 403,
      body: { ok: false, error: "Session access denied." },
    };
  }
  const itemId = String(body?.itemId || "").trim();
  if (!itemId) {
    return {
      status: 400,
      body: { ok: false, error: "itemId is required." },
    };
  }
  const answer = String(body?.answer || "");
  const result = submitSessionAnswer(sessionId, itemId, answer);
  if (!result || !result.result?.ok) {
    return {
      status: 400,
      body: {
        ok: false,
        error: result?.result?.error || "Failed to submit session answer.",
      },
    };
  }
  return {
    status: 200,
    body: {
      ok: true,
      feedback: result.result,
      session: result.session,
    },
  };
}

module.exports = {
  startSessionHandler,
  getSessionHandler,
  submitSessionHandler,
};
