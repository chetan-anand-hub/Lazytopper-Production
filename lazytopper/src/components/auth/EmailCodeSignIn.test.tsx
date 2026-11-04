/**
 * EMAIL-CODE-1 - the six-box email code step: send -> code boxes (ONE numeric input, autocomplete one-time-code) -> signed
 * in; clear errors with tries left / expired / locked; "Send a new code" only after 30 s; nothing typed goes to storage.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import EmailCodeSignIn, { EMAIL_CODE_RESEND_SEC } from "./EmailCodeSignIn";
import { EmailCodeError, describeEmailCodeError } from "../../services/emailCode";

vi.mock("firebase/auth", () => ({ signInWithCustomToken: vi.fn(async () => undefined) }));
vi.mock("../../services/firebaseClient", () => ({ authClient: {} }));

afterEach(() => {
  cleanup();
});

function mount(over: Partial<Parameters<typeof EmailCodeSignIn>[0]> = {}) {
  const props = {
    send: vi.fn(async () => undefined),
    verify: vi.fn(async () => undefined),
    onSignedIn: vi.fn(),
    describe: describeEmailCodeError,
    ...over,
  };
  render(<EmailCodeSignIn {...props} />);
  return props;
}

describe("EmailCodeSignIn", () => {
  it("typed email -> Send code -> six boxes on one numeric one-time-code input -> 6 digits sign in", async () => {
    const p = mount({ showHeading: true, onCancel: vi.fn() });
    expect(screen.getByText("Sign in with email code")).toBeTruthy();
    fireEvent.change(screen.getByTestId("email-code-email"), { target: { value: "asha@gmail.com" } });
    fireEvent.click(screen.getByTestId("email-code-send"));
    await screen.findByTestId("email-code-sent");
    expect(p.send).toHaveBeenCalledWith("asha@gmail.com");
    expect(screen.getByTestId("email-code-sent").textContent).toContain("as••••@gmail.com");
    const input = screen.getByTestId("email-code-input") as HTMLInputElement;
    expect(input.getAttribute("autocomplete")).toBe("one-time-code");
    expect(input.getAttribute("inputmode")).toBe("numeric");
    expect(input.maxLength).toBe(6);
    expect(document.querySelectorAll(".lt-ecs__box")).toHaveLength(6);
    fireEvent.change(input, { target: { value: "12 34 56" } });
    await waitFor(() => expect(p.verify).toHaveBeenCalledWith("asha@gmail.com", "123456"));
    await waitFor(() => expect(p.onSignedIn).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("email-code-done")).toBeTruthy();
  });

  it("a fixed email + sendOnMount sends ONCE on mount (no email box)", async () => {
    const p = mount({ email: "kid@gmail.com", sendOnMount: true });
    await screen.findByTestId("email-code-sent");
    expect(p.send).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("email-code-email")).toBeNull();
  });

  it("wrong code: 'That code didn't match — 4 tries left', boxes cleared, try again", async () => {
    const verify = vi.fn().mockRejectedValueOnce(new EmailCodeError("code_mismatch", { triesLeft: 4 })).mockResolvedValueOnce(undefined);
    const p = mount({ email: "kid@gmail.com", sendOnMount: true, verify });
    await screen.findByTestId("email-code-sent");
    fireEvent.change(screen.getByTestId("email-code-input"), { target: { value: "000000" } });
    expect((await screen.findByTestId("email-code-error")).textContent).toBe("That code didn't match — 4 tries left.");
    expect((screen.getByTestId("email-code-input") as HTMLInputElement).value).toBe("");
    fireEvent.change(screen.getByTestId("email-code-input"), { target: { value: "123456" } });
    await waitFor(() => expect(p.onSignedIn).toHaveBeenCalled());
  });

  it("expired / locked say to send a new one, and 'Send a new code' opens at once", async () => {
    const verify = vi.fn().mockRejectedValue(new EmailCodeError("code_expired"));
    mount({ email: "kid@gmail.com", sendOnMount: true, verify });
    await screen.findByTestId("email-code-sent");
    expect((screen.getByTestId("email-code-resend") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId("email-code-input"), { target: { value: "123456" } });
    expect((await screen.findByTestId("email-code-error")).textContent).toBe("Code expired — send a new one.");
    await waitFor(() => expect((screen.getByTestId("email-code-resend") as HTMLButtonElement).disabled).toBe(false));
    expect(describeEmailCodeError(new EmailCodeError("too_many_tries"))).toBe("Too many tries — send a new code.");
  });

  it("'Send a new code' waits 30 s by default, counting down; then sends again", async () => {
    expect(EMAIL_CODE_RESEND_SEC).toBe(30);
    mount({ email: "kid@gmail.com", sendOnMount: true });
    await screen.findByTestId("email-code-sent");
    const resend = () => screen.getByTestId("email-code-resend") as HTMLButtonElement;
    expect(resend().textContent).toBe("Send a new code in 30s");
    expect(resend().disabled).toBe(true);
    cleanup();
    // The same countdown, shortened through the seam so the test needs no fake clock.
    const send = vi.fn(async () => undefined);
    mount({ email: "kid@gmail.com", sendOnMount: true, send, resendAfterSec: 1 });
    await screen.findByTestId("email-code-sent");
    expect(resend().disabled).toBe(true);
    await waitFor(() => expect(resend().disabled).toBe(false), { timeout: 3000 });
    expect(resend().textContent).toBe("Send a new code");
    await act(async () => {
      fireEvent.click(resend());
    });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  });

  it("send refused (too many): says to wait; nothing typed goes to storage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const send = vi.fn().mockRejectedValue(new EmailCodeError("too_many", { retryAfterSec: 20 }));
    mount({ send });
    fireEvent.change(screen.getByTestId("email-code-email"), { target: { value: "asha@gmail.com" } });
    fireEvent.click(screen.getByTestId("email-code-send"));
    expect((await screen.findByTestId("email-code-error")).textContent).toBe("Please wait 20 seconds, then try again.");
    expect(screen.getByTestId("email-code-email")).toBeTruthy();
    expect(JSON.stringify(setItem.mock.calls)).not.toContain("asha");
    setItem.mockRestore();
  });
});
