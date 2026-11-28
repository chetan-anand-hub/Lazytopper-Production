import { defineConfig, devices } from '@playwright/test';

// Two suites share this config, as separate projects:
//
//   student-bot            the original exploratory spec (tests/student-bot.spec.ts) against a
//                          running dev server. Unchanged: it reads E2E_BASE_URL itself.
//   e2e-mobile/-desktop    UI-E2E-1 — signed-out pages in a real browser at 360x740 (touch) and
//                          1280x800, against the PRODUCTION build (tests/e2e/support/serveBuild.ts).
//                          Run by .github/workflows/ui-e2e.yml.
//
//   pnpm --filter lazytopper run test:e2e            (after a build with production's flags:
//                                                     VITE_FREE_CHECK_ENABLED=1 VITE_PAYMENTS_ENABLED=1)
//   pnpm --filter lazytopper run test:e2e:update     re-record the visual baselines (Linux only;
//                                                     how: the header of .github/workflows/ui-e2e.yml)
//   PW_BASE_URL=https://<deployment> pnpm ... test:e2e  run against a deployed site instead
//                                                     (no local server; the network stays hermetic)
//
// ★ The e2e local server starts only when an e2e project is selected, so running the
// student-bot project alone needs no build.

const CI = !!process.env.CI;
const E2E_PORT = Number(process.env.E2E_PORT || 4310);
const externalBase = process.env.PW_BASE_URL;
const e2eSelected = process.argv.some((a) => /e2e-(mobile|desktop)/.test(a));
const e2eBase = externalBase || `http://127.0.0.1:${E2E_PORT}`;

const e2eUse = {
  baseURL: e2eBase,
  headless: true,
  locale: 'en-IN',
  timezoneId: 'Asia/Kolkata',
  // The app's routes are what is under test; a service worker could bypass them.
  serviceWorkers: 'block' as const,
  trace: 'retain-on-failure' as const,
  screenshot: 'only-on-failure' as const,
};

export default defineConfig({
  // Visual baselines are per-OS (font rasterisation differs): only the linux set is committed.
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{projectName}/{arg}{ext}',
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled', caret: 'hide' },
  },
  // CI: a missing baseline FAILS ('none'). Playwright's 'missing' mode would write it and PASS,
  // so a page added without a baseline would never be compared. ui-e2e.yml writes missing ones
  // only after a failed run, for committing. UPDATE_SNAPSHOTS=all|missing|none overrides.
  updateSnapshots: (process.env.UPDATE_SNAPSHOTS as 'all' | 'missing' | 'none' | undefined) ?? (CI ? 'none' : 'missing'),
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  forbidOnly: CI,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.PW_BASE_URL || 'http://localhost:25246',
    headless: true,
  },
  projects: [
    {
      name: 'student-bot',
      testDir: 'tests',
      testMatch: 'student-bot.spec.ts',
    },
    {
      name: 'e2e-mobile',
      testDir: 'tests/e2e',
      metadata: { viewport: 'mobile' },
      use: {
        ...devices['Pixel 5'],
        ...e2eUse,
        viewport: { width: 360, height: 740 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: 'e2e-desktop',
      testDir: 'tests/e2e',
      metadata: { viewport: 'desktop' },
      use: {
        ...devices['Desktop Chrome'],
        ...e2eUse,
        viewport: { width: 1280, height: 800 },
      },
    },
    // UI-E2E-2 — SIGNED-IN pages (tests/e2e/signed-in.*.spec.ts) against a build made with
    // tests/e2e/buildEnv.signedIn.json, with the Firebase Auth + Firestore emulators running
    // (tests/e2e/support/signedIn.ts; .github/workflows/ui-e2e.yml job ui-e2e-signed-in).
    // The name contains "e2e-desktop", so `e2eSelected` above starts the same local server.
    {
      name: 'e2e-desktop-signed-in',
      testDir: 'tests/e2e',
      testMatch: /signed-in\.[\w-]+\.spec\.ts$/,
      metadata: { viewport: 'desktop' },
      use: {
        ...devices['Desktop Chrome'],
        ...e2eUse,
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer:
    e2eSelected && !externalBase
      ? {
          command: `pnpm exec tsx tests/e2e/support/serveBuild.ts`,
          url: `${e2eBase}/version.json`,
          env: { E2E_PORT: String(E2E_PORT) },
          reuseExistingServer: !CI,
          timeout: 60_000,
          stdout: 'pipe',
        }
      : undefined,
});
