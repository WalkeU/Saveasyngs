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

// added after the initial release; ignore the error on databases that already have it
try {
  db.exec("ALTER TABLE categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
  // give existing rows a stable initial order instead of leaving them all at 0
  db.exec(`
    UPDATE categories
    SET sort_order = ranked.rn
    FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY type ORDER BY id) - 1 AS rn FROM categories) AS ranked
    WHERE categories.id = ranked.id
  `);
} catch {
  // column already exists
}

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
  "INSERT OR IGNORE INTO categories (name, type, sort_order) VALUES (@name, @type, @sortOrder)",
);
const seedCategories = db.transaction((categories: typeof defaultCategories) => {
  const nextOrder: Record<string, number> = { expense: 0, income: 0 };
  for (const category of categories) {
    const sortOrder = nextOrder[category.type]++;
    insertCategory.run({ ...category, sortOrder });
  }
});
seedCategories(defaultCategories);
