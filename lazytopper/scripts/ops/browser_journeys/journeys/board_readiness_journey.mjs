import {
  captureJourneyScreenshot,
  collectSurfaceSignals,
  isVisible,
  makeJourneyCheck,
  openAuthenticatedPath,
} from "../browser_journey_lib.mjs";

export const journey = {
  id: "board_readiness_journey",
  area: "practice",
  title: "Board readiness journey",
  async run({ browser, scenario = {}, taskId = "" }) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const startUrl = await openAuthenticatedPath(
      page,
      scenario.startingPath || "/practice/10/Maths?topic=trigonometry&count=4"
    );
    const checks = [];

    try {
      const firstQuestion = page.getByTestId("practice-question-card").first();
      await isVisible(firstQuestion, 20000);
      const mentorHelpToggle = firstQuestion.getByTestId("practice-mentor-help-toggle").first();
      if (await isVisible(mentorHelpToggle, 8000)) {
        await mentorHelpToggle.scrollIntoViewIfNeeded().catch(() => {});
        await mentorHelpToggle.click().catch(() => {});
      }
      const boardCta = firstQuestion.getByRole("button", { name: /board steps/i }).first();
      const boardCtaVisible = await isVisible(boardCta, 8000);
      if (boardCtaVisible) {
        await boardCta.scrollIntoViewIfNeeded().catch(() => {});
        await boardCta.click().catch(() => {});
      }
      const mentorDrawer = page.getByTestId("practice-mentor-drawer");
      const boardPanel = page.getByTestId("practice-board-steps-panel");
      checks.push(
        makeJourneyCheck(
          "mentor_drawer_reachable",
          await isVisible(mentorDrawer, 15000),
          "Practice should open the CBSE mentor drawer for the board-readiness journey.",
          "P0"
        )
      );
      checks.push(
        makeJourneyCheck(
          "board_steps_discoverable",
          boardCtaVisible,
          "Board Steps / CBSE checking should be discoverable from practice.",
          "P0"
        )
      );
      checks.push(
        makeJourneyCheck(
          "board_steps_panel_visible",
          await isVisible(boardPanel, 12000),
          "Board readiness should expose the offline CBSE board-steps template panel.",
          "P0"
        )
      );
      checks.push(
        makeJourneyCheck(
          "solution_photo_affordance_visible",
          await isVisible(page.getByRole("button", { name: /upload solution photo/i }).first(), 8000),
          "CBSE solution checking should expose the handwritten-solution upload affordance.",
          "P1"
        )
      );
      const signals = await collectSurfaceSignals(page);
      checks.push(
        makeJourneyCheck(
          "board_surface_not_cluttered",
          signals.primaryCtaCount <= 9,
          `Board-readiness surface should keep visible CTA count manageable. Count=${signals.primaryCtaCount}.`,
          "P2"
        )
      );
      checks.push(
        makeJourneyCheck(
          "advanced_reasoning_depth_visible",
          !scenario.expectations?.requiresReasoningDepth ||
            signals.bodySnippet.toLowerCase().includes("why this question") ||
            signals.bodySnippet.toLowerCase().includes("strategy context"),
          "Advanced students should still see reasoning context, not only answer-check mechanics.",
          "P1"
        )
      );
      const screenshotPath = await captureJourneyScreenshot(page, {
        taskId,
        journeyId: "board_readiness_journey",
        scenarioId: scenario.scenarioId,
        label: "board",
      }).catch(() => "");
      return {
        startUrl,
        checks,
        artifacts: screenshotPath ? [{ type: "screenshot", path: screenshotPath }] : [],
        meta: {
          finalUrl: page.url(),
          keyVisibleCtas: signals.keyVisibleCtas,
          primaryCtaCount: signals.primaryCtaCount,
          guidedCueVisible: signals.guidedCueVisible,
          bodySnippet: signals.bodySnippet,
        },
      };
    } finally {
      await context.close();
    }
  },
};
