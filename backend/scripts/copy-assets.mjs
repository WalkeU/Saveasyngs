import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "..", "src", "db", "schema.sql");
const destDir = join(__dirname, "..", "dist", "db");

mkdirSync(destDir, { recursive: true });
copyFileSync(src, join(destDir, "schema.sql"));
