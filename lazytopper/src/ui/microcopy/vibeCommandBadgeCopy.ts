// src/ui/microcopy/vibeCommandBadgeCopy.ts
//
// LazyTopper – Vibe / Command / Badge Microcopy
//
// This resource exports all microcopy strings used throughout the UI
// for vibe mode toggles, command palette placeholders, streak/badge
// banners and Daily Mix controls. Generated from the S7 task.

export const vibeCommandBadgeCopy = {
  vibeToggle: {
    mainLabel: 'How are you feeling today?',
    subtitle: 'Pick your study vibe — we’ll tune everything to match.',
    headerEmoji: '🙂',
    beast: {
      label: '⚡ Beast Mode',
      subtextShort: 'Hard practice, full rigour.',
      subtextLong: 'Tough questions, longer sessions, full exam grind.',
      tooltip:
        'Best when you’ve got energy for serious board prep — more Medium/Hard questions, longer mixes.',
    },
    zombie: {
      label: '😴 Zombie Mode',
      subtextShort: '10 min light revision.',
      subtextLong: 'Easy MCQs, short videos, low‑pressure revision only.',
      tooltip:
        'For tired days. We keep it light so you still get a win and keep your streak alive.',
    },
    globalTooltip:
      'Vibe Mode tells LazyTopper how intense today’s session should be. You can switch anytime.',
    hints: {
      zombieStillCounts: 'Tip: Zombie days still count as “No Zero Days” 💫',
      beastHeader: 'Mode: ⚡ Beast',
      zombieHeader: 'Mode: 😴 Zombie',
    },
  },
  commandPalette: {
    searchPlaceholder: 'Search topics, modes, commands…',
    searchPlaceholderAlt: 'Type to jump: topics, mixes, mocks, stats…',
    helperLine: 'Try “Practice Trigo”, “Daily Mix”, or “My stats”.',
    helperEmojiVariant: '⚡ Quick tip: Try “Daily Mix”.',
    sectionHeaders: {
      commands: 'Commands',
      topics: 'Topics',
      practicePacks: 'Practice packs',
      shortcuts: 'Shortcuts',
    },
    topHits: {
      dailyMix: {
        label: 'Play Daily Focus Mix',
        description:
          'One-tap playlist: concept video, must‑crack Qs and recap, tuned to your vibe. 🎧',
      },
      mockTest: {
        label: 'Start predictive mock',
        description:
          'Full board-style paper built from highly probable questions. 📝',
      },
      myStats: {
        label: 'Open my stats',
        description:
          'See hours, streaks, accuracy and Match % for each topic. 📊',
      },
      toggleBeast: {
        label: 'Switch to Beast Mode',
        description:
          'Harder questions, longer sessions, serious exam grind. ⚡',
      },
      toggleZombie: {
        label: 'Switch to Zombie Mode',
        description:
          'Chill mode: short revision, easy MCQs, streak-safe sessions. 😴',
      },
      practiceTrigoHPQ: {
        label: 'Practice Trigonometry – HPQ set',
        description:
          'Jump into high‑yield Trigo questions picked from HPQ engine. 🎯',
      },
      openTopicHubRealNumbers: {
        label: 'Real Numbers – TopicHub',
        description:
          'Why it matters, core ideas, common mistakes and 95+ tips in one place. 📘',
      },
    },
    triggerHint: {
      navbar: 'Press ⌘K / Ctrl+K to search topics, mixes and commands.',
      emoji: '⌨️',
    },
  },
  streaksAndBadges: {
    dashboardStrip: {
      mainText: 'No Zero Days: {{streakDays}} 🔥',
      subtextVariants: {
        lowStreak:
          'You’re warming up. Do one short mix today to grow this streak.',
        midStreak:
          'Nice run! {{daysToNext}} days to your next badge.',
        highStreak:
          'Solid habit. You’re in serious prep mode. 💪',
      },
      inSessionToast:
        'Streak saved! Today counts as a No Zero Day. 🌟',
    },
    unlockToasts: {
      threeDaySpark: {
        title: 'New badge unlocked 🎉',
        body: '3‑Day Spark – 3 days in a row. Tiny sessions, big flex. 🔥',
      },
      noZeroWeek: {
        title: 'You did a No Zero Week ⚡',
        body: '7 days non‑stop. This is exactly how toppers start.',
      },
      streakBeast: {
        title: 'Streak Beast unlocked 💪',
        body:
          '14 days of No Zero Days. You’re more consistent than most students now.',
      },
      boardWarrior: {
        title: 'Board Warrior status 🛡️',
        body:
          '30 days back‑to‑back. This is topper territory – boards won’t know what hit you.',
      },
      consistencyLegend: {
        title: 'Consistency Legend 💎',
        body:
          '60 No Zero Days in a row. You’re training harder than the paper. Respect.',
      },
    },
    themedBadgeToasts: {
      dailyMixRookie: {
        title: 'Daily Mix Rookie 🎧',
        body:
          'You’ve finished your mix 3 days in a row. Zero planning, all progress.',
      },
      dailyMixPro: {
        title: 'Daily Mix Pro 🎧',
        body:
          '{{count}} Daily Mixes done. You’ve turned playlists into marks.',
      },
      hpqHustler: {
        title: 'HPQ Hustler unlocked 🔥',
        body:
          'You’ve attacked {{count}} must‑crack questions this streak. Boards are looking nervous.',
      },
      weekendWarrior: {
        title: 'Weekend Warrior 🛡️',
        body:
          'You protected three weekends in a row for board prep. Huge flex.',
      },
    },
    dashboardBadgeBanner: {
      headingTemplate: 'New badge unlocked: {{badgeName}}',
      streakBeastExampleBody:
        '14 days of No Zero Days. Keep riding this wave into exam season. ⚡',
      cta: 'View all badges',
    },
    streakReset: {
      message:
        'Streak reset, progress stays. Start a fresh run today with one short Daily Mix. 💫',
      tooltip:
        'Even if streak resets, all your hours, accuracy gains and badges are safe.',
    },
  },
  dailyMix: {
    controls: {
      next: {
        label: 'Next',
        altLabel: 'Next item ▶',
        tooltip: 'Skip to the next video or question in today’s mix.',
      },
      shuffle: {
        label: 'Shuffle',
        altLabel: 'Shuffle order 🔀',
        tooltip: 'Remix the remaining items in your Daily Mix.',
      },
      done: {
        label: 'I’m done',
        altLabel: 'I’m done for today ✅',
        tooltip: 'End today’s mix and save your progress.',
        completionToasts: {
          heading: 'Daily Mix complete 🎉',
          body:
            'You just banked {{minutes}} mins of real board prep.',
        },
      },
    },
    playerCopy: {
      headerProgress:
        'Daily Focus Mix – {{current}} / {{total}} items',
      progressNudge:
        'Nice! {{completed}}/{{total}} items done. Keep going for one more? 💪',
      pausedHint:
        'Paused. Tap “Next” when you’re ready to continue. No rush. 🙂',
      zombieNudge:
        'Zombie day? Chill. Finish one more light item and call it a win. 😴✨',
    },
  },
};