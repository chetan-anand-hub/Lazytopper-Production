/**
 * LIMITS-1 PR-2 — the Basic list's papers row with the limits ON comes from a LAZY chunk (PERF-3), so the
 * entry carries none of it whichever way the flag is set; with the limits off the row is unchanged.
 * MUTATION: import limitsPlanCopy statically in BasicFreeList.tsx -> "lazy" test RED.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { basicDownloadLine } from "../../config/limitsPlanCopy";

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

describe("BasicFreeList papers row", () => {
  it("limits off: the old wording, no limits copy", async () => {
    await mount("");
    expect(screen.getByTestId("basic-free-list").textContent).toMatch(/Open or download \d+ chapter tests or mocks a day/);
  });
  it("limits on (any case the other readers accept): the weekly download line from the config, via the lazy row", async () => {
    for (const flag of ["1", "TRUE", "On"]) {
      cleanup();
      await mount(flag);
      await screen.findByText(new RegExp(basicDownloadLine().replace(/^Download/, "download").replace(/[—]/g, ".")));
      expect(screen.getByTestId("basic-free-list").textContent).not.toMatch(/Open or download/);
    }
  });
  it("lazy: BasicFreeList imports neither limitsPlanCopy nor limitsConfig statically", () => {
    const t = readFileSync(path.join(here, "BasicFreeList.tsx"), "utf8");
    expect(t).not.toMatch(/from "\.\.\/\.\.\/config\/limits/);
    expect(t).toMatch(/import\("\.\.\/\.\.\/config\/limitsPlanCopy"\)/);
    expect(t).toMatch(/\(1\|true\|on\|yes\)\$\/i/);
  });
});
