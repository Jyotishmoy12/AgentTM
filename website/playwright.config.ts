import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4178",
    headless: true,
    launchOptions: process.env.AGENTTM_BROWSER_PATH
      ? { executablePath: process.env.AGENTTM_BROWSER_PATH }
      : {},
  },
  webServer: {
    command: "npm run preview -- --port 4178 --strictPort",
    url: "http://127.0.0.1:4178",
    reuseExistingServer: !process.env.CI,
  },
});
