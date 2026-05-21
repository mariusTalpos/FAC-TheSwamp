import { test, expect } from "@playwright/test";

test("anonymous public payload reflects ring visibility toggles (SC-003)", async ({ page }) => {
  const email = `e2e_vis_${Date.now()}@example.com`;
  const password = "longpassword123";

  await page.goto("/register/fighter");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: false }).fill(password);
  await page.getByRole("checkbox", { name: /18 years of age/i }).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible({ timeout: 30_000 });

  const me = await page.request.get("/api/me/fighter-profile");
  const profile = (await me.json()) as { id: string };

  const patchVisible = await page.request.patch("/api/me/fighter-profile", {
    data: {
      displayName: "Visible Ring",
      ringName: "The Ring",
      visibility: { ringName: { public: true } },
    },
  });
  expect(patchVisible.ok()).toBeTruthy();

  const pub1 = await page.request.get(`/api/public/fighters/${profile.id}`);
  const body1 = (await pub1.json()) as { displayName: string };
  expect(body1.displayName).toContain("The Ring");

  const patchHidden = await page.request.patch("/api/me/fighter-profile", {
    data: {
      visibility: { ringName: { public: false } },
    },
  });
  expect(patchHidden.ok()).toBeTruthy();

  const pub2 = await page.request.get(`/api/public/fighters/${profile.id}`);
  const body2 = (await pub2.json()) as { displayName: string };
  expect(body2.displayName).not.toContain("The Ring");
});
