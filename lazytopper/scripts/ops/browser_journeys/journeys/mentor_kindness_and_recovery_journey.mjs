import {
  bodyText,
  captureJourneyScreenshot,
  collectSurfaceSignals,
  isVisible,
  makeJourneyCheck,
  openAuthenticatedPath,
} from "../browser_journey_lib.mjs";

export const journey = {
  id: "mentor_kindness_and_recovery_journey",
  area: "mentor",
  title: "Mentor kindness and recovery journey",
  async run({ browser, scenario = {}, taskId = "" }) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route("**/api/mentor", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "forced_browser_journey_failure" }),
      });
    });
    const startUrl = await openAuthenticatedPath(
      page,
      scenario.startingPath || "/practice/10/Maths?topic=trigonometry&count=3&journeyMentor=hint"
    );
    const checks = [];

    try {
      checks.push(
        makeJourneyCheck(
          "mentor_surface_reachable",
          await isVisible(page.getByTestId("practice-mentor-drawer"), 12000),
          "A student should be able to open mentor help directly from practice.",
          "P0"
        )
      );
      const drawer = page.getByTestId("practice-mentor-drawer");
      await page
        .waitForFunction(() => {
          const drawerEl = document.querySelector('[data-testid="practice-mentor-drawer"]');
          const text = String(drawerEl?.textContent || "").toLowerCase();
          return (
            text.includes("good attempt") ||
            text.includes("let's start") ||
            text.includes("next move")
          );
        }, { timeout: 12000 })
        .catch(() => {});
      const drawerText = await drawer.innerText().catch(() => "");
      const signals = await collectSurfaceSignals(page);
      checks.push(
        makeJourneyCheck(
          "fallback_reply_is_constructive",
          /good attempt|let's start|next move/i.test(drawerText),
          "When the live mentor fails, the fallback response should still guide the student constructively.",
          "P1"
        )
      );
      checks.push(
        makeJourneyCheck(
          "recovery_controls_visible",
          (await isVisible(page.getByRole("button", { name: /^Reset$/ }).first(), 4000)) &&
            (await isVisible(page.locator('button[title=\"Close\"]').first(), 4000)),
          "Mentor recovery should expose clear Reset and Close controls.",
          "P1"
        )
      );
      checks.push(
        makeJourneyCheck(
          "support_language_not_harsh",
          !/you failed|wrong answer|bad job|not good enough/i.test(drawerText),
          "Mentor fallback and recovery copy should stay non-shaming.",
          "P1"
        )
      );
      checks.push(
        makeJourneyCheck(
          "help_controls_remain_low_friction",
          signals.primaryCtaCount <= 8,
          `Mentor recovery should not overwhelm the student with too many visible decisions. Count=${signals.primaryCtaCount}.`,
          "P2"
        )
      );
      const screenshotPath = await captureJourneyScreenshot(page, {
        taskId,
        journeyId: "mentor_kindness_and_recovery_journey",
        scenarioId: scenario.scenarioId,
        label: "mentor",
      }).catch(() => "");
      return {
        startUrl,
        checks,
        artifacts: screenshotPath ? [{ type: "screenshot", path: screenshotPath }] : [],
        meta: {
          finalUrl: page.url(),
          keyVisibleCtas: signals.keyVisibleCtas,
          primaryCtaCount: signals.primaryCtaCount,
          bodySnippet: (await bodyText(page)).slice(0, 800),
        },
      };
    } finally {
      await context.close();
    }
  },
};
