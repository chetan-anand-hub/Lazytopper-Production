/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  hydrateLocalProgressFromCloud,
  ensureLearnerProgressBaseline,
  setActiveProgressUser,
} from "../services/studentProgressStore";
import { ensureLearnerCloudBaseline } from "../services/studentCloudStore";
import { activateTrial, hydrateSubscriptionFromCloud } from "../services/subscriptionService";
import { hydrateMistakeLogsFromCloud } from "../services/mistakeLogService";
import { authClient, firebaseConfigured } from "../services/firebaseClient";
import { restoreFromDB } from "../services/dbSyncService";
import { ensureLearnerAccountMetadata } from "../services/learnerAccountService";

export type AuthUser = {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  isLocalSession?: boolean;
};

export type PhoneRecaptchaStatus = "idle" | "ready" | "solved" | "expired" | "error";

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  firebaseReady: boolean;
  phoneRecaptchaStatus: PhoneRecaptchaStatus;
  mistakeLogsHydrated: number;
  getToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  initPhoneRecaptcha: (recaptchaContainerId: string) => Promise<void>;
  sendPhoneOtp: (phoneE164: string, recaptchaContainerId: string) => Promise<void>;
  verifyPhoneOtp: (code: string) => Promise<void>;
  continueLocalSession: () => void;
  logout: () => Promise<void>;
};

const LOCAL_AUTH_KEY = "lazytopper.auth.local.v1";
const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readLocalSession(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed || typeof parsed.uid !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalSession(user: AuthUser | null): void {
  try {
    if (!user) {
      window.localStorage.removeItem(LOCAL_AUTH_KEY);
      return;
    }
    window.localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

function createLocalDevUser(): AuthUser {
  return {
    uid: "local-dev-user",
    email: null,
    phoneNumber: null,
    displayName: "Local Student",
    isLocalSession: true,
  };
}

function shouldUseDeterministicE2EAuth(): boolean {
  const explicit = String(import.meta.env.VITE_E2E_AUTO_ANON_AUTH || "").trim().toLowerCase();
  return explicit === "1" || explicit === "true" || explicit === "yes";
}

function shouldAutoAnonBootstrap(): boolean {
  if (shouldUseDeterministicE2EAuth()) return true;
  const isAutomation =
    typeof navigator !== "undefined" &&
    typeof navigator.webdriver === "boolean" &&
    navigator.webdriver;
  return Boolean(import.meta.env.DEV) && isAutomation;
}

function mapFirebaseUser(fbUser: FirebaseUser): AuthUser {
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    phoneNumber: fbUser.phoneNumber,
    displayName: fbUser.displayName,
  };
}

async function signOutOfFirebase(): Promise<void> {
  if (!authClient) return;
  try {
    await firebaseSignOut(authClient);
  } catch {
    // ignore sign-out errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<AuthUser | null>(null);
  const [firebaseLoaded, setFirebaseLoaded] = useState(false);
  const [localUser, setLocalUser] = useState<AuthUser | null>(() => readLocalSession());
  const [mistakeLogsHydrated, setMistakeLogsHydrated] = useState(0);

  // Track Firebase Auth state directly: the signed-in Firebase user (Google,
  // email/password, or — from PR-4 — phone) is the source of identity.
  useEffect(() => {
    if (!firebaseConfigured || !authClient) {
      setFirebaseLoaded(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(authClient, (fbUser) => {
      setFirebaseUser(fbUser ? mapFirebaseUser(fbUser) : null);
      setFirebaseLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  const user = firebaseUser || localUser;
  const loading = !firebaseLoaded;

  // Local-dev / E2E anonymous-session bootstrap (automation/dev only; never a
  // user-facing guest mode).
  useEffect(() => {
    if (shouldAutoAnonBootstrap() && firebaseLoaded && !firebaseUser && !localUser) {
      const devUser = createLocalDevUser();
      setLocalUser(devUser);
      writeLocalSession(devUser);
    }
  }, [firebaseLoaded, firebaseUser, localUser]);

  useEffect(() => {
    const uid = user?.uid || null;
    setActiveProgressUser(uid);
    if (!user || !uid || user.isLocalSession) return;
    const activeUser = user;

    let cancelled = false;

    void (async () => {
      if (cancelled) return;

      await Promise.allSettled([
        restoreFromDB(uid),
        ensureLearnerAccountMetadata({
          uid,
          email: activeUser.email,
          phoneNumber: activeUser.phoneNumber,
          displayName: activeUser.displayName,
          authProvider:
            activeUser.phoneNumber && !activeUser.email
              ? "firebase-phone"
              : activeUser.email
                ? "firebase-email"
                : "firebase",
        }),
        ensureLearnerCloudBaseline(uid),
        ensureLearnerProgressBaseline(uid),
        hydrateLocalProgressFromCloud(uid),
        hydrateMistakeLogsFromCloud(uid).then(() => {
          if (!cancelled) setMistakeLogsHydrated((n) => n + 1);
        }),
        hydrateSubscriptionFromCloud(uid).then(() => {
          activateTrial(uid);
        }),
      ]);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.email, user?.phoneNumber, user?.displayName, user?.isLocalSession]);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!authClient?.currentUser) return null;
    try {
      return await authClient.currentUser.getIdToken();
    } catch {
      return null;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!authClient) throw new Error("Firebase Auth is not configured");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(authClient, provider);
  }, []);

  const signInWithEmailPassword = useCallback(async (email: string, password: string) => {
    if (!authClient) throw new Error("Firebase Auth is not configured");
    await signInWithEmailAndPassword(authClient, email, password);
  }, []);

  const signUpWithEmailPassword = useCallback(
    async (email: string, password: string, displayName?: string) => {
      if (!authClient) throw new Error("Firebase Auth is not configured");
      const credential = await createUserWithEmailAndPassword(authClient, email, password);
      const trimmedName = (displayName || "").trim();
      if (trimmedName && credential.user) {
        try {
          await updateProfile(credential.user, { displayName: trimmedName });
        } catch {
          // Non-blocking: account is created even if the display name fails to set.
        }
      }
    },
    [],
  );

  const continueLocalSession = () => {
    const devUser = createLocalDevUser();
    setLocalUser(devUser);
    setActiveProgressUser(devUser.uid);
    writeLocalSession(devUser);
  };

  const logout = useCallback(async () => {
    await signOutOfFirebase();
    writeLocalSession(null);
    setActiveProgressUser(null);
    setLocalUser(null);
    setFirebaseUser(null);
  }, []);

  const noopAsync = async () => {};

  const value: AuthContextType = {
    user,
    loading,
    firebaseReady: firebaseConfigured,
    phoneRecaptchaStatus: "idle",
    mistakeLogsHydrated,
    getToken,
    signInWithGoogle,
    signInWithEmailPassword,
    signUpWithEmailPassword,
    // Phone (SMS OTP) handlers are wired in PR-4; the façade shape is stable now.
    initPhoneRecaptcha: noopAsync,
    sendPhoneOtp: noopAsync,
    verifyPhoneOtp: noopAsync,
    continueLocalSession,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
