import {
  bodyText,
  captureJourneyScreenshot,
  collectSurfaceSignals,
  isVisible,
  makeJourneyCheck,
  openAuthenticatedPath,
} from "../browser_journey_lib.mjs";

export const journey = {
  id: "topichub_guided_entry_journey",
  area: "topichub",
  title: "TopicHub guided entry journey",
  async run({ browser, scenario = {}, taskId = "" }) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const startPath = scenario.startingPath || "/topic-hub/10/Maths/trigonometry?tab=learn";
    const startUrl = await openAuthenticatedPath(page, startPath);
    const checks = [];

    try {
      checks.push(
        makeJourneyCheck(
          "chapter_heading_visible",
          await isVisible(page.getByRole("heading", { level: 1, name: /trigonometry/i }).first()),
          "TopicHub should open the requested chapter with a visible chapter heading.",
          "P1"
        )
      );
      checks.push(
        makeJourneyCheck(
          "study_flow_visible",
          await isVisible(page.getByTestId("topichub-learn-grind-practice-timeline")),
          "TopicHub should show the study flow timeline as the chapter entry signal.",
          "P0"
        )
      );
      const tabLabels = ["Learn", "Grind", "Resources"];
      const visibleTabs = [];
      for (const label of tabLabels) {
        if (await isVisible(page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first(), 2500)) {
          visibleTabs.push(label);
        }
      }
      checks.push(
        makeJourneyCheck(
          "low_confusion_tabs_visible",
          visibleTabs.length === 3,
          `Expected Learn, Grind, Resources tabs. Visible tabs: ${visibleTabs.join(", ") || "none"}.`,
          "P1"
        )
      );
      const text = await bodyText(page);
      const signals = await collectSurfaceSignals(page);
      checks.push(
        makeJourneyCheck(
          "recommended_order_copy_visible",
          text.includes("Recommended order:") && text.includes("Learn concept") && text.includes("Practice timed questions"),
          "TopicHub should explain the recommended learning order in plain language.",
          "P1"
        )
      );
      checks.push(
        makeJourneyCheck(
          "entry_surface_not_chaotic",
          !signals.looksCluttered &&
            signals.primaryCtaCount <= Number(scenario.expectations?.maxPrimaryCtas || 9),
          `Above-fold CTA count should stay manageable. Count=${signals.primaryCtaCount}.`,
          "P2"
        )
      );
      checks.push(
        makeJourneyCheck(
          "guided_start_signal_visible",
          !scenario.expectations?.requiresGuidedCue || signals.guidedCueVisible,
          "The chapter entry should expose a guided or recommended start signal.",
          "P1"
        )
      );
      checks.push(
        makeJourneyCheck(
          "advanced_depth_cues_visible",
          !scenario.expectations?.requiresDepthCue ||
            /board question types in this chapter|mastery|practice timed questions/i.test(text),
          "High-agency students should still see meaningful depth or mastery cues on the chapter surface.",
          "P1"
        )
      );
      const screenshotPath = await captureJourneyScreenshot(page, {
        taskId,
        journeyId: "topichub_guided_entry_journey",
        scenarioId: scenario.scenarioId,
        label: "entry",
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
