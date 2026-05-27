import { test, expect } from "@playwright/test";

test.describe("events registration (E3)", () => {
  test.skip("publish → fighter register → marshal register → view schedule", async ({ page }) => {
    // Requires seeded users and running app — enable when DATABASE_URL and seeds are available.
    await page.goto("/login");
    expect(page).toBeTruthy();
  });
});
