// src/services/commandPaletteConfig.ts
//
// Updated Command Palette actions: student-friendly labels + concise descriptions
// + a separate icon map (lucide-react icon names) without changing the QuickAction type.
//
// Notes:
// - Keeps the same exported type shape as previous versions (id, label, description, handler).
// - Icons are provided via `quickActionIconMap` keyed by action id so UI can render icons without
//   extending the QuickAction interface.

export interface QuickAction {
  /** Unique identifier for this action. */
  id: string;
  /** Display label shown in the command palette. */
  label: string;
  /** Short description explaining what the action does. */
  description: string;
  /** Name of the handler function or route to navigate to. */
  handler: string;
}

/**
 * Updated set of quick actions.
 * Handlers are string keys that your palette integration layer maps to routes / callbacks.
 */
export const defaultQuickActions: QuickAction[] = [
  // Core “Pro Tips” entry points
  {
    id: 'start-daily-mix',
    label: 'Play Daily Mix',
    description: 'Start today’s quick mix: 1 concept + questions + recap',
    handler: 'navigateToDailyMix',
  },
  {
    id: 'open-weekly-wrapped',
    label: 'Weekly Wrapped',
    description: 'Open your weekly progress story (shareable recap)',
    handler: 'navigateToWeeklyWrap',
  },

  // Practice & exam mode
  {
    id: 'start-practice',
    label: 'Practice a Topic',
    description: 'Pick a chapter/topic and start practice now',
    handler: 'navigateToPractice',
  },
  {
    id: 'practice-hpq',
    label: 'Practice HPQ',
    description: 'Highly Probable Questions for fast marks gain',
    handler: 'navigateToHPQ',
  },
  {
    id: 'take-mock-test',
    label: 'Take a Mock Test',
    description: 'Attempt a timed mock (exam-style flow)',
    handler: 'navigateToMockTest',
  },
  {
    id: 'open-mock-builder',
    label: 'Build a Mock Paper',
    description: 'Create a custom mock by subject, chapters, and difficulty',
    handler: 'navigateToMockBuilder',
  },

  // Content & guidance
  {
    id: 'open-topic-hub',
    label: 'Open TopicHub',
    description: 'Core ideas, common mistakes, exam patterns, 95+ tips',
    handler: 'navigateToTopicHub',
  },
  {
    id: 'open-mentor',
    label: 'Ask Mentor',
    description: 'Plan, solve, explain, marking tips, and quick recap',
    handler: 'navigateToMentor',
  },

  // Stats & settings
  {
    id: 'view-stats',
    label: 'My Stats',
    description: 'Streaks, Match %, accuracy, and weekly performance',
    handler: 'navigateToStats',
  },
  {
    id: 'toggle-vibe-mode',
    label: 'Toggle Vibe (Beast / Zombie)',
    description: 'Switch difficulty + pace: Beast = harder, Zombie = lighter',
    handler: 'toggleVibeMode',
  },

  // Navigation
  {
    id: 'view-dashboard',
    label: 'Dashboard',
    description: 'Go back to the main home screen',
    handler: 'navigateToDashboard',
  },
];

/**
 * Icon suggestions (lucide-react icon names) for each action id.
 * UI layer can render an icon by looking up `quickActionIconMap[action.id]`.
 */
export const quickActionIconMap: Record<string, string> = {
  // Pro Tips
  'start-daily-mix': 'PlayCircle',
  'open-weekly-wrapped': 'PartyPopper',

  // Practice
  'start-practice': 'Dumbbell',
  'practice-hpq': 'Target',
  'take-mock-test': 'ClipboardCheck',
  'open-mock-builder': 'SlidersHorizontal',

  // Content & guidance
  'open-topic-hub': 'Library',
  'open-mentor': 'Sparkles',

  // Stats & settings
  'view-stats': 'BarChart3',
  'toggle-vibe-mode': 'Zap',

  // Navigation
  'view-dashboard': 'LayoutDashboard',
};

/**
 * Optional: search synonyms (student language) keyed by action id.
 * If you later add keyword search, these can power “fuzzy intent” queries.
 */
export const quickActionKeywords: Record<string, string[]> = {
  'start-daily-mix': ['daily mix', 'mix', 'play', 'today', 'focus'],
  'practice-hpq': ['hpq', 'highly probable', 'most important', 'imp', 'marks', 'pyq vibes'],
  'take-mock-test': ['mock', 'test', 'timer', 'exam', 'paper'],
  'open-mock-builder': ['builder', 'custom paper', 'mock builder', 'create mock'],
  'open-topic-hub': ['topichub', 'notes', 'mistakes', 'tips', 'concepts'],
  'open-mentor': ['mentor', 'help', 'explain', 'solve', 'marking', 'plan'],
  'view-stats': ['stats', 'progress', 'accuracy', 'streak', 'match'],
  'toggle-vibe-mode': ['vibe', 'beast', 'zombie', 'difficulty', 'easy', 'hard'],
  'view-dashboard': ['dashboard', 'home', 'main'],
  'open-weekly-wrapped': ['wrapped', 'weekly', 'recap', 'share', 'story'],
};