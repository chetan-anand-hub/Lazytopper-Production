// src/services/strategyStorage.ts
// Import the latest `StrategyPlan` type from our strategy engine.  The
// previous version of this file referenced `StrategyPlanV1` which is
// no longer exported by the engine.  The new type remains
// structurally compatible with the persisted JSON representation
// (subject, planRows, dailyMix).
import type { StrategyPlan } from "./strategyEngine";

// Storage key for persisting the study strategy plan.  The suffix
// `.v1` remains for backward compatibility with existing data in
// localStorage.  Changing this key would orphan existing saved
// plans, so we leave it unchanged even though the underlying type has
// evolved.
const KEY = "lazytopper.strategyPlan.v1";

export function saveStrategyPlanV1(plan: StrategyPlan): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(plan));
  } catch {
    // ignore
  }
}

export function loadStrategyPlanV1(): StrategyPlan | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StrategyPlan;
  } catch {
    return null;
  }
}

export function clearStrategyPlanV1(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
