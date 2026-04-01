import { doc, getDoc, setDoc } from "firebase/firestore";
import type { StudentProfile } from "../utils/strategy";
import { firestoreDb } from "./firebaseClient";

const PROFILE_KEY_PREFIX = "lazytopper.profile.v2";
const DASHBOARD_PREFS_KEY_PREFIX = "lazytopper.dashboard.prefs.v1";

export type DashboardPrefs = {
  plannerSubject?: "Maths" | "Science";
  daysLeftOverride?: number;
  targetPercentOverride?: number;
  hoursPerDayOverride?: number;
  examDate?: string;
  examDateSource?: "official" | "predicted";
  updatedAt?: string;
};

function localProfileKey(uid: string): string {
  return `${PROFILE_KEY_PREFIX}:${uid}`;
}

function localPrefsKey(uid: string): string {
  return `${DASHBOARD_PREFS_KEY_PREFIX}:${uid}`;
}

function sanitizeProfile(input: unknown): StudentProfile | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const rec = input as Record<string, unknown>;
  const studentClass = String(rec.studentClass || "10") === "12" ? "12" : "10";
  const daysLeft = Number(rec.daysLeft || 0);
  const targetPercent = Number(rec.targetPercent || 0);
  const hoursPerDay = Number(rec.hoursPerDay || 0);
  const currentPercentRaw = Number(rec.currentPercent);
  if (!Number.isFinite(daysLeft) || !Number.isFinite(targetPercent) || !Number.isFinite(hoursPerDay)) {
    return null;
  }
  return {
    studentClass,
    daysLeft,
    targetPercent,
    hoursPerDay,
    currentPercent: Number.isFinite(currentPercentRaw) ? currentPercentRaw : undefined,
  };
}

function sanitizePrefs(input: unknown): DashboardPrefs | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const rec = input as Record<string, unknown>;
  const plannerSubject = String(rec.plannerSubject || "Maths") === "Science" ? "Science" : "Maths";
  return {
    plannerSubject,
    daysLeftOverride: Number.isFinite(Number(rec.daysLeftOverride))
      ? Number(rec.daysLeftOverride)
      : undefined,
    targetPercentOverride: Number.isFinite(Number(rec.targetPercentOverride))
      ? Number(rec.targetPercentOverride)
      : undefined,
    hoursPerDayOverride: Number.isFinite(Number(rec.hoursPerDayOverride))
      ? Number(rec.hoursPerDayOverride)
      : undefined,
    examDate: typeof rec.examDate === "string" ? rec.examDate : undefined,
    examDateSource:
      String(rec.examDateSource || "predicted") === "official" ? "official" : "predicted",
    updatedAt: typeof rec.updatedAt === "string" ? rec.updatedAt : undefined,
  };
}

function readLocal<T>(key: string, sanitize: (input: unknown) => T | null): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return sanitize(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write errors
  }
}

export async function loadStudentProfile(uid: string): Promise<StudentProfile | null> {
  const local = readLocal(localProfileKey(uid), sanitizeProfile);
  if (firestoreDb) {
    try {
      const snap = await getDoc(doc(firestoreDb, "learnerProfiles", uid));
      if (snap.exists()) {
        const remote = sanitizeProfile(snap.data());
        if (remote) {
          writeLocal(localProfileKey(uid), remote);
          return remote;
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("[studentCloudStore] loadStudentProfile cloud read failed", { uid, error });
      }
      // fall through to local copy
    }
  }
  return local;
}

export async function saveStudentProfile(uid: string, profile: StudentProfile): Promise<void> {
  writeLocal(localProfileKey(uid), profile);
  if (!firestoreDb) return;
  try {
    await setDoc(
      doc(firestoreDb, "learnerProfiles", uid),
      {
        ...profile,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[studentCloudStore] saveStudentProfile cloud write failed", { uid, error });
    }
    // keep local fallback only
  }
}

export async function loadDashboardPrefs(uid: string): Promise<DashboardPrefs | null> {
  const local = readLocal(localPrefsKey(uid), sanitizePrefs);
  if (firestoreDb) {
    try {
      const snap = await getDoc(doc(firestoreDb, "dashboardPrefs", uid));
      if (snap.exists()) {
        const remote = sanitizePrefs(snap.data());
        if (remote) {
          writeLocal(localPrefsKey(uid), remote);
          return remote;
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("[studentCloudStore] loadDashboardPrefs cloud read failed", { uid, error });
      }
      // ignore and use local
    }
  }
  return local;
}

export async function saveDashboardPrefs(uid: string, prefs: DashboardPrefs): Promise<void> {
  const payload: DashboardPrefs = {
    ...prefs,
    updatedAt: new Date().toISOString(),
  };
  writeLocal(localPrefsKey(uid), payload);
  if (!firestoreDb) return;
  try {
    await setDoc(doc(firestoreDb, "dashboardPrefs", uid), payload, { merge: true });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[studentCloudStore] saveDashboardPrefs cloud write failed", { uid, error });
    }
    // keep local fallback only
  }
}

export async function ensureLearnerCloudBaseline(uid: string): Promise<void> {
  const safeUid = String(uid || "").trim();
  if (!safeUid || !firestoreDb) return;

  const nowIso = new Date().toISOString();
  try {
    await Promise.all([
      setDoc(
        doc(firestoreDb, "learnerProfiles", safeUid),
        {
          uid: safeUid,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        { merge: true }
      ),
      setDoc(
        doc(firestoreDb, "dashboardPrefs", safeUid),
        {
          uid: safeUid,
          updatedAt: nowIso,
        },
        { merge: true }
      ),
    ]);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[studentCloudStore] ensureLearnerCloudBaseline failed", { uid: safeUid, error });
    }
    // noop: local fallbacks stay active
  }
}
