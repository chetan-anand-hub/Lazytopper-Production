import { buildSubjectPlan, type SubjectKey, type SubjectPlanRow } from "../utils/buildStudyPlan";

export type VibeMode = "beast" | "zombie";
export type PlannerFeasibilityBand = "risk" | "stretch" | "on-track";

export interface StrategyInputs {
  grade: string;
  subject: SubjectKey;
  daysLeft: number;
  hoursPerDay: number;
  targetPercent: number;
  vibe?: VibeMode;
  weakChapters?: string[];
}

export interface DailyMixSuggestion {
  topicKey: string;
  topicLabel: string;
  minutes: number;
}

export interface StrategyPlanMeta {
  effectiveStudyDays: number;
  grossHours: number;
  effectiveHours: number;
  coreHours: number;
  revisionHours: number;
  mockHours: number;
  phaseDays: {
    foundation: number;
    consolidation: number;
    sprint: number;
  };
  feasibilityBand: PlannerFeasibilityBand;
  expectedMasteryRange: [number, number];
  capacityGapHours: number;
}

export interface StrategyPlan {
  subject: SubjectKey;
  planRows: SubjectPlanRow[];
  dailyMix: DailyMixSuggestion;
  meta: StrategyPlanMeta;
}

function clamp(num: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, num));
}

function recommendedHoursPerDay(targetPercent: number): number {
  if (!Number.isFinite(targetPercent) || targetPercent <= 0) return 1.0;
  if (targetPercent <= 60) return 1.0;
  if (targetPercent <= 70) return 1.3;
  if (targetPercent <= 80) return 1.6;
  if (targetPercent <= 90) return 2.0;
  return 2.4;
}

function adherenceFactor(daysLeft: number, hoursPerDay: number): number {
  const daysFactor = daysLeft < 25 ? 0.88 : daysLeft < 50 ? 0.84 : 0.8;
  const hoursFactor = hoursPerDay <= 1.5 ? 0.95 : hoursPerDay <= 3 ? 0.9 : 0.85;
  return clamp(daysFactor * hoursFactor, 0.72, 0.95);
}

function reserveSplit(targetPercent: number): { revision: number; mocks: number } {
  if (targetPercent >= 90) return { revision: 0.18, mocks: 0.16 };
  if (targetPercent >= 80) return { revision: 0.16, mocks: 0.14 };
  if (targetPercent >= 70) return { revision: 0.14, mocks: 0.12 };
  return { revision: 0.12, mocks: 0.1 };
}

function phaseSplit(daysLeft: number): { foundation: number; consolidation: number; sprint: number } {
  if (daysLeft <= 20) return { foundation: 0.35, consolidation: 0.25, sprint: 0.4 };
  if (daysLeft <= 45) return { foundation: 0.45, consolidation: 0.3, sprint: 0.25 };
  return { foundation: 0.5, consolidation: 0.3, sprint: 0.2 };
}

function allocateCoreHours(
  rows: SubjectPlanRow[],
  coreHours: number,
  weakChapters: string[]
): SubjectPlanRow[] {
  if (!rows.length || !Number.isFinite(coreHours) || coreHours <= 0) return [];
  const weakSet = new Set(weakChapters.map((c) => String(c || "").toLowerCase().trim()));
  const boosted = rows.map((row) => {
    const isWeak = weakSet.has(String(row.topicKey || "").toLowerCase().trim());
    const tierBoost = row.tier === "must-crack" ? 1.22 : row.tier === "high-roi" ? 1.08 : 0.94;
    const weakBoost = isWeak ? 1.3 : 1;
    const weight = Math.max(0.1, row.hours * tierBoost * weakBoost);
    return { ...row, _weight: weight } as SubjectPlanRow & { _weight: number };
  });

  const totalWeight = boosted.reduce((sum, row) => sum + row._weight, 0) || 1;
  const minHourByTier: Record<SubjectPlanRow["tier"], number> = {
    "must-crack": 1.8,
    "high-roi": 1.2,
    "good-to-do": 0.8,
  };

  let draft = boosted.map((row) => ({
    ...row,
    hours: (row._weight / totalWeight) * coreHours,
  }));

  const minTotal = draft.reduce((sum, row) => sum + minHourByTier[row.tier], 0);
  if (coreHours >= minTotal) {
    draft = draft.map((row) => ({
      ...row,
      hours: Math.max(row.hours, minHourByTier[row.tier]),
    }));
  }

  const adjustedTotal = draft.reduce((sum, row) => sum + row.hours, 0) || 1;
  const scale = coreHours / adjustedTotal;

  return draft
    .map((row) => ({
      topicKey: row.topicKey,
      topicName: row.topicName,
      tier: row.tier,
      weightagePercent: row.weightagePercent,
      hours: Number((row.hours * scale).toFixed(1)),
    }))
    .sort((a, b) => b.hours - a.hours);
}

function estimateExpectedMastery(targetPercent: number, effectiveHours: number, requiredHours: number): [number, number] {
  const ratio = requiredHours > 0 ? effectiveHours / requiredHours : 1;
  const baseline = clamp(targetPercent - 18, 45, 90);
  const min = clamp(baseline + (ratio - 0.7) * 18, 40, 95);
  const max = clamp(min + 8 + (ratio - 1) * 6, min + 1, 98);
  return [Math.round(min), Math.round(max)];
}

function classifyFeasibility(effectiveHours: number, requiredHours: number): PlannerFeasibilityBand {
  if (requiredHours <= 0) return "on-track";
  const ratio = effectiveHours / requiredHours;
  if (ratio >= 1.0) return "on-track";
  if (ratio >= 0.8) return "stretch";
  return "risk";
}

function computeRequiredHours(daysLeft: number, targetPercent: number): number {
  const baselinePerDay = recommendedHoursPerDay(targetPercent);
  return Math.max(16, baselinePerDay * Math.max(1, daysLeft));
}

function buildDailyMix(
  rows: SubjectPlanRow[],
  vibe: VibeMode,
  weakChapters: string[]
): DailyMixSuggestion {
  const minutesTotal = vibe === "zombie" ? 35 : 60;
  if (!rows.length) return { topicKey: "", topicLabel: "", minutes: minutesTotal };
  const weakSet = new Set(weakChapters.map((c) => String(c || "").toLowerCase().trim()));
  const ranked = [...rows].sort((a, b) => {
    const aWeak = weakSet.has(String(a.topicKey || "").toLowerCase().trim()) ? 0.6 : 0;
    const bWeak = weakSet.has(String(b.topicKey || "").toLowerCase().trim()) ? 0.6 : 0;
    return b.hours + bWeak - (a.hours + aWeak);
  });
  const top = ranked[0];
  return { topicKey: top.topicKey, topicLabel: top.topicName, minutes: minutesTotal };
}

export function generateStrategyPlan(inputs: StrategyInputs): StrategyPlan {
  const {
    subject,
    daysLeft,
    hoursPerDay,
    targetPercent,
    vibe = "beast",
    weakChapters = [],
  } = inputs;

  const safeDays = Math.max(1, Math.round(Number(daysLeft) || 0));
  const plannedHoursPerDay = Number.isFinite(hoursPerDay) && hoursPerDay > 0
    ? hoursPerDay
    : recommendedHoursPerDay(targetPercent);

  const effectiveDaysRatio = safeDays <= 20 ? 0.92 : safeDays <= 50 ? 0.88 : 0.84;
  const effectiveStudyDays = Math.max(1, Math.round(safeDays * effectiveDaysRatio));
  const grossHours = effectiveStudyDays * plannedHoursPerDay;
  const effectiveHours = Number((grossHours * adherenceFactor(safeDays, plannedHoursPerDay)).toFixed(1));

  const reserve = reserveSplit(targetPercent);
  const revisionHours = Number((effectiveHours * reserve.revision).toFixed(1));
  const mockHours = Number((effectiveHours * reserve.mocks).toFixed(1));
  const coreHours = Number(Math.max(4, effectiveHours - revisionHours - mockHours).toFixed(1));

  const baseRows = buildSubjectPlan(subject, coreHours);
  const planRows = allocateCoreHours(baseRows, coreHours, weakChapters);
  const dailyMix = buildDailyMix(planRows, vibe, weakChapters);

  const phase = phaseSplit(safeDays);
  const phaseDays = {
    foundation: Math.max(1, Math.round(safeDays * phase.foundation)),
    consolidation: Math.max(1, Math.round(safeDays * phase.consolidation)),
    sprint: Math.max(1, safeDays - Math.round(safeDays * phase.foundation) - Math.round(safeDays * phase.consolidation)),
  };

  const requiredHours = computeRequiredHours(safeDays, targetPercent);
  const feasibilityBand = classifyFeasibility(effectiveHours, requiredHours);
  const expectedMasteryRange = estimateExpectedMastery(targetPercent, effectiveHours, requiredHours);
  const capacityGapHours = Number(Math.max(0, requiredHours - effectiveHours).toFixed(1));

  return {
    subject,
    planRows,
    dailyMix,
    meta: {
      effectiveStudyDays,
      grossHours: Number(grossHours.toFixed(1)),
      effectiveHours,
      coreHours,
      revisionHours,
      mockHours,
      phaseDays,
      feasibilityBand,
      expectedMasteryRange,
      capacityGapHours,
    },
  };
}

