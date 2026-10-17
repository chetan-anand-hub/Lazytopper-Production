import { describe, expect, it } from "vitest";
import {
  buildPaperReminderIcs,
  buildWhatsAppReminderUrl,
  escapeIcsText,
  foldIcsLine,
  reminderIcsFileName,
  reminderStartLocal,
  whatsAppReminderText,
} from "./paperReminderLinks";

const input = {
  code: "CT-M-TRIG-03",
  label: "Trigonometry",
  url: "https://lazytopper.com/app/chapter-test/10/maths/trigonometry",
};
// A fixed local instant (month is 0-based): 17 Oct 2026, 09:15 local.
const now = new Date(2026, 9, 17, 9, 15, 0);

describe("AWAIT-1 paper reminder builders", () => {
  it("defaults the reminder to tomorrow 7 pm local, as a floating time", () => {
    expect(reminderStartLocal(now)).toBe("20261018T190000");
    // Month rollover.
    expect(reminderStartLocal(new Date(2026, 9, 31, 22, 0, 0))).toBe("20261101T190000");
  });

  it("builds a valid .ics with the code, chapter and deep link, and no personal data", () => {
    const ics = buildPaperReminderIcs(input, now);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261018T190000\r\n");
    expect(ics).toContain("DTEND:20261018T193000\r\n");
    expect(ics).toContain("SUMMARY:Upload answers: CT-M-TRIG-03 Trigonometry\r\n");
    // Unfold, then the deep link is intact.
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain(`URL:${input.url}`);
    expect(unfolded).toContain(`on LazyTopper: ${input.url}`);
    expect(ics).not.toMatch(/ATTENDEE|ORGANIZER|MAILTO|@gmail/i);
    // Every physical line is at most 75 chars.
    for (const line of ics.split("\r\n")) expect(line.length).toBeLessThanOrEqual(75);
  });

  it("escapes iCalendar text and folds long lines", () => {
    expect(escapeIcsText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    const folded = foldIcsLine("X".repeat(160));
    expect(folded.split("\r\n").every((l) => l.length <= 75)).toBe(true);
    expect(folded.replace(/\r\n /g, "")).toBe("X".repeat(160));
  });

  it("names the file from the code only", () => {
    expect(reminderIcsFileName("CT-M-TRIG-03")).toBe("lazytopper-reminder-CT-M-TRIG-03.ics");
    expect(reminderIcsFileName("../x y")).toBe("lazytopper-reminder-xy.ics");
  });

  it("builds a wa.me self-send link with NO phone number", () => {
    const url = buildWhatsAppReminderUrl(input);
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(url.slice("https://wa.me/?text=".length))).toBe(
      "Reminder: upload my answers for CT-M-TRIG-03 (Trigonometry) on LazyTopper: " + input.url,
    );
    expect(whatsAppReminderText(input)).toContain(input.url);
    expect(url).not.toMatch(/wa\.me\/\d/);
  });
});
