/**
 * LIMITS-1 PR-2 gave the Basic list a limits-on papers row (a weekly download, from a LAZY chunk). GUEST-WALL (owner ruling
 * 26 Nov 2026, 22:43 IST: "remove the download or checking option from basic plan") retires it: the list is the same with the
 * limits on or off, and states no download and no written-answer check as a Basic allowance.
 * MUTATION: restore the lazy `basicPapersRow` override in BasicFreeList.tsx -> "limits on" RED.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

async function mount(flag: string) {
  vi.resetModules();
  vi.stubEnv("VITE_LIMITS_ENABLED", flag);
  const { BasicFreeList } = await import("./BasicFreeList");
  render(<BasicFreeList />);
}

const ROW = "Open 3 chapter tests or mocks a day (1 when signed out)";
const FIRST = "Your first test is free, marking included.";

describe("BasicFreeList papers row (GUEST-WALL)", () => {
  for (const flag of ["", "1", "TRUE", "On"]) {
    it(`limits ${flag ? `on (${flag})` : "off"}: opens only, the first free test, no download or checking`, async () => {
      await mount(flag);
      // let any (retired) lazy import settle before reading
      await new Promise((r) => setTimeout(r, 0));
      const text = screen.getByTestId("basic-free-list").textContent || "";
      expect(text).toContain(ROW);
      expect(text).toContain(FIRST);
      expect(text).not.toMatch(/download|not checked|written answers/i);
    });
  }
  it("BasicFreeList imports neither limitsPlanCopy nor limitsConfig (statically or lazily)", () => {
    const t = readFileSync(path.join(here, "BasicFreeList.tsx"), "utf8");
    expect(t).not.toMatch(/config\/limits/);
  });
});
