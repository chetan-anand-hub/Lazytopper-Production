/**
 * registerPackPaper (PACKS-GRADE-1) — files a downloaded pack paper under its printed code through the
 * EXISTING download-record functions, so a "waiting for your answers" card appears and the upload goes to the
 * existing grader with the stored paper. Nothing here grades, scores or writes a new kind of record; the
 * "never replace a graded record" guards live in those functions and apply unchanged.
 */
import type { AuthUser } from "../../context/AuthContext";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import { recordWorksheetDownload } from "../../services/worksheetPaperStore";
import { recordPaperDownload } from "../../components/papers/paperDownloadRecord";
import { buildChapterTestSessionRecord, buildFullMockSessionRecord, type SessionSubject } from "../../services/sessionRecords";
import { saveChapterTestPaper } from "../../services/chapterTestPaperStore";
import { saveFullMockPaperSnapshot } from "../../services/fullMockPaperStore";

export interface PackPaperReg {
  kind: "worksheet" | "chapter-test" | "full-mock";
  code: string;
  name: string;
  subject: "Maths" | "Science";
  /** Chapter slug (worksheet / chapter test); empty for a mock. */
  topicKey: string;
  paper: PersistedWorksheet;
}

export async function registerPackPaper(user: AuthUser | null | undefined, reg: PackPaperReg): Promise<void> {
  try {
    const { code, name, subject, topicKey } = reg;
    const paper: PersistedWorksheet = { ...reg.paper, code, name };
    const sessionSubject: SessionSubject = subject === "Science" ? "science" : "maths";
    if (reg.kind === "worksheet") {
      await recordWorksheetDownload(user, paper, { code, name });
    } else if (reg.kind === "chapter-test") {
      await recordPaperDownload({
        user,
        code,
        paper,
        buildRecord: (response, uid) => buildChapterTestSessionRecord({ paper, code, subject: sessionSubject, topicKey, response, uid }),
        saveSnapshot: () => saveChapterTestPaper(user, { code, name, subject, topicKey, paper, objective: null, downloaded: true }),
      });
    } else {
      await recordPaperDownload({
        user,
        code,
        paper,
        buildRecord: (response, uid) => buildFullMockSessionRecord({ paper, code, subject: sessionSubject, response, uid }),
        saveSnapshot: () =>
          saveFullMockPaperSnapshot(user, {
            code,
            name,
            subject,
            grade: "10",
            paper,
            startedAt: Date.now(),
            durationMs: 0,
            objective: null,
            downloaded: true,
          }),
      });
    }
  } catch {
    /* best-effort: the PDF is already downloaded */
  }
}
