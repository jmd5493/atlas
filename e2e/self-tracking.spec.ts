import { expect, test } from "@playwright/test";

import { createProgram, deleteProgramByTitle, uniqueName } from "./helpers";

test.use({ storageState: "e2e/.auth/trainer.json" });

test("trainer can link a self-tracking client, build a program for it, and log against it", async ({ page }) => {
  const programTitle = uniqueName("Self Training Program");
  const exerciseName = uniqueName("Pull-ups");

  await page.goto("/dashboard/clients");

  // clients_auth_user_id_unique_idx allows exactly one self-link per
  // trainer, forever — archiving a client doesn't clear auth_user_id, and
  // there's no delete-client action in the UI (by design: archive, not
  // delete). So this test can't assume a clean slate on every run; it
  // reuses an existing self-link if this trainer account already has one
  // from a previous run, rather than trying (and failing) to create a
  // second one.
  const existingInfoBox = page.locator("text=/tracking your own workouts as/i");
  let selfClientLabel: string;

  if (await existingInfoBox.isVisible().catch(() => false)) {
    const infoText = await existingInfoBox.textContent();
    const match = infoText?.match(/tracking your own workouts as ([^.]+)\./i);
    if (!match) {
      throw new Error(`Could not parse the self-linked client's name from: "${infoText}"`);
    }
    selfClientLabel = match[1].trim();
    await expect(page.locator('input[name="selfTrack"]')).toHaveCount(0);
  } else {
    selfClientLabel = uniqueName("Trainer Self");
    const [firstName, ...rest] = selfClientLabel.split(" ");
    const checkbox = page.locator('input[name="selfTrack"]');
    await expect(checkbox).toBeVisible();

    await page.fill("#firstName", firstName);
    await page.fill("#lastName", rest.join(" "));
    await checkbox.check();
    await page.click('button:has-text("Create client")');
    await page.waitForURL("**/dashboard/clients?status=created**");

    await expect(page.locator(`text=/tracking your own workouts as ${selfClientLabel}/i`)).toBeVisible();
    await expect(page.locator('input[name="selfTrack"]')).toHaveCount(0);
  }

  // The self-linked client shows up in the program-creation dropdown like
  // any other client.
  await page.goto("/dashboard/programs");
  const options = await page.locator("#clientId option").allTextContents();
  expect(options.some((text) => text.includes(selfClientLabel))).toBe(true);

  await createProgram(page, {
    clientLabel: selfClientLabel,
    title: programTitle,
    startDate: "2026-09-05",
    workouts: [{ dayNumber: 1, label: "Self Day", exercises: [{ name: exerciseName, sets: "4", reps: "8" }] }],
  });

  // The role gate on /dashboard/workouts allows a trainer through when
  // they have a linked client record, same as it would for a client account.
  await page.goto("/dashboard/workouts");
  await expect(page.locator(`article:has-text("${programTitle}")`)).toBeVisible();

  const exerciseCard = page.locator(`li:has-text("${exerciseName}")`);
  page.once("dialog", (dialog) => dialog.accept());
  await exerciseCard.locator('button:has-text("Log this exercise")').click();
  await page.waitForURL("**/dashboard/workouts?status=created**");

  // Shows up in the trainer's own client-logs review page alongside real clients.
  await page.goto("/dashboard/client-logs");
  await expect(page.locator(`article:has-text("${exerciseName}")`)).toBeVisible();

  // Cleanup: only the throwaway program — the self-link itself is left in
  // place so subsequent runs can reuse it (see note above).
  await deleteProgramByTitle(page, programTitle);
});
