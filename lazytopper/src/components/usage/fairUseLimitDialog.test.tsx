// DECISION 32e (FAIR-USE-WARN-1) — a TRIAL student refused for TODAY'S answer checks
// sees the limit panel as a DIALOG: role="dialog", aria-modal, focus kept inside, Esc or
// Close dismisses, the copy word for word, the upgrade link kept — and the page beneath
// (its saved answers) is never unmounted or reset. Premium refusals and trial PAPER
// allowances keep the inline panel exactly as before.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useState } from "react";

import FairUseLimitPanel from "./FairUseLimitPanel";
import { trialComeBackLine, type LimitState } from "./fairUseGate";

// 2026-09-28 10:00 IST = 04:30Z. Next IST midnight = 2026-09-28T18:30:00Z.
const NOW = Date.parse("2026-09-28T04:30:00Z");
const MIDNIGHT = "2026-09-28T18:30:00.000Z";

const TRIAL_CHECKS: LimitState = { tier: "trial", scope: "checks", resetAt: MIDNIGHT, window: null, allowance: 5 };

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** A page: an answer the student has typed, a Grade button, and the panel when refused. */
function Page({ limit, onDismiss }: { limit: LimitState; onDismiss?: () => void }) {
  const [answer, setAnswer] = useState("");
  const [refused, setRefused] = useState(false);
  return (
    <MemoryRouter>
      <textarea aria-label="Your answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
      <button type="button" onClick={() => setRefused(true)}>
        Grade
      </button>
      {refused ? <FairUseLimitPanel limit={limit} onDismiss={onDismiss} /> : null}
    </MemoryRouter>
  );
}

describe("32e · trial daily-checks limit → a dialog", () => {
  it("★★ opens as a modal dialog for a TRIAL student at today's answer checks, copy exact", () => {
    render(<Page limit={TRIAL_CHECKS} />);
    fireEvent.click(screen.getByRole("button", { name: "Grade" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();
    // the existing used/reset line, unchanged
    expect(dialog.querySelector("p")?.textContent).toBe(
      "You've used today's 5 answer checks. They reset at 12:00 am on Tue 29 Sep. Premium removes the daily limit.",
    );
    // PLUS exactly the 32e sentence
    expect(screen.getByTestId("fair-use-come-back").textContent).toBe(
      "Come back tomorrow: your free checks reset at 12:00 am on Tue 29 Sep. Practice, MCQs, CBQs and notes still work now.",
    );
    // the upgrade link is kept, internal, never /app/
    expect(screen.getByTestId("fair-use-see-plans").getAttribute("href")).toBe("/pricing");
    expect(dialog.textContent).not.toMatch(/₹|INR|rupee|trial_limit|usage_limit/i);
  });

  it("the copy function is word for word", () => {
    expect(trialComeBackLine("12:00 am on Tue 29 Sep")).toBe(
      "Come back tomorrow: your free checks reset at 12:00 am on Tue 29 Sep. Practice, MCQs, CBQs and notes still work now.",
    );
  });

  it.each<[string, LimitState]>([
    ["premium (any window)", { tier: "premium", scope: "checks", resetAt: MIDNIGHT, window: "day" }],
    ["premium 5-hour", { tier: "premium", scope: "checks", resetAt: MIDNIGHT, window: "fiveHour" }],
    ["trial chapter test (a paper allowance)", { tier: "trial", scope: "chapter-test", resetAt: MIDNIGHT, window: null, allowance: 1 }],
    ["trial full mock (weekly)", { tier: "trial", scope: "full-mock", resetAt: MIDNIGHT, window: null, allowance: 1 }],
    ["trial checks with NO reset time (nothing to name)", { tier: "trial", scope: "checks", resetAt: null, window: null, allowance: 5 }],
  ])("★★ %s → the inline panel exactly as before, no dialog", (_n, limit) => {
    render(<Page limit={limit} />);
    fireEvent.click(screen.getByRole("button", { name: "Grade" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    const panel = screen.getByTestId("fair-use-limit-panel");
    expect(panel.getAttribute("role")).toBe("status");
    expect(screen.queryByTestId("fair-use-come-back")).toBeNull();
  });

  it("★★ focus moves into the dialog and Tab / Shift+Tab stay inside it", () => {
    render(<Page limit={TRIAL_CHECKS} />);
    fireEvent.click(screen.getByRole("button", { name: "Grade" }));
    const dialog = screen.getByRole("dialog");
    const plans = screen.getByTestId("fair-use-see-plans");
    const close = screen.getByRole("button", { name: "Close" });
    expect(document.activeElement).toBe(close);
    // Tab from the LAST focusable wraps to the first
    fireEvent.keyDown(close, { key: "Tab" });
    expect(document.activeElement).toBe(plans);
    // Shift+Tab from the FIRST wraps to the last
    fireEvent.keyDown(plans, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(close);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("★★ Esc dismisses (and calls the page's onDismiss); focus returns to Grade", () => {
    const onDismiss = vi.fn();
    render(<Page limit={TRIAL_CHECKS} onDismiss={onDismiss} />);
    const grade = screen.getByRole("button", { name: "Grade" });
    grade.focus();
    fireEvent.click(grade);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(grade);
  });

  it("★ Close dismisses even when the page passed no onDismiss", () => {
    render(<Page limit={TRIAL_CHECKS} />);
    fireEvent.click(screen.getByRole("button", { name: "Grade" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("★★ saved work is untouched: the answer survives open + dismiss, same element (never remounted)", () => {
    render(<Page limit={TRIAL_CHECKS} />);
    const box = screen.getByRole("textbox", { name: "Your answer" }) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "x = 3, so the HCF is 6" } });
    fireEvent.click(screen.getByRole("button", { name: "Grade" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // the page beneath is still mounted while the dialog is open
    expect(screen.getByLabelText("Your answer")).toBe(box);
    expect(box.value).toBe("x = 3, so the HCF is 6");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.getByLabelText("Your answer")).toBe(box);
    expect(box.value).toBe("x = 3, so the HCF is 6");
  });
});
