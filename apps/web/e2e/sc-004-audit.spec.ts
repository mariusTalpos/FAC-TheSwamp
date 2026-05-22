import { test, expect } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

test("SC-004: audit API returns role assignment events for FAC admin", async ({ browser }) => {
  const adminEmail = `e2e_adm_${Date.now()}@example.com`;
  const fighterEmail = `e2e_fgt_${Date.now()}@example.com`;
  const password = "longpassword123";

  const adminPage = await browser.newPage();
  await adminPage.goto("/register/fighter");
  await adminPage.getByLabel("Email").fill(adminEmail);
  await adminPage.getByLabel("Password", { exact: false }).fill(password);
  await adminPage.getByRole("checkbox", { name: /18 years of age/i }).check();
  await adminPage.getByRole("button", { name: "Create account" }).click();
  await expect(adminPage.getByRole("heading", { name: "Welcome" })).toBeVisible({
    timeout: 30_000,
  });

  await execFileAsync(
    npx,
    ["tsx", "scripts/grant-fac-admin.ts", adminEmail],
    {
      cwd: appDir,
      shell: process.platform === "win32",
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://fac:fac@127.0.0.1:5432/fac_app",
      },
    },
  );

  const provision = await adminPage.request.post("/api/admin/users", {
    data: {
      provisionMode: "direct_active",
      email: fighterEmail,
      initialPassword: password,
    },
  });
  expect(provision.ok()).toBeTruthy();
  const created = (await provision.json()) as { userId: string };

  const assign = await adminPage.request.post(`/api/admin/users/${created.userId}/roles`, {
    data: { operationalRoleKey: "marshal" },
  });
  expect(assign.ok()).toBeTruthy();

  const audit = await adminPage.request.get(`/api/admin/users/${created.userId}/audit?limit=20`);
  expect(audit.ok()).toBeTruthy();
  const body = (await audit.json()) as { items: { eventType: string }[] };
  const types = body.items.map((i) => i.eventType);
  expect(types).toContain("role.assigned");
  expect(types).toContain("user.created");

  await adminPage.close();
});
