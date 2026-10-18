// ADMIN-EXTEND-1 — the admin "Extend Premium" control's pure half: input bounds, the
// preview end it names in the confirmation line, and the request it sends. The server
// decides the real end (server/services/premiumExtension.test.cjs); this file pins that the
// preview uses the SAME rule — max(now, current end) + days — so the line the admin
// confirms is the end the server then writes.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EXTEND_API,
  confirmationLine,
  doneLine,
  extendBlockedReason,
  newRequestId,
  parseExtendDays,
  postExtension,
  previewNewEndMs,
  type ExtensionResult,
} from "./adminExtendModel";
import { formatIstDate } from "./studentsAdminModel";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-10-18T12:00:00+05:30");

describe("ADMIN-EXTEND-1 · input", () => {
  it("days: 1-30 whole numbers only", () => {
    expect(parseExtendDays("7")).toBe(7);
    expect(parseExtendDays(" 1 ")).toBe(1);
    expect(parseExtendDays("30")).toBe(30);
    for (const bad of ["0", "31", "1.5", "-1", "", "abc", "100"]) expect(parseExtendDays(bad)).toBeNull();
  });

  it("legacy Premium with no end, and an unreadable plan, cannot be extended", () => {
    expect(extendBlockedReason({ kind: "premium", premiumUntilMs: null })).toMatch(/no end date/);
    expect(extendBlockedReason({ kind: "unknown" })).not.toBeNull();
    expect(extendBlockedReason({ kind: "basic" })).toBeNull();
    expect(extendBlockedReason({ kind: "trial", trialEndsAtMs: NOW + DAY, daysLeft: 1 })).toBeNull();
  });
});

describe("ADMIN-EXTEND-1 · preview = max(now, current end) + days (the server's rule)", () => {
  it("running trial -> from the trial end", () => {
    expect(previewNewEndMs({ kind: "trial", trialEndsAtMs: NOW + 3 * DAY, daysLeft: 3 }, 7, NOW)).toBe(NOW + 10 * DAY);
  });
  it("running pass -> from the pass end", () => {
    expect(previewNewEndMs({ kind: "premium", premiumUntilMs: NOW + 20 * DAY }, 7, NOW)).toBe(NOW + 27 * DAY);
  });
  it("basic / ended -> from now", () => {
    expect(previewNewEndMs({ kind: "basic" }, 7, NOW)).toBe(NOW + 7 * DAY);
    expect(previewNewEndMs({ kind: "trial", trialEndsAtMs: NOW - DAY, daysLeft: 0 }, 2, NOW)).toBe(NOW + 2 * DAY);
  });
  it("blocked plans have no preview", () => {
    expect(previewNewEndMs({ kind: "premium", premiumUntilMs: null }, 7, NOW)).toBeNull();
  });
});

describe("ADMIN-EXTEND-1 · honest lines", () => {
  it("the confirmation line names the student, the days and the new end date, and says ₹0 / not a sale", () => {
    const line = confirmationLine("ri•••@gmail.com (uid u1)", 7, NOW + 10 * DAY, "feedback call reward");
    expect(line).toContain("ri•••@gmail.com (uid u1)");
    expect(line).toContain("7 more days");
    expect(line).toContain(formatIstDate(NOW + 10 * DAY));
    expect(line).toContain("₹0");
    expect(line).toContain("not a sale");
    expect(line).toContain("feedback call reward");
    expect(confirmationLine("s", 1, NOW, "r")).toContain("1 more day of");
  });

  it("the done line shows the SERVER's end, and says when it was already applied", () => {
    const ext: ExtensionResult = {
      uid: "u1", requestId: "req-1", days: 7, reason: "feedback call reward", pricePaidInr: 0, isSale: false,
      basis: "trial", previousEnd: null, newEnd: new Date(NOW + 9 * DAY).toISOString(), adminUid: "a", createdAt: null,
    };
    expect(doneLine("s", ext, false)).toBe(`Done: s has Premium until ${formatIstDate(NOW + 9 * DAY)} (+7 days, ₹0, not a sale).`);
    expect(doneLine("s", ext, true)).toMatch(/^Already done:/);
  });
});

describe("ADMIN-EXTEND-1 · request", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("request ids are unique and server-acceptable", () => {
    const a = newRequestId();
    const b = newRequestId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
  });

  it("POSTs to the admin route with the Bearer token and exactly {uid, days, reason, requestId}", async () => {
    const fetchMock = vi.fn(async (..._args: unknown[]) => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, replayed: false, extension: { uid: "u1", days: 7 } }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const out = await postExtension({ uid: "u1", days: 7, reason: "feedback call reward", requestId: "req-abc12345" }, async () => "tok");
    expect(out.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(EXTEND_API);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(JSON.parse(String(init.body))).toEqual({ uid: "u1", days: 7, reason: "feedback call reward", requestId: "req-abc12345" });
  });

  it("403 -> not authorised; no token -> no request at all", async () => {
    const fetchMock = vi.fn(async (..._args: unknown[]) => ({ ok: false, status: 403, json: async () => ({ ok: false }) }));
    vi.stubGlobal("fetch", fetchMock);
    const refused = await postExtension({ uid: "u1", days: 7, reason: "r", requestId: "req-abc12345" }, async () => "tok");
    expect(refused).toEqual({ ok: false, status: 403, error: "Not authorised." });
    fetchMock.mockClear();
    const noToken = await postExtension({ uid: "u1", days: 7, reason: "r", requestId: "req-abc12345" }, async () => null);
    expect(noToken.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
