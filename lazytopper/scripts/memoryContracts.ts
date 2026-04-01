export const MEMORY_CONTRACT = {
  ignorePathFragments: [
    'node_modules',
    'dist',
    'build',
    '.git',
    '.project_memory',
    'coverage',
    '.vercel',
    'docs/session',
  ],
  todoFileExtensions: ['.ts', '.tsx', '.js', '.jsx', '.md'],
  criticalFiles: [
    'src/pages/WeeklyWrappedPage.tsx',
    'src/pages/Onboarding.tsx',
    'src/config/cbseDates.ts',
    'src/utils/shareImage.ts',
  ],
  forbiddenExactMatches: [
    'TODO: implement proper share functionality',
    'TODO: update these when CBSE announces official dates',
  ],
  invariants: [
    {
      name: 'weekly-wrapped capture wrapper',
      file: 'src/pages/WeeklyWrappedPage.tsx',
      regex: /id=["']weekly-wrapped-capture["']/,
    },
    {
      name: 'share helper call',
      file: 'src/pages/WeeklyWrappedPage.tsx',
      regex: /shareNodeAsImage\s*\(/,
    },
    {
      name: 'cbse dates export',
      file: 'src/config/cbseDates.ts',
      regex: /export\s+const\s+cbseDates/,
    },
    {
      name: 'onboarding imports cbse dates',
      file: 'src/pages/Onboarding.tsx',
      regex: /from\s+["'][^"']*cbseDates["']/,
    },
    {
      name: 'onboarding renders format/TBD',
      file: 'src/pages/Onboarding.tsx',
      regex: /(TBD|formatCbseDate)/,
    },
  ],
  governance: {
    governanceInputs: [
      'docs/project_memory/governance/LazyTopper_Rulebook.docx',
      'docs/project_memory/governance/LazyTopper_Learnings.docx',
      'docs/project_memory/governance/LazyTopper_ExecutionLog.docx',
      'docs/project_memory/governance/LazyTopper_Changelog.docx',
    
      "docs/project_memory/governance/inputs",
],
    governanceDigestOut: '.project_memory/blackbox/rules_digest.md',
    governanceKeywords: [
      'SCOPE LOCK',
      'EVIDENCE OUTSIDE REPO',
      'CLEAN-GATE',
      'Do not patch unless',
      'STOP',
      'Invariant',
      'QA',
      'Codex',
      'Blackbox',
      'Contextpack',
    ],
    governanceRequired: true,
  },
} as const;

