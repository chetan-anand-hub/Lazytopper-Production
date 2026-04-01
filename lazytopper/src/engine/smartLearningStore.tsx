// src/engine/smartLearningStore.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../context/AuthContext";
import {
  buildProgressScopeKey,
  hydrateLocalProgressFromCloud,
  saveLearnerProgressSegment,
} from "../services/studentProgressStore";

import {
  type ChapterId,
  type ChapterMeta,
  type UserChapterStats,
  type HpqAttemptPayload,
  computeMatchScoreForChapter,
  applyHpqAttemptToStats,
} from "./smartLearningTypes.ts";

/**
 * Shape exposed by the Smart Learning context to React components.
 */
export interface SmartLearningState {
  /** All stats keyed by chapterId (e.g. "10-Maths-Polynomials") */
  statsByChapter: Record<ChapterId, UserChapterStats>;

  /** Get stats for a single chapter (if exists). */
  getStatsForChapter: (chapterId: ChapterId) => UserChapterStats | undefined;

  /**
   * Record a single HPQ attempt (correct/incorrect + time etc).
   * This uses applyHpqAttemptToStats under the hood.
   */
  recordHpqAttempt: (attempt: HpqAttemptPayload) => void;

  /**
   * Compute match score (Mark Yield) for a chapter for the current user,
   * using both board weightage and user stats.
   */
  getMatchScoreForChapter: (
    chapter: ChapterMeta,
    maxBoardWeightage: number
  ) => number;
}

const SmartLearningContext = createContext<SmartLearningState | undefined>(
  undefined
);

const LEGACY_SMART_LEARNING_STORAGE_KEY = "lazytopper.smartLearning.stats.v1";

function loadPersistedStats(uid?: string | null): Record<ChapterId, UserChapterStats> {
  if (typeof window === "undefined") return {};
  try {
    const scopedKey = buildProgressScopeKey("smartLearning", uid || null);
    const raw =
      window.localStorage.getItem(scopedKey) ||
      window.localStorage.getItem(LEGACY_SMART_LEARNING_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<ChapterId, UserChapterStats>;
  } catch {
    return {};
  }
}

interface ProviderProps {
  children: ReactNode;
}

/**
 * Very small in-memory store.
 * - Lives only in React state (resets on full refresh)
 * - Good enough to test behaviour / UI before wiring backend.
 */
export const SmartLearningProvider: React.FC<ProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const uid = user?.uid || null;
  const [statsByChapter, setStatsByChapter] = useState<
    Record<ChapterId, UserChapterStats>
  >(() => loadPersistedStats(uid));

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      if (uid) {
        await hydrateLocalProgressFromCloud(uid);
      }
      if (!cancelled) {
        setStatsByChapter(loadPersistedStats(uid));
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const getStatsForChapter = (chapterId: ChapterId) => statsByChapter[chapterId];

  const recordHpqAttempt = (attempt: HpqAttemptPayload) => {
    setStatsByChapter((prev) => {
      const prevStats = prev[attempt.chapterId];
      const nextStats = applyHpqAttemptToStats(prevStats, attempt);
      return {
        ...prev,
        [attempt.chapterId]: nextStats,
      };
    });
  };

  const getMatchScoreForChapter = (
    chapter: ChapterMeta,
    maxBoardWeightage: number
  ) => {
    const stats = statsByChapter[chapter.id];
    return computeMatchScoreForChapter({
      chapter,
      stats,
      maxBoardWeightage,
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const scopedKey = buildProgressScopeKey("smartLearning", uid);
      window.localStorage.setItem(
        scopedKey,
        JSON.stringify(statsByChapter)
      );
      if (!uid) {
        window.localStorage.setItem(
          LEGACY_SMART_LEARNING_STORAGE_KEY,
          JSON.stringify(statsByChapter)
        );
      }
    } catch {
      // Best effort persistence only.
    }
    if (uid) {
      void saveLearnerProgressSegment(uid, "statsByChapter", statsByChapter);
    }
  }, [statsByChapter, uid]);

  const value: SmartLearningState = {
    statsByChapter,
    getStatsForChapter,
    recordHpqAttempt,
    getMatchScoreForChapter,
  };

  return (
    <SmartLearningContext.Provider value={value}>
      {children}
    </SmartLearningContext.Provider>
  );
};

/**
 * Hook to use inside pages like TopicHub, HPQ page, Daily Mix, etc.
 */
// eslint-disable-next-line react-refresh/only-export-components -- context hook is co-located with provider intentionally.
export function useSmartLearning(): SmartLearningState {
  const ctx = useContext(SmartLearningContext);
  if (!ctx) {
    throw new Error(
      "useSmartLearning must be used inside <SmartLearningProvider>"
    );
  }
  return ctx;
}
