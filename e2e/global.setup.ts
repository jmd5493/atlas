import { test as setup } from "@playwright/test";

const TRAINER_STATE = "e2e/.auth/trainer.json";
const CLIENT_STATE = "e2e/.auth/client.json";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.test.example to .env.test.local and fill in the test account credentials.`,
    );
  }
  return value;
}

async function loginAndSave(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
  statePath: string,
) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
  await page.context().storageState({ path: statePath });
}

setup("authenticate as trainer", async ({ page }) => {
  await loginAndSave(page, requiredEnv("E2E_TRAINER_EMAIL"), requiredEnv("E2E_TRAINER_PASSWORD"), TRAINER_STATE);
});

setup("authenticate as client", async ({ page }) => {
  await loginAndSave(page, requiredEnv("E2E_CLIENT_EMAIL"), requiredEnv("E2E_CLIENT_PASSWORD"), CLIENT_STATE);
});
