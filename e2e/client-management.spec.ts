import { expect, test } from "@playwright/test";

import { expandDetails, uniqueName } from "./helpers";

test.use({ storageState: "e2e/.auth/trainer.json" });

test("trainer can create, archive, and restore a client", async ({ page }) => {
  const firstName = "E2E";
  const lastName = uniqueName("Client");

  await page.goto("/dashboard/clients");
  await page.fill("#firstName", firstName);
  await page.fill("#lastName", lastName);
  await page.click('button:has-text("Create client")');
  await page.waitForURL("**/dashboard/clients?status=created**");
  await expect(page.locator(`article:has-text("${firstName} ${lastName}")`)).toBeVisible();

  const article = page.locator(`article:has-text("${firstName} ${lastName}")`);
  await expandDetails(article);
  page.once("dialog", (dialog) => dialog.accept());
  await article.locator('button:has-text("Archive client")').click();
  await page.waitForURL("**/dashboard/clients?status=archived**");

  // Gone from the active list...
  await expect(page.locator(`article:has-text("${firstName} ${lastName}")`)).toHaveCount(0);

  // ...but present under the archived view.
  await page.goto("/dashboard/clients?view=archived");
  const archivedArticle = page.locator(`article:has-text("${firstName} ${lastName}")`);
  await expect(archivedArticle).toBeVisible();

  await expandDetails(archivedArticle);
  page.once("dialog", (dialog) => dialog.accept());
  await archivedArticle.locator('button:has-text("Restore client")').click();
  await page.waitForURL("**/dashboard/clients?status=restored**");

  // Restore lands back on the active view (this used to redirect to the
  // still-archived view, which was a real bug — see git history).
  await expect(page.locator('h2:has-text("Client list")')).toBeVisible();
  await expect(page.locator(`article:has-text("${firstName} ${lastName}")`)).toBeVisible();

  // Cleanup: archive it again so it doesn't linger in the active list.
  const cleanupArticle = page.locator(`article:has-text("${firstName} ${lastName}")`);
  await expandDetails(cleanupArticle);
  page.once("dialog", (dialog) => dialog.accept());
  await cleanupArticle.locator('button:has-text("Archive client")').click();
  await page.waitForURL("**/dashboard/clients?status=archived**");
});
