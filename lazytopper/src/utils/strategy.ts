export interface StudentProfile {
  studentClass: "10" | "12";
  daysLeft: number;
  targetPercent: number;
  hoursPerDay: number;
  // optional: estimate of current performance (avg of last 3 tests etc.)
  currentPercent?: number;
}

export interface StrategyResult {
  realisticMin: number;
  realisticMax: number;
  hoursPerDayRequired: number;
  effortStatus: "low" | "ok" | "high";
}

export function calculateStrategy(profile: StudentProfile): StrategyResult {
  const { daysLeft, targetPercent, hoursPerDay, currentPercent } = profile;

  const safeDays = Math.max(daysLeft, 1);
  const safeHoursPerDay = Math.max(hoursPerDay, 0.5);

  // Approximate total effort hours needed for a given performance band
  const baseHoursForPercent = (percent: number) => {
    if (percent >= 90) return 240;
    if (percent >= 80) return 180;
    if (percent >= 70) return 130;
    if (percent >= 60) return 90;
    return 70; // below 60
  };

  const baseForTarget = baseHoursForPercent(targetPercent);

  // If we have last-3-marks, we use them.
  // Otherwise assume they are ~10% below target or around 60%.
  const assumedCurrent =
    typeof currentPercent === "number"
      ? currentPercent
      : Math.max(Math.min(targetPercent - 10, 70), 50);

  const baseForCurrent = baseHoursForPercent(assumedCurrent);

  // We only need the *gap* effort from current to target,
  // but we enforce a minimum so it's not unrealistically low.
  const gapHours = Math.max(
    baseForTarget - baseForCurrent,
    baseForTarget * 0.4
  );

  const requiredTotalHours = gapHours;
  const availableTotalHours = safeDays * safeHoursPerDay;

  const hoursPerDayRequired = requiredTotalHours / safeDays;
  const effortRatio = availableTotalHours / requiredTotalHours;

  let realisticMin = targetPercent;
  let realisticMax = targetPercent;
  let effortStatus: StrategyResult["effortStatus"] = "ok";

  if (effortRatio >= 1.1) {
    realisticMin = Math.max(targetPercent - 2, 50);
    realisticMax = Math.min(targetPercent + 8, 95);
    effortStatus = "high";
  } else if (effortRatio >= 0.8) {
    realisticMin = Math.max(targetPercent - 5, 50);
    realisticMax = Math.min(targetPercent + 3, 95);
    effortStatus = "ok";
  } else if (effortRatio >= 0.5) {
    const drop = Math.round((1 - effortRatio) * 20);
    realisticMax = targetPercent - drop;
    realisticMin = realisticMax - 8;
    effortStatus = "low";
  } else {
    realisticMax = Math.max(targetPercent - 20, 40);
    realisticMin = Math.max(realisticMax - 10, 30);
    effortStatus = "low";
  }

  realisticMin = Math.max(30, Math.min(realisticMin, 95));
  realisticMax = Math.max(realisticMin + 1, Math.min(realisticMax, 98));

  return {
    realisticMin,
    realisticMax,
    hoursPerDayRequired: Number(hoursPerDayRequired.toFixed(1)),
    effortStatus,
  };
}
