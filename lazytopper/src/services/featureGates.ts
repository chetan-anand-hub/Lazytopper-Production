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
  | "parent_dashboard";

interface FeatureGate {
  requiredTier: "free" | "logged_in" | "premium";
  freeLimit?: number;
  label: string;
  /**
   * ★★ DOES A PAYING STUDENT ACTUALLY RECEIVE THIS TODAY?
   *
   * WHY THIS FIELD EXISTS — and why it is NOT the same thing as `requiredTier`.
   * `getPremiumFeatureList()` is rendered as the "Premium includes:" sell on the
   * upgrade surfaces, i.e. it is COMMERCE COPY. It was derived from
   * `requiredTier === "premium"` alone, so every entry in this table became a
   * promise the moment it was added — including entries for surfaces that were
   * later severed from the router. The result, owner-verified live: a student
   * being asked for money was sold Smart Study Planner, Daily Focus Mix, Full
   * Analytics Dashboard and Parent Dashboard, **none of which the product ships**.
   *
   * ANTI-FABRICATION APPLIES TO COMMERCE. Every line on an upgrade surface must
   * name something the student will actually get.
   *
   * ⚠ THIS FIELD DELIBERATELY DOES NOT AFFECT GATING. `canAccessFeature` does not
   * read it, so a `shipped: false` entry still gates exactly as it did. Removing
   * the gate ENTRIES is a separate, larger change (some are read by surfaces that
   * still exist in the tree) and is not a gating lane's call — it is tracked as
   * [FU-FEATUREGATES-RETIRED-ENTRIES]. What this field changes is only what the
   * product is willing to SELL.
   *
   * Default is "shipped" — absent means yes. Only a deliberate `false` withholds
   * a feature from the sell, and each one below names the evidence.
   */
  shipped?: boolean;
}

const FEATURE_GATES: Record<FeatureId, FeatureGate> = {
  trends:              { requiredTier: "free", label: "Exam Trends" },
  practice:            { requiredTier: "logged_in", freeLimit: 10, label: "Practice Questions" },
  mock_papers:         { requiredTier: "logged_in", freeLimit: 1, label: "Mock Papers" },

  // ── Premium, and LIVE. Each verified by a real route in App.tsx, not by memory.
  //    /mock-paper, /full-mock and /chapter-test all mount behind <MockViewGate>.
  unlimited_mocks:     { requiredTier: "premium", label: "Unlimited Mock Tests" },
  //    /exam-simulation → <RequirePremium><ExamSimulationPage/></RequirePremium>
  exam_simulation:     { requiredTier: "premium", label: "Exam Simulation" },
  //    /topic-hub and /topic-hub/:grade/:subject[/:topicKey] — the rebuilt hub.
  topic_hub:           { requiredTier: "premium", label: "Chapter Hub (AI Tutor)" },
  //    /weak-area-practice → <RequirePremium><WeakAreaPracticePage/></RequirePremium>
  weak_area_practice:  { requiredTier: "premium", label: "Weak Area Practice" },

  // ── Premium, and NOT SHIPPED. `shipped: false` keeps each out of the sell while
  //    leaving its gate behaviour byte-identical. The evidence is a route that no
  //    longer exists — App.tsx names all five in its retired/deferred list.
  //    "/predictive-papers DISCONNECTED + marked DEFERRED-REVIVE"
  predicted_questions: { requiredTier: "premium", label: "Predicted Questions", shipped: false },
  //    StudyPlan — retired surface (standing rule: a reference to it is evidence
  //    of deadness, never of liveness). No route.
  study_planner:       { requiredTier: "premium", label: "Smart Study Planner", shipped: false },
  //    DailyMix — retired surface, no route. [FU-FEATUREGATES-DAILY-MIX-RETIRED]
  daily_mix:           { requiredTier: "premium", label: "Daily Focus Mix", shipped: false },
  //    Dashboard — retired: "/dashboard (old Dashboard) RETIRED". No route.
  full_analytics:      { requiredTier: "premium", label: "Full Analytics Dashboard", shipped: false },
  //    "/parent-dashboard (ParentDashboardPage) DISCONNECTED + marked DEFERRED-REVIVE"
  parent_dashboard:    { requiredTier: "premium", label: "Parent Dashboard", shipped: false },
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

/**
 * The Premium sell — what an upgrade surface is allowed to promise.
 *
 * ★ TWO conditions, not one. `requiredTier === "premium"` says a feature is PAID;
 * `shipped !== false` says it EXISTS. The old implementation tested only the first
 * and therefore sold five surfaces the product had already severed from the router.
 * Both upgrade surfaces read this function, so filtering here fixes the sell
 * everywhere at once rather than in each renderer — the same reasoning that put
 * every price behind `pricing.ts`.
 */
export function getPremiumFeatureList(): { id: FeatureId; label: string }[] {
  return Object.entries(FEATURE_GATES)
    .filter(([, gate]) => gate.requiredTier === "premium" && gate.shipped !== false)
    .map(([id, gate]) => ({ id: id as FeatureId, label: gate.label }));
}

const DAILY_PRACTICE_KEY = "lazytopper.dailyPracticeCount";

export function getDailyPracticeCount(uid: string): number {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(`${DAILY_PRACTICE_KEY}:${uid}`);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (parsed?.date !== today) return 0;
    return parsed.count || 0;
  } catch {
    return 0;
  }
}

export function incrementDailyPracticeCount(uid: string): number {
  const today = new Date().toISOString().slice(0, 10);
  let count = getDailyPracticeCount(uid);
  count++;
  try {
    localStorage.setItem(`${DAILY_PRACTICE_KEY}:${uid}`, JSON.stringify({ date: today, count }));
  } catch {}
  return count;
}
