import { config } from "dotenv";
import { resolve } from "node:path";

/** Load `.env.local` then `.env` from the app root (`apps/web`). Safe to import multiple times. */
const root = process.cwd();
config({ path: resolve(root, ".env.local") });
config({ path: resolve(root, ".env") });
