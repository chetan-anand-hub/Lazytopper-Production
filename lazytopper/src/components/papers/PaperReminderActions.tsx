// src/components/papers/PaperReminderActions.tsx
//
// AWAIT-1-PAPERS — "Add reminder to calendar" + "Remind me on WhatsApp" for a downloaded
// paper (shared: Chapter Test and Full Mock now; Worksheet and Quick Practice later).
//   • Calendar: an .ics file built client-side (tomorrow 7 pm local), no personal data.
//   • WhatsApp: a wa.me SELF-SEND link with NO number — the student picks the chat.
//   • Analytics: `paper_reminder` {surface, kind} only — never the code, ids or the link.
import { trackPaperReminder, type PaperReminderSurface } from "../../analytics/analytics";
import {
  buildAppDeepLink,
  buildPaperReminderIcs,
  buildWhatsAppReminderUrl,
  reminderIcsFileName,
  type PaperReminderInput,
} from "./paperReminderLinks";
import "./papers.css";

export interface PaperReminderActionsProps {
  /** The code printed on the paper. */
  code: string;
  /** Chapter or paper label shown in the reminder. */
  label: string;
  /** In-app path of the page where the answers are uploaded (no router base). */
  path: string;
  surface: PaperReminderSurface;
}

/** The absolute link back to `path` in this app (origin + router base). */
export function paperDeepLink(path: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://lazytopper.com";
  return buildAppDeepLink(origin, String(import.meta.env.BASE_URL || "/"), path);
}

function downloadIcs(input: PaperReminderInput): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    const blob = new Blob([buildPaperReminderIcs(input, new Date())], { type: "text/calendar;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = reminderIcsFileName(input.code);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  } catch {
    /* best-effort: a reminder is never worth a broken page */
  }
}

export default function PaperReminderActions({ code, label, path, surface }: PaperReminderActionsProps) {
  const input: PaperReminderInput = { code, label, url: paperDeepLink(path) };
  return (
    <div className="lt-paper-rem" data-testid="paper-reminder-actions">
      <button
        type="button"
        className="lt-paper-rem__btn"
        onClick={() => {
          trackPaperReminder(surface, "calendar");
          downloadIcs(input);
        }}
      >
        📅 Add reminder to calendar
      </button>
      <a
        className="lt-paper-rem__btn lt-paper-rem__btn--wa"
        href={buildWhatsAppReminderUrl(input)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackPaperReminder(surface, "whatsapp")}
      >
        💬 Remind me on WhatsApp
      </a>
    </div>
  );
}
