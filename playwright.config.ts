import { PlaywrightTestConfig, defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: 'http://localhost:6001',
    actionTimeout: 5000,
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    viewport: { width: 1280, height: 720 },
  },
  reporter: [['html', { open: 'always' }], ['list']],
  preserveOutput: 'always',
  retries: 1,
  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:6001',
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
  maxFailures: 1,
});
