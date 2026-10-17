// src/components/papers/PaperDownloadedNote.tsx
//
// AWAIT-1-PAPERS — the confirmation shown after a Chapter Test / Full Mock paper download.
// Signed in: the code to write on the answer sheet, where to come back, and the reminders.
// Signed out: the PDF still downloads, and one honest line says how to keep the paper.
import PaperReminderActions from "./PaperReminderActions";
import type { PaperReminderSurface } from "../../analytics/analytics";
import "./papers.css";

export const SIGNED_OUT_DOWNLOAD_LINE = "Sign in to keep this paper and upload your answers later.";

export interface PaperDownloadedNoteProps {
  signedIn: boolean;
  code: string;
  label: string;
  path: string;
  surface: PaperReminderSurface;
}

export default function PaperDownloadedNote({ signedIn, code, label, path, surface }: PaperDownloadedNoteProps) {
  if (!signedIn) {
    return (
      <div className="lt-paper-dl lt-paper-dl--signedout" role="status">
        {SIGNED_OUT_DOWNLOAD_LINE}
      </div>
    );
  }
  return (
    <div className="lt-paper-dl" role="status" data-testid="paper-downloaded-note">
      <p className="lt-paper-dl__p">
        Your paper: <span className="lt-paper-dl__code">{code}</span>. Write this code at the top of your answer
        sheet. When you&rsquo;re done, come back here (or Home) and tap Upload answers.
      </p>
      <PaperReminderActions code={code} label={label} path={path} surface={surface} />
    </div>
  );
}
