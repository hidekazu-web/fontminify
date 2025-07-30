import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: false, // Electronアプリは並列実行しない
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Electronテストは1つずつ実行
  reporter: [
    ['html'],
    ['list'],
    process.env.CI ? ['github'] : null
  ].filter(Boolean),
  
  use: {
    actionTimeout: 10000,
    navigationTimeout: 30000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'electron',
      testMatch: /.*\.spec\.ts/,
      use: {
        // Electronアプリ用の設定
      },
    },
  ],

  // テスト前の準備
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),
});