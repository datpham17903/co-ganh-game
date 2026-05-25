import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @co-ganh/web dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
      cwd: '../..',
    },
    {
      command: 'pnpm --filter @co-ganh/server dev',
      url: 'http://localhost:3001/health',
      reuseExistingServer: true,
      timeout: 60_000,
      cwd: '../..',
    },
  ],
});
