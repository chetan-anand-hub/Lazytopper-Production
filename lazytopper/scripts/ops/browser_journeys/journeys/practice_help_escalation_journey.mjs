import {
  bodyText,
  captureJourneyScreenshot,
  collectSurfaceSignals,
  isVisible,
  makeJourneyCheck,
  openAuthenticatedPath,
} from "../browser_journey_lib.mjs";

export const journey = {
  id: "practice_help_escalation_journey",
  area: "practice",
  title: "Practice help escalation journey",
  async run({ browser, scenario = {}, taskId = "" }) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const startPath = scenario.startingPath || "/practice/10/Maths?topic=trigonometry&count=5";
    const startUrl = await openAuthenticatedPath(page, startPath);
    const checks = [];

    try {
      const firstQuestion = page.getByTestId("practice-question-card").first();
      checks.push(
        makeJourneyCheck(
          "practice_questions_loaded",
          await isVisible(firstQuestion, 20000),
          "Practice should load at least one question for Trigonometry.",
          "P0"
        )
      );
      checks.push(
        makeJourneyCheck(
          "why_panel_visible",
          await isVisible(page.getByTestId("practice-why-panel"), 8000),
          "The Why this question panel should be visible for flagged Trigonometry practice.",
          "P1"
        )
      );
      const mentorButton = firstQuestion.getByRole("button", { name: /ask mentor about this question/i }).first();
      checks.push(
        makeJourneyCheck(
          "mentor_escalation_cta_visible",
          await isVisible(mentorButton, 8000),
          "Practice should show a clear mentor escalation CTA on the question card.",
          "P1"
        )
      );
      if (await isVisible(mentorButton, 8000)) {
        await mentorButton.scrollIntoViewIfNeeded().catch(() => {});
        await mentorButton.click().catch(() => {});
      }
      const mentorDrawer = page.getByTestId("practice-mentor-drawer");
      checks.push(
        makeJourneyCheck(
          "mentor_drawer_reachable",
          await isVisible(mentorDrawer, 12000),
          "The mentor drawer should open from practice without leaving the question context.",
          "P0"
        )
      );
      const signals = await collectSurfaceSignals(page);
      checks.push(
        makeJourneyCheck(
          "handholding_preserved",
          /strategy context is being used for this question|answer mentor's question|paste your working or add a short note/i.test(
            await bodyText(page)
          ),
          "Practice help escalation should preserve question-level context and handholding cues.",
          "P1"
        )
      );
      checks.push(
        makeJourneyCheck(
          "help_reachable_within_two_interactions",
          !scenario.expectations?.helpReachableWithinClicks || (await isVisible(mentorDrawer, 12000)),
          "Help should be reachable from practice with minimal friction.",
          "P1"
        )
      );
      checks.push(
        makeJourneyCheck(
          "quick_value_cues_visible",
          !scenario.expectations?.requiresQuickValue ||
            /fast drill presets|why this question|board steps/i.test(await bodyText(page)),
          "Returning or high-agency students should still see quick value cues on the practice surface.",
          "P2"
        )
      );
      const screenshotPath = await captureJourneyScreenshot(page, {
        taskId,
        journeyId: "practice_help_escalation_journey",
        scenarioId: scenario.scenarioId,
        label: "practice",
      }).catch(() => "");
      return {
        startUrl,
        checks,
        artifacts: screenshotPath ? [{ type: "screenshot", path: screenshotPath }] : [],
        meta: {
          finalUrl: page.url(),
          keyVisibleCtas: signals.keyVisibleCtas,
          primaryCtaCount: signals.primaryCtaCount,
          helpCueVisible: signals.helpCueVisible,
          bodySnippet: signals.bodySnippet,
        },
      };
    } finally {
      await context.close();
    }
  },
};
