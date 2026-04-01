export type CbseDates = {
  class10: {
    boardExam?: string | null;
  };
  class12: {
    boardExam?: string | null;
  };
};

export const cbseDates: CbseDates = {
  class10: {
    boardExam: null,
  },
  class12: {
    boardExam: null,
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
