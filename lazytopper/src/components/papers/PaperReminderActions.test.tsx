// AWAIT-1-PAPERS — the shared reminder actions + the downloaded-paper note.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const track = vi.hoisted(() => ({ calls: [] as unknown[][] }));
vi.mock("../../analytics/analytics", () => ({
  trackPaperReminder: (...args: unknown[]) => {
    track.calls.push(args);
  },
}));

import PaperReminderActions from "./PaperReminderActions";
import PaperDownloadedNote, { SIGNED_OUT_DOWNLOAD_LINE } from "./PaperDownloadedNote";

afterEach(() => {
  cleanup();
  track.calls = [];
});

describe("PaperReminderActions", () => {
  it("calendar: tracks {surface, kind} only and builds an .ics download", () => {
    const create = vi.fn(() => "blob:x");
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    render(<PaperReminderActions code="CT-M-TRIG-03" label="Trigonometry" path="/chapter-test/10/Maths/trigonometry" surface="chapter_test" />);
    fireEvent.click(screen.getByRole("button", { name: /Add reminder to calendar/ }));
    expect(track.calls).toEqual([["chapter_test", "calendar"]]);
    expect(create).toHaveBeenCalledOnce();
  });

  it("WhatsApp: a wa.me self-send link (no number) carrying the code, chapter and deep link", () => {
    render(<PaperReminderActions code="FM-S-02" label="Science · Mock #2" path="/full-mock/10/Science" surface="full_mock" />);
    const a = screen.getByRole("link", { name: /Remind me on WhatsApp/ }) as HTMLAnchorElement;
    expect(a.href.startsWith("https://wa.me/?text=")).toBe(true);
    const text = decodeURIComponent(a.href.slice("https://wa.me/?text=".length));
    expect(text).toMatch(/^Reminder: upload my answers for FM-S-02 \(Science · Mock #2\) on LazyTopper: http/);
    expect(text).toMatch(/full-mock\/10\/Science$/);
    expect(a.rel).toContain("noopener");
    fireEvent.click(a);
    expect(track.calls).toEqual([["full_mock", "whatsapp"]]);
  });
});

describe("PaperDownloadedNote", () => {
  it("signed in: the code, where to come back, and the reminders", () => {
    render(<PaperDownloadedNote signedIn code="CT-M-TRIG-03" label="Trigonometry" path="/x" surface="chapter_test" />);
    expect(screen.getByTestId("paper-downloaded-note").textContent).toMatch(
      /Your paper: CT-M-TRIG-03\. Write this code at the top of your answer sheet\. When you.re done, come back here \(or Home\) and tap Upload answers\./,
    );
    expect(screen.getByTestId("paper-reminder-actions")).toBeTruthy();
  });

  it("signed out: only the sign-in line, no reminders", () => {
    render(<PaperDownloadedNote signedIn={false} code="CT-M-TRIG-03" label="Trigonometry" path="/x" surface="chapter_test" />);
    expect(screen.getByText(SIGNED_OUT_DOWNLOAD_LINE)).toBeTruthy();
    expect(screen.queryByTestId("paper-reminder-actions")).toBeNull();
  });
});
