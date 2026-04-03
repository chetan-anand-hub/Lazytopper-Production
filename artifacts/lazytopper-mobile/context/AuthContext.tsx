import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  onAuthStateChanged,
  signInWithPopup,
  signInWithCredential,
  signInWithPhoneNumber,
  signOut as fbSignOut,
} from "firebase/auth";
import type { User as FirebaseUser, ConfirmationResult } from "firebase/auth";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";

import { firebaseConfigured, authClient } from "@/services/firebaseConfig";

WebBrowser.maybeCompleteAuthSession();

interface User {
  uid: string;
  displayName: string;
  email: string | null;
  isGuest: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  firebaseAvailable: boolean;
  authError: string | null;
  signInAsGuest: () => Promise<string>;
  signInWithGoogle: () => Promise<void>;
  signInWithPhone: (verificationId: string, code: string) => Promise<void>;
  sendPhoneOtp: (phoneNumber: string) => Promise<string | null>;
  signInFromNativePhoneAuth: (uid: string, displayName: string, phoneNumber: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  firebaseAvailable: false,
  authError: null,
  signInAsGuest: async () => "",
  signInWithGoogle: async () => {},
  signInWithPhone: async () => {},
  sendPhoneOtp: async () => null,
  signInFromNativePhoneAuth: async () => {},
  signOut: async () => {},
});

const AUTH_STORAGE_KEY = "lt_auth_user";

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
};

function mapFirebaseUser(fbUser: FirebaseUser): User {
  return {
    uid: fbUser.uid,
    displayName: fbUser.displayName || fbUser.email || fbUser.phoneNumber || "Student",
    email: fbUser.email,
    isGuest: false,
  };
}

function showAuthError(message: string) {
  if (Platform.OS === "web") {
    console.error("[Auth]", message);
  } else {
    Alert.alert("Sign-in Error", message);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {
          console.warn("[Auth] Failed to parse stored user");
        }
      }
      setIsLoading(false);
    });

    if (firebaseConfigured && authClient) {
      const unsubscribe = onAuthStateChanged(authClient, (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          const mapped = mapFirebaseUser(fbUser);
          setUser(mapped);
          AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mapped));
        }
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, []);

  const persistUser = async (u: User) => {
    setUser(u);
    setAuthError(null);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
  };

  const signInAsGuest = async (): Promise<string> => {
    const uid = `guest_${Date.now().toString()}${Math.random().toString(36).substr(2, 9)}`;
    const guestUser: User = {
      uid,
      displayName: "Explorer",
      email: null,
      isGuest: true,
    };
    await persistUser(guestUser);
    return uid;
  };

  const handleSignInWithGoogle = async () => {
    if (!firebaseConfigured || !authClient) {
      const msg = "Google sign-in is unavailable. Firebase is not configured.";
      setAuthError(msg);
      showAuthError(msg);
      return;
    }
    try {
      if (Platform.OS === "web") {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(authClient, provider);
        await persistUser(mapFirebaseUser(result.user));
        return;
      }

      const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        const msg = "Google Client ID not configured. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID.";
        setAuthError(msg);
        showAuthError(msg);
        return;
      }

      const redirectUri = AuthSession.makeRedirectUri({ scheme: "lazytopper-mobile" });
      const request = new AuthSession.AuthRequest({
        clientId,
        redirectUri,
        scopes: ["openid", "profile", "email"],
        responseType: AuthSession.ResponseType.IdToken,
        usePKCE: false,
      });

      const result = await request.promptAsync(GOOGLE_DISCOVERY);
      if (result.type === "success" && result.params.id_token) {
        const credential = GoogleAuthProvider.credential(result.params.id_token);
        const fbResult = await signInWithCredential(authClient, credential);
        await persistUser(mapFirebaseUser(fbResult.user));
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Google sign-in failed. Please try again.";
      setAuthError(msg);
      showAuthError(msg);
    }
  };

  const handleSendPhoneOtp = async (phoneNumber: string): Promise<string | null> => {
    if (!firebaseConfigured || !authClient) {
      const msg = "Phone OTP is unavailable. Firebase is not configured.";
      setAuthError(msg);
      showAuthError(msg);
      return null;
    }

    if (Platform.OS !== "web") {
      return "native-webview";
    }

    try {
      let recaptchaContainer = document.getElementById("recaptcha-container");
      if (!recaptchaContainer) {
        recaptchaContainer = document.createElement("div");
        recaptchaContainer.id = "recaptcha-container";
        recaptchaContainer.style.display = "none";
        document.body.appendChild(recaptchaContainer);
      }

      const recaptchaVerifier = new RecaptchaVerifier(authClient, "recaptcha-container", {
        size: "invisible",
      });

      const confirmation = await signInWithPhoneNumber(authClient, phoneNumber, recaptchaVerifier);
      confirmationResultRef.current = confirmation;
      return "web-confirmation";
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to send OTP. Please try again.";
      setAuthError(msg);
      showAuthError(msg);
      return null;
    }
  };

  const handleSignInWithPhone = async (_verificationId: string, code: string) => {
    if (!firebaseConfigured || !authClient) {
      const msg = "Phone sign-in is unavailable. Firebase is not configured.";
      setAuthError(msg);
      showAuthError(msg);
      return;
    }

    if (Platform.OS === "web" && confirmationResultRef.current) {
      try {
        const result = await confirmationResultRef.current.confirm(code);
        confirmationResultRef.current = null;
        await persistUser(mapFirebaseUser(result.user));
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Invalid OTP code. Please try again.";
        setAuthError(msg);
        showAuthError(msg);
      }
    }
  };

  const handleSignInFromNativePhoneAuth = async (uid: string, displayName: string, phoneNumber: string) => {
    const phoneUser: User = {
      uid,
      displayName: displayName || phoneNumber || "Student",
      email: null,
      isGuest: false,
    };
    await persistUser(phoneUser);
  };

  const handleSignOut = async () => {
    if (user) {
      await AsyncStorage.removeItem(`lt_subscription_${user.uid}`);
    }
    if (firebaseConfigured && authClient) {
      try {
        await fbSignOut(authClient);
      } catch (error: unknown) {
        console.warn("[Auth] Firebase sign-out error");
      }
    }
    setUser(null);
    setAuthError(null);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        firebaseAvailable: firebaseConfigured,
        authError,
        signInAsGuest,
        signInWithGoogle: handleSignInWithGoogle,
        signInWithPhone: handleSignInWithPhone,
        sendPhoneOtp: handleSendPhoneOtp,
        signInFromNativePhoneAuth: handleSignInFromNativePhoneAuth,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
