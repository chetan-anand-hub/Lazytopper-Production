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

export const cbseDates: CbseDates = {
  class10: {
    phase1: "2026-02-17",
    phase2: "2026-05-15",
    boardExam: "2026-02-17",
  },
  class12: {
    phase1: "2026-02-17",
    phase2: "2026-05-15",
    boardExam: "2026-02-17",
  },
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

export function formatCbseDateRange(start?: string | null, end?: string | null): string {
  const s = formatCbseDate(start);
  const e = formatCbseDate(end);
  if (s === 'TBD' && e === 'TBD') return 'TBD';
  if (s === 'TBD') return e;
  if (e === 'TBD') return s;
  return `${s} – ${e}`;
}
