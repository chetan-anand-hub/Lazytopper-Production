/**
 * ASK-PARENTS-PAY-1 — the student's side: "Ask your parents to pay".
 *
 * Dark by default; one tap mints a link for THIS account and SHOWS the exact message before
 * anything is sent; the student picks the contact in WhatsApp (wa.me with text only, no
 * number); a real count or none; the server's prices; analytics carries no content.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackAskParentTap: vi.fn() };
});

import AskParents, { AskParentsView, ASK_PARENTS_LABEL, ASK_PARENTS_PRIVACY_NOTE, ASK_PARENTS_WA_BLOCKED } from "./AskParents";
import * as analytics from "../../analytics/analytics";
import type { MintedParentLink } from "../../services/parentPay";

const track = analytics.trackAskParentTap as unknown as ReturnType<typeof vi.fn>;
const TOKEN = "T".repeat(43);
const NOW = Date.parse("2026-10-18T10:00:00Z");
const MINTED: MintedParentLink = {
  token: TOKEN,
  expiresAt: new Date(NOW + 72 * 3600e3).toISOString(),
  prices: { month: 599, till_boards: 2396 },
};

function setup(over: Partial<Parameters<typeof AskParentsView>[0]> = {}) {
  const props = {
    mint: vi.fn(async () => MINTED),
    loadCheckedCount: vi.fn(async () => 7 as number | null),
    origin: "https://www.lazytopper.com",
    base: "/",
    now: () => NOW,
    openWindow: vi.fn(() => ({ opener: {} as unknown })),
    copyText: vi.fn(async () => undefined),
    ...over,
  };
  render(<AskParentsView {...props} />);
  return props;
}

async function openSheet() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: ASK_PARENTS_LABEL }));
  });
}

beforeEach(() => track.mockClear());
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("AskParents", () => {
  it("DARK: renders nothing unless both client flags are on", () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    vi.stubEnv("VITE_PARENT_PAY_ENABLED", "");
    const { container } = render(<AskParents />);
    expect(container.innerHTML).toBe("");
  });

  it("is a secondary action: nothing is minted or sent until the student taps", () => {
    const p = setup();
    expect(screen.getByRole("button", { name: ASK_PARENTS_LABEL })).toHaveAttribute("aria-expanded", "false");
    expect(p.mint).not.toHaveBeenCalled();
    expect(p.openWindow).not.toHaveBeenCalled();
  });

  it("tap -> mints once and SHOWS the exact message: real count, server prices, the fragment link", async () => {
    const p = setup();
    await openSheet();
    expect(p.mint).toHaveBeenCalledTimes(1);
    const msg = screen.getByTestId("ask-parents-message").textContent || "";
    expect(msg).toContain("I've had 7 answers checked on it in the last 30 days.");
    expect(msg).toContain("₹599 for a month");
    expect(msg).toContain("₹2,396 once");
    expect(msg).toContain(`https://www.lazytopper.com/pricing#pp=${TOKEN}`);
    expect(msg).toContain("works for 3 days");
    expect(screen.getByText(ASK_PARENTS_PRIVACY_NOTE)).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("pricing", "open");
    // Closing and reopening reuses the same link.
    await openSheet();
    await openSheet();
    expect(p.mint).toHaveBeenCalledTimes(1);
  });

  it("zero (or unknown) answers checked: the count line is LEFT OUT", async () => {
    for (const n of [0, null]) {
      setup({ loadCheckedCount: vi.fn(async () => n) });
      await openSheet();
      expect(screen.getByTestId("ask-parents-message").textContent).not.toMatch(/checked on it/);
      cleanup();
    }
  });

  it("a failed count read never blocks the link — the line is simply omitted", async () => {
    setup({ loadCheckedCount: vi.fn(async () => { throw new Error("offline"); }) });
    await openSheet();
    expect(screen.getByTestId("ask-parents-message").textContent).not.toMatch(/checked on it/);
  });

  it("Send on WhatsApp opens wa.me with the TEXT only — no phone number anywhere", async () => {
    const p = setup();
    await openSheet();
    fireEvent.click(screen.getByRole("button", { name: "Send on WhatsApp" }));
    expect(p.openWindow).toHaveBeenCalledTimes(1);
    const [url, target] = (p.openWindow as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as unknown as [string, string];
    expect(target).toBe("_blank");
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe("https://wa.me/");
    expect([...u.searchParams.keys()]).toEqual(["text"]);
    expect(u.searchParams.get("text")).toBe(screen.getByTestId("ask-parents-message").textContent);
    expect(track).toHaveBeenCalledWith("pricing", "whatsapp");
    // Analytics carries surface + action only — never the message, link or token.
    for (const call of track.mock.calls) expect(JSON.stringify(call)).not.toContain(TOKEN);
  });

  it("a blocked popup says so, and Copy message is the fallback", async () => {
    const p = setup({ openWindow: vi.fn(() => null) });
    await openSheet();
    fireEvent.click(screen.getByRole("button", { name: "Send on WhatsApp" }));
    expect(screen.getByTestId("ask-parents-notice")).toHaveTextContent(ASK_PARENTS_WA_BLOCKED);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy message" }));
    });
    expect(p.copyText).toHaveBeenCalledWith(screen.getByTestId("ask-parents-message").textContent);
    expect(screen.getByTestId("ask-parents-notice")).toHaveTextContent("Message copied.");
    expect(track).toHaveBeenCalledWith("pricing", "copy");
  });

  it("हिंदी switches the message, same link and facts", async () => {
    setup();
    await openSheet();
    fireEvent.click(screen.getByRole("button", { name: "हिंदी" }));
    const msg = screen.getByTestId("ask-parents-message").textContent || "";
    expect(msg).toContain("7 उत्तर");
    expect(msg).toContain(`#pp=${TOKEN}`);
    expect(msg).toContain("₹599");
  });

  it("a failed mint shows an honest error and a retry — no message, no WhatsApp button", async () => {
    const mint = vi.fn(async (): Promise<MintedParentLink> => { throw new Error("503"); });
    setup({ mint });
    await openSheet();
    expect(screen.getByTestId("ask-parents-failed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send on WhatsApp" })).toBeNull();
    mint.mockImplementationOnce(async () => MINTED);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    });
    expect(screen.getByTestId("ask-parents-message")).toBeInTheDocument();
  });
});
