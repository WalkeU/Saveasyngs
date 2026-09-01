import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultCategories } from "./default-categories.js";

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

try {
  db.exec("ALTER TABLE categories ADD COLUMN icon TEXT");
} catch {
  // column already exists
}

function migrate(name: string, run: () => void) {
  const applied = db.prepare("SELECT 1 FROM _migrations WHERE name = ?").get(name);
  if (applied) return;
  db.transaction(() => {
    run();
    db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(name);
  })();
}

// replaces the old Hungarian/interim default categories with the fixed English
// taxonomy above; transactions referencing a deleted category fall back to
// null (ON DELETE SET NULL) instead of being lost, and any category the user
// actually created themselves is untouched since this only runs once, ever
migrate("2026-09-category-taxonomy-en", () => {
  db.exec("DELETE FROM categories");
});

// backfills the default icon for databases whose categories already existed
// before the icon column was added; never overwrites a chosen icon, and
// never touches a category outside the fixed default names
migrate("2026-09-category-icons", () => {
  const setIcon = db.prepare(
    "UPDATE categories SET icon = ? WHERE name = ? AND type = ? AND icon IS NULL",
  );
  for (const category of defaultCategories) {
    setIcon.run(category.icon, category.name, category.type);
  }
});

const insertCategory = db.prepare(
  "INSERT OR IGNORE INTO categories (name, type, icon, sort_order) VALUES (@name, @type, @icon, @sortOrder)",
);
const seedCategories = db.transaction((categories: typeof defaultCategories) => {
  const nextOrder: Record<string, number> = { expense: 0, income: 0 };
  for (const category of categories) {
    const sortOrder = nextOrder[category.type]++;
    insertCategory.run({ ...category, sortOrder });
  }
});
seedCategories(defaultCategories);
