import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e-web',
  timeout: 60000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report-web' }],
    ['list'],
    process.env.CI ? ['github'] : ['line']
  ].filter(Boolean) as any,

  use: {
    actionTimeout: 10000,
    navigationTimeout: 30000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    baseURL: 'http://localhost:5176',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev:web',
    url: 'http://localhost:5176',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
})
