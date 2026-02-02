import { test, expect } from "@playwright/test";

test.describe("UI Components", () => {
	test("should display login button on login page", async ({ page }) => {
		await page.goto("/login");
		await page.waitForLoadState("networkidle");

		// Should show Google sign-in button
		const button = page.getByRole("button", { name: /sign in with google/i });
		await expect(button).toBeVisible();

		// Button should have content
		const text = await button.textContent();
		expect(text).toContain("Google");
	});

	test("should load without errors", async ({ page }) => {
		const errors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				errors.push(msg.text());
			}
		});

		await page.goto("/login");
		await page.waitForLoadState("networkidle");

		// Should not have critical errors (allow warnings)
		const criticalErrors = errors.filter((e) => !e.includes("Warning"));
		expect(criticalErrors.length).toBe(0);
	});
});
