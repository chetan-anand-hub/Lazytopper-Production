/**
 * PACK-DOWNLOAD-RESTORE - a student who owns a PDF pack covering a Chapter Test / Full Mock downloads it exactly as before 18 Nov 2026
 * (TEST-SERIES-1 had taken it away). Written-answer CHECKING is unchanged: a PDF pack does not open it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

const sub = vi.hoisted(() => ({ paid: false }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => ({ status: { tier: sub.paid ? "premium" : "free" }, isPremium: sub.paid }) }));
vi.mock("../../services/subscriptionService", async (orig) => ({ ...(await orig<typeof import("../../services/subscriptionService")>()), isPaidPremium: () => sub.paid }));
const mine = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock("../../services/packs", async (orig) => ({ ...(await orig<typeof import("../../services/packs")>()), fetchMyPacks: (...a: unknown[]) => mine.fn(...a) }));

import { canCheckSeriesPapers, canDownloadPaper } from "../../lib/testSeries/seriesAccess";
import { resetOwnedPacksCache } from "../packs/useOwnedPacks";
import { resetTestSeriesOwnershipForTests } from "./testSeriesOwnership";
import { useSeriesDownloadAccess, useSeriesPaperAccess, type DownloadPaper } from "./WrittenCheckGate";

const pack = (sku: string, target: string) => ({ packId: `${sku}:${target}`, sku, target, pricePaidInr: 49, paidAt: 1 });
const mineOf = (packs: unknown[], extra: Record<string, unknown> = {}) => ({ packs, licensee: { name: "", email: "" }, boardPassCredit: null, ...extra });

let seen: { check: boolean; dl: boolean } | null = null;
function Probe({ paper }: { paper: DownloadPaper }) {
  const check = useSeriesPaperAccess("u1");
  const dl = useSeriesDownloadAccess("u1", check, paper);
  seen = { check, dl };
  return null;
}
async function run(packs: unknown[], paper: DownloadPaper, extra: Record<string, unknown> = {}) {
  cleanup();
  resetOwnedPacksCache();
  resetTestSeriesOwnershipForTests();
  mine.fn.mockResolvedValue(mineOf(packs, extra));
  render(<Probe paper={paper} />);
  await waitFor(() => expect(mine.fn).toHaveBeenCalled());
  await new Promise((r) => setTimeout(r, 30));
  return seen!;
}

beforeEach(() => {
  sub.paid = false;
  seen = null;
  mine.fn.mockReset();
});
afterEach(cleanup);

describe("pure rule", () => {
  it("a covering pack opens the download, never the written check", () => {
    expect(canDownloadPaper({ paidPremium: false, ownsCoveringPack: true })).toBe(true);
    expect(canCheckSeriesPapers({ paidPremium: false })).toBe(false);
    expect(canDownloadPaper({ paidPremium: false })).toBe(false);
    expect(canDownloadPaper({ paidPremium: true })).toBe(true);
    expect(canDownloadPaper({ paidPremium: false, ownsTestSeries: true })).toBe(true);
  });
});

describe("Chapter Test downloads", () => {
  const ct = (slug: string): DownloadPaper => ({ kind: "chapter-test", chapterSlug: slug });
  it("Chapter Pack of THIS chapter: download yes, check no; another chapter: neither", async () => {
    expect(await run([pack("pack_chapter", "real-numbers")], ct("real-numbers"))).toEqual({ check: false, dl: true });
    expect(await run([pack("pack_chapter", "real-numbers")], ct("polynomials"))).toEqual({ check: false, dl: false });
  });
  it("Subject Pack covers its subject's chapters; Bundle covers all; no pack covers nothing", async () => {
    expect((await run([pack("pack_subject", "maths")], ct("real-numbers"))).dl).toBe(true);
    expect((await run([pack("pack_bundle", "all")], ct("real-numbers"))).dl).toBe(true);
    expect((await run([], ct("real-numbers"))).dl).toBe(false);
  });
});

describe("Full Mock downloads", () => {
  const fm = (subject: "maths" | "science"): DownloadPaper => ({ kind: "full-mock", subject });
  it("Mock Pack / Subject Pack / Bundle of the subject: download yes, check no; the other subject: no", async () => {
    expect(await run([pack("pack_mock", "maths")], fm("maths"))).toEqual({ check: false, dl: true });
    expect((await run([pack("pack_mock", "maths")], fm("science"))).dl).toBe(false);
    expect((await run([pack("pack_subject", "science")], fm("science"))).dl).toBe(true);
    expect((await run([pack("pack_bundle", "all")], fm("science"))).dl).toBe(true);
  });
});

describe("others unchanged", () => {
  it("Board Pass holder and Test Series owner download (and check) with no extra rule", async () => {
    sub.paid = true;
    cleanup();
    render(<Probe paper={{ kind: "full-mock", subject: "maths" }} />);
    expect(seen).toEqual({ check: true, dl: true });
    sub.paid = false;
    expect(await run([{ packId: "test_series:all", sku: "test_series", target: "all", pricePaidInr: 999, paidAt: 1 }], { kind: "full-mock", subject: "maths" }, { ownsTestSeries: true })).toEqual({ check: true, dl: true });
  });
});
