import { test, expect } from "@playwright/test";

test.describe("Routing", () => {
	test("should load login page", async ({ page }) => {
		await page.goto("/login");
		await page.waitForLoadState("networkidle");

		// Should show Google sign-in button
		await expect(
			page.getByRole("button", { name: /sign in with google/i }),
		).toBeVisible();
	});

	test("should load rules page without auth", async ({ page }) => {
		await page.goto("/rules");
		await page.waitForLoadState("networkidle");

		// Should show content
		const content = await page.textContent("body");
		expect(content).toBeTruthy();
		expect(content?.length).toBeGreaterThan(500);
	});
});
