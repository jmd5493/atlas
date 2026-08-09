import { expect, test } from "@playwright/test";

import { uniqueName } from "./helpers";

test("client can delete their own logged entry", async ({ browser }) => {
  const context = await browser.newContext({ storageState: "e2e/.auth/client.json" });
  const page = await context.newPage();
  const exerciseName = uniqueName("Delete Test");

  await page.goto("/dashboard/logs");
  await page.fill("#exerciseName", exerciseName);
  await page.fill("#sets", "3");
  await page.fill("#reps", "10");
  await page.fill("#performedOn", "2026-09-06");
  await page.click('button:has-text("Save workout log")');
  await page.waitForURL("**/dashboard/logs?status=created**");
  await expect(page.locator(`article:has-text("${exerciseName}")`)).toBeVisible();

  const entry = page.locator(`article:has-text("${exerciseName}")`);
  page.once("dialog", (dialog) => dialog.accept());
  await entry.locator('button:has-text("Delete entry")').click();
  await page.waitForURL("**/dashboard/logs?status=deleted**");

  await expect(page.locator("text=/log entry deleted/i")).toBeVisible();
  await expect(page.locator(`article:has-text("${exerciseName}")`)).toHaveCount(0);

  await context.close();
});

test("trainer can delete a client's logged entry from the review page", async ({ browser }) => {
  // Client logs one, in its own context.
  const clientContext = await browser.newContext({ storageState: "e2e/.auth/client.json" });
  const clientPage = await clientContext.newPage();
  const exerciseName = uniqueName("Trainer Delete Test");

  await clientPage.goto("/dashboard/logs");
  await clientPage.fill("#exerciseName", exerciseName);
  await clientPage.fill("#sets", "3");
  await clientPage.fill("#reps", "10");
  await clientPage.fill("#performedOn", "2026-09-06");
  await clientPage.click('button:has-text("Save workout log")');
  await clientPage.waitForURL("**/dashboard/logs?status=created**");
  await clientContext.close();

  // Trainer deletes it from their review page.
  const trainerContext = await browser.newContext({ storageState: "e2e/.auth/trainer.json" });
  const trainerPage = await trainerContext.newPage();
  await trainerPage.goto("/dashboard/client-logs");
  const entry = trainerPage.locator(`article:has-text("${exerciseName}")`);
  await expect(entry).toBeVisible();

  trainerPage.once("dialog", (dialog) => dialog.accept());
  await entry.locator('button:has-text("Delete entry")').click();
  await trainerPage.waitForURL("**/dashboard/client-logs?status=deleted**");

  await expect(trainerPage.locator("text=/log entry deleted/i")).toBeVisible();
  await expect(trainerPage.locator(`article:has-text("${exerciseName}")`)).toHaveCount(0);

  await trainerContext.close();
});
