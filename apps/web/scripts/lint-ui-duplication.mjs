import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "src", "app", "(auth)");
const pattern = /setError\(typeof data\.message/;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const hits = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      hits.push(...(await walk(full)));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      const text = await readFile(full, "utf8");
      if (pattern.test(text)) hits.push(full);
    }
  }
  return hits;
}

const files = await walk(root);
if (files.length > 0) {
  console.error("Legacy UI error parsing found in:");
  for (const f of files) console.error(f);
  process.exit(1);
}

console.log("No legacy setError(typeof data.message patterns under (auth).");
