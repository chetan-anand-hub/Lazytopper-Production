import { type User, onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, setDoc, updateDoc, type Firestore } from "firebase/firestore";
import { authClient, firestoreDb } from "./firebaseClient";
import type { SessionItem } from "./sessionTypes";

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

function isLocalSessionMode(): boolean {
  const local = readLocalAuthSession();
  return Boolean(local?.uid && local?.isLocalSession);
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

function buildMockItem(): SessionItem {
  return {
    id: "temp_q_1",
    itemType: "practice_question",
    title: "Placeholder Question",
    description: "Placeholder Question for cloud session continuity verification.",
    payload: {
      question: "Placeholder Question: verify cloud-backed session continuity.",
      options: ["Okay, got it", "Wait, what?"],
      answer: "Okay, got it",
      explanation: "This is a temporary verification item before full content import.",
    },
  };
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
    items: [buildMockItem()],
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

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await waitForUser();
    const db = requireFirestore();
    const uid = String(user?.uid || "").trim();
    if (!uid) {
      throw createSessionError(SESSION_AUTH_UNAVAILABLE, "Signed-in user UID is unavailable.");
    }

    await upsertLearnerProfileBaseline(db, uid, now);

    const newSession = buildSessionDoc(req, uid, sessionId, now);
    const sessionRef = doc(db, "learnerProfiles", uid, "sessions", sessionId);
    await setDoc(sessionRef, newSession);
    await writeTranscript(uid, sessionId, {
      itemId: "session_start",
      role: "system",
      kind: "session_start",
      content: `Session started (${newSession.kind}) for ${newSession.subjectId}.`,
      cursor: 0,
      completed: false,
    });
    return { ok: true, sessionId, session: newSession };
  } catch (error) {
    if (!isLocalSessionMode() || !localAuth?.uid) {
      throw error;
    }
    const localSession = buildSessionDoc(req, String(localAuth.uid), sessionId, now);
    const sessions = readLocalSessions();
    sessions[sessionId] = localSession;
    writeLocalSessions(sessions);
    return { ok: true, sessionId, session: localSession };
  }
}

export async function getSession(sessionId: string): Promise<GetSessionResponse> {
  const localAuth = readLocalAuthSession();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await waitForUser();
    const db = requireFirestore();
    const uid = String(user?.uid || "").trim();
    if (!uid) {
      throw createSessionError(SESSION_AUTH_UNAVAILABLE, "Signed-in user UID is unavailable.");
    }

    const ref = doc(db, "learnerProfiles", uid, "sessions", sessionId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw createSessionError(SESSION_NOT_FOUND, "Session not found.");
    }
    return { ok: true, session: snap.data() as SessionDoc };
  } catch (error) {
    if (!isLocalSessionMode() || !localAuth?.uid) {
      throw error;
    }
    const localSession = readLocalSessions()[sessionId];
    if (!localSession) {
      throw createSessionError(SESSION_NOT_FOUND, "Session not found.");
    }
    return { ok: true, session: localSession };
  }
}

export async function submitSessionAnswer(
  sessionId: string,
  itemId: string,
  answer: string
): Promise<SubmitSessionResponse> {
  const localAuth = readLocalAuthSession();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await waitForUser();
    const db = requireFirestore();
    const uid = String(user?.uid || "").trim();
    if (!uid) {
      throw createSessionError(SESSION_AUTH_UNAVAILABLE, "Signed-in user UID is unavailable.");
    }

    const sessionRef = doc(db, "learnerProfiles", uid, "sessions", sessionId);
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) {
      throw createSessionError(SESSION_NOT_FOUND, "Session not found.");
    }

    const session = snap.data() as SessionDoc;
    const { currentItem, previousCursor, updatedSession, feedback } = applyAnswerToSession(
      session,
      itemId,
      answer
    );

    await updateDoc(sessionRef, {
      answers: updatedSession.answers,
      cursor: updatedSession.cursor,
      completed: updatedSession.completed,
      metrics: updatedSession.metrics,
      updatedAt: updatedSession.updatedAt,
    });

    await Promise.all([
      writeTranscript(uid, sessionId, {
        itemId: currentItem.id,
        role: "student",
        kind: "answer_submission",
        content: String(answer || ""),
        cursor: previousCursor,
        completed: updatedSession.completed,
      }),
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
    ]);

    return {
      ok: true,
      feedback,
      session: updatedSession,
    };
  } catch (error) {
    if (!isLocalSessionMode() || !localAuth?.uid) {
      throw error;
    }
    const sessions = readLocalSessions();
    const localSession = sessions[sessionId];
    if (!localSession) {
      throw createSessionError(SESSION_NOT_FOUND, "Session not found.");
    }
    const { updatedSession, feedback } = applyAnswerToSession(localSession, itemId, answer);
    sessions[sessionId] = updatedSession;
    writeLocalSessions(sessions);
    return {
      ok: true,
      feedback,
      session: updatedSession,
    };
  }
}
