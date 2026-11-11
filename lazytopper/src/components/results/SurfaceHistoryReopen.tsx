/**
 * SPEED-PH-1 - the read-only re-opened scorecard of SurfaceHistory, split into its own lazy
 * chunk. SurfaceHistory is mounted on /practice-hub; statically importing ResultsScorecard +
 * scorecardVariants here dragged ~40 KB gz of scorecard code into that page's first load for a
 * card that only shows after a student taps a history row. Loaded via `lazySheet` (retry +
 * failure boundary) the moment `reopen` is set. Behaviour is unchanged from the inline block.
 */
import type { WorksheetGradeResponse } from "../../ai/aiClient";
import type { SessionRecord } from "../../services/sessionRecords";
import { practiceSetPaperKey } from "../../services/limitsClient";
import ResultsScorecard from "./ResultsScorecard";
import { storedWorksheetScorecardVariant } from "./scorecardVariants";

type WorksheetQuestions = NonNullable<Parameters<typeof storedWorksheetScorecardVariant>[1]["questions"]>;

export interface SurfaceHistoryReopenProps {
  record: SessionRecord;
  gradedDateLabel: string;
  onClose: () => void;
  onDownload: (() => void) | undefined;
  downloading: boolean;
  response: WorksheetGradeResponse | null;
  questions: WorksheetQuestions | undefined;
  onUploadSheet: (() => void) | undefined;
}

export default function SurfaceHistoryReopen({
  record,
  gradedDateLabel,
  onClose,
  onDownload,
  downloading,
  response,
  questions,
  onUploadSheet,
}: SurfaceHistoryReopenProps) {
  return (
    <ResultsScorecard
      // LIMITS-1 PR-2 - a stored re-open obeys the same server lock as the live card; the free
      // first-of-kind stays open (same key as when it was graded), the rest stay locked.
      limitKey={{
        kind: record.surface,
        resultKey: record.surface === "quick-practice" ? practiceSetPaperKey(record.questionIds) : record.id,
      }}
      reopened
      variant={storedWorksheetScorecardVariant(record, {
        gradedDateLabel,
        onDone: onClose,
        onDownload,
        downloading,
        response,
        questions,
        onUploadSheet,
      })}
      onClose={onClose}
    />
  );
}
