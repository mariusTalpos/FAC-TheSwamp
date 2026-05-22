import { expect, type Page } from "@playwright/test";

export const DEV_PASSWORD = process.env.DEV_SEED_PASSWORD ?? "TestPassword123!";

export async function signIn(page: Page, email: string, password = DEV_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible({ timeout: 30_000 });
}
