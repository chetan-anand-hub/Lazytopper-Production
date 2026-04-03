import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  uid: string;
  displayName: string;
  email: string | null;
  isGuest: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signInAsGuest: async () => {},
  signOut: async () => {},
});

const AUTH_STORAGE_KEY = "lt_auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {}
      }
      setIsLoading(false);
    });
  }, []);

  const signInAsGuest = async () => {
    const guestUser: User = {
      uid: `guest_${Date.now().toString()}${Math.random().toString(36).substr(2, 9)}`,
      displayName: "Explorer",
      email: null,
      isGuest: true,
    };
    setUser(guestUser);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(guestUser));
  };

  const signOut = async () => {
    if (user) {
      await AsyncStorage.removeItem(`lt_subscription_${user.uid}`);
    }
    setUser(null);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signInAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
