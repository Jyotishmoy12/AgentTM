import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.AGENTTM_TEST_URL ?? `http://127.0.0.1:${process.env.AGENTTM_E2E_PORT || '7333'}`,
    channel: process.env.CI ? undefined : 'chrome',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
  },
  webServer: process.env.AGENTTM_TEST_URL ? undefined : {
    command: 'node scripts/e2e-server.mjs',
    url: `http://127.0.0.1:${process.env.AGENTTM_E2E_PORT || '7333'}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
