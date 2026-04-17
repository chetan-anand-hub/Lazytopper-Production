/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import { useUser, useClerk } from "@clerk/react";
import { signInWithCustomToken, signOut as firebaseSignOut } from "firebase/auth";
import {
  hydrateLocalProgressFromCloud,
  ensureLearnerProgressBaseline,
  setActiveProgressUser,
} from "../services/studentProgressStore";
import { ensureLearnerCloudBaseline } from "../services/studentCloudStore";
import { activateTrial, hydrateSubscriptionFromCloud } from "../services/subscriptionService";
import { authClient, firebaseConfigured } from "../services/firebaseClient";

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

async function signIntoFirebase(
  uid: string,
  getToken: () => Promise<string | null>
): Promise<boolean> {
  if (!firebaseConfigured || !authClient) return false;
  if (authClient.currentUser?.uid === uid) return true;
  try {
    const sessionToken = await getToken();
    if (!sessionToken) {
      if (import.meta.env.DEV) {
        console.warn("[AuthContext] No Clerk session token available — skipping Firebase sign-in");
      }
      return false;
    }
    const resp = await fetch("/api/auth/firebase-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({}),
    });
    const data = (await resp.json()) as { ok: boolean; token?: string; error?: string };
    if (data.ok && data.token) {
      await signInWithCustomToken(authClient, data.token);
      if (import.meta.env.DEV) {
        console.info("[AuthContext] Firebase Auth signed in for uid=%s", uid);
      }
      return true;
    } else {
      if (import.meta.env.DEV) {
        console.warn("[AuthContext] Firebase token endpoint returned error:", data.error);
      }
      return false;
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[AuthContext] Firebase sign-in failed — cloud sync disabled for this session:", err);
    }
    return false;
  }
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
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const clerk = useClerk();

  const [localUser, setLocalUser] = useState<AuthUser | null>(() => readLocalSession());
  const firebaseSignedInUid = useRef<string | null>(null);

  const mappedClerkUser: AuthUser | null = clerkUser
    ? {
        uid: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || null,
        phoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber || null,
        displayName: clerkUser.fullName || clerkUser.firstName || null,
      }
    : null;

  const user = mappedClerkUser || localUser;
  const loading = !clerkLoaded;

  useEffect(() => {
    if (shouldAutoAnonBootstrap() && clerkLoaded && !clerkUser && !localUser) {
      const devUser = createLocalDevUser();
      setLocalUser(devUser);
      writeLocalSession(devUser);
    }
  }, [clerkLoaded, clerkUser, localUser]);

  useEffect(() => {
    const uid = user?.uid || null;
    setActiveProgressUser(uid);
    if (uid && !user?.isLocalSession) {
      void (async () => {
        if (firebaseSignedInUid.current !== uid) {
          const getToken = () =>
            clerk.session?.getToken() ?? Promise.resolve(null);
          const success = await signIntoFirebase(uid, getToken);
          if (success) {
            firebaseSignedInUid.current = uid;
          }
        }
        await Promise.allSettled([
          ensureLearnerCloudBaseline(uid),
          ensureLearnerProgressBaseline(uid),
          hydrateLocalProgressFromCloud(uid),
          hydrateSubscriptionFromCloud(uid).then(() => {
            activateTrial(uid);
          }),
        ]);
      })();
    }
  }, [user?.uid, user?.isLocalSession]);

  const signInWithGoogleHandler = async () => {
    clerk.openSignIn({});
  };

  const continueLocalSession = () => {
    const devUser = createLocalDevUser();
    setLocalUser(devUser);
    setActiveProgressUser(devUser.uid);
    writeLocalSession(devUser);
  };

  const logoutHandler = async () => {
    firebaseSignedInUid.current = null;
    void signOutOfFirebase();
    if (clerkUser) {
      await clerk.signOut();
    }
    writeLocalSession(null);
    setActiveProgressUser(null);
    setLocalUser(null);
  };

  const noopAsync = async () => {};

  const value: AuthContextType = {
    user,
    loading,
    firebaseReady: true,
    phoneRecaptchaStatus: "idle",
    signInWithGoogle: signInWithGoogleHandler,
    initPhoneRecaptcha: noopAsync,
    sendPhoneOtp: noopAsync,
    verifyPhoneOtp: noopAsync,
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
