/**
 * EMAIL-CODE-1 - the /login door method "Sign in with email code" (EmailCodeDoor), built and tested here, NOT yet mounted
 * in Login.tsx: the one lazy reference it needs puts the entry chunk over the PERF-3 budget (see the PR). Self-gating:
 * nothing renders while VITE_EMAIL_CODE_SIGNIN_ENABLED is off. On: the button opens the email-code sheet; "Sign in another
 * way" closes it; the code signs in (Login's existing signed-in exit would then redirect).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const codes = vi.hoisted(() => ({
  sendEmailCode: vi.fn(async (_e: string) => undefined),
  signInWithEmailCode: vi.fn(async (_e: string, _c: string) => undefined),
  describeEmailCodeError: vi.fn(() => "x"),
}));
vi.mock("../../services/emailCode", () => codes);

import EmailCodeDoor from "./EmailCodeDoor";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_EMAIL_CODE_SIGNIN_ENABLED", "1");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("EmailCodeDoor", () => {
  it("flag on: the door opens the email-code sheet; email -> code -> signed in", async () => {
    render(<EmailCodeDoor />);
    fireEvent.click(screen.getByTestId("lt-email-code-door"));
    expect(await screen.findByRole("dialog", { name: "Sign in with email code" })).toBeTruthy();
    fireEvent.change(await screen.findByTestId("email-code-email"), { target: { value: "asha@gmail.com" } });
    fireEvent.click(screen.getByTestId("email-code-send"));
    await screen.findByTestId("email-code-sent");
    expect(codes.sendEmailCode).toHaveBeenCalledWith("asha@gmail.com");
    fireEvent.change(screen.getByTestId("email-code-input"), { target: { value: "123456" } });
    await waitFor(() => expect(codes.signInWithEmailCode).toHaveBeenCalledWith("asha@gmail.com", "123456"));
  });

  it("'Sign in another way' (and Escape) close the sheet", async () => {
    render(<EmailCodeDoor />);
    fireEvent.click(screen.getByTestId("lt-email-code-door"));
    fireEvent.click(await screen.findByTestId("email-code-other"));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByTestId("lt-email-code-door"));
    await screen.findByRole("dialog");
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("flag off: renders nothing", () => {
    vi.stubEnv("VITE_EMAIL_CODE_SIGNIN_ENABLED", "");
    const { container } = render(<EmailCodeDoor />);
    expect(container.innerHTML).toBe("");
  });
});
