import { describe, it, expect } from "vitest";

import {
  PARENT_RETURN_KEY,
  persistParentFlag,
  shouldShowParentReturn,
  storedParentFlag,
  urlHasParentFlag,
  withParentFlag,
  type ParentReturnStorage,
} from "./parentReturn";

/** A plain in-memory storage. */
function memStorage(): ParentReturnStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => (data.has(k) ? (data.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
}

/** A storage whose every call throws (private window / blocked site data). */
const throwingStorage: ParentReturnStorage = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
};

describe("PARENTS-CTA-1 — parentReturn (the /check-improve back link flag)", () => {
  it("shows with from=for_parents in the URL, and persists the flag for the tab", () => {
    const s = memStorage();
    expect(shouldShowParentReturn("?from=for_parents&utm_source=for_parents", s)).toBe(true);
    expect(s.data.get(PARENT_RETURN_KEY)).toBe("1");
  });

  it("keeps showing after the query string is gone, in the same tab", () => {
    const s = memStorage();
    shouldShowParentReturn("?from=for_parents", s);
    expect(shouldShowParentReturn("", s)).toBe(true);
    expect(shouldShowParentReturn("?review=ABC", s)).toBe(true);
  });

  it("is hidden without the flag (fresh tab, other sources, other `from` values)", () => {
    expect(shouldShowParentReturn("", memStorage())).toBe(false);
    expect(shouldShowParentReturn("?utm_source=parent_share&utm_medium=whatsapp", memStorage())).toBe(false);
    expect(shouldShowParentReturn("?utm_source=for_parents", memStorage())).toBe(false);
    expect(shouldShowParentReturn("?from=pricing", memStorage())).toBe(false);
    expect(shouldShowParentReturn("?from=FOR_PARENTS", memStorage())).toBe(false);
  });

  it("does not write anything when the flag is absent", () => {
    const s = memStorage();
    shouldShowParentReturn("?from=other", s);
    expect(s.data.size).toBe(0);
  });

  it("is throw-safe: a storage that throws never breaks the page", () => {
    expect(() => shouldShowParentReturn("?from=for_parents", throwingStorage)).not.toThrow();
    expect(shouldShowParentReturn("?from=for_parents", throwingStorage)).toBe(true); // URL alone still shows it
    expect(shouldShowParentReturn("", throwingStorage)).toBe(false);
    expect(storedParentFlag(throwingStorage)).toBe(false);
    expect(() => persistParentFlag(throwingStorage)).not.toThrow();
  });

  it("works with no storage at all", () => {
    expect(shouldShowParentReturn("?from=for_parents", null)).toBe(true);
    expect(shouldShowParentReturn("", null)).toBe(false);
  });

  it("CONTROL — the URL detector reads the exact param, not a substring", () => {
    expect(urlHasParentFlag("?from=for_parents")).toBe(true);
    expect(urlHasParentFlag("from=for_parents")).toBe(true);
    expect(urlHasParentFlag("?x=from%3Dfor_parents")).toBe(false);
    expect(urlHasParentFlag("?from=for_parents_x")).toBe(false);
  });
});

describe("PARENTS-NAV-1 — withParentFlag (every /for-parents link carries the flag)", () => {
  it("adds from=for_parents to a bare path", () => {
    expect(withParentFlag("/pricing")).toBe("/pricing?from=for_parents");
    expect(withParentFlag("/highly-probable/10/Maths")).toBe("/highly-probable/10/Maths?from=for_parents");
  });

  it("merges with an existing query, keeping it first and encoded", () => {
    expect(withParentFlag(`/cbse/class-10?returnTo=${encodeURIComponent("/for-parents")}`)).toBe(
      "/cbse/class-10?returnTo=%2Ffor-parents&from=for_parents",
    );
    expect(withParentFlag("/x?a=1&b=2")).toBe("/x?a=1&b=2&from=for_parents");
  });

  it("replaces an existing `from` rather than duplicating it, and keeps a #hash last", () => {
    expect(withParentFlag("/x?from=other")).toBe("/x?from=for_parents");
    expect(withParentFlag("/x?from=for_parents")).toBe("/x?from=for_parents");
    expect(withParentFlag("/cbse/class-10#papers")).toBe("/cbse/class-10?from=for_parents#papers");
    expect(withParentFlag("/x?a=1#h")).toBe("/x?a=1&from=for_parents#h");
  });

  it("every output is read back as flagged by the same detector the destination uses", () => {
    for (const to of ["/pricing", "/cbse/class-10?returnTo=%2Ffor-parents", "/legal/privacy", "/x?from=other#h"]) {
      const out = withParentFlag(to);
      const search = out.slice(out.indexOf("?"), out.includes("#") ? out.indexOf("#") : undefined);
      expect(urlHasParentFlag(search), out).toBe(true);
    }
  });
});
