// @ts-check
import { defineConfig } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false, // shared backend rate-limit buckets — keep serial
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: BASE,
    ignoreHTTPSErrors: true,
    headless: true,
    viewport: { width: 1366, height: 800 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        channel: "chromium",
        // Use system chrome to avoid downloading browsers in CI
        launchOptions: {
          executablePath: "/usr/bin/google-chrome",
        },
      },
    },
  ],
});
