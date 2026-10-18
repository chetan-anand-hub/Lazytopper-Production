import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const trackFeedbackEvent = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", () => ({ trackFeedbackEvent }));
const auth = vi.hoisted(() => ({ currentUser: null as null | { uid: string } }));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));

import { WHATSAPP_URL } from "../../config/socialProfiles";
import { whatsAppHref } from "../contact/whatsappContact";
import { FeedbackPrompt } from "./FeedbackPrompt";
import { __resetFeedbackHostForTests, requestFeedbackPrompt } from "./feedbackPromptHost";
import {
  FEEDBACK_CALL_COPY,
  FEEDBACK_CALL_MESSAGE,
  allFeedbackActivityNames,
  feedbackActivityName,
  feedbackCallHref,
  feedbackVendorName,
} from "./feedbackPromptModel";
import { ACTIVITY_EVENTS } from "../../services/activityClient";

/**
 * FEEDBACK-1 · the 5-minute feedback call (owner ruling 18 Oct 2026): "Got 5 minutes?
 * Chat with us and we'll extend your Premium trial by 7 days."
 *
 * ★ A PROMISE, NOT A GRANT. The card opens WhatsApp to the business number and records a
 * names-only tap. Nothing in the client grants or extends Premium or a trial (CLAUDE.md §5:
 * only a server-verified payment or an ADMIN grant can).
 */

const ALL_OFFER_TEXT = [FEEDBACK_CALL_COPY.offer, FEEDBACK_CALL_COPY.note, FEEDBACK_CALL_COPY.cta, FEEDBACK_CALL_MESSAGE];

describe("FEEDBACK-1 call offer · copy", () => {
  it("is the owner's offer, word for word", () => {
    expect(FEEDBACK_CALL_COPY.offer).toBe("Got 5 minutes? Chat with us and we'll extend your Premium trial by 7 days.");
    expect(FEEDBACK_CALL_COPY.note).toBe("Our team adds the 7 days to your account after the call.");
    expect(FEEDBACK_CALL_COPY.cta).toBe("Chat with us on WhatsApp");
    expect(FEEDBACK_CALL_MESSAGE).toBe("Hi LazyTopper, I'd like the 5-minute feedback call for 7 extra Premium days.");
  });

  it("has no money or urgency words; the only numbers are the honest 5 minutes and 7 days", () => {
    const banned =
      /₹|rupee|\brs\b|price|pay|paid|free|discount|cheap|save|hurry|today|tonight|\bnow\b|limited|last chance|expire|deadline|ends|only|quick|fast|before it/i;
    for (const text of ALL_OFFER_TEXT) {
      expect(text).not.toMatch(banned);
      for (const n of text.match(/\d+/g) ?? []) expect(["5", "7"]).toContain(n);
    }
    // Control: the banned pattern does catch what it is meant to catch.
    expect("Only today: pay ₹99 now").toMatch(banned);
  });

  it("asks for nothing personal: no phone, email or parent field in the copy", () => {
    for (const text of ALL_OFFER_TEXT) expect(text).not.toMatch(/phone number|e-?mail|parent|consent/i);
  });
});

describe("FEEDBACK-1 call offer · WhatsApp link", () => {
  it("is built from the shared business-number constant with the fixed prefill", () => {
    const href = feedbackCallHref(WHATSAPP_URL);
    expect(href.startsWith(`${WHATSAPP_URL}?text=`)).toBe(true);
    expect(decodeURIComponent(href.slice(`${WHATSAPP_URL}?text=`.length))).toBe(FEEDBACK_CALL_MESSAGE);
    // Same shape as the floating WhatsApp button / ContactPage link: one number, one builder shape.
    expect(href).toBe(whatsAppHref(FEEDBACK_CALL_MESSAGE));
  });

  it("takes the number it is given (it holds no number of its own)", () => {
    expect(feedbackCallHref("https://wa.me/10000000000")).toMatch(/^https:\/\/wa\.me\/10000000000\?text=/);
  });
});

describe("FEEDBACK-1 call offer · the card", () => {
  afterEach(() => cleanup());

  it("shows the offer under the reasons with a WhatsApp link that opens in a new tab", () => {
    render(<FeedbackPrompt onAnswer={vi.fn()} onDismiss={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText(FEEDBACK_CALL_COPY.offer)).toBeInTheDocument();
    expect(screen.getByText(FEEDBACK_CALL_COPY.note)).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: FEEDBACK_CALL_COPY.cta });
    expect(cta).toHaveAttribute("href", feedbackCallHref(WHATSAPP_URL));
    expect(cta).toHaveAttribute("target", "_blank");
    expect(cta.getAttribute("rel")).toMatch(/noopener/);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(document.querySelector("input")).toBeNull();
  });

  it("a tap reports onCallTap only - it does not answer, dismiss or close the card", () => {
    const onAnswer = vi.fn();
    const onDismiss = vi.fn();
    const onDone = vi.fn();
    const onCallTap = vi.fn();
    render(<FeedbackPrompt onAnswer={onAnswer} onDismiss={onDismiss} onDone={onDone} onCallTap={onCallTap} />);
    fireEvent.click(screen.getByTestId("feedback-call-cta"));
    expect(onCallTap).toHaveBeenCalledTimes(1);
    expect(onAnswer).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByTestId("feedback-prompt")).toBeInTheDocument();
  });
});

describe("FEEDBACK-1 call offer · the event", () => {
  beforeEach(() => {
    window.localStorage.clear();
    trackFeedbackEvent.mockClear();
    __resetFeedbackHostForTests();
  });
  afterEach(() => {
    act(() => __resetFeedbackHostForTests());
    vi.restoreAllMocks();
  });

  it("names: feedback_call_tap_<moment> first-party (allow-listed), feedback_call_tap for vendors", () => {
    expect(feedbackActivityName("call_tap", "paywall")).toBe("feedback_call_tap_paywall");
    expect(feedbackActivityName("call_tap", "trial_end")).toBe("feedback_call_tap_trial_end");
    expect(feedbackVendorName("call_tap")).toBe("feedback_call_tap");
    for (const n of ["feedback_call_tap_paywall", "feedback_call_tap_trial_end"]) {
      expect(allFeedbackActivityNames()).toContain(n);
      expect(ACTIVITY_EVENTS as readonly string[]).toContain(n);
    }
  });

  it.each(["paywall", "trial_end"] as const)(
    "in the host (%s), a tap records call_tap for that moment and makes no network call",
    async (moment) => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
      await act(async () => {
        expect(await requestFeedbackPrompt(moment, { uid: "u1", trialKey: "2026-10-01T00:00:00Z" })).toBe(true);
      });
      const cta = document.querySelector("[data-testid='feedback-call-cta']") as HTMLAnchorElement;
      expect(cta).not.toBeNull();
      act(() => {
        fireEvent.click(cta);
      });
      expect(trackFeedbackEvent.mock.calls).toEqual([
        ["shown", moment],
        ["call_tap", moment],
      ]);
      expect(fetchSpy).not.toHaveBeenCalled();
      // The card stays up: the student can still answer or say No thanks.
      expect(document.querySelector("[data-testid='feedback-prompt']")).not.toBeNull();
    },
  );
});

describe("FEEDBACK-1 call offer · ★ no subscription or trial write from the client", () => {
  const FEEDBACK_SOURCES = [
    "src/components/feedback/FeedbackPrompt.tsx",
    "src/components/feedback/feedbackPromptModel.ts",
    "src/components/feedback/feedbackPromptHost.tsx",
  ];
  const WRITER =
    /activateTrial|grantPass|setDoc|updateDoc|addDoc|writeBatch|runTransaction|subscriptionService|newAccountTrial|trialStartDate|passEnd|\/api\/admin|\/api\/pay/;

  it.each(FEEDBACK_SOURCES)("%s has no subscription/trial/premium writer or admin/pay call", (rel) => {
    const abs = resolve(process.cwd(), rel);
    expect(existsSync(abs)).toBe(true);
    expect(readFileSync(abs, "utf8")).not.toMatch(WRITER);
  });

  it("control: the same pattern DOES find the real trial writer", () => {
    const abs = resolve(process.cwd(), "src/services/newAccountTrial.ts");
    expect(existsSync(abs)).toBe(true);
    expect(readFileSync(abs, "utf8")).toMatch(WRITER);
  });
});
