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
  // SEVER PR (2026-06-08): 'start-daily-mix' (→ /daily-mix) and
  // 'open-weekly-wrapped' (→ /weekly-wrapped) removed — both routes are retired.
  // The catalog now advertises live targets only.

  // Practice & exam mode
  {
    id: 'start-practice',
    label: 'Practice a Topic',
    description: 'Pick a chapter/topic and start practice now',
    handler: 'navigateToPractice',
  },
  {
    id: 'practice-hpq',
    label: 'Practice Predicted Questions',
    description: 'Predicted questions for fast marks gain',
    handler: 'navigateToHPQ',
  },
  {
    id: 'take-mock-test',
    label: 'Take a Mock Test',
    description: 'Attempt a timed mock (exam-style flow)',
    handler: 'navigateToMockTest',
  },

  // Content & guidance
  {
    id: 'open-topic-hub',
    label: 'Open Chapter Hub',
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
    label: 'Toggle Study Mode (Challenge / Relaxed)',
    description: 'Switch difficulty + pace: Challenge = harder, Relaxed = lighter',
    handler: 'toggleVibeMode',
  },

  // SEVER PR: 'view-dashboard' (→ /dashboard) removed — the old Dashboard is retired.
];

/**
 * Icon suggestions (lucide-react icon names) for each action id.
 * UI layer can render an icon by looking up `quickActionIconMap[action.id]`.
 */
export const quickActionIconMap: Record<string, string> = {
  // Practice
  'start-practice': 'Dumbbell',
  'practice-hpq': 'Target',
  'take-mock-test': 'ClipboardCheck',

  // Content & guidance
  'open-topic-hub': 'Library',
  'open-mentor': 'Sparkles',

  // Stats & settings
  'view-stats': 'BarChart3',
  'toggle-vibe-mode': 'Zap',
};

/**
 * Optional: search synonyms (student language) keyed by action id.
 * If you later add keyword search, these can power “fuzzy intent” queries.
 */
export const quickActionKeywords: Record<string, string[]> = {
  'practice-hpq': ['hpq', 'highly probable', 'most important', 'imp', 'marks', 'pyq vibes'],
  'take-mock-test': ['mock', 'test', 'timer', 'exam', 'paper'],
  'open-topic-hub': ['topichub', 'notes', 'mistakes', 'tips', 'concepts'],
  'open-mentor': ['mentor', 'help', 'explain', 'solve', 'marking', 'plan'],
  'view-stats': ['stats', 'progress', 'accuracy', 'streak', 'match'],
  'toggle-vibe-mode': ['vibe', 'beast', 'zombie', 'difficulty', 'easy', 'hard'],
};