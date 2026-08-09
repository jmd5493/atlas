import { defineConfig } from "@playwright/test";

// Playwright's test runner is plain Node, not the Next.js dev server, so it
// doesn't get .env.local loaded automatically the way `next dev` does. Load
// it here (plus the e2e-only overrides in .env.test.local) so both the
// webServer it spawns below and the test files themselves see the same
// Supabase config and test-account credentials.
process.loadEnvFile?.(".env.local");
try {
  process.loadEnvFile?.(".env.test.local");
} catch {
  // .env.test.local is optional locally but required to actually run the
  // suite — see .env.test.example for what to fill in.
}

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // shares real trainer/client accounts against one live Supabase project
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    {
      name: "e2e",
      testMatch: /.*\.spec\.ts/,
      dependencies: ["setup"],
    },
  ],
});
