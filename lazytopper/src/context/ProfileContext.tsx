/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { calculateStrategy } from "../utils/strategy";
import type { StudentProfile, StrategyResult } from "../utils/strategy";
import { useAuth } from "./AuthContext";
import { loadStudentProfile, saveStudentProfile } from "../services/studentCloudStore";


// --------------------
// Context Shape
// --------------------
interface ProfileContextType {
  profile: StudentProfile | null;
  strategy: StrategyResult | null;
  loadingProfile: boolean;
  setProfileAndCompute: (profile: StudentProfile) => void;
}

// --------------------
// Create context
// --------------------
const ProfileContext = createContext<ProfileContextType | undefined>(
  undefined
);

// --------------------
// Provider component
// --------------------
export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [strategy, setStrategy] = useState<StrategyResult | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const setProfileAndCompute = useCallback((p: StudentProfile) => {
    setProfile(p);
    setStrategy(calculateStrategy(p));
    const uid = user?.uid;
    if (uid) {
      void saveStudentProfile(uid, p);
    }
  }, [user?.uid]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      const resetTimer = window.setTimeout(() => {
        setProfile(null);
        setStrategy(null);
        setLoadingProfile(false);
      }, 0);
      return () => {
        window.clearTimeout(resetTimer);
      };
    }
    let isCancelled = false;
    void (async () => {
      await Promise.resolve();
      if (isCancelled) return;
      setLoadingProfile(true);
      const loaded = await loadStudentProfile(uid);
      if (isCancelled) return;
      if (loaded) {
        setProfile(loaded);
        setStrategy(calculateStrategy(loaded));
      } else {
        setProfile(null);
        setStrategy(null);
      }
      setLoadingProfile(false);
    })();
    return () => {
      isCancelled = true;
    };
  }, [user?.uid]);

  const value = useMemo<ProfileContextType>(
    () => ({ profile, strategy, loadingProfile, setProfileAndCompute }),
    [profile, strategy, loadingProfile, setProfileAndCompute]
  );

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

// --------------------
// Hook to use profile
// --------------------
export const useProfile = () => {
  const ctx = useContext(ProfileContext);

  if (!ctx) {
    throw new Error("useProfile must be used inside ProfileProvider");
  }

  return ctx;
};
