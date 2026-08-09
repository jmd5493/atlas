import { expect, test } from "@playwright/test";

// No storageState here — these run logged out, which is the default for the
// "e2e" project since only global.setup.ts writes storage state files.

test.describe("login page", () => {
  test("rejects an empty submission with a client-side required prompt, not a server round-trip", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.locator("#email")).toHaveAttribute("required", "");
    await expect(page.locator("#password")).toHaveAttribute("required", "");
  });

  test("links to signup and forgot-password", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('a:has-text("Create your account")')).toHaveAttribute("href", "/signup");
    await expect(page.locator('a:has-text("Forgot password?")')).toHaveAttribute("href", "/forgot-password");
  });

  test("shows an error message for bad credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "definitely-not-a-real-account@example.com");
    await page.fill("#password", "wrong-password-123");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=/invalid|error/i")).toBeVisible({ timeout: 10_000 });
    // Still on /login — a bad login must never fall through to /dashboard.
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("signup page", () => {
  // Deliberately not exercising a real signUp() call here: Supabase's mailer
  // has a low rate limit shared across this whole project, and every real
  // signup burns from it. The signup→role-hardening→email-linking mechanism
  // itself is covered by inserting directly into auth.users and checking the
  // resulting profiles/clients rows — see the project's manual verification
  // notes; that's a more precise test of the DB trigger than a UI round-trip
  // would be anyway, and doesn't cost mailer quota on every run.
  test("renders email/password fields and links back to login", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("#displayName")).toBeVisible();
    await expect(page.locator("#displayName")).toHaveAttribute("required", "");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('a:has-text("Sign in")')).toHaveAttribute("href", "/login");
  });

  test("enforces the 8-character minimum client-side", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("#password")).toHaveAttribute("minlength", "8");
  });
});

test.describe("forgot-password page", () => {
  test("shows the same generic message whether or not the email exists", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.fill("#email", "no-such-account-xyz@example.com");
    await page.click('button:has-text("Send reset link")');
    await expect(page.locator("text=/password reset link is on its way/i")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("reset-password page", () => {
  test("shows an invalid/expired fallback when there's no recovery code in the URL", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.locator("text=/invalid or has expired/i")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('a:has-text("Request a new link")')).toHaveAttribute("href", "/forgot-password");
  });
});
