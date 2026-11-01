// CBQ-TUTOR-TASTE-1 - callTutor hands the server's remaining count to the banner store; the 402 at 0 stays the normal lock.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./paidCallHeaders", () => ({ paidJsonHeaders: async () => ({ "Content-Type": "application/json" }) }));
vi.mock("../analytics/analytics", () => ({ sendAnalyticsHit: vi.fn() }));

import { callTutor, type TutorRequest } from "./tutorClient";
import { getCbqTutorBonus, resetCbqTutorBonusForTests } from "./cbqTutorBonus";
import { sendAnalyticsHit } from "../analytics/analytics";

const REQ: TutorRequest = { uid: "s1", topicKey: "real-numbers", topicLabel: "Real Numbers", subject: "maths", messages: [{ role: "user", content: "why?" }] };
function respond(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: status < 300, status, text: async () => JSON.stringify(body) })));
}
beforeEach(() => {
  resetCbqTutorBonusForTests();
  vi.mocked(sendAnalyticsHit).mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe("CBQ tutor bonus wiring", () => {
  it("a served turn that spent a bonus question records what is left and fires the event once", async () => {
    respond(200, { reply: "Because...", cbqTutorBonus: { used: 1, left: 2, limit: 3 } });
    await callTutor(REQ);
    expect(getCbqTutorBonus("s1")).toEqual({ uid: "s1", left: 2, limit: 3 });
    expect(sendAnalyticsHit).toHaveBeenCalledTimes(1);
  });
  it("an ordinary Premium turn touches nothing", async () => {
    respond(200, { reply: "Because..." });
    await callTutor(REQ);
    expect(getCbqTutorBonus("s1")).toBeNull();
    expect(sendAnalyticsHit).not.toHaveBeenCalled();
  });
  it("the 402 at 0 left is still the Premium lock and sets the count to 0", async () => {
    respond(402, { error: "premium_required", message: "Premium.", feature: "tutor", tier: "free", cbqTutorBonus: { used: 3, left: 0, limit: 3 } });
    await expect(callTutor(REQ)).rejects.toMatchObject({ name: "PremiumRequiredError" });
    expect(getCbqTutorBonus("s1")?.left).toBe(0);
    expect(sendAnalyticsHit).not.toHaveBeenCalled();
  });
});
