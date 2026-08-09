import type { Locator, Page } from "@playwright/test";

/** Tags every piece of e2e-created data so it's identifiable for manual cleanup if a test fails mid-run. */
export function uniqueName(prefix: string): string {
  return `${prefix} E2E ${Date.now()}`;
}

/**
 * Opens a client/program list item's <details> disclosure via its
 * <summary>, verifying it actually ended up open rather than assuming the
 * click landed — clicking <summary> is a native toggle, so a click that
 * lands while it's already open closes it instead. One retry covers that.
 */
export async function expandDetails(article: Locator) {
  const details = article.locator("details");
  const summary = article.locator("summary");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (await details.evaluate((el) => (el as HTMLDetailsElement).open)) {
      return;
    }
    await summary.click();
  }

  if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open))) {
    throw new Error("Could not get <details> into an open state after 2 attempts");
  }
}

type ProgramExercise = {
  name: string;
  sets: string;
  reps: string;
  weight?: string;
};

type ProgramWorkout = {
  dayNumber: number;
  label: string;
  exercises: ProgramExercise[];
};

/**
 * Drives the "Add program" create form (scoped to it specifically — the
 * program list can contain other programs, each rendering their own copy of
 * ProgramDayBuilder in a collapsed edit form, so an unscoped locator for
 * e.g. "Day 1" matches more than one element on the page).
 */
export async function createProgram(
  page: Page,
  options: {
    clientLabel: string;
    title: string;
    startDate: string;
    durationWeeks?: string;
    workouts: ProgramWorkout[];
  },
) {
  await page.goto("/dashboard/programs");
  const createForm = page.locator('form:has(button:has-text("Create program"))');

  await page.selectOption("#clientId", { label: options.clientLabel });
  await page.fill("#title", options.title);
  await page.fill("#startDate", options.startDate);
  await page.fill("#durationWeeks", options.durationWeeks ?? "4");

  for (const workout of options.workouts) {
    const dayCard = createForm.locator(`h4:has-text("Day ${workout.dayNumber}")`).locator("..").locator("..");
    await dayCard.locator('button:has-text("+ Add workout")').click();

    const blocks = dayCard.locator("div.rounded-lg.border.border-stone-200.bg-stone-50");
    const block = blocks.last();
    await block.locator('input[placeholder*="AM Strength"]').fill(workout.label);

    for (const [index, exercise] of workout.exercises.entries()) {
      if (index > 0) {
        await block.locator('button:has-text("+ Add exercise")').click();
      }
      const exerciseBlocks = block.locator("div.rounded-lg.border.border-stone-200.bg-white");
      const exerciseBlock = exerciseBlocks.nth(index);
      await exerciseBlock.locator('input[placeholder*="Exercise name"]').fill(exercise.name);
      await exerciseBlock.locator('input[type="number"]').nth(0).fill(exercise.sets);
      await exerciseBlock.locator('input[type="number"]').nth(1).fill(exercise.reps);
      if (exercise.weight) {
        await exerciseBlock.locator('input[type="number"]').nth(2).fill(exercise.weight);
      }
    }
  }

  await page.click('button:has-text("Create program")');
  await page.waitForURL("**/dashboard/programs?status=created**");
}

/** Deletes a program by its exact title from the trainer's program list, accepting the confirm() dialog. */
export async function deleteProgramByTitle(page: Page, title: string) {
  await page.goto("/dashboard/programs");
  const article = page.locator(`article:has-text("${title}")`);
  if ((await article.count()) === 0) {
    return;
  }
  await expandDetails(article);
  page.once("dialog", (dialog) => dialog.accept());
  await article.locator('button:has-text("Delete program")').click();
  await page.waitForURL("**/dashboard/programs?status=deleted**").catch(() => {});
}
