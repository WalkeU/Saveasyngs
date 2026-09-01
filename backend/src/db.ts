import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DB_PATH ?? join(__dirname, "..", "data", "savings.db");

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = readFileSync(join(__dirname, "db", "schema.sql"), "utf-8");
db.exec(schema);

const defaultCategories: Array<{ name: string; type: "expense" | "income" }> = [
  { name: "Étkezés", type: "expense" },
  { name: "Bevásárlás", type: "expense" },
  { name: "Lakhatás", type: "expense" },
  { name: "Rezsi", type: "expense" },
  { name: "Közlekedés", type: "expense" },
  { name: "Szórakozás", type: "expense" },
  { name: "Egészség", type: "expense" },
  { name: "Utazás", type: "expense" },
  { name: "Egyéb", type: "expense" },
  { name: "Fizetés", type: "income" },
  { name: "Utalás", type: "income" },
  { name: "Egyéb bevétel", type: "income" },
];

const insertCategory = db.prepare(
  "INSERT OR IGNORE INTO categories (name, type) VALUES (@name, @type)",
);
const seedCategories = db.transaction((categories: typeof defaultCategories) => {
  for (const category of categories) insertCategory.run(category);
});
seedCategories(defaultCategories);
