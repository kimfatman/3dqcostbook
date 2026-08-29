import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const storageState = process.env.E2E_ADMIN_STORAGE_STATE;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "zh-CN",
  },
  projects: [
    {
      name: "admin-chromium",
      use: { ...devices["Desktop Chrome"], ...(storageState ? { storageState } : {}) },
    },
    {
      name: "admin-mobile",
      use: { ...devices["Pixel 5"], ...(storageState ? { storageState } : {}) },
    },
  ],
  webServer: process.env.E2E_SKIP_WEBSERVER ? undefined : {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
