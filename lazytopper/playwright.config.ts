import { defineConfig } from '@playwright/test';

// This minimal configuration enables Playwright to discover tests in the 	ests
// directory and sets a baseURL for API requests. It defaults to http://localhost:5173.
export default defineConfig({
  testDir: 'tests',
  use: {
    baseURL: process.env.PW_BASE_URL || 'http://localhost:5173',
    headless: true,
  },
});
