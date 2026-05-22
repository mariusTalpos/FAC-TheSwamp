import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

async function runTsx(script: string) {
  const env = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://fac:fac@127.0.0.1:5432/fac_app",
  };
  await execFileAsync(npx, ["tsx", script], { cwd: appDir, env, shell: process.platform === "win32" });
}

export default async function globalSetup() {
  await runTsx("scripts/seed-operational-roles.ts");
  await runTsx("scripts/seed-dev-users.ts");
  await runTsx("scripts/reset-e2e-affiliations.ts");
}
