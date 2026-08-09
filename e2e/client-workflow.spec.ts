import { expect, test } from "@playwright/test";

import { createProgram, deleteProgramByTitle, uniqueName } from "./helpers";

test.use({ storageState: "e2e/.auth/client.json" });

const CLIENT_LABEL = "Billy McKenna"; // must match the E2E_CLIENT_EMAIL account linked in .env.test.local

test("client sees a same-day multi-workout program grouped under one heading and can log an exercise", async ({
  page,
  browser,
}) => {
  const title = uniqueName("Client View Program");
  const exerciseName = uniqueName("Deadlift");

  // Set up as the trainer in a separate context.
  const trainerContext = await browser.newContext({ storageState: "e2e/.auth/trainer.json" });
  const trainerPage = await trainerContext.newPage();
  await createProgram(trainerPage, {
    clientLabel: CLIENT_LABEL,
    title,
    startDate: "2026-09-04",
    workouts: [
      { dayNumber: 1, label: "AM Session", exercises: [{ name: exerciseName, sets: "3", reps: "5", weight: "225" }] },
      { dayNumber: 1, label: "PM Session", exercises: [{ name: "Farmer Carry", sets: "4", reps: "1" }] },
    ],
  });

  // Verify as the client.
  await page.goto("/dashboard/workouts");
  const programArticle = page.locator(`article:has-text("${title}")`);
  await expect(programArticle).toBeVisible();

  const dayHeading = programArticle.locator("h3", { hasText: "Day 1" });
  await expect(dayHeading).toBeVisible();
  await expect(programArticle.locator("text=AM Session")).toBeVisible();
  await expect(programArticle.locator("text=PM Session")).toBeVisible();

  const exerciseCard = programArticle.locator(`li:has-text("${exerciseName}")`);
  page.once("dialog", (dialog) => dialog.accept());
  await exerciseCard.locator('button:has-text("Log this exercise")').click();
  await page.waitForURL("**/dashboard/workouts?status=created**");
  await expect(page.locator("text=/exercise log saved/i")).toBeVisible();

  await deleteProgramByTitle(trainerPage, title);
  await trainerContext.close();
});

test("client can log something extra, unlinked to any plan", async ({ page }) => {
  const exerciseName = uniqueName("Extra Sprint");

  await page.goto("/dashboard/logs");
  await page.fill("#exerciseName", exerciseName);
  await page.fill("#sets", "3");
  await page.fill("#reps", "10");
  await page.fill("#performedOn", "2026-09-04");
  await page.click('button:has-text("Save workout log")');
  await page.waitForURL("**/dashboard/logs?status=created**");

  await expect(page.locator("text=/workout log saved/i")).toBeVisible();
  await expect(page.locator(`article:has-text("${exerciseName}")`)).toBeVisible();
});
