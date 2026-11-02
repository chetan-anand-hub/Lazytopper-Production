// SALE-MOMENT-1 - the owned-packs read: the cache is reset after a purchase, and one account's answer never shows for another.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

const H = vi.hoisted(() => ({ byCall: [] as Array<Array<{ packId: string }>>, fetch: vi.fn() }));
vi.mock("../../services/packs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/packs")>();
  return {
    ...actual,
    fetchMyPacks: () => {
      const n = H.fetch.mock.calls.length;
      H.fetch();
      return Promise.resolve({ packs: H.byCall[Math.min(n, H.byCall.length - 1)], licensee: { name: "", email: "" }, boardPassCredit: null });
    },
  };
});

import { resetOwnedPacksCache, useOwnedPacks } from "./useOwnedPacks";

beforeEach(() => {
  H.byCall = [[]];
  H.fetch.mockClear();
  resetOwnedPacksCache();
});
afterEach(cleanup);

describe("useOwnedPacks", () => {
  it("shares one read inside the TTL, and asks again after resetOwnedPacksCache (a pack was just bought)", async () => {
    H.byCall = [[], [{ packId: "pack_chapter:trigonometry" }]];
    const a = renderHook(() => useOwnedPacks("u1", true));
    await waitFor(() => expect(a.result.current.phase).toBe("ready"));
    const b = renderHook(() => useOwnedPacks("u1", true));
    await waitFor(() => expect(b.result.current.phase).toBe("ready"));
    expect(H.fetch).toHaveBeenCalledTimes(1);
    resetOwnedPacksCache();
    const c = renderHook(() => useOwnedPacks("u1", true));
    await waitFor(() => expect(c.result.current).toEqual({ phase: "ready", packs: [{ packId: "pack_chapter:trigonometry" }] }));
    expect(H.fetch).toHaveBeenCalledTimes(2);
  });
  it("goes back to loading when the uid changes: user A's answer is never shown for user B", async () => {
    H.byCall = [[{ packId: "pack_bundle:all" }], [{ packId: "pack_chapter:triangles" }]];
    const { result, rerender } = renderHook(({ uid }) => useOwnedPacks(uid, true), { initialProps: { uid: "A" } });
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    rerender({ uid: "B" });
    // the very render after the change must not carry A's packs
    expect(result.current.phase).toBe("loading");
    await act(async () => {});
    await waitFor(() => expect(result.current).toEqual({ phase: "ready", packs: [{ packId: "pack_chapter:triangles" }] }));
  });
  it("goes back to loading when it is switched off", async () => {
    const { result, rerender } = renderHook(({ on }) => useOwnedPacks("A", on), { initialProps: { on: true } });
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    rerender({ on: false });
    expect(result.current.phase).toBe("loading");
  });
});
