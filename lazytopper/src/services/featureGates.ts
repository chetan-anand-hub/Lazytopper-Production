import type { SubscriptionTier } from "./subscriptionService";

export type FeatureId =
  | "trends"
  | "practice"
  | "mock_papers"
  | "unlimited_mocks"
  | "exam_simulation"
  | "predicted_questions"
  | "topic_hub"
  | "study_planner"
  | "daily_mix"
  | "weak_area_practice"
  | "full_analytics"
  | "parent_dashboard"
  | "mock_builder";

interface FeatureGate {
  requiredTier: "free" | "logged_in" | "premium";
  freeLimit?: number;
  label: string;
}

const FEATURE_GATES: Record<FeatureId, FeatureGate> = {
  trends:              { requiredTier: "free", label: "Exam Trends" },
  practice:            { requiredTier: "logged_in", freeLimit: 3, label: "Practice Sessions" },
  mock_papers:         { requiredTier: "logged_in", freeLimit: 1, label: "Mock Papers" },
  unlimited_mocks:     { requiredTier: "premium", label: "Unlimited Mock Tests" },
  exam_simulation:     { requiredTier: "premium", label: "Exam Simulation" },
  predicted_questions: { requiredTier: "premium", label: "Predicted Questions" },
  topic_hub:           { requiredTier: "premium", label: "Chapter Hub (AI Tutor)" },
  study_planner:       { requiredTier: "premium", label: "Smart Study Planner" },
  daily_mix:           { requiredTier: "premium", label: "Daily Focus Mix" },
  weak_area_practice:  { requiredTier: "premium", label: "Weak Area Practice" },
  full_analytics:      { requiredTier: "premium", label: "Full Analytics Dashboard" },
  parent_dashboard:    { requiredTier: "premium", label: "Parent Dashboard" },
  mock_builder:        { requiredTier: "premium", label: "Mock Builder" },
};

export function canAccessFeature(
  featureId: FeatureId,
  tier: SubscriptionTier,
  isLoggedIn: boolean,
): boolean {
  const gate = FEATURE_GATES[featureId];
  if (!gate) return true;

  if (gate.requiredTier === "free") return true;
  if (gate.requiredTier === "logged_in") return isLoggedIn;
  if (gate.requiredTier === "premium") return tier === "premium" || tier === "trial";
  return false;
}

export function getFeatureGate(featureId: FeatureId): FeatureGate {
  return FEATURE_GATES[featureId];
}

export function getPremiumFeatureList(): { id: FeatureId; label: string }[] {
  return Object.entries(FEATURE_GATES)
    .filter(([, gate]) => gate.requiredTier === "premium")
    .map(([id, gate]) => ({ id: id as FeatureId, label: gate.label }));
}

const DAILY_PRACTICE_KEY = "lazytopper.dailyPracticeCount";

export function getDailyPracticeCount(): number {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(DAILY_PRACTICE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (parsed?.date !== today) return 0;
    return parsed.count || 0;
  } catch {
    return 0;
  }
}

export function incrementDailyPracticeCount(): number {
  const today = new Date().toISOString().slice(0, 10);
  let count = getDailyPracticeCount();
  count++;
  try {
    localStorage.setItem(DAILY_PRACTICE_KEY, JSON.stringify({ date: today, count }));
  } catch {}
  return count;
}
