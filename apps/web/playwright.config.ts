import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const appDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  globalSetup: path.join(appDir, "e2e", "global-setup.ts"),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run dev",
        cwd: appDir,
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://fac:fac@127.0.0.1:5432/fac_app",
          AUTH_SECRET: process.env.AUTH_SECRET ?? "playwright-test-secret-playwright-test-secret",
          AUTH_URL: "http://127.0.0.1:3000",
          NEXTAUTH_URL: "http://127.0.0.1:3000",
          NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
          NEXT_PUBLIC_DEV_LOGIN_HINT: "true",
        },
      },
});
