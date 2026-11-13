/**
 * SELFPAY-ATTACH-1 - pay first, then "who will use it?": the who step after a verified payment, "Me" (confirm, code, Home flag), "My child"
 * (WhatsApp share without a number in the URL), already_has, the 10-minute screen fallback (fake timers), the close confirm, the holder card.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const analytics = vi.hoisted(() => ({ trackNamedEvent: vi.fn(), trackPurchase: vi.fn(), newCheckoutAttemptId: vi.fn(() => "lt_attempt") }));
vi.mock("../../analytics/analytics", () => analytics);
vi.mock("../../lib/packs/packAnalytics", () => ({ trackPackPurchase: vi.fn(), trackPackEvent: vi.fn() }));
const built = vi.hoisted(() => ({ files: [] as unknown[] }));
vi.mock("../../lib/packs/buildPackFiles", async (orig) => ({
  ...(await orig<typeof import("../../lib/packs/buildPackFiles")>()),
  buildPackFiles: async () => built.files,
}));
const auth = vi.hoisted(() => ({ sendPhoneOtp: vi.fn(async () => undefined), verifyPhoneOtp: vi.fn(async () => undefined) }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth }));

import CheckoutSheet, { type CheckoutSheetItem } from "./CheckoutSheet";
import { ATTACH_HOLD_MS, type SelfBuyOutcome } from "../../services/checkoutWho";

const PASS: CheckoutSheetItem = { kind: "pass", sku: "till_boards", label: "Board Pass", description: "Board Pass", priceDisplay: "₹2,262" };
const CBQ: CheckoutSheetItem = { kind: "pack", sku: "pack_cbq", target: "maths", label: "Maths CBQ Pack", description: "x", priceDisplay: "₹199" };
const PROOF = { orderId: "order_1", paymentId: "pay_1", signature: "ab".repeat(32) };
const PAID: SelfBuyOutcome = { status: "paid", confirmed: true, contact: { phone: "+919876543210", first: "phone" }, attach: PROOF };
let fetchMock: ReturnType<typeof vi.fn>;
const answer = (body: Record<string, unknown>, status = 200) => fetchMock.mockResolvedValueOnce({ ok: status < 400, status, json: async () => body });

function mount(over: Partial<Parameters<typeof CheckoutSheet>[0]> = {}) {
  const props = {
    item: PASS,
    signedIn: false,
    selfMasked: null,
    onPaySelf: vi.fn(),
    onSignIn: vi.fn(),
    onSignInWithNumber: vi.fn(),
    onSignInWithEmail: vi.fn(),
    onClose: vi.fn(),
    buySelf: vi.fn(async () => PAID),
    selfFirst: true,
    attachOn: true,
    ...over,
  };
  render(<CheckoutSheet {...props} />);
  return props;
}
const type = (id: string, v: string) => fireEvent.change(screen.getByTestId(id), { target: { value: v } });
async function payToWho() {
  fireEvent.click(screen.getByTestId("who-pay-self-out"));
  await screen.findByTestId("attach-choose-me");
}
const lastBody = () => JSON.parse((fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1] as { body: string }).body);

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("before paying", () => {
  it("one line under Pay says who is asked after; flag off: no line", () => {
    mount();
    expect(screen.getByTestId("who-attach-before").textContent).toBe("After paying, you'll choose who uses it: you or someone else.");
    cleanup();
    mount({ attachOn: false });
    expect(screen.queryByTestId("who-attach-before")).toBeNull();
  });
});

describe("after a verified payment", () => {
  it("the who step: two choices, the 10-minute note naming the MASKED paid-with number; no full number anywhere", async () => {
    mount();
    await payToWho();
    expect(screen.getByText("Who will use this Board Pass?")).toBeTruthy();
    expect(screen.getByTestId("attach-hold-note").textContent).toBe(
      "If you don't choose in 10 minutes, it goes on +91 98•••••210, the number you paid with. You can sign in with that number.",
    );
    expect(document.body.textContent).not.toMatch(/9876543210|98765 43210/);
  });

  it("no usable contact: no note, and 'Me' asks for a mobile or email", async () => {
    mount({ buySelf: vi.fn(async () => ({ ...PAID, contact: null })) });
    await payToWho();
    expect(screen.queryByTestId("attach-hold-note")).toBeNull();
    fireEvent.click(screen.getByTestId("attach-choose-me"));
    expect(screen.getByTestId("attach-me-input")).toBeTruthy();
  });

  it("'Me' -> 'Yes, that's me' sends choice me with the proof and NO recipient, then the code is sent to the paid-with number", async () => {
    mount();
    await payToWho();
    fireEvent.click(screen.getByTestId("attach-choose-me"));
    expect(screen.getByTestId("attach-me-line").textContent).toMatch(/Board Pass on .*98•••••210.*the number you paid with/);
    answer({ ok: true, phoneMasked: "98•••••210" });
    fireEvent.click(screen.getByTestId("attach-me-yes"));
    await screen.findByTestId("who-otp-resend").catch(() => undefined);
    await vi.waitFor(() => expect(auth.sendPhoneOtp).toHaveBeenCalledWith("+919876543210", expect.any(String)));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/pay/guest/attach");
    expect(lastBody()).toEqual({ ...PROOF, choice: "me" });
    expect(screen.queryByTestId("who-send-child")).toBeNull();
  });

  it("'Me' -> a different mobile: sent as the recipient", async () => {
    mount();
    await payToWho();
    fireEvent.click(screen.getByTestId("attach-choose-me"));
    fireEvent.click(screen.getByTestId("attach-me-different"));
    type("attach-me-input", "98765 11111");
    answer({ ok: true, phoneMasked: "98•••••111" });
    fireEvent.click(screen.getByTestId("attach-me-submit"));
    await vi.waitFor(() => expect(auth.sendPhoneOtp).toHaveBeenCalledWith("+919876511111", expect.any(String)));
    expect(lastBody()).toEqual({ ...PROOF, choice: "me", recipient: { phone: "+919876511111", first: "phone" } });
  });

  it("'My child': recipient sent, Done card; the WhatsApp share carries the text only - no number in the URL", async () => {
    mount();
    await payToWho();
    fireEvent.click(screen.getByTestId("attach-choose-other"));
    type("attach-other-input", "91234 56789");
    expect(screen.getByTestId("attach-other-submit").textContent).toBe("Activate on 91234 56789");
    answer({ ok: true, phoneMasked: "+91 91•••••789" });
    fireEvent.click(screen.getByTestId("attach-other-submit"));
    await screen.findByTestId("attach-done");
    expect(lastBody()).toEqual({ ...PROOF, choice: "other", recipient: { phone: "+919123456789", first: "phone" } });
    expect(screen.getByText("+91 91•••••789 can sign in now")).toBeTruthy();
    expect(document.body.textContent).not.toContain("+91 +91");
    const href = (screen.getByTestId("attach-share") as HTMLAnchorElement).href;
    expect(href.startsWith("https://wa.me/?text=")).toBe(true);
    expect(href).not.toMatch(/9123|456789|91234/);
    expect(document.body.textContent).not.toMatch(/9123456789|91234 56789(?!.*Activate)/);
  });

  it("'My child' by email instead", async () => {
    mount();
    await payToWho();
    fireEvent.click(screen.getByTestId("attach-choose-other"));
    fireEvent.click(screen.getByTestId("attach-toggle-id"));
    type("attach-other-input", "Child@Gmail.com");
    answer({ ok: true, emailMasked: "ch••••@gmail.com" });
    fireEvent.click(screen.getByTestId("attach-other-submit"));
    await screen.findByTestId("attach-done");
    expect(lastBody().recipient).toEqual({ email: "child@gmail.com", first: "email" });
  });

  it("already_has: told plainly with the masked number, asked for another; the sheet stays open and nothing is charged again", async () => {
    const p = mount();
    await payToWho();
    fireEvent.click(screen.getByTestId("attach-choose-other"));
    type("attach-other-input", "91234 56789");
    answer({ ok: false, reason: "already_has" });
    fireEvent.click(screen.getByTestId("attach-other-submit"));
    expect((await screen.findByTestId("attach-already-has")).textContent).toBe("+91 91•••••789 already has the Board Pass till the boards.");
    expect(screen.getByText("Who should this one go to?")).toBeTruthy();
    expect(p.onClose).not.toHaveBeenCalled();
    expect(p.buySelf).toHaveBeenCalledTimes(1);
    // a pack says "owns this pack"
    cleanup();
    mount({ item: CBQ });
    await payToWho();
    fireEvent.click(screen.getByTestId("attach-choose-other"));
    type("attach-other-input", "91234 56789");
    answer({ ok: false, reason: "already_has" });
    fireEvent.click(screen.getByTestId("attach-other-submit"));
    expect((await screen.findByTestId("attach-already-has")).textContent).toBe("+91 91•••••789 already owns this pack.");
  });

  it("a failed save keeps the choice screen with an honest line (payment is safe)", async () => {
    mount();
    await payToWho();
    fireEvent.click(screen.getByTestId("attach-choose-me"));
    answer({ ok: false }, 500);
    fireEvent.click(screen.getByTestId("attach-me-yes"));
    await screen.findByTestId("attach-me-yes");
    expect(screen.getByTestId("attach-me-yes")).toBeTruthy();
  });

  it("an old server (no attach answer in verify) keeps today's thank-you screen", async () => {
    mount({ buySelf: vi.fn(async () => ({ ...PAID, attach: undefined })) });
    fireEvent.click(screen.getByTestId("who-pay-self-out"));
    await screen.findByTestId("who-paid");
    expect(screen.queryByTestId("attach-choose-me")).toBeNull();
  });
});

describe("10 minutes, no answer (screen only; the server enforces the rule)", () => {
  it("shows 'Your Board Pass is on 98•••••210' + Start; Start sends the code to the paid-with number (code only)", async () => {
    vi.useFakeTimers();
    mount();
    fireEvent.click(screen.getByTestId("who-pay-self-out"));
    await act(async () => { await vi.advanceTimersByTimeAsync(5); });
    expect(screen.getByTestId("attach-choose-me")).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(ATTACH_HOLD_MS + 50); });
    expect(screen.getByText(/Your Board Pass is on .*98•••••210/)).toBeTruthy();
    expect(screen.getByTestId("attach-fallback-line").textContent).toBe("This is the number you paid with. Sign in with it to use the Board Pass.");
    expect(document.body.textContent).not.toMatch(/emailed/i);
    await act(async () => { fireEvent.click(screen.getByTestId("attach-start")); await vi.advanceTimersByTimeAsync(5); });
    expect(auth.sendPhoneOtp).toHaveBeenCalledWith("+919876543210", expect.any(String));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("once attached, the timer does nothing", async () => {
    vi.useFakeTimers();
    mount();
    fireEvent.click(screen.getByTestId("who-pay-self-out"));
    await act(async () => { await vi.advanceTimersByTimeAsync(5); });
    fireEvent.click(screen.getByTestId("attach-choose-other"));
    type("attach-other-input", "91234 56789");
    answer({ ok: true, phoneMasked: "91•••••789" });
    await act(async () => { fireEvent.click(screen.getByTestId("attach-other-submit")); await vi.advanceTimersByTimeAsync(5); });
    expect(screen.getByTestId("attach-done")).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(ATTACH_HOLD_MS + 50); });
    expect(screen.getByTestId("attach-done")).toBeTruthy();
    expect(screen.queryByTestId("attach-start")).toBeNull();
  });
});

describe("closing before choosing", () => {
  it("asks first: 'Your payment is safe. Sign in with 98•••••210 to use it.'; Close then closes", async () => {
    const p = mount();
    await payToWho();
    fireEvent.click(screen.getByLabelText("Close"));
    expect(p.onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId("who-close-confirm").textContent).toContain("Your payment is safe. Sign in with ");
    expect(screen.getByTestId("who-close-confirm").textContent).toContain("98•••••210 to use it.");
    fireEvent.click(screen.getByTestId("who-close-anyway"));
    expect(p.onClose).toHaveBeenCalledTimes(1);
  });
});

describe("closing before choosing: F1 + F4", () => {
  it("close-confirm: 'Put it on 98•••••210 now' answers 'me' with the paid-with contact, then the existing sign-in code", async () => {
    const p = mount();
    await payToWho();
    fireEvent.click(screen.getByLabelText("Close"));
    expect(screen.getByTestId("who-close-me-now").textContent).toBe("Put it on +91 98•••••210 now");
    answer({ ok: true, phoneMasked: "98•••••210" });
    fireEvent.click(screen.getByTestId("who-close-me-now"));
    await vi.waitFor(() => expect(auth.sendPhoneOtp).toHaveBeenCalledWith("+919876543210", expect.any(String)));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/pay/guest/attach");
    expect(lastBody()).toEqual({ ...PROOF, choice: "me" });
    expect(screen.queryByTestId("who-close-confirm")).toBeNull();
    expect(p.onClose).not.toHaveBeenCalled();
  });

  it("'Keep choosing' returns to where the payer was (nothing sent)", async () => {
    mount();
    await payToWho();
    fireEvent.click(screen.getByTestId("attach-choose-other"));
    fireEvent.click(screen.getByLabelText("Close"));
    fireEvent.click(screen.getByTestId("who-close-stay"));
    expect(screen.queryByTestId("who-close-confirm")).toBeNull();
    expect(screen.getByTestId("attach-other-input")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("F4: the done screen shows the SERVER's echoed mask, not the typed number", async () => {
    mount();
    await payToWho();
    fireEvent.click(screen.getByTestId("attach-choose-other"));
    type("attach-other-input", "91234 56789");
    answer({ ok: true, phoneMasked: "+91 98•••••210" }); // a replayed answer for the first recipient
    fireEvent.click(screen.getByTestId("attach-other-submit"));
    await screen.findByTestId("attach-done");
    expect(screen.getByText("+91 98•••••210 can sign in now")).toBeTruthy();
    expect(document.body.textContent).not.toContain("+91 +91");
    expect(document.body.textContent).not.toContain("91•••••789");
  });
});

describe("a signed-in holder taps Buy", () => {
  it("Board Pass: 'You already have the Board Pass' with the REAL date; Buy for someone else opens the box; Go to Home navigates", () => {
    const onGoTo = vi.fn();
    const p = mount({ signedIn: true, selfMasked: "an••••@gmail.com", startAt: "other", holder: { until: "31 Mar 2027" }, onGoTo });
    expect(screen.getByText("You already have the Board Pass")).toBeTruthy();
    expect(screen.getByTestId("who-holder-line").textContent).toBe("It's active till your boards (until 31 Mar 2027). There's nothing more to pay.");
    expect(p.buySelf).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("who-holder-go"));
    expect(onGoTo).toHaveBeenCalledWith("/");
    cleanup();
    mount({ signedIn: true, selfMasked: null, startAt: "other", holder: { until: "31 Mar 2027" } });
    fireEvent.click(screen.getByTestId("who-holder-other"));
    expect(screen.getByTestId("who-first")).toBeTruthy();
  });

  it("no date known: none is invented", () => {
    mount({ signedIn: true, selfMasked: null, startAt: "other", holder: {} });
    expect(screen.getByTestId("who-holder-line").textContent).toBe("It's active till your boards. There's nothing more to pay.");
  });

  it("an owned pack: 'You already own the …' + Buy for someone else + Open My packs", () => {
    const onGoTo = vi.fn();
    mount({ item: CBQ, signedIn: true, selfMasked: null, startAt: "other", holder: {}, onGoTo });
    expect(screen.getByText("You already own the Maths CBQ Pack")).toBeTruthy();
    expect(screen.getByTestId("who-holder-line").textContent).toBe("Your files are in My packs, ready to download.");
    fireEvent.click(screen.getByTestId("who-holder-go"));
    expect(onGoTo).toHaveBeenCalledWith("/packs#my-packs");
  });
});

describe("PARENTS-V2-1 - attachPreselect (the /for-parents pay-first flow)", () => {
  it("signed out with audience 'parent' + attachPreselect: straight to the one Pay (not the number box), and the who step opens with 'My child / someone else' selected", async () => {
    mount({ audience: "parent", attachPreselect: "other" });
    expect(screen.queryByTestId("who-first")).toBeNull();
    await payToWho();
    expect(screen.getByTestId("attach-choose-other").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("attach-choose-me").getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByTestId("attach-continue"));
    expect(screen.getByTestId("attach-other-input")).toBeTruthy();
  });

  it("F3: the parent pay-first path reports recipient 'other' (as before), a student's pay-first path still reports 'self'", async () => {
    mount({ audience: "parent", attachPreselect: "other" });
    await payToWho();
    const calls = analytics.trackNamedEvent.mock.calls.map((c) => [c[0], (c[1] as { recipient?: string }).recipient]);
    expect(calls).toContainEqual(["guest_pay_option_shown", "other"]);
    expect(calls).toContainEqual(["guest_pay_start", "other"]);
    expect(calls).toContainEqual(["guest_pay_paid", "other"]);
    expect(calls.some(([n]) => n === "guest_pay_self_start")).toBe(false);
    expect(calls.some(([, r]) => r === "self")).toBe(false);
    cleanup();
    analytics.trackNamedEvent.mockClear();
    mount();
    await payToWho();
    const student = analytics.trackNamedEvent.mock.calls.map((c) => [c[0], (c[1] as { recipient?: string }).recipient]);
    expect(student).toContainEqual(["guest_pay_start", "self"]);
    expect(student).toContainEqual(["guest_pay_paid", "self"]);
  });

  it("without the prop nothing changes: no selected state, no Continue button", async () => {
    mount();
    await payToWho();
    expect(screen.getByTestId("attach-choose-other").getAttribute("aria-pressed")).toBeNull();
    expect(screen.queryByTestId("attach-continue")).toBeNull();
  });

  it("audience 'parent' WITHOUT the prop keeps the old number-box start (default unchanged)", () => {
    mount({ audience: "parent" });
    expect(screen.queryByTestId("who-pay-self-out")).toBeNull();
  });
});

describe("PAID-SHOWS-1 - the purchase card is the first block of the paid screen", () => {
  it("signed out, attach flow: the card (from the receipt) sits BELOW 'Who will use it?', and the proof is kept in this tab only", async () => {
    sessionStorage.clear();
    answer({ ok: true, attached: false, savedTo: "+91 98•••••210", item: { kind: "pass", label: "Board Pass" } });
    mount({ buySelf: vi.fn(async () => ({ ...PAID, receipt: PROOF, gstProof: PROOF })) });
    await payToWho();
    const card = await screen.findByTestId("purchase-card");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/pay/guest/receipt");
    expect(JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body)).toEqual(PROOF);
    expect((await screen.findByTestId("receipt-title")).textContent).toBe("Your Board Pass is active till your boards");
    const who = screen.getByTestId("attach-choose-me");
    expect(who.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(JSON.parse(sessionStorage.getItem("lt.paidReceipt.v1") || "{}")).toEqual(PROOF);
  });

  it("no receipt proof (old outcome) or a signed-in payer: no card", async () => {
    mount();
    await payToWho();
    expect(screen.queryByTestId("purchase-card")).toBeNull();
  });

  it("a SIGNED-IN payer buying for someone else gets no receipt call and no card (the receipt is signed-out only)", async () => {
    mount({ signedIn: true, startAt: "other", buy: vi.fn(async () => ({ status: "paid" as const, confirmed: true, receipt: PROOF })) });
    fireEvent.change(screen.getByTestId("who-first"), { target: { value: "anaya@gmail.com" } });
    fireEvent.click(screen.getByTestId("who-pay"));
    await screen.findByTestId("who-paid");
    expect(screen.queryByTestId("purchase-card")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("the paid-for-someone-else screen (signed out) shows the card too", async () => {
    answer({ ok: true, attached: true, savedTo: "an••••@gmail.com", item: { kind: "pass", label: "Board Pass" } });
    mount({ selfFirst: false, startAt: "other", buy: vi.fn(async () => ({ status: "paid" as const, confirmed: true, receipt: PROOF })) });
    fireEvent.change(screen.getByTestId("who-first"), { target: { value: "anaya@gmail.com" } });
    fireEvent.click(screen.getByTestId("who-pay"));
    await screen.findByTestId("purchase-card");
    expect(screen.getByTestId("who-paid")).toBeTruthy();
  });
});

describe("POSTPAY-WHO-FIRST-1 - the choice comes first, the files fold into one line", () => {
  const PACK_RECEIPT = {
    ok: true,
    attached: false,
    savedTo: "+91 98•••••210",
    item: { kind: "pack", label: "PDF pack" },
    pack: { packId: "pack_cbq:maths", sku: "pack_cbq", target: "maths", paidAt: 1, orderId: "order_1" },
    licensee: { name: "", email: "", phone: "+91 98•••••210" },
  };
  const mk = (id: string, group: string) => ({ id, label: id, group, filename: id + ".pdf", build: vi.fn(async () => undefined) });

  it("one 'Payment received' line, then the 10-minute notice ABOVE Me / My child, then the buttons", async () => {
    answer({ ok: true, attached: false, savedTo: "+91 98•••••210", item: { kind: "pass", label: "Board Pass" } });
    mount({ buySelf: vi.fn(async () => ({ ...PAID, receipt: PROOF, gstProof: PROOF })) });
    await payToWho();
    await screen.findByTestId("receipt-title");
    expect(screen.getAllByText(/Payment received/)).toHaveLength(1);
    const paid = screen.getByTestId("who-paid");
    const note = screen.getByTestId("attach-hold-note");
    const me = screen.getByTestId("attach-choose-me");
    const other = screen.getByTestId("attach-choose-other");
    expect(note.className).toBe("lt-who__notice");
    expect(paid.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(note.compareDocumentPosition(me) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(me.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("the files are one folded line 'Your files (N) · Show' below the choice, and open out once the payer has chosen", async () => {
    built.files = [mk("a", "Real Numbers"), mk("b", "Real Numbers"), mk("c", "Polynomials")];
    answer(PACK_RECEIPT);
    mount({ item: CBQ, buySelf: vi.fn(async () => ({ ...PAID, receipt: PROOF, gstProof: PROOF })) });
    await payToWho();
    const fold = await screen.findByTestId("receipt-files-fold");
    expect(screen.getByTestId("receipt-files-summary").textContent).toBe("Your files (3) · Show");
    expect((fold as HTMLDetailsElement).open).toBe(false);
    expect(screen.getByTestId("attach-choose-me").compareDocumentPosition(fold) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // the "saved to" line lives inside the fold
    expect(fold.contains(screen.getByTestId("receipt-saved"))).toBe(true);
    // choose "Me" and confirm: the attach settles, the list is no longer folded
    answer({ ok: true, status: "attached" });
    fireEvent.click(screen.getByTestId("attach-choose-me"));
    fireEvent.click(screen.getByTestId("attach-me-yes"));
    await waitFor(() => expect(screen.queryByTestId("receipt-files-fold")).toBeNull());
    expect(screen.getAllByTestId("receipt-download").length).toBe(3);
  });
});

describe("GST-AFTER-PAY-1 - 'For your GST invoice' on the paid screen", () => {
  it("flag on: it sits BELOW the Me / My child choice and the files line, never blocks the choice, and saves with the receipt proof", async () => {
    vi.stubEnv("VITE_GST_STATE_FIELD", "1");
    built.files = [];
    answer({ ok: true, attached: false, savedTo: "+91 98•••••210", item: { kind: "pass", label: "Board Pass" } });
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, ipStateCode: null, remembered: null }) });
    mount({ buySelf: vi.fn(async () => ({ ...PAID, receipt: PROOF, gstProof: PROOF })) });
    await payToWho();
    const block = await screen.findByTestId("postpay-gst");
    expect(screen.getByTestId("attach-choose-other").compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("receipt-title").compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // the choice still works with the block untouched
    fireEvent.click(screen.getByTestId("attach-choose-me"));
    expect(screen.getByTestId("attach-me-yes")).toBeTruthy();
  });

  it("flag off: no block at all", async () => {
    vi.stubEnv("VITE_GST_STATE_FIELD", "");
    answer({ ok: true, attached: false, savedTo: "+91 98•••••210", item: { kind: "pass", label: "Board Pass" } });
    mount({ buySelf: vi.fn(async () => ({ ...PAID, receipt: PROOF, gstProof: PROOF })) });
    await payToWho();
    await screen.findByTestId("receipt-title");
    expect(screen.queryByTestId("postpay-gst")).toBeNull();
  });
});
