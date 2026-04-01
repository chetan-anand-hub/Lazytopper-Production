import { test, expect } from '@playwright/test';

// Minimal smoke test hitting the stubbed mentor API.
test('mentor stub returns 200 for board_steps_ms', async ({ request }) => {
  const response = await request.post('/api/mentor', {
    data: {
      mode: 'board_steps_ms',
      conversation: [],
    },
  });
  expect(response.status()).toBe(200);
});
