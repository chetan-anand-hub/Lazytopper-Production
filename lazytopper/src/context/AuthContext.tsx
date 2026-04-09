/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useUser, useClerk } from "@clerk/react";
import {
  hydrateLocalProgressFromCloud,
  ensureLearnerProgressBaseline,
  setActiveProgressUser,
} from "../services/studentProgressStore";
import { ensureLearnerCloudBaseline } from "../services/studentCloudStore";
import { activateTrial, hydrateSubscriptionFromCloud } from "../services/subscriptionService";

export type AuthUser = {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  isLocalSession?: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  firebaseReady: boolean;
  signInWithGoogle: () => Promise<void>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const clerk = useClerk();

  const [localUser, setLocalUser] = useState<AuthUser | null>(() => readLocalSession());

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
    if (clerkUser) {
      await clerk.signOut();
    }
    writeLocalSession(null);
    setActiveProgressUser(null);
    setLocalUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    firebaseReady: true,
    signInWithGoogle: signInWithGoogleHandler,
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
