import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'fr-FR',
  },
  projects: [
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 1180, height: 820 } } },
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
  webServer: [
    {
      command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    // Live relay (proxied by vite preview on /api), rooms in memory only.
    { command: 'node server/live.mjs', port: 8081, reuseExistingServer: !process.env.CI },
  ],
});
