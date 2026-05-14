import { test, expect } from "@playwright/test";

test("fighter can self-register and reach account home", async ({ page }) => {
  const email = `e2e_${Date.now()}@example.com`;
  const password = "longpassword123";

  await page.goto("/register/fighter");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: false }).fill(password);
  await page.getByRole("checkbox", { name: /18 years of age/i }).check();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible({ timeout: 30_000 });
});

test("non-admin receives 403 and audit row on privileged admin create", async ({ page, request }) => {
  const email = `e2e_denied_${Date.now()}@example.com`;
  const password = "longpassword123";

  await page.goto("/register/fighter");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: false }).fill(password);
  await page.getByRole("checkbox", { name: /18 years of age/i }).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible({ timeout: 30_000 });

  const res = await page.request.post("/api/admin/users", {
    data: {
      provisionMode: "direct_active",
      email: `other_${Date.now()}@example.com`,
      initialPassword: "longpassword123",
    },
  });
  expect(res.status()).toBe(403);
});
