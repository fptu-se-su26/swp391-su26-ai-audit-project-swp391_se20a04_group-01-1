import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e/tests',
    fullyParallel: false,
    retries: 1,
    timeout: 30000,
    expect: { timeout: 10000 },
    reporter: [['html', { open: 'never', outputFolder: 'playwright-report' }], ['list']],
    use: {
        baseURL: 'http://localhost:5173',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'on-first-retry'
    },
    projects: [
        {
            name: 'Chrome',
            use: { ...devices['Desktop Chrome'], channel: 'chrome' }
        },
        {
            name: 'Firefox',
            use: { ...devices['Desktop Firefox'] }
        },
        {
            name: 'Headless Chrome',
            use: { ...devices['Desktop Chrome'], headless: true }
        }
    ]
});
