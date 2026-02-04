import { expect, test } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should display login page with Google sign-in", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Should show Google sign-in button
    await expect(
      page.getByRole("button", { name: /sign in with google/i }),
    ).toBeVisible();
  });

  test("should navigate to rules page without auth", async ({ page }) => {
    await page.goto("/rules");
    await page.waitForLoadState("networkidle");

    // Should show rules content
    const content = await page.textContent("body");
    expect(content).toMatch(/(UNO|Objective|official|rules)/i);
  });
});
