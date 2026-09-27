// tutorClient — BUGFIX-1 · B3: a 402 from the tutor never shows the student a raw code.
//
// `useTutorSession` renders `e.message` from whatever `callTutor` throws, so the thrown
// MESSAGE is exactly what the student reads. Before this fix a 402 threw
// `new Error(details.error || ...)` — the literal string "premium_required".

import { describe, it, expect, afterEach, vi } from "vitest";

vi.mock("./paidCallHeaders", () => ({
  paidJsonHeaders: async () => ({ "Content-Type": "application/json" }),
}));

import { callTutor, TutorPremiumRequiredError, type TutorRequest } from "./tutorClient";

const REQ: TutorRequest = {
  uid: "student-1",
  topicKey: "real-numbers",
  topicLabel: "Real Numbers",
  subject: "maths",
  messages: [{ role: "user", content: "Why is root 2 irrational?" }],
};

function respond(status: number, body: unknown) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: status >= 200 && status < 300, status, text: async () => text })),
  );
}

async function thrown(): Promise<Error> {
  try {
    await callTutor(REQ);
  } catch (e) {
    return e as Error;
  }
  throw new Error("callTutor did not throw");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BUGFIX-1 · B3 · the tutor's 402 is a typed branch", () => {
  it("★★ a 402 premium_required throws a PremiumRequiredError carrying the server's copy — never the raw code", async () => {
    respond(402, {
      error: "premium_required",
      message: "The tutor is part of Premium.",
      feature: "tutor",
      tier: "free",
      trialEndedAt: "2026-09-01",
    });
    const err = await thrown();
    expect(err.name).toBe("PremiumRequiredError");
    expect(err).toBeInstanceOf(TutorPremiumRequiredError);
    expect(err.message).toBe("The tutor is part of Premium.");
    expect(err.message).not.toMatch(/premium_required/);
    const typed = err as TutorPremiumRequiredError;
    expect(typed.feature).toBe("tutor");
    expect(typed.tier).toBe("free");
    expect(typed.trialEndedAt).toBe("2026-09-01");
  });

  it("★ a 402 premium_required with NO message still shows plain English, not the code", async () => {
    respond(402, { error: "premium_required" });
    const err = await thrown();
    expect(err.name).toBe("PremiumRequiredError");
    expect(err.message).not.toMatch(/premium_required/);
    expect(err.message.length).toBeGreaterThan(0);
  });

  it("★ any other failure prefers the server's `message` over its `error` code", async () => {
    respond(500, { error: "tutor_upstream_failed", message: "The tutor is busy. Try again in a minute." });
    const err = await thrown();
    expect(err.name).toBe("Error");
    expect(err.message).toBe("The tutor is busy. Try again in a minute.");
  });

  it("★ CONTROL: with no `message`, the `error` code is still surfaced rather than swallowed", async () => {
    respond(500, { error: "tutor_upstream_failed" });
    expect((await thrown()).message).toBe("tutor_upstream_failed");
  });

  it("★ CONTROL: a non-JSON error body falls back to the generic copy", async () => {
    respond(502, "<html>Bad gateway</html>");
    expect((await thrown()).message).toBe("The tutor request failed.");
  });

  it("★ CONTROL: a 200 still returns the reply", async () => {
    respond(200, { reply: "Assume root 2 = p/q in lowest terms…" });
    await expect(callTutor(REQ)).resolves.toMatchObject({ reply: "Assume root 2 = p/q in lowest terms…" });
  });
});
