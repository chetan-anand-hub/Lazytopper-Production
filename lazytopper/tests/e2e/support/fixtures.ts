/**
 * UI-E2E-1 — the suite's `test`: every test gets the hermetic network (support/network.ts)
 * installed BEFORE its first navigation, an error collector, and its viewport's name.
 */
import { test as base, expect } from "@playwright/test";

import { collectPageErrors, installNetwork, type NetworkLog, type PageErrors } from "./network";
import type { Viewport } from "./pages";

/**
 * The instant the VISUAL snapshots run at (IST). The pages are date-driven — founding
 * prices end 30 Nov, a countdown ticks daily, the greeting follows the hour — so a pixel
 * baseline must not depend on the day CI happens to run. Only the visual test installs it;
 * every other check runs at the real date, i.e. on what students see today.
 */
export const FROZEN_CLOCK = new Date("2026-11-23T10:30:00+05:30");

export const test = base.extend<{ net: NetworkLog; pageErrors: PageErrors; viewportName: Viewport }>({
  // Playwright requires a destructuring pattern as a fixture's first parameter, even an empty one.
  // eslint-disable-next-line no-empty-pattern
  viewportName: async ({}, provide, testInfo) => {
    const v = (testInfo.project.metadata as { viewport?: Viewport }).viewport;
    if (v !== "mobile" && v !== "desktop") throw new Error(`project ${testInfo.project.name} has no metadata.viewport`);
    await provide(v);
  },
  net: async ({ context, baseURL }, provide) => {
    if (!baseURL) throw new Error("ui-e2e: no baseURL (playwright.config.ts)");
    await provide(await installNetwork(context, new URL(baseURL).origin));
  },
  pageErrors: async ({ page, net }, provide) => {
    await provide(collectPageErrors(page, net));
  },
});

export { expect };
