import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import {
  GoogleAuthProvider,
  PhoneAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithCredential,
  signOut as fbSignOut,
} from "firebase/auth";
import type { User as FirebaseUser } from "firebase/auth";
import React, { createContext, useContext, useEffect, useState } from "react";
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
  signInAsGuest: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithPhone: (verificationId: string, code: string) => Promise<void>;
  sendPhoneOtp: (phoneNumber: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  firebaseAvailable: false,
  authError: null,
  signInAsGuest: async () => {},
  signInWithGoogle: async () => {},
  signInWithPhone: async () => {},
  sendPhoneOtp: async () => null,
  signOut: async () => {},
});

const AUTH_STORAGE_KEY = "lt_auth_user";

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

  useEffect(() => {
    AsyncStorage.getItem(AUTH_STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {
          console.warn("[Auth] Failed to parse stored user:", e);
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

  const signInAsGuest = async () => {
    const guestUser: User = {
      uid: `guest_${Date.now().toString()}${Math.random().toString(36).substr(2, 9)}`,
      displayName: "Explorer",
      email: null,
      isGuest: true,
    };
    await persistUser(guestUser);
  };

  const handleSignInWithGoogle = async () => {
    if (!firebaseConfigured || !authClient) {
      const msg = "Google sign-in is unavailable. Firebase is not configured.";
      setAuthError(msg);
      showAuthError(msg);
      return;
    }
    try {
      const provider = new GoogleAuthProvider();

      if (Platform.OS === "web") {
        const result = await signInWithPopup(authClient, provider);
        await persistUser(mapFirebaseUser(result.user));
      } else {
        const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId) {
          const msg = "Google Client ID not configured. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID.";
          setAuthError(msg);
          showAuthError(msg);
          return;
        }

        const redirectUri = Linking.createURL("auth/callback");

        const authUrl =
          `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${clientId}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=id_token` +
          `&scope=openid%20profile%20email` +
          `&nonce=${Math.random().toString(36).substring(2)}`;

        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
        if (result.type === "success" && result.url) {
          const url = new URL(result.url);
          const fragment = url.hash.substring(1);
          const params = new URLSearchParams(fragment);
          const idToken = params.get("id_token");

          if (idToken) {
            const credential = GoogleAuthProvider.credential(idToken);
            const fbResult = await signInWithCredential(authClient, credential);
            await persistUser(mapFirebaseUser(fbResult.user));
          }
        }
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
    try {
      const phoneProvider = new PhoneAuthProvider(authClient);
      const verificationId = await phoneProvider.verifyPhoneNumber(phoneNumber, undefined as never);
      return verificationId;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to send OTP. Please try again.";
      setAuthError(msg);
      showAuthError(msg);
      return null;
    }
  };

  const handleSignInWithPhone = async (verificationId: string, code: string) => {
    if (!firebaseConfigured || !authClient) {
      const msg = "Phone sign-in is unavailable. Firebase is not configured.";
      setAuthError(msg);
      showAuthError(msg);
      return;
    }
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      const result = await signInWithCredential(authClient, credential);
      await persistUser(mapFirebaseUser(result.user));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Phone sign-in failed. Check code and try again.";
      setAuthError(msg);
      showAuthError(msg);
    }
  };

  const handleSignOut = async () => {
    if (user) {
      await AsyncStorage.removeItem(`lt_subscription_${user.uid}`);
    }
    if (firebaseConfigured && authClient) {
      try {
        await fbSignOut(authClient);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Sign-out error";
        console.warn("[Auth] Firebase sign-out error:", msg);
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
