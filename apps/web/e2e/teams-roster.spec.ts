import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

/**
 * Epic E2 journeys (SC-004, SC-005). Requires PostgreSQL + seeds (global-setup).
 * Run: npx playwright test --grep @team
 */
test.describe("teams roster @team", () => {
  test("unaffiliated fighter apply → captain approve (SC-004)", async ({ browser }) => {
    const teamName = `E2E North ${Date.now()}`;
    let teamId = "";

    const adminPage = await browser.newPage();
    await signIn(adminPage, "admin@fac.test");
    await adminPage.goto("/admin/teams");
    await adminPage.getByLabel(/team name/i).fill(teamName);
    await adminPage.getByRole("button", { name: "Create team" }).click();
    await expect(adminPage.getByRole("status")).toContainText(teamName, { timeout: 15_000 });

    await adminPage.getByRole("link", { name: teamName }).click();
    await expect(adminPage.getByRole("heading", { level: 1, name: teamName })).toBeVisible();
    teamId = adminPage.url().match(/\/admin\/teams\/([^/]+)/)?.[1] ?? "";
    expect(teamId).toBeTruthy();

    await adminPage.locator("#captain-user").selectOption({ label: "captain@fac.test" });
    await adminPage.getByRole("button", { name: "Assign captain" }).click();
    await expect(adminPage.getByRole("status")).toContainText("Captain assigned", {
      timeout: 15_000,
    });
    await adminPage.close();

    const fighterPage = await browser.newPage();
    await signIn(fighterPage, "fighter@fac.test");
    await fighterPage.goto("/me/team-affiliation");
    await expect(fighterPage.getByText(/unaffiliated/i)).toBeVisible();
    await fighterPage.locator("#apply-team").selectOption({ label: teamName });
    await fighterPage.getByRole("button", { name: "Submit application" }).click();
    await expect(fighterPage.getByRole("status")).toContainText("Application submitted", {
      timeout: 15_000,
    });
    await expect(fighterPage.getByText(/pending approval/i)).toBeVisible();
    await fighterPage.close();

    const captainPage = await browser.newPage();
    captainPage.on("dialog", (dialog) => void dialog.accept());
    await signIn(captainPage, "captain@fac.test");
    await captainPage.goto(`/captain/teams/${teamId}/pending`);
    await expect(captainPage.getByText("Plain Fighter")).toBeVisible({ timeout: 15_000 });
    await captainPage.getByRole("button", { name: "Approve" }).first().click();
    await expect(captainPage.getByText("Plain Fighter")).not.toBeVisible({ timeout: 15_000 });
    await captainPage.goto(`/captain/teams/${teamId}/roster`);
    await expect(captainPage.getByText("Plain Fighter")).toBeVisible();
    await captainPage.close();

    const fighterAgain = await browser.newPage();
    await signIn(fighterAgain, "fighter@fac.test");
    await fighterAgain.goto("/me/team-affiliation");
    await expect(fighterAgain.getByText(new RegExp(`Active member of ${teamName}`))).toBeVisible();
    await fighterAgain.close();
  });

  test("marshal without team is not forced to apply (SC-005)", async ({ page }) => {
    await signIn(page, "marshal@fac.test");
    await expect(page.getByText(/Marshal access does not require team membership/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Team affiliation" })).not.toBeVisible();
  });
});
