// LEGACY-RETIRED 2026-06-08 - disconnected from product; safe to delete in clean-branch pass.
export {
  type SubjectTitle,
  type PerformanceRow,
  type TopicMetaLight,
  toTopicMetaLight,
  parseChapterId,
  displayTopic,
  subjectMaxWeightage,
  nowDayLabel,
  greetingLabel,
  toPositiveNumber,
  formatTimeAgo,
  isWidgetUnseen,
  markWidgetSeen,
  isFirstDashboardVisit,
  markFirstVisitDone,
  useThemeColors,
  THEME_STYLES,
  SPRINT_FORMULAS,
} from "./dashboardUtils";
export { RingChart, ProgressBar } from "./RingChart";
export { FocusScoreCard } from "./FocusScoreCard";
export { SprintDashboard } from "./SprintDashboard";
export { EmptyStateCard, NewBadge, FirstVisitOverlay } from "./DashboardWidgets";
export { DashboardHeader } from "./DashboardHeader";
export { QuickAccessBar } from "./QuickAccessBar";
export { StatsRow } from "./StatsRow";
export { DailyMixPreview } from "./DailyMixPreview";
export { TopicMasteryGrid } from "./TopicMasteryGrid";
export { StudyPlanSummary } from "./StudyPlanSummary";
export { WeakAreasPanel } from "./WeakAreasPanel";
export { RecentActivityList } from "./RecentActivityList";
export { BadgesSection } from "./BadgesSection";
export { ExploreMorePanel } from "./ExploreMorePanel";
export { JourneyCard } from "./JourneyCard";
export { PaceSelectorPanel } from "./PaceSelectorPanel";
export { HeroActionCard, type HeroAction } from "./HeroActionCard";
export { MistakeInsightWidget } from "./MistakeInsightWidget";
