import { expect, test } from "@playwright/test";

import { createProgram, deleteProgramByTitle, expandDetails, uniqueName } from "./helpers";

test.use({ storageState: "e2e/.auth/trainer.json" });

const CLIENT_LABEL = "Billy McKenna"; // must match the E2E_CLIENT_EMAIL account linked in .env.test.local

test("trainer can create a program with two workouts on the same day", async ({ page }) => {
  const title = uniqueName("Multi-Workout Program");

  await createProgram(page, {
    clientLabel: CLIENT_LABEL,
    title,
    startDate: "2026-09-01",
    workouts: [
      { dayNumber: 1, label: "Morning Strength", exercises: [{ name: "Back Squat", sets: "4", reps: "8", weight: "185" }] },
      { dayNumber: 1, label: "Evening Cardio", exercises: [{ name: "Rowing Intervals", sets: "6", reps: "1" }] },
    ],
  });

  await expect(page.locator(`article:has-text("${title}")`)).toBeVisible();

  await deleteProgramByTitle(page, title);
  await expect(page.locator(`article:has-text("${title}")`)).toHaveCount(0);
});

test("editing an existing program's days pre-populates and fully replaces the schedule", async ({ page }) => {
  const title = uniqueName("Edit Days Program");

  await createProgram(page, {
    clientLabel: CLIENT_LABEL,
    title,
    startDate: "2026-09-02",
    workouts: [{ dayNumber: 2, label: "Leg Day", exercises: [{ name: "Squat", sets: "3", reps: "10", weight: "135" }] }],
  });

  const article = page.locator(`article:has-text("${title}")`);
  await expandDetails(article);

  const scheduleForm = article.locator('form:has(button:has-text("Save workout schedule"))');
  await expect(scheduleForm.locator('input[value="Squat"]')).toBeVisible();

  // Add a second workout to Day 2 and save — this is a full replace, so the
  // saved state should end up with exactly these two workouts, nothing more.
  const day2Card = scheduleForm.locator('h4:has-text("Day 2")').locator("..").locator("..");
  await day2Card.locator('button:has-text("+ Add workout")').click();
  const newBlock = day2Card.locator("div.rounded-lg.border.border-stone-200.bg-stone-50").nth(1);
  await newBlock.locator('input[placeholder*="AM Strength"]').fill("Accessories");
  await newBlock.locator('input[placeholder*="Exercise name"]').fill("Walking Lunges");
  await newBlock.locator('input[type="number"]').nth(0).fill("3");
  await newBlock.locator('input[type="number"]').nth(1).fill("12");

  page.once("dialog", (dialog) => dialog.accept());
  await scheduleForm.locator('button:has-text("Save workout schedule")').click();
  await page.waitForURL("**/dashboard/programs?status=days-updated**");

  // Re-expand and confirm both workouts are now present.
  const reloadedArticle = page.locator(`article:has-text("${title}")`);
  await expandDetails(reloadedArticle);
  const reloadedForm = reloadedArticle.locator('form:has(button:has-text("Save workout schedule"))');
  await expect(reloadedForm.locator('input[value="Squat"]')).toBeVisible();
  await expect(reloadedForm.locator('input[value="Walking Lunges"]')).toBeVisible();

  await deleteProgramByTitle(page, title);
});

test("deleting a program keeps the client's already-logged exercise history", async ({ page, browser }) => {
  const title = uniqueName("Delete Preserves History");
  const exerciseName = uniqueName("Bench Press");

  await createProgram(page, {
    clientLabel: CLIENT_LABEL,
    title,
    startDate: "2026-09-03",
    workouts: [{ dayNumber: 1, label: "Push Day", exercises: [{ name: exerciseName, sets: "4", reps: "6", weight: "175" }] }],
  });

  // Log the exercise as the client, in a separate authenticated context.
  const clientContext = await browser.newContext({ storageState: "e2e/.auth/client.json" });
  const clientPage = await clientContext.newPage();
  await clientPage.goto("/dashboard/workouts");
  const exerciseCard = clientPage.locator(`li:has-text("${exerciseName}")`).first();
  clientPage.once("dialog", (dialog) => dialog.accept());
  await exerciseCard.locator('button:has-text("Log this exercise")').click();
  await clientPage.waitForURL("**/dashboard/workouts?status=created**");
  await clientContext.close();

  // Trainer deletes the program.
  await deleteProgramByTitle(page, title);
  await expect(page.locator(`article:has-text("${title}")`)).toHaveCount(0);

  // The client's log entry survives (workout_program_id is ON DELETE SET
  // NULL, not part of a cascade — this is the whole point of the test).
  await page.goto("/dashboard/client-logs");
  await expect(page.locator(`article:has-text("${exerciseName}")`)).toBeVisible();
});
