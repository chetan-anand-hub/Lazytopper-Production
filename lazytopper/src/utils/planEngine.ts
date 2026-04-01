// src/utils/planEngine.ts
import {
  class10TopicTrendList,
  type TopicTier,
} from "../data/class10MathTopicTrends";
import {
  class10ScienceTopicTrendList,
  type TierKey as ScienceTierKey,
} from "../data/class10ScienceTopicTrends";

export type PlannerSubjectKey = "Maths" | "Science";

export interface PlannerInputs {
  daysLeft: number;
  mathTargetPercent: number;
  scienceTargetPercent: number;
  mathHoursPerDay: number;
  scienceHoursPerDay: number;
}

/**
 * New mastery model (Option B) – used by the smart planner.
 * Keep strings lowercase & hyphenated to avoid confusion.
 */
export type MasteryBand = "very-weak" | "weak" | "moderate" | "strong";

export type MasteryMap = Record<string, MasteryBand>; // chapterKey → mastery

/**
 * HPQ metadata structure used by the planner.
 * You can later wire this to your actual prediction engine JSON.
 */
export interface HPQQuestionMeta {
  id: string;
  subject: PlannerSubjectKey;
  chapterKey: string; // should match topicKey/topicName used below
  text: string;
  marks: number;
  difficulty: "easy" | "medium" | "hard";
  likelihood: number; // 0–100
  blueprintSlot?: string; // e.g. "[5 marks, LA]" or "[1 mark, MCQ]"
  tags?: string[]; // e.g. ["Sample-paper", "NEP-shift"]
}

export type HPQBankBySubject = {
  Maths: HPQQuestionMeta[];
  Science: HPQQuestionMeta[];
};

type AnyTier = TopicTier | ScienceTierKey | undefined;

// Simple multipliers so “must-crack” gets more days than “good-to-do”
const TIER_MULTIPLIER: Record<string, number> = {
  "must-crack": 1.3,
  "high-roi": 1.1,
  "good-to-do": 0.8,
};

/**
 * Multiplier based on mastery:
 * - very-weak → needs more time
 * - strong → can survive on less time + HPQ focus
 */
const MASTERY_MULTIPLIER: Record<MasteryBand, number> = {
  "very-weak": 1.4,
  weak: 1.2,
  moderate: 1.0,
  strong: 0.7,
};

interface ChapterPlan {
  name: string;
  tier: AnyTier;
  weightage: number;
  daysAllocated: number;
}

/**
 * More detailed internal structure for smart planner.
 */
interface ChapterAllocation {
  chapterKey: string;
  displayName: string;
  tier: AnyTier;
  weightage: number;
  mastery: MasteryBand;
  // total "target hours" for this chapter for this subject
  targetHours: number;

  // internal remaining buckets (will be decremented as we assign blocks)
  remainingConceptHours: number;
  remainingHPQHours: number;
  remainingMixedHours: number;
}

/**
 * A single study block in the generated plan.
 */
export type StudyBlockType =
  | "concept"
  | "hpq-practice"
  | "mixed-practice"
  | "mock";

export interface StudyBlock {
  subject: PlannerSubjectKey;
  chapterKey: string;
  chapterName: string;
  blockType: StudyBlockType;
  durationHours: number;
  mastery: MasteryBand;
  hpqQuestionIds?: string[]; // IDs to pull from HPQ view / practice page
  notes?: string;
}

/**
 * A day's plan.
 */
export interface DayPlan {
  dayIndex: number; // 1-based
  label: string; // e.g. "Day 1", or later: date-based
  blocks: StudyBlock[];
}

/**
 * Overall study plan exported to UI + Mentor.
 */
export interface StudyPlan {
  totalDays: number;
  generatedAt: string;
  days: DayPlan[];
  // For debugging / analytics, we also return how we allocated subject hours.
  meta: {
    inputs: SmartPlannerInputs;
    totalMathHours: number;
    totalScienceHours: number;
  };
}

// -------------------- EXISTING HELPER LOGIC --------------------

function getTierMultiplier(tier: AnyTier): number {
  if (!tier) return 1;
  return TIER_MULTIPLIER[tier] ?? 1;
}

function buildSubjectChapterPlans(
  subject: PlannerSubjectKey,
  subjectDays: number
): ChapterPlan[] {
  if (subjectDays <= 0) return [];

  if (subject === "Maths") {
    // Maths: use topic trend list
    const sorted = [...class10TopicTrendList].sort(
      (a, b) => b.weightagePercent - a.weightagePercent
    );

    const totalEffective = sorted.reduce((sum, t) => {
      const m = getTierMultiplier(t.tier);
      return sum + t.weightagePercent * m;
    }, 0);

    return sorted.map((t) => {
      const m = getTierMultiplier(t.tier);
      const effective = t.weightagePercent * m;
      const fraction = totalEffective > 0 ? effective / totalEffective : 0;
      // At least 1 day for any chapter that appears in the plan
      const daysAllocated = Math.max(1, Math.round(subjectDays * fraction));

      return {
        name: t.topicKey,
        tier: t.tier,
        weightage: t.weightagePercent,
        daysAllocated,
      };
    });
  }

  // Science
  const sortedSci = [...class10ScienceTopicTrendList].sort(
    (a, b) => b.weightagePercent - a.weightagePercent
  );

  const totalEffectiveSci = sortedSci.reduce((sum, t) => {
    const m = getTierMultiplier(t.tier);
    return sum + t.weightagePercent * m;
  }, 0);

  return sortedSci.map((t) => {
    const m = getTierMultiplier(t.tier);
    const effective = t.weightagePercent * m;
    const fraction = totalEffectiveSci > 0 ? effective / totalEffectiveSci : 0;
    const daysAllocated = Math.max(1, Math.round(subjectDays * fraction));

    return {
      name: t.topicName,
      tier: t.tier,
      weightage: t.weightagePercent,
      daysAllocated,
    };
  });
}

// Nice teacher-y label
function tierLabel(tier: AnyTier): string {
  if (tier === "must-crack") return "🔥 must-crack";
  if (tier === "high-roi") return "💎 high-ROI";
  if (tier === "good-to-do") return "🌈 good-to-do";
  return "";
}

/**
 * Builds a text snapshot for the Mentor panel *and* for the Study Plan page.
 * Persona: CBSE teacher with 20+ years of guiding Class 10 students.
 *
 * NOTE: Kept exactly as earlier so no existing usage breaks.
 */
export function buildPlannerSnapshot(inputs: PlannerInputs): string {
  const {
    daysLeft,
    mathTargetPercent,
    scienceTargetPercent,
    mathHoursPerDay,
    scienceHoursPerDay,
  } = inputs;

  const totalHours = mathHoursPerDay + scienceHoursPerDay;
  const safeDays = Math.max(0, daysLeft);

  // If a student gives zero hours (it happens 😅)
  if (totalHours <= 0 || safeDays <= 0) {
    return [
      "Let’s set up something realistic first 👇",
      "",
      "• You’ve currently set 0 hours/day or 0 days left.",
      "• For a meaningful plan, give me at least 1 hour/day and a realistic days-to-boards estimate.",
      "",
      "Once that’s in place, I’ll break the time between Maths and Science using chapter weightage + your targets.",
    ].join("\n");
  }

  // Split days between subjects in proportion to hours/day
  const mathsDayShare = mathHoursPerDay / totalHours;
  const scienceDayShare = scienceHoursPerDay / totalHours;

  const mathsDays = Math.max(5, Math.round(safeDays * mathsDayShare));
  const scienceDays = Math.max(5, Math.round(safeDays * scienceDayShare));

  const mathsChapters = buildSubjectChapterPlans("Maths", mathsDays);
  const scienceChapters = buildSubjectChapterPlans("Science", scienceDays);

  // Limit to top chapters for snapshot (full list can go on Study Plan page)
  const topMaths = mathsChapters.slice(0, 7);
  const topScience = scienceChapters.slice(0, 7);

  const headerLines = [
    "Planner snapshot based on current inputs (teacher-mode) 👇",
    "",
    `• Days left to boards: ${safeDays}`,
    `• Maths target: ${mathTargetPercent}%  |  Hours/day: ${mathHoursPerDay}`,
    `• Science target: ${scienceTargetPercent}%  |  Hours/day: ${scienceHoursPerDay}`,
    "",
    "I’m assuming you’ll also study other subjects, so I’m keeping this plan realistic, not brutal.",
    "",
  ];

  const mathsLines: string[] = [
    "MATHS – high impact first:",
    `→ Roughly ${mathsDays} focused Maths days over the next ${safeDays} days.`,
  ];

  topMaths.forEach((ch) => {
    mathsLines.push(
      `• ${ch.name}  (${ch.weightage}% paper)${
        tierLabel(ch.tier) ? " · " + tierLabel(ch.tier) : ""
      } – ~${ch.daysAllocated} day(s) of first-time study + practice`
    );
  });

  mathsLines.push(
    "• Last 7–10 days: only revision + PYQ/HPQ mocks from these same chapters."
  );

  const scienceLines: string[] = [
    "",
    "SCIENCE – keep Physics, Chem, Bio balanced:",
    `→ Roughly ${scienceDays} focused Science days over the next ${safeDays} days.`,
  ];

  topScience.forEach((ch) => {
    scienceLines.push(
      `• ${ch.name}  (${ch.weightage}% paper)${
        tierLabel(ch.tier) ? " · " + tierLabel(ch.tier) : ""
      } – ~${ch.daysAllocated} day(s) for concept notes + NCERT + PYQs`
    );
  });

  scienceLines.push(
    "• Final 7–10 days: only full-syllabus revision + mixed chapter practice papers."
  );

  const closingLines = [
    "",
    "This is your high-level roadmap. On the Study Plan page, we’ll break this into a day-wise timetable you can tick off.",
  ];

  return [
    ...headerLines,
    ...mathsLines,
    ...scienceLines,
    ...closingLines,
  ].join("\n");
}

// -------------------- NEW SMART PLANNER (MASTERY + HPQ) --------------------

/**
 * Inputs for the *structured* smart planner (uses mastery + HPQ).
 * We keep the old PlannerInputs for snapshot, and extend it here.
 */
export interface SmartPlannerInputs extends PlannerInputs {
  mathMastery: MasteryMap; // key: maths topicKey
  scienceMastery: MasteryMap; // key: science topicName
}

/**
 * Helper: get mastery band with sensible default.
 */
function getMasteryForChapter(
  chapterKey: string,
  masteryMap: MasteryMap
): MasteryBand {
  return masteryMap[chapterKey] ?? "moderate";
}

/**
 * Build chapter allocations (with target hours) for a subject.
 * Combines: blueprint weightage, tier, and mastery multipliers.
 */
function buildChapterAllocationsForSubject(
  subject: PlannerSubjectKey,
  daysLeft: number,
  hoursPerDay: number,
  masteryMap: MasteryMap
): ChapterAllocation[] {
  if (daysLeft <= 0 || hoursPerDay <= 0) return [];

  const totalSubjectHours = daysLeft * hoursPerDay;

  if (subject === "Maths") {
    const sorted = [...class10TopicTrendList].sort(
      (a, b) => b.weightagePercent - a.weightagePercent
    );

    // Effective weight combines blueprint weightage, tier, mastery
    const totalEffective = sorted.reduce((sum, t) => {
      const tierMul = getTierMultiplier(t.tier);
      const mastery = getMasteryForChapter(t.topicKey, masteryMap);
      const masteryMul = MASTERY_MULTIPLIER[mastery];
      return sum + t.weightagePercent * tierMul * masteryMul;
    }, 0);

    return sorted.map<ChapterAllocation>((t) => {
      const mastery = getMasteryForChapter(t.topicKey, masteryMap);
      const tierMul = getTierMultiplier(t.tier);
      const masteryMul = MASTERY_MULTIPLIER[mastery];
      const effective = t.weightagePercent * tierMul * masteryMul;
      const fraction = totalEffective > 0 ? effective / totalEffective : 0;
      const chapterHours = totalSubjectHours * fraction;

      // Split chapterHours into buckets depending on mastery band
      const { conceptFrac, hpqFrac, mixedFrac } = getBucketFractions(mastery);

      return {
        chapterKey: t.topicKey,
        displayName: t.topicKey, // topicKey is already a nice identifier
        tier: t.tier,
        weightage: t.weightagePercent,
        mastery,
        targetHours: chapterHours,
        remainingConceptHours: chapterHours * conceptFrac,
        remainingHPQHours: chapterHours * hpqFrac,
        remainingMixedHours: chapterHours * mixedFrac,
      };
    });
  }

  // Science
  const sortedSci = [...class10ScienceTopicTrendList].sort(
    (a, b) => b.weightagePercent - a.weightagePercent
  );

  const totalEffectiveSci = sortedSci.reduce((sum, t) => {
    const tierMul = getTierMultiplier(t.tier);
    const mastery = getMasteryForChapter(t.topicName, masteryMap);
    const masteryMul = MASTERY_MULTIPLIER[mastery];
    return sum + t.weightagePercent * tierMul * masteryMul;
  }, 0);

  return sortedSci.map<ChapterAllocation>((t) => {
    const mastery = getMasteryForChapter(t.topicName, masteryMap);
    const tierMul = getTierMultiplier(t.tier);
    const masteryMul = MASTERY_MULTIPLIER[mastery];
    const effective = t.weightagePercent * tierMul * masteryMul;
    const fraction = totalEffectiveSci > 0 ? effective / totalEffectiveSci : 0;
    const chapterHours = totalSubjectHours * fraction;

    const { conceptFrac, hpqFrac, mixedFrac } = getBucketFractions(mastery);

    return {
      chapterKey: t.topicName,
      displayName: t.topicName,
      tier: t.tier,
      weightage: t.weightagePercent,
      mastery,
      targetHours: chapterHours,
      remainingConceptHours: chapterHours * conceptFrac,
      remainingHPQHours: chapterHours * hpqFrac,
      remainingMixedHours: chapterHours * mixedFrac,
    };
  });
}

/**
 * Decide how to split chapter hours into Concept vs HPQ vs Mixed,
 * depending on mastery band – teacher-intuition encoded.
 */
function getBucketFractions(mastery: MasteryBand): {
  conceptFrac: number;
  hpqFrac: number;
  mixedFrac: number;
} {
  switch (mastery) {
    case "very-weak":
      return { conceptFrac: 0.5, hpqFrac: 0.3, mixedFrac: 0.2 };
    case "weak":
      return { conceptFrac: 0.4, hpqFrac: 0.4, mixedFrac: 0.2 };
    case "moderate":
      return { conceptFrac: 0.25, hpqFrac: 0.5, mixedFrac: 0.25 };
    case "strong":
      return { conceptFrac: 0.1, hpqFrac: 0.6, mixedFrac: 0.3 };
    default:
      return { conceptFrac: 0.3, hpqFrac: 0.4, mixedFrac: 0.3 };
  }
}

/**
 * Pick HPQ question IDs for a chapter, sorted by likelihood.
 * We only pick a small number for each block (can tune later).
 */
function pickHPQsForChapter(
  hpqBank: HPQQuestionMeta[],
  chapterKey: string,
  maxCount: number
): string[] {
  return hpqBank
    .filter((q) => q.chapterKey === chapterKey)
    .sort((a, b) => b.likelihood - a.likelihood)
    .slice(0, maxCount)
    .map((q) => q.id);
}

/**
 * Core smart planner.
 *
 * - Uses daysLeft, hours/day, mastery, and HPQ bank
 * - Generates a day-wise JSON plan with blocks for each subject
 * - Last ~7 days tilt more towards mocks (hpq-practice/mixed-practice)
 */
export function buildSmartStudyPlan(
  inputs: SmartPlannerInputs,
  hpqBank: HPQBankBySubject
): StudyPlan {
  const {
    daysLeft,
    mathHoursPerDay,
    scienceHoursPerDay,
    mathMastery,
    scienceMastery,
  } = inputs;

  const safeDays = Math.max(0, daysLeft);
  const totalMathHours = safeDays * Math.max(0, mathHoursPerDay);
  const totalScienceHours = safeDays * Math.max(0, scienceHoursPerDay);

  if (safeDays <= 0 || (totalMathHours <= 0 && totalScienceHours <= 0)) {
    return {
      totalDays: 0,
      generatedAt: new Date().toISOString(),
      days: [],
      meta: {
        inputs,
        totalMathHours,
        totalScienceHours,
      },
    };
  }

  // Build allocations per subject
  const mathAllocations = buildChapterAllocationsForSubject(
    "Maths",
    safeDays,
    Math.max(0, mathHoursPerDay),
    mathMastery
  );
  const sciAllocations = buildChapterAllocationsForSubject(
    "Science",
    safeDays,
    Math.max(0, scienceHoursPerDay),
    scienceMastery
  );

  // Helper pointers so we can loop through chapters in priority order.
  const mathChaptersSorted = [...mathAllocations].sort(
    (a, b) => b.targetHours - a.targetHours
  );
  const sciChaptersSorted = [...sciAllocations].sort(
    (a, b) => b.targetHours - a.targetHours
  );

  const days: DayPlan[] = [];

  for (let dayIndex = 1; dayIndex <= safeDays; dayIndex++) {
    const blocks: StudyBlock[] = [];
    const isLastWeek = dayIndex > safeDays - 7 && safeDays >= 10;

    // Maths blocks for the day
    if (mathHoursPerDay > 0 && mathChaptersSorted.length > 0) {
      allocateSubjectBlocksForDay({
        subject: "Maths",
        hoursForDay: mathHoursPerDay,
        isLastWeek,
        chapterAllocations: mathChaptersSorted,
        hpqBank: hpqBank.Maths,
        pushBlock: (b) => blocks.push(b),
      });
    }

    // Science blocks for the day
    if (scienceHoursPerDay > 0 && sciChaptersSorted.length > 0) {
      allocateSubjectBlocksForDay({
        subject: "Science",
        hoursForDay: scienceHoursPerDay,
        isLastWeek,
        chapterAllocations: sciChaptersSorted,
        hpqBank: hpqBank.Science,
        pushBlock: (b) => blocks.push(b),
      });
    }

    days.push({
      dayIndex,
      label: `Day ${dayIndex}`,
      blocks,
    });
  }

  return {
    totalDays: safeDays,
    generatedAt: new Date().toISOString(),
    days,
    meta: {
      inputs,
      totalMathHours,
      totalScienceHours,
    },
  };
}

// -------------------- INTERNAL ALLOCATION HELPER --------------------

interface AllocateSubjectBlocksParams {
  subject: PlannerSubjectKey;
  hoursForDay: number;
  isLastWeek: boolean;
  chapterAllocations: ChapterAllocation[];
  hpqBank: HPQQuestionMeta[];
  pushBlock: (block: StudyBlock) => void;
}

/**
 * Distributes a subject's hours for a single day across its chapters.
 * Uses remaining concept/HPQ/mixed hours and tweaks in last week for mocks.
 */
function allocateSubjectBlocksForDay(params: AllocateSubjectBlocksParams) {
  const {
    subject,
    hoursForDay,
    isLastWeek,
    chapterAllocations,
    hpqBank,
    pushBlock,
  } = params;

  let remainingDayHours = hoursForDay;
  const MIN_BLOCK = 0.5; // half-hour blocks to avoid tiny pieces

  while (remainingDayHours >= MIN_BLOCK) {
    // Pick chapter with highest remaining total hours
    const chapter = chapterAllocations
      .filter(
        (ch) =>
          ch.remainingConceptHours > 0 ||
          ch.remainingHPQHours > 0 ||
          ch.remainingMixedHours > 0
      )
      .sort(
        (a, b) =>
          (b.remainingConceptHours +
            b.remainingHPQHours +
            b.remainingMixedHours) -
          (a.remainingConceptHours +
            a.remainingHPQHours +
            a.remainingMixedHours)
      )[0];

    if (!chapter) break; // everything exhausted

    // Decide block type for this chapter
    let blockType: StudyBlockType;
    if (isLastWeek) {
      // In the last week, lean towards hpq-practice/mixed-practice/mocks
      if (chapter.remainingHPQHours > MIN_BLOCK) {
        blockType = "hpq-practice";
      } else if (chapter.remainingMixedHours > MIN_BLOCK) {
        blockType = "mixed-practice";
      } else if (chapter.remainingConceptHours > MIN_BLOCK) {
        blockType = "concept";
      } else {
        // If almost done, treat as mock-style mixed practice
        blockType = "mock";
      }
    } else {
      // Normal days: concept first (if weak), then HPQ, then mixed
      if (chapter.remainingConceptHours > MIN_BLOCK) {
        blockType = "concept";
      } else if (chapter.remainingHPQHours > MIN_BLOCK) {
        blockType = "hpq-practice";
      } else if (chapter.remainingMixedHours > MIN_BLOCK) {
        blockType = "mixed-practice";
      } else {
        // If all buckets nearly used, treat as hpq-practice
        blockType = "hpq-practice";
      }
    }

    // Block duration – 0.5h or remainingDayHours at minimum
    const blockDuration = Math.min(1, remainingDayHours); // 1-hour chunks are friendlier
    remainingDayHours -= blockDuration;

    // Deduct from respective bucket
    switch (blockType) {
      case "concept":
        chapter.remainingConceptHours = Math.max(
          0,
          chapter.remainingConceptHours - blockDuration
        );
        break;
      case "hpq-practice":
        chapter.remainingHPQHours = Math.max(
          0,
          chapter.remainingHPQHours - blockDuration
        );
        break;
      case "mixed-practice":
        chapter.remainingMixedHours = Math.max(
          0,
          chapter.remainingMixedHours - blockDuration
        );
        break;
      case "mock":
        // mock doesn't strictly deduct – it broadly counts as mixed practice
        chapter.remainingMixedHours = Math.max(
          0,
          chapter.remainingMixedHours - blockDuration
        );
        break;
    }

    // Attach HPQ question IDs when relevant
    let hpqQuestionIds: string[] | undefined;
    if (blockType === "hpq-practice" || blockType === "mixed-practice") {
      hpqQuestionIds = pickHPQsForChapter(hpqBank, chapter.chapterKey, 4);
    }

    const block: StudyBlock = {
      subject,
      chapterKey: chapter.chapterKey,
      chapterName: chapter.displayName,
      blockType,
      durationHours: blockDuration,
      mastery: chapter.mastery,
      hpqQuestionIds,
    };

    if (blockType === "mock") {
      block.notes =
        "Full-syllabus / mixed mock block. Use HPQ + PYQ sets for timed practice.";
    }

    pushBlock(block);
  }
}
