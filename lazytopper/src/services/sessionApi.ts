import { type User, onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, setDoc, updateDoc, type Firestore } from "firebase/firestore";
import { authClient, firestoreDb } from "./firebaseClient";
import type { SessionItem } from "./sessionTypes";
import { generateDailyMix } from "./dailyMixGenerator";

export type SessionKind = "daily_mix" | "chapter" | "hpq" | "revision" | "mock";
export type SessionSubjectId = "maths" | "science";
export type SessionVibe = "low" | "high";

export interface SessionDoc {
  sessionId: string;
  createdAt: number;
  updatedAt: number;
  owner: string;
  kind: SessionKind;
  subjectId: SessionSubjectId;
  chapterId?: string;
  vibe: SessionVibe;
  items: SessionItem[];
  cursor: number;
  completed: boolean;
  answers?: Record<string, string>;
  metrics?: {
    attempts: number;
    correct: number;
  };
}

export interface StartSessionRequest {
  kind: SessionKind;
  subjectId?: SessionSubjectId;
  chapterId?: string;
  vibe?: SessionVibe;
}

export interface StartSessionResponse {
  ok: boolean;
  sessionId: string;
  session: SessionDoc;
}

export interface GetSessionResponse {
  ok: boolean;
  session: SessionDoc;
}

export interface SubmitSessionResponse {
  ok: boolean;
  feedback: {
    ok: boolean;
    correct: boolean;
    score: number;
    expected: string;
    missingKeywords: string[];
    nextCursor: number;
    completed: boolean;
  };
  session: SessionDoc;
}

export const SESSION_AUTH_TIMEOUT = "SESSION_AUTH_TIMEOUT" as const;
export const SESSION_AUTH_UNAVAILABLE = "SESSION_AUTH_UNAVAILABLE" as const;
export const SESSION_FIRESTORE_UNAVAILABLE = "SESSION_FIRESTORE_UNAVAILABLE" as const;
export const SESSION_NOT_FOUND = "SESSION_NOT_FOUND" as const;

export type SessionApiErrorCode =
  | typeof SESSION_AUTH_TIMEOUT
  | typeof SESSION_AUTH_UNAVAILABLE
  | typeof SESSION_FIRESTORE_UNAVAILABLE
  | typeof SESSION_NOT_FOUND;

type SessionApiError = Error & {
  code: SessionApiErrorCode;
  cause?: unknown;
};

type TranscriptRole = "system" | "student";
type TranscriptKind = "session_start" | "answer_submission" | "feedback";
type LocalAuthSession = {
  uid?: string;
  isLocalSession?: boolean;
};
type LocalSessionMap = Record<string, SessionDoc>;

interface TranscriptMessageDoc {
  messageId: string;
  sessionId: string;
  itemId: string;
  role: TranscriptRole;
  kind: TranscriptKind;
  content: string;
  score?: number;
  correct?: boolean;
  missingKeywords?: string[];
  cursor?: number;
  completed?: boolean;
  createdAt: number;
}

const LOCAL_AUTH_KEY = "lazytopper.auth.local.v1";
const LOCAL_SESSION_KEY = "lazytopper.session.local.v1";

function readLocalAuthSession(): LocalAuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalAuthSession;
    if (!parsed || typeof parsed.uid !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function readLocalSessions(): LocalSessionMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LocalSessionMap;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeLocalSessions(value: LocalSessionMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(value));
  } catch {
    // ignore local persistence failures
  }
}

function buildSessionItems(req: StartSessionRequest): SessionItem[] {
  const subjectId = req.subjectId || "maths";
  const subject: "Maths" | "Science" = subjectId === "science" ? "Science" : "Maths";
  const chapterId = req.chapterId || "";
  const topicKey = chapterId.replace(/^\d+-\w+-/, "") || "triangles";
  const vibe = req.vibe || "high";

  try {
    const mixItems = generateDailyMix({
      grade: 10,
      subject,
      topic: topicKey,
      seedKey: `session-${Date.now()}`,
      count: 6,
      intensity: vibe === "high" ? "hard" : "normal",
    });

    return mixItems.map((item) => ({
      id: item.id,
      itemType: (item.type === "question" ? "practice_question" : item.type === "video" ? "concept_micro" : "revision_card") as SessionItem["itemType"],
      title: item.title,
      description: item.description,
      payload: item.payload,
    }));
  } catch {
    const chapterLabel = topicKey.replace(/[-_]+/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    const questionDifficulty = vibe === "high" ? "Medium/Hard" : "Easy/Medium";
    return [
      {
        id: `concept-${topicKey}-${Date.now()}`,
        itemType: "concept_micro" as const,
        title: `Concept: ${chapterLabel}`,
        description: `Understand ${chapterLabel} with one quick explanation before practice.`,
        payload: { topicKey, subject, mode: "concept" },
      },
      {
        id: `q1-${topicKey}-${Date.now()}`,
        itemType: "practice_question" as const,
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
        id: `q2-${topicKey}-${Date.now()}`,
        itemType: "practice_question" as const,
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
        id: `revision-${topicKey}-${Date.now()}`,
        itemType: "revision_card" as const,
        title: `Revision Card: ${chapterLabel}`,
        description: `Revise key formulas, diagram labels, and exam patterns for ${chapterLabel}.`,
        payload: { topicKey, subject, mode: "revision" },
      },
    ];
  }
}

function buildSessionDoc(
  req: StartSessionRequest,
  owner: string,
  sessionId: string,
  now: number
): SessionDoc {
  return {
    sessionId,
    createdAt: now,
    updatedAt: now,
    owner,
    kind: req.kind,
    subjectId: req.subjectId || "maths",
    chapterId: req.chapterId,
    vibe: req.vibe || "high",
    items: buildSessionItems(req),
    cursor: 0,
    completed: false,
    answers: {},
    metrics: { attempts: 0, correct: 0 },
  };
}

function applyAnswerToSession(session: SessionDoc, itemId: string, answer: string) {
  const currentById = session.items.find((item) => item.id === itemId);
  const cursorIndex = Math.max(0, Math.min(session.items.length - 1, Number(session.cursor || 0)));
  const currentItem = currentById || session.items[cursorIndex] || null;
  if (!currentItem) {
    throw createSessionError(SESSION_NOT_FOUND, "Session item not found.");
  }

  const itemData = currentItem as unknown as Record<string, unknown>;
  const payload = (itemData.payload || {}) as Record<string, unknown>;
  const expectedRaw =
    itemData.answer ??
    itemData.correctAnswer ??
    payload.answer ??
    payload.correctAnswer ??
    payload.expected ??
    "";
  const expected = String(expectedRaw || "See explanation");

  const normalizedAnswer = String(answer || "").trim().toLowerCase();
  const normalizedExpected = String(expectedRaw || "").trim().toLowerCase();
  const correct = normalizedExpected ? normalizedAnswer === normalizedExpected : normalizedAnswer.length > 0;
  const score = correct ? 1 : 0;
  const missingKeywords: string[] = [];

  const previousCursor = Number(session.cursor || 0);
  const nextCursor = previousCursor + 1;
  const completed = nextCursor >= session.items.length;
  const answers = { ...(session.answers || {}), [currentItem.id]: String(answer || "") };
  const attempts = Number(session.metrics?.attempts || 0) + 1;
  const totalCorrect = Number(session.metrics?.correct || 0) + (correct ? 1 : 0);
  const updatedAt = Date.now();

  const updatedSession: SessionDoc = {
    ...session,
    answers,
    cursor: nextCursor,
    completed,
    updatedAt,
    metrics: {
      attempts,
      correct: totalCorrect,
    },
  };

  return {
    currentItem,
    previousCursor,
    updatedSession,
    feedback: {
      ok: true,
      correct,
      score,
      expected,
      missingKeywords,
      nextCursor,
      completed,
    },
  };
}

function createSessionError(
  code: SessionApiErrorCode,
  message: string,
  cause?: unknown
): SessionApiError {
  const error = new Error(message) as SessionApiError;
  error.name = "SessionApiError";
  error.code = code;
  if (cause !== undefined) {
    error.cause = cause;
  }
  return error;
}

function generateId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function requireFirestore(): Firestore {
  if (!firestoreDb) {
    throw createSessionError(
      SESSION_FIRESTORE_UNAVAILABLE,
      "Firestore is not initialized. Check VITE_FIREBASE_* configuration."
    );
  }
  return firestoreDb;
}

export function getSessionApiErrorCode(error: unknown): SessionApiErrorCode | null {
  const code = (error as { code?: unknown })?.code;
  if (
    code === SESSION_AUTH_TIMEOUT ||
    code === SESSION_AUTH_UNAVAILABLE ||
    code === SESSION_FIRESTORE_UNAVAILABLE ||
    code === SESSION_NOT_FOUND
  ) {
    return code;
  }
  return null;
}

async function waitForUser(timeoutMs = 4000): Promise<User> {
  if (!authClient) {
    throw createSessionError(
      SESSION_AUTH_UNAVAILABLE,
      "Firebase Auth is unavailable. Sign-in is required for cloud sessions."
    );
  }

  const auth = authClient;
  const existing = auth.currentUser;
  if (existing) return existing;

  return new Promise<User>((resolve, reject) => {
    let settled = false;
    let unsubscribe = () => {};
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsubscribe();
      reject(
        createSessionError(
          SESSION_AUTH_TIMEOUT,
          `User session not ready within ${timeoutMs}ms. Please retry.`
        )
      );
    }, timeoutMs);

    unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (!user || settled) return;
        settled = true;
        clearTimeout(timer);
        unsubscribe();
        resolve(user);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        unsubscribe();
        reject(
          createSessionError(
            SESSION_AUTH_UNAVAILABLE,
            "Firebase Auth failed while waiting for user session.",
            error
          )
        );
      }
    );
  });
}

async function writeTranscript(
  uid: string,
  sessionId: string,
  payload: Omit<TranscriptMessageDoc, "messageId" | "createdAt" | "sessionId">
): Promise<void> {
  const db = requireFirestore();
  const messageId = `msg_${generateId()}`;
  const messagesRef = collection(db, "learnerProfiles", uid, "sessions", sessionId, "messages");
  await setDoc(doc(messagesRef, messageId), {
    messageId,
    sessionId,
    createdAt: Date.now(),
    ...payload,
  } as TranscriptMessageDoc);
}

async function upsertLearnerProfileBaseline(db: Firestore, uid: string, now: number): Promise<void> {
  const profileRef = doc(db, "learnerProfiles", uid);
  await setDoc(
    profileRef,
    {
      uid,
      updatedAt: new Date(now).toISOString(),
      profileSource: "sessionApi",
    },
    { merge: true }
  );
}

export async function startSession(req: StartSessionRequest): Promise<StartSessionResponse> {
  const sessionId = generateId();
  const now = Date.now();
  const localAuth = readLocalAuthSession();
  const owner = localAuth?.uid || "local";
  const newSession = buildSessionDoc(req, owner, sessionId, now);

  const sessions = readLocalSessions();
  sessions[sessionId] = newSession;
  writeLocalSessions(sessions);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await waitForUser(2000);
    const db = requireFirestore();
    const uid = String(user?.uid || "").trim();
    if (uid) {
      newSession.owner = uid;
      sessions[sessionId] = newSession;
      writeLocalSessions(sessions);
      const sessionRef = doc(db, "learnerProfiles", uid, "sessions", sessionId);
      const sessionPath = `learnerProfiles/${uid}/sessions/${sessionId}`;
      const cloudOps = [
        { label: "upsertBaseline", fn: () => upsertLearnerProfileBaseline(db, uid, now) },
        { label: `setDoc(${sessionPath})`, fn: () => setDoc(sessionRef, newSession) },
        {
          label: `writeTranscript(${sessionPath}/session_start)`,
          fn: () =>
            writeTranscript(uid, sessionId, {
              itemId: "session_start",
              role: "system",
              kind: "session_start",
              content: `Session started (${newSession.kind}) for ${newSession.subjectId}.`,
              cursor: 0,
              completed: false,
            }),
        },
      ];
      const results = await Promise.allSettled(cloudOps.map((op) => op.fn()));
      results.forEach((result, i) => {
        if (result.status === "rejected") {
          console.warn("[sessionApi] startSession cloud op failed", {
            uid,
            op: cloudOps[i].label,
            error: result.reason,
          });
        }
      });
    }
  } catch (error) {
    console.warn("[sessionApi] startSession cloud sync failed — local session still created", { sessionId, error });
  }

  return { ok: true, sessionId, session: newSession };
}

export async function getSession(sessionId: string): Promise<GetSessionResponse> {
  const localSession = readLocalSessions()[sessionId];
  if (localSession) {
    return { ok: true, session: localSession };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await waitForUser(2000);
    const db = requireFirestore();
    const uid = String(user?.uid || "").trim();
    if (uid) {
      const ref = doc(db, "learnerProfiles", uid, "sessions", sessionId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const session = snap.data() as SessionDoc;
        const sessions = readLocalSessions();
        sessions[sessionId] = session;
        writeLocalSessions(sessions);
        return { ok: true, session };
      }
    }
  } catch (error) {
    console.warn("[sessionApi] getSession cloud fetch failed", { sessionId, error });
  }

  throw createSessionError(SESSION_NOT_FOUND, "Session not found.");
}

export async function submitSessionAnswer(
  sessionId: string,
  itemId: string,
  answer: string
): Promise<SubmitSessionResponse> {
  const sessions = readLocalSessions();
  const localSession = sessions[sessionId];
  if (!localSession) {
    throw createSessionError(SESSION_NOT_FOUND, "Session not found.");
  }

  const { currentItem, previousCursor, updatedSession, feedback } = applyAnswerToSession(
    localSession,
    itemId,
    answer
  );

  sessions[sessionId] = updatedSession;
  writeLocalSessions(sessions);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await waitForUser(2000);
    const db = requireFirestore();
    const uid = String(user?.uid || "").trim();
    if (uid) {
      const sessionRef = doc(db, "learnerProfiles", uid, "sessions", sessionId);
      const sessionPath = `learnerProfiles/${uid}/sessions/${sessionId}`;
      const cloudOps = [
        {
          label: `updateDoc(${sessionPath})`,
          fn: () =>
            updateDoc(sessionRef, {
              answers: updatedSession.answers,
              cursor: updatedSession.cursor,
              completed: updatedSession.completed,
              metrics: updatedSession.metrics,
              updatedAt: updatedSession.updatedAt,
            }),
        },
        {
          label: `writeTranscript(${sessionPath}/answer_submission)`,
          fn: () =>
            writeTranscript(uid, sessionId, {
              itemId: currentItem.id,
              role: "student",
              kind: "answer_submission",
              content: String(answer || ""),
              cursor: previousCursor,
              completed: updatedSession.completed,
            }),
        },
        {
          label: `writeTranscript(${sessionPath}/feedback)`,
          fn: () =>
            writeTranscript(uid, sessionId, {
              itemId: currentItem.id,
              role: "system",
              kind: "feedback",
              content: feedback.correct ? "Correct path." : "Needs improvement.",
              score: feedback.score,
              correct: feedback.correct,
              missingKeywords: feedback.missingKeywords,
              cursor: feedback.nextCursor,
              completed: feedback.completed,
            }),
        },
      ];
      const results = await Promise.allSettled(cloudOps.map((op) => op.fn()));
      results.forEach((result, i) => {
        if (result.status === "rejected") {
          console.warn("[sessionApi] submitSessionAnswer cloud op failed", {
            uid,
            sessionId,
            itemId,
            op: cloudOps[i].label,
            error: result.reason,
          });
        }
      });
    }
  } catch (error) {
    console.warn("[sessionApi] submitSessionAnswer cloud sync failed — local answer still saved", { sessionId, itemId, error });
  }

  return {
    ok: true,
    feedback,
    session: updatedSession,
  };
}
