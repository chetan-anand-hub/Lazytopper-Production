import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { GUEST_CLAIMED_EVENT } from "../../services/guestPay";

afterEach(() => {
  cleanup();
  vi.resetModules();
  vi.doUnmock("./SecondLoginPrompt");
  vi.unstubAllEnvs();
});

const fire = () => act(async () => { window.dispatchEvent(new CustomEvent(GUEST_CLAIMED_EVENT, { detail: { count: 1, items: [] } })); });

describe("SecondLoginPromptHost never breaks the app (SECOND-LOGIN-PROMPT-1 review fix)", () => {
  it("a lazy chunk that fails to load leaves the rest of the app rendered", async () => {
    vi.doMock("./SecondLoginPrompt", () => { throw new Error("chunk failed"); });
    const { default: Host } = await import("./SecondLoginPromptHost");
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<><div data-testid="app">the app</div><Host /></>);
    await fire();
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByTestId("app").textContent).toBe("the app");
    err.mockRestore();
  });

  it("a prompt that throws while rendering leaves the rest of the app rendered", async () => {
    vi.doMock("./SecondLoginPrompt", () => ({ default: () => { throw new Error("render failed"); } }));
    const { default: Host } = await import("./SecondLoginPromptHost");
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<><div data-testid="app">the app</div><Host /></>);
    await fire();
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByTestId("app").textContent).toBe("the app");
    err.mockRestore();
  });

  it("the kill switch accepts 1 / true / on / yes", async () => {
    const { isSecondLoginPromptEnabled } = await import("../../services/secondLoginPrompt");
    expect(isSecondLoginPromptEnabled()).toBe(true);
    for (const v of ["1", "true", "TRUE", "on", "yes"]) {
      vi.stubEnv("VITE_SECOND_LOGIN_PROMPT_DISABLED", v);
      expect(isSecondLoginPromptEnabled(), v).toBe(false);
    }
    vi.stubEnv("VITE_SECOND_LOGIN_PROMPT_DISABLED", "0");
    expect(isSecondLoginPromptEnabled()).toBe(true);
  });
});
