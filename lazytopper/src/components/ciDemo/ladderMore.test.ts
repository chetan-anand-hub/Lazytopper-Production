import { beforeEach, describe, expect, it, vi } from "vitest";

const H = vi.hoisted(() => ({ one: vi.fn(), launch: vi.fn() }));
vi.mock("../../analytics/analytics", async (orig) => ({ ...(await orig<object>()), trackOneMinute: (...a: unknown[]) => H.one(...a) }));
vi.mock("../startHere/StartHereCard", () => ({ launchStartHereSet: (...a: unknown[]) => H.launch(...a) }));

import { launchMoreLikeThis } from "./ladderMore";

beforeEach(() => {
  H.one.mockReset();
  H.launch.mockReset();
});

describe("FIVE-MORE-1 launchMoreLikeThis", () => {
  it("fires one_min_more_practice and signed in goes straight to the set", async () => {
    const nav = vi.fn();
    H.launch.mockImplementation(async (a: { navigate: (t: string) => void }) => (a.navigate("/practice/10/Maths?topic=x"), true));
    await launchMoreLikeThis({ navigate: nav, signedIn: true, subject: "Maths", chapter: "x" });
    expect(H.one).toHaveBeenCalledWith("one_min_more_practice");
    expect(nav).toHaveBeenCalledWith("/practice/10/Maths?topic=x");
  });
  it("signed out goes through /login with the set as the redirect (no guest session)", async () => {
    const nav = vi.fn();
    H.launch.mockImplementation(async (a: { navigate: (t: string) => void }) => (a.navigate("/practice/10/Maths?topic=x"), true));
    await launchMoreLikeThis({ navigate: nav, signedIn: false, subject: "Maths", chapter: "x" });
    expect(nav).toHaveBeenCalledWith(`/login?redirect=${encodeURIComponent("/practice/10/Maths?topic=x")}`);
  });
  it("a short chapter falls back to the chapter's Quick Practice link", async () => {
    const nav = vi.fn();
    H.launch.mockResolvedValue(false);
    await launchMoreLikeThis({ navigate: nav, signedIn: true, subject: "Science", chapter: "light-reflection-and-refraction" });
    expect(nav.mock.calls[0][0]).toMatch(/^\/practice\/10\/Science\?.*topic=light-reflection-and-refraction/);
  });
});
