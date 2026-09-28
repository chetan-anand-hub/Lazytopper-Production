import { predictCbseExamDate, predictCbsePhase2Date } from "../services/cbseExamDate";

export type CbseExamPhase = "phase1" | "phase2";

export type CbseClassDates = {
  phase1: string | null;
  phase2: string | null;
  boardExam?: string | null;
};

export type CbseDates = {
  class10: CbseClassDates;
  class12: CbseClassDates;
};

/**
 * BOARD-DATE-1 (D2) — no hard-coded year. Every field is a GETTER that asks the one
 * client predictor at READ time, so SprintDashboard and Onboarding show the same board
 * date as the landing countdown (`predictCbseExamDate("10")` in Welcome.tsx), and a tab
 * left open across a board day never keeps last year's date. (Evaluating the predictor
 * once at module load would freeze the date for the life of the tab — the trap
 * Welcome.tsx documents for its own anchor.)
 */
function classDates(studentClass: "10" | "12"): CbseClassDates {
  return {
    get phase1() {
      return predictCbseExamDate(studentClass);
    },
    get phase2() {
      return predictCbsePhase2Date(studentClass);
    },
    get boardExam() {
      return predictCbseExamDate(studentClass);
    },
  };
}

export const cbseDates: CbseDates = {
  class10: classDates("10"),
  class12: classDates("12"),
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatCbseDate(dateStr?: string | null): string {
  if (!dateStr) {
    return 'TBD';
  }

  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) {
    return 'TBD';
  }

  return dateFormatter.format(parsed);
}

/**
 * Owner ruling 5 (2026-09-28) — an exact board / phase-2 day that is PREDICTED must say
 * so: "17 Feb 2027 (expected)". A date from CBSE's notice or the admin override
 * (`source: "official"`) shows bare, so the label disappears once CBSE announces.
 * A screen that only has the synchronous predictor passes nothing — always "expected".
 */
export function formatExpectedCbseDate(
  dateStr?: string | null,
  source: "official" | "predicted" = "predicted",
): string {
  const text = formatCbseDate(dateStr);
  if (text === 'TBD' || source === 'official') return text;
  return `${text} (expected)`;
}

export function formatCbseDateRange(start?: string | null, end?: string | null): string {
  const s = formatCbseDate(start);
  const e = formatCbseDate(end);
  if (s === 'TBD' && e === 'TBD') return 'TBD';
  if (s === 'TBD') return e;
  if (e === 'TBD') return s;
  return `${s} – ${e}`;
}
