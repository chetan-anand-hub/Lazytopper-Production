/**
 * CODE-WHERE-1 (owner 4 Nov 2026) — every "code sent" message names WHERE it went (masked), with "Change it" back to
 * the input (value kept, focused). The full identifier is never rendered, and never reaches analytics or storage.
 *
 * Screens here: EmailCodeSignIn (Login's email-code door + the thank-you screen), LinkEmailPanel, the "Sign-in methods"
 * modal (LinkSignInMethodModalSheet — opened by LinkPhoneNudge, Settings and the account menus), AccountReadyPanel.
 * Login's phone OTP: pages/Login.codeWhere.test.tsx.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const seen = vi.hoisted(() => ({ calls: [] as unknown[] }));
vi.mock("../../analytics/analytics", async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(actual)) {
    out[k] =
      typeof v === "function"
        ? (...a: unknown[]) => {
            seen.calls.push([k, a]);
            return (v as (...x: unknown[]) => unknown)(...a);
          }
        : v;
  }
  return out;
});
vi.mock("../../services/uxTelemetry", () => ({
  trackUxEvent: (...a: unknown[]) => {
    seen.calls.push(["trackUxEvent", a]);
  },
}));

const auth = vi.hoisted(() => ({
  user: null as null | Record<string, unknown>,
  sendLinkPhoneOtp: vi.fn(async (_p: string, _c: string) => undefined),
  confirmLinkPhoneOtp: vi.fn(async (_c: string) => undefined),
  sendPhoneOtp: vi.fn(async (_p: string, _c: string) => undefined),
  verifyPhoneOtp: vi.fn(async (_c: string) => undefined),
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth }));

const linkSvc = vi.hoisted(() => ({
  linkGoogleToCurrentAccount: vi.fn(async () => undefined),
  sendEmailLinkForLinking: vi.fn(async (_e: string) => undefined),
  completeEmailLink: vi.fn(async () => undefined),
  clearEmailLinkFromUrl: vi.fn(),
  isEmailLinkReturn: vi.fn(() => false),
  describeEmailLinkError: vi.fn(() => "x"),
}));
vi.mock("../../services/linkSignInEmail", () => linkSvc);

import CodeSentTo from "./CodeSentTo";
import EmailCodeSignIn from "./EmailCodeSignIn";
import LinkEmailPanel from "./LinkEmailPanel";
import LinkSignInMethodModalSheet from "./LinkSignInMethodModalSheet";
import AccountReadyPanel from "../checkoutWho/AccountReadyPanel";

const EMAIL = "rahul.verma+lt@gmail.com";
const EMAIL_MASKED = "ra••••@gmail.com";
const DIGITS = "9876543210";
const PHONE_MASKED = "+91 98•••••210";

/** Nothing the student typed reaches analytics, storage or the URL. */
function expectNoLeak(raw: string[]) {
  const payload = JSON.stringify(seen.calls);
  const stored: string[] = [];
  for (const s of [window.localStorage, window.sessionStorage]) {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i) || "";
      stored.push(k, s.getItem(k) || "");
    }
  }
  for (const r of raw) {
    expect(payload).not.toContain(r);
    expect(stored.join("\n")).not.toContain(r);
    expect(window.location.href).not.toContain(r);
  }
}

beforeEach(() => {
  seen.calls.length = 0;
  vi.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  auth.user = { uid: "U1", email: "a@b.com", phoneNumber: null, displayName: "A", providerIds: ["google.com"] };
});
afterEach(() => cleanup());

describe("CodeSentTo (the shared message)", () => {
  it("email: masked address + where to look + 'Wrong email? Change it'", () => {
    const onChange = vi.fn();
    render(<CodeSentTo kind="email" to={EMAIL} onChange={onChange} />);
    const p = screen.getByTestId("code-sent-to");
    expect(p.textContent).toBe(`We've sent a 6-digit code to ${EMAIL_MASKED} — check your inbox (and Promotions/Spam). Wrong email? Change it`);
    fireEvent.click(screen.getByRole("button", { name: "Wrong email? Change it" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it("phone: 'by SMS to +91 98•••••210' + 'Wrong number? Change it'", () => {
    render(<CodeSentTo kind="phone" to={`+91${DIGITS}`} onChange={() => {}} />);
    expect(screen.getByTestId("code-sent-to").textContent).toBe(`We've sent a code by SMS to ${PHONE_MASKED}. Wrong number? Change it`);
  });
  it("no onChange -> no link; uses a CSS class, never an inline style", () => {
    const { container } = render(<CodeSentTo kind="email" to={EMAIL} />);
    expect(screen.queryByTestId("code-sent-change")).toBeNull();
    expect(container.querySelector("[style]")).toBeNull();
    expect(container.querySelector(".lt-codesent")).not.toBeNull();
  });
  it("never says Premium", () => {
    render(<CodeSentTo kind="email" to={EMAIL} what="link" onChange={() => {}} />);
    expect(document.body.textContent).not.toMatch(/premium/i);
  });
});

describe("EmailCodeSignIn (Login email-code door / thank-you screen)", () => {
  it("after send: masked address; 'Change it' returns to the box with the value kept and focused", async () => {
    const send = vi.fn(async () => undefined);
    render(<EmailCodeSignIn send={send} verify={vi.fn(async () => undefined)} describe={() => "x"} />);
    fireEvent.change(screen.getByTestId("email-code-email"), { target: { value: EMAIL } });
    fireEvent.click(screen.getByTestId("email-code-send"));
    const sent = await screen.findByTestId("email-code-sent");
    expect(sent.textContent).toContain(EMAIL_MASKED);
    expect(sent.textContent).toContain("Promotions/Spam");
    expect(document.body.textContent).not.toContain(EMAIL);

    fireEvent.click(screen.getByRole("button", { name: "Wrong email? Change it" }));
    const box = (await screen.findByTestId("email-code-email")) as HTMLInputElement;
    expect(box.value).toBe(EMAIL);
    await waitFor(() => expect(document.activeElement).toBe(box));
    expect(send).toHaveBeenCalledTimes(1); // going back cancels nothing and sends nothing
    expectNoLeak([EMAIL, "rahul.verma"]);
  });

  it("a FIXED address (thank-you screen): where it went, but no 'Change it'", async () => {
    render(<EmailCodeSignIn email={EMAIL} sendOnMount send={vi.fn(async () => undefined)} verify={vi.fn(async () => undefined)} describe={() => "x"} />);
    const sent = await screen.findByTestId("email-code-sent");
    expect(sent.textContent).toContain(EMAIL_MASKED);
    expect(screen.queryByTestId("code-sent-change")).toBeNull();
    expect(document.body.textContent).not.toContain(EMAIL);
  });
});

describe("LinkEmailPanel (add an email)", () => {
  it("after the link is sent: masked address; 'Change it' returns to the box, value kept, focused", async () => {
    render(<LinkEmailPanel />);
    fireEvent.click(screen.getByTestId("link-email-by-link"));
    fireEvent.change(screen.getByTestId("link-email-input"), { target: { value: EMAIL } });
    fireEvent.click(screen.getByTestId("link-email-submit"));
    const sent = await screen.findByTestId("link-email-sent");
    expect(sent.textContent).toContain(`We've sent a link to ${EMAIL_MASKED}`);
    expect(document.body.textContent).not.toContain(EMAIL);

    fireEvent.click(screen.getByRole("button", { name: "Wrong email? Change it" }));
    const box = (await screen.findByTestId("link-email-input")) as HTMLInputElement;
    expect(box.value).toBe(EMAIL);
    await waitFor(() => expect(document.activeElement).toBe(box));
    expect(linkSvc.sendEmailLinkForLinking).toHaveBeenCalledTimes(1);
    expectNoLeak([EMAIL]);
  });
});

describe("Sign-in methods modal (LinkPhoneNudge / Settings / account menu)", () => {
  it("after send: masked number; 'Change it' returns to the number box, value kept, focused", async () => {
    render(<LinkSignInMethodModalSheet open onClose={() => {}} />);
    const num = screen.getByLabelText("Mobile number") as HTMLInputElement;
    fireEvent.change(num, { target: { value: DIGITS } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    const sent = await screen.findByTestId("code-sent-to");
    expect(sent.textContent).toContain(`by SMS to ${PHONE_MASKED}`);
    expect(document.body.textContent).not.toContain(DIGITS);
    expect(auth.sendLinkPhoneOtp).toHaveBeenCalledWith(`+91${DIGITS}`, "lt-link-recaptcha");

    fireEvent.click(screen.getByRole("button", { name: "Wrong number? Change it" }));
    const back = (await screen.findByLabelText("Mobile number")) as HTMLInputElement;
    expect(back.value).toBe(DIGITS);
    await waitFor(() => expect(document.activeElement).toBe(back));
    expect(auth.sendLinkPhoneOtp).toHaveBeenCalledTimes(1);
    expectNoLeak([DIGITS]);
  });
});

describe("AccountReadyPanel (thank-you screen, phone)", () => {
  it("after 'It's for me': where the SMS went (masked); no 'Change it' — the payment is recorded against that number", async () => {
    render(
      <AccountReadyPanel
        item={{ kind: "pass", sku: "till_boards", label: "Board Pass", description: "Board Pass" }}
        recipient={{ first: "phone", phone: `+91${DIGITS}` }}
        payerSignedIn={false}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId("who-open-me"));
    const sent = await screen.findByTestId("who-code-sent-to");
    expect(sent.textContent).toContain(`by SMS to ${PHONE_MASKED}`);
    expect(screen.queryByTestId("code-sent-change")).toBeNull();
    expect(document.body.textContent).not.toContain(DIGITS);
    expectNoLeak([DIGITS]);
  });
});
