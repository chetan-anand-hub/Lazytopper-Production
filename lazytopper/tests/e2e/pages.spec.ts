/**
 * UI-E2E-1 — signed-out pages × {mobile 360×740, desktop 1280×800}, in a real browser,
 * against the production build (support/serveBuild.ts). No AI calls, no payments, no backend.
 *
 * Per page and viewport:
 *   layout  (a) no uncaught page errors / console errors (allowlist: support/network.ts)
 *           (b) the page's primary CTA is inside the first viewport, not under the mobile
 *               bottom nav, and is the element a tap at its centre actually hits
 *           (c) no horizontal overflow
 *           (d) axe `color-contrast` on <main>: no serious/critical violation that is not in
 *               the day-one baseline (tests/e2e/baseline.json)
 *   visual  (e) above-the-fold screenshot vs the committed baseline (frozen clock, dynamic
 *               regions masked, animations off)
 *
 * Why these: each is a bug that shipped past every jsdom gate — the /test-series Buy button
 * below the fold at 360 px, faint progress text, a nested-router crash on every page (#490).
 */
import AxeBuilder from "@axe-core/playwright";

import { contrastEntry, readBaseline, writeContrast, writeMode, type ContrastEntry } from "./support/baseline";
import { FROZEN_CLOCK, expect, test } from "./support/fixtures";
import { COVERED_PAGES, dynamicRegions, settle } from "./support/pages";

for (const covered of COVERED_PAGES) {
  test.describe(`${covered.path}`, () => {
    test("layout: errors, CTA above the fold, overflow, contrast", async ({ page, net, pageErrors, viewportName }, testInfo) => {
      const id = `${covered.slug}@${viewportName}`;
      const baseline = readBaseline();
      const cta = covered.cta(page, viewportName);

      await page.goto(covered.path);
      await settle(page, cta);

      await test.step("(b) primary CTA inside the first viewport, uncovered", async () => {
        const geo = await cta.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const nav = document.querySelector("[data-lt-bottomnav]");
          const n = nav ? nav.getBoundingClientRect() : null;
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          const describe = (e: Element | null) =>
            e ? `<${e.tagName.toLowerCase()} class="${String(e.className).slice(0, 60)}">` : "nothing";
          return {
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            left: Math.round(r.left),
            right: Math.round(r.right),
            vw: window.innerWidth,
            vh: window.innerHeight,
            navTop: n && n.height > 0 ? Math.round(n.top) : null,
            hitIsCta: !!hit && (hit === el || el.contains(hit)),
            hit: describe(hit),
          };
        });
        const floor = geo.navTop ?? geo.vh;
        const inFold = geo.top >= 0 && geo.bottom <= floor && geo.left >= 0 && geo.right <= geo.vw;
        const where =
          `${covered.ctaLabel(viewportName)} at y=${geo.top}..${geo.bottom}, x=${geo.left}..${geo.right}; ` +
          `viewport ${geo.vw}x${geo.vh}` + (geo.navTop !== null ? `, bottom nav starts at y=${geo.navTop}` : "");

        const known = baseline.ctaBelowFold[id];
        if (known) {
          testInfo.annotations.push({
            type: inFold ? "baseline-stale" : "known-issue",
            description: inFold ? `ctaBelowFold.${id} is fixed — remove it from baseline.json` : `${known} (${where})`,
          });
          return;
        }
        expect.soft(inFold, `primary CTA must be fully visible without scrolling and above the bottom nav: ${where}`).toBe(true);
        expect.soft(geo.hitIsCta, `a tap at the CTA's centre must hit the CTA, but hits ${geo.hit}: ${where}`).toBe(true);
      });

      await test.step("(c) no horizontal overflow", async () => {
        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
          scrollWidth: document.scrollingElement!.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        expect.soft(scrollWidth, `page is ${scrollWidth}px wide in a ${innerWidth}px viewport`).toBeLessThanOrEqual(innerWidth);
      });

      await test.step("(d) text contrast (axe color-contrast, serious/critical)", async () => {
        const result = await new AxeBuilder({ page }).withRules(["color-contrast"]).include("main").analyze();
        const found = new Map<string, ContrastEntry>();
        for (const violation of result.violations) {
          for (const node of violation.nodes) {
            const impact = node.impact ?? violation.impact;
            if (impact !== "serious" && impact !== "critical") continue;
            const entry = contrastEntry(node);
            if (!found.has(entry.key)) found.set(entry.key, entry);
          }
        }
        if (writeMode()) {
          writeContrast(id, [...found.values()]);
          return;
        }
        const listed = new Set((baseline.contrast[id] ?? []).map((e) => e.key));
        const fresh = [...found.values()].filter((e) => !listed.has(e.key));
        const stale = [...listed].filter((k) => !found.has(k));
        if (stale.length) {
          testInfo.annotations.push({ type: "baseline-stale", description: `contrast.${id}: fixed, remove: ${stale.join(" ; ")}` });
        }
        expect
          .soft(
            fresh.map((e) => `${e.key}  (ratio ${e.ratio}, ${e.target})`),
            `NEW low-contrast text on ${id} (not in tests/e2e/baseline.json)`,
          )
          .toEqual([]);
      });

      await test.step("(a) no uncaught errors, every API call answered by a fixture", async () => {
        expect.soft(pageErrors.errors, "uncaught page errors / console errors").toEqual([]);
        expect.soft(net.unmockedApi, "API calls with no fixture in support/network.ts").toEqual([]);
      });
    });

    test("visual: above-the-fold snapshot", async ({ page, viewportName }) => {
      await page.clock.install({ time: FROZEN_CLOCK });
      const cta = covered.cta(page, viewportName);
      await page.goto(covered.path);
      await settle(page, cta);
      await expect(page).toHaveScreenshot(`${covered.slug}.png`, {
        mask: dynamicRegions(page),
        animations: "disabled",
        caret: "hide",
      });
    });
  });
}
