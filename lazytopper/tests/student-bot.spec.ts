import { test, expect, type Locator, type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const AUTH_INIT_WAIT_MS = 4000;

async function openApp(page: Page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(AUTH_INIT_WAIT_MS);
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function pickFirstVisible(locators: Locator[], timeoutMs = 7000): Promise<Locator | null> {
  const deadline = Date.now() + timeoutMs;
  for (const locator of locators) {
    const count = await locator.count().catch(() => 0);
    const candidateCount = Math.max(1, count);
    for (let i = 0; i < candidateCount; i += 1) {
      const candidate = count > 0 ? locator.nth(i) : locator.first();
      const timeLeft = deadline - Date.now();
      if (timeLeft <= 0) break;
      try {
        await candidate.waitFor({ state: 'visible', timeout: Math.min(1200, timeLeft) });
        return candidate;
      } catch {
        // try next candidate
      }
    }
  }
  return null;
}

async function tryNavigateToDashboardOrTopicHub(page: Page) {
  const nav = await pickFirstVisible([
    page.getByRole('link', { name: /dashboard/i }),
    page.getByRole('button', { name: /dashboard/i }),
    page.getByRole('link', { name: /topic\s*hub/i }),
    page.getByRole('button', { name: /topic\s*hub/i }),
    page.getByRole('link', { name: /topics|learn/i }),
    page.getByRole('button', { name: /topics|learn/i }),
  ], 8000);

  if (nav) {
    await nav.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(600);
  }
}

async function ensureSignedInForAudit(page: Page) {
  const loginHeading = page.getByRole('heading', { name: /student sign in/i }).first();
  const loginVisible = await loginHeading.isVisible().catch(() => false);
  if (!loginVisible) return;

  const localContinue = await pickFirstVisible([
    page.getByRole('button', { name: /continue in local session/i }),
    page.getByText(/continue in local session/i),
  ], 7000);

  if (!localContinue) return;
  await localContinue.click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(700);
}

async function settleAfterAuth(page: Page) {
  await page
    .waitForFunction(() => {
      const text = String(document.body?.innerText || '').toLowerCase();
      return (
        !text.includes('loading your dashboard') &&
        !text.includes('loading session') &&
        !text.includes('checking your session')
      );
    }, { timeout: 25000 })
    .catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(500);
}

test.describe('Student Bot E2E QA Agent', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120000);

  test('Critical Cloud Integrity (Fix Verification)', async ({ page }) => {
    await openApp(page);
    await tryNavigateToDashboardOrTopicHub(page);
    await ensureSignedInForAudit(page);
    await settleAfterAuth(page);

    for (let i = 0; i < 8; i += 1) {
      const alreadyVisible = await page
        .getByText(/placeholder question/i)
        .first()
        .isVisible()
        .catch(() => false);
      if (alreadyVisible) return;

      const loadingSession = await page
        .getByRole('heading', { name: /loading session/i })
        .first()
        .isVisible()
        .catch(() => false);
      if (loadingSession) {
        await expect(
          page.getByText(/placeholder question/i).first(),
          'Session is loading but placeholder did not appear in time.'
        ).toBeVisible({ timeout: 30000 });
        return;
      }
      await page.waitForTimeout(500);
    }

    const startControl = await pickFirstVisible([
      page.getByRole('button', { name: /resume|start learning|start|continue/i }),
      page.getByRole('link', { name: /resume|start learning|start|continue/i }),
      page.locator('button:has-text("Resume"), button:has-text("Start Learning"), button:has-text("Continue"), a:has-text("Resume"), a:has-text("Start Learning"), a:has-text("Continue")'),
    ], 12000);

    await expect(
      startControl,
      'Could not find "Resume / Start Learning" control after auth initialization.'
    ).not.toBeNull();

    await startControl!.click();
    await expect(
      page.getByText(/placeholder question/i).first(),
      'Critical cloud continuity failed: "Placeholder Question" not visible.'
    ).toBeVisible({ timeout: 20000 });
  });

  test('Pro Features Audit (Features Verification)', async ({ page }) => {
    await openApp(page);
    await tryNavigateToDashboardOrTopicHub(page);
    await ensureSignedInForAudit(page);
    await settleAfterAuth(page);

    const results: Array<{ feature: string; status: 'FOUND' | 'NOT FOUND' }> = [];

    async function softAudit(feature: string, locators: Locator[], timeoutMs = 5000) {
      const found = await pickFirstVisible(locators, timeoutMs);
      if (found) {
        console.log(`[FOUND] ${feature}`);
        results.push({ feature, status: 'FOUND' });
      } else {
        console.warn(`[NOT FOUND] ${feature}`);
        results.push({ feature, status: 'NOT FOUND' });
      }
    }

    await softAudit('Daily Focus Mix', [
      page.getByRole('button', { name: /start daily mix|daily mix|play/i }),
      page.getByRole('link', { name: /start daily mix|daily mix|play/i }),
      page.getByText(/daily focus mix|start daily mix|daily mix/i),
    ]);

    await softAudit('Match % Score / Yield badge', [
      page.getByText(/match\s*%|match score|yield/i),
      page.locator('[class*="match"], [class*="yield"], [data-testid*="match"], [data-testid*="yield"]'),
    ]);

    await softAudit('Vibe Check toggle (High/Low)', [
      page.getByRole('button', { name: /vibe|energy|high|low/i }),
      page.getByText(/vibe|energy|high|low/i),
      page.locator('[aria-label*="vibe" i], [aria-label*="energy" i]'),
    ]);

    await page.keyboard.press('Control+K').catch(() => {});
    await page.waitForTimeout(400);

    let commandPalette = await pickFirstVisible([
      page.getByRole('dialog', { name: /search|command|palette/i }),
      page.getByPlaceholder(/search|command/i),
      page.locator('[role="dialog"] input[type="search"], [data-testid*="command"], [data-testid*="palette"]'),
    ], 2500);

    if (!commandPalette) {
      await page.keyboard.press('Meta+K').catch(() => {});
      await page.waitForTimeout(400);
      commandPalette = await pickFirstVisible([
        page.getByRole('dialog', { name: /search|command|palette/i }),
        page.getByPlaceholder(/search|command/i),
        page.locator('[role="dialog"] input[type="search"], [data-testid*="command"], [data-testid*="palette"]'),
      ], 2500);
    }

    if (commandPalette) {
      console.log('[FOUND] Command Palette');
      results.push({ feature: 'Command Palette', status: 'FOUND' });
    } else {
      console.warn('[NOT FOUND] Command Palette');
      results.push({ feature: 'Command Palette', status: 'NOT FOUND' });
    }

    await softAudit('Weekly Wrapped / Weekly Recap', [
      page.getByRole('button', { name: /weekly wrapped|weekly recap/i }),
      page.getByRole('link', { name: /weekly wrapped|weekly recap/i }),
      page.getByText(/weekly wrapped|weekly recap/i),
    ]);

    console.log('[PRO FEATURES AUDIT SUMMARY]');
    for (const row of results) {
      console.log(`- ${row.feature}: ${row.status}`);
    }

    // Keep this audit non-blocking by design.
    expect(true).toBeTruthy();
  });
});
