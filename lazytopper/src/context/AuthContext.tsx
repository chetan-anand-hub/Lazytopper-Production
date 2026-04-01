/* eslint-disable react-refresh/only-export-components */
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { authClient, firebaseConfigured } from "../services/firebaseClient";
import {
  hydrateLocalProgressFromCloud,
  ensureLearnerProgressBaseline,
  setActiveProgressUser,
} from "../services/studentProgressStore";
import { ensureLearnerCloudBaseline } from "../services/studentCloudStore";

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
  signInWithGoogle: () => Promise<void>;
  initPhoneRecaptcha: (recaptchaContainerId: string) => Promise<void>;
  sendPhoneOtp: (phoneE164: string, recaptchaContainerId: string) => Promise<void>;
  verifyPhoneOtp: (code: string) => Promise<void>;
  continueLocalSession: () => void;
  logout: () => Promise<void>;
};

const LOCAL_AUTH_KEY = "lazytopper.auth.local.v1";
const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    phoneNumber: user.phoneNumber,
    displayName: user.displayName,
  };
}

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
    // ignore local write failures
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (firebaseConfigured) return null;
    return readLocalSession();
  });
  const [loading, setLoading] = useState<boolean>(firebaseConfigured);
  const [phoneRecaptchaStatus, setPhoneRecaptchaStatus] = useState<PhoneRecaptchaStatus>("idle");
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const autoAnonAttemptedRef = useRef(false);

  const resetRecaptcha = async () => {
    const verifier = recaptchaRef.current;
    if (!verifier) return;
    try {
      const widgetId = await verifier.render();
      const grecaptchaObj = (window as { grecaptcha?: { reset: (id?: number) => void } }).grecaptcha;
      if (grecaptchaObj && typeof grecaptchaObj.reset === "function") {
        grecaptchaObj.reset(widgetId);
      }
      setPhoneRecaptchaStatus("ready");
    } catch {
      // ignore reset failures
    }
  };

  useEffect(() => {
    if (!firebaseConfigured || !authClient) return;
    const auth = authClient;
    const unsubscribe = onAuthStateChanged(auth, (next) => {
      if (!next && shouldAutoAnonBootstrap() && !autoAnonAttemptedRef.current) {
        autoAnonAttemptedRef.current = true;
        if (shouldUseDeterministicE2EAuth()) {
          const localUser = createLocalDevUser();
          setUser(localUser);
          writeLocalSession(localUser);
          setLoading(false);
          return;
        }
        setUser(null);
        setLoading(true);
        void signInAnonymously(auth).catch(() => {
          setLoading(false);
        });
        return;
      }
      const mapped = next ? toAuthUser(next) : null;
      setUser(mapped);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const uid = user?.uid || null;
    setActiveProgressUser(uid);
    if (uid && !user?.isLocalSession) {
      void (async () => {
        await Promise.allSettled([
          ensureLearnerCloudBaseline(uid),
          ensureLearnerProgressBaseline(uid),
          hydrateLocalProgressFromCloud(uid),
        ]);
      })();
    }
  }, [user?.uid, user?.isLocalSession]);

  const signInWithGoogleHandler = async () => {
    if (!firebaseConfigured || !authClient) {
      throw new Error("Firebase is not configured.");
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(authClient, provider);
  };

  const initPhoneRecaptchaHandler = async (recaptchaContainerId: string) => {
    if (!firebaseConfigured || !authClient) {
      throw new Error("Firebase is not configured.");
    }
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(authClient, recaptchaContainerId, {
        size: "normal",
        callback: () => {
          setPhoneRecaptchaStatus("solved");
        },
        "expired-callback": () => {
          setPhoneRecaptchaStatus("expired");
        },
        "error-callback": () => {
          setPhoneRecaptchaStatus("error");
        },
      });
      await recaptchaRef.current.render();
      setPhoneRecaptchaStatus("ready");
    }
  };

  const sendPhoneOtpHandler = async (phoneE164: string, recaptchaContainerId: string) => {
    if (!firebaseConfigured || !authClient) {
      throw new Error("Firebase is not configured.");
    }

    await initPhoneRecaptchaHandler(recaptchaContainerId);
    const verifier = recaptchaRef.current;
    if (!verifier) {
      throw new Error("reCAPTCHA initialization failed.");
    }

    try {
      await verifier.verify();
      setPhoneRecaptchaStatus("solved");
      confirmationRef.current = await signInWithPhoneNumber(authClient, phoneE164, verifier);
    } catch (error) {
      await resetRecaptcha();
      throw error;
    }
  };

  const verifyPhoneOtpHandler = async (code: string) => {
    const confirmation = confirmationRef.current;
    if (!confirmation) {
      throw new Error("OTP session not found. Send OTP first.");
    }
    await confirmation.confirm(code);
    confirmationRef.current = null;
  };

  const continueLocalSession = () => {
    const localUser = createLocalDevUser();
    setUser(localUser);
    setActiveProgressUser(localUser.uid);
    writeLocalSession(localUser);
  };

  const logoutHandler = async () => {
    if (!firebaseConfigured || !authClient) {
      writeLocalSession(null);
      setActiveProgressUser(null);
      setUser(null);
      return;
    }
    await signOut(authClient);
    setActiveProgressUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    firebaseReady: firebaseConfigured,
    phoneRecaptchaStatus,
    signInWithGoogle: signInWithGoogleHandler,
    initPhoneRecaptcha: initPhoneRecaptchaHandler,
    sendPhoneOtp: sendPhoneOtpHandler,
    verifyPhoneOtp: verifyPhoneOtpHandler,
    continueLocalSession,
    logout: logoutHandler,
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
