// src/components/papers/paperReminderLinks.ts
//
// AWAIT-1-PAPERS — the pure builders behind <PaperReminderActions>: a calendar (.ics) file
// and a WhatsApp SELF-SEND link that remind a student to come back and upload the answers
// for a paper they downloaded (owner ruling 17 Oct 2026).
//
//   • NO personal data: only the paper code, the chapter / paper label and the deep link.
//   • WhatsApp is `https://wa.me/?text=…` with NO number: the student picks who to send it
//     to (themselves or a parent). No number is stored, no API is called.
//   • The calendar event defaults to TOMORROW 7 pm in the student's local time, written as a
//     floating local time (no Z), so the calendar shows 7 pm wherever it is opened.
//   • Pure: the caller passes `now`, so the builders are deterministic under test.

export interface PaperReminderInput {
  /** The code printed on the paper, e.g. `CT-M-TRIG-03`. */
  code: string;
  /** The chapter or paper label, e.g. `Trigonometry` or `Science · Mock #2`. */
  label: string;
  /** Absolute deep link back to the page where the answers are uploaded. */
  url: string;
}

/**
 * Absolute deep link to an in-app path: origin + the router base (vite BASE_URL, never a
 * hardcoded prefix) + the path. Pure: the caller passes origin and base.
 */
export function buildAppDeepLink(origin: string, base: string, path: string): string {
  const b = base ? (base.endsWith("/") ? base : `${base}/`) : "/";
  return `${origin}${b.startsWith("/") ? b : `/${b}`}${String(path).replace(/^\/+/, "")}`;
}

export const PAPER_REMINDER_HOUR = 19;
export const PAPER_REMINDER_DURATION_MIN = 30;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function floatingLocal(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function reminderStartDate(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, PAPER_REMINDER_HOUR, 0, 0);
}

/** Tomorrow at 7 pm, local time, as an iCalendar floating DATE-TIME (`YYYYMMDDTHHMMSS`). */
export function reminderStartLocal(now: Date): string {
  return floatingLocal(reminderStartDate(now));
}

function utcStamp(now: Date): string {
  return (
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  );
}

/** RFC 5545 TEXT escaping: backslash, semicolon, comma and newlines. */
export function escapeIcsText(value: string): string {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 line folding: no physical line longer than 75 characters (continuations start with a space). */
export function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(` ${line.slice(i, i + 74)}`);
  return parts.join("\r\n");
}

export function reminderTitle(input: PaperReminderInput): string {
  return `Upload answers: ${input.code} ${input.label}`.trim();
}

/** The calendar file body (text/calendar, CRLF line endings). */
export function buildPaperReminderIcs(input: PaperReminderInput, now: Date): string {
  const startDate = reminderStartDate(now);
  const endDate = new Date(startDate.getTime() + PAPER_REMINDER_DURATION_MIN * 60_000);
  const title = escapeIcsText(reminderTitle(input));
  const description = escapeIcsText(
    `Upload your answer sheet for ${input.code} (${input.label}) on LazyTopper: ${input.url}`,
  );
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LazyTopper//Paper reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${reminderIcsFileName(input.code).replace(/\.ics$/, "")}-${now.getTime()}@lazytopper.com`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${floatingLocal(startDate)}`,
    `DTEND:${floatingLocal(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `URL:${input.url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${title}`,
    "TRIGGER:-PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

/** A safe download name for the .ics file (the code only — letters, digits and dashes). */
export function reminderIcsFileName(code: string): string {
  const safe = String(code).replace(/[^A-Za-z0-9-]/g, "") || "paper";
  return `lazytopper-reminder-${safe}.ics`;
}

export function whatsAppReminderText(input: PaperReminderInput): string {
  return `Reminder: upload my answers for ${input.code} (${input.label}) on LazyTopper: ${input.url}`;
}

/** WhatsApp self-send link: NO phone number, the student chooses the chat. */
export function buildWhatsAppReminderUrl(input: PaperReminderInput): string {
  return `https://wa.me/?text=${encodeURIComponent(whatsAppReminderText(input))}`;
}
