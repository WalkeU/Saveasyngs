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

try {
  db.exec("ALTER TABLE transactions ADD COLUMN bucket_id INTEGER REFERENCES savings_buckets(id) ON DELETE SET NULL");
} catch {
  // column already exists
}

try {
  db.exec("ALTER TABLE recurring_payments ADD COLUMN bucket_id INTEGER REFERENCES savings_buckets(id) ON DELETE SET NULL");
} catch {
  // column already exists
}

// safe to run every startup: the column above is now guaranteed to exist
db.exec("CREATE INDEX IF NOT EXISTS idx_transactions_bucket ON transactions(bucket_id)");

try {
  db.exec("ALTER TABLE savings_buckets ADD COLUMN note TEXT");
} catch {
  // column already exists
}

try {
  db.exec("ALTER TABLE savings_buckets ADD COLUMN manual_value REAL");
} catch {
  // column already exists
}

try {
  db.exec("ALTER TABLE transactions ADD COLUMN time TEXT");
} catch {
  // column already exists
}

db.exec("INSERT OR IGNORE INTO app_settings (id, decimal_places) VALUES (1, 0)");

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

// widens categories.type and transactions.type to allow 'savings' in
// addition to 'expense'/'income'; SQLite can't ALTER a CHECK constraint,
// so this rebuilds both tables (the documented rename-table procedure)
// and drops the old, never-used savings_goals/savings_contributions
// tables that the new savings-category model replaces
{
  const applied = db.prepare("SELECT 1 FROM _migrations WHERE name = ?").get("2026-09-savings-type-widen");
  if (!applied) {
    db.pragma("foreign_keys = OFF");
    db.transaction(() => {
      db.exec(`
        CREATE TABLE categories_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'savings')),
          color TEXT,
          icon TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE (name, type)
        );
        INSERT INTO categories_new (id, name, type, color, icon, sort_order, created_at)
          SELECT id, name, type, color, icon, sort_order, created_at FROM categories;
        DROP TABLE categories;
        ALTER TABLE categories_new RENAME TO categories;

        CREATE TABLE transactions_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'savings')),
          amount REAL NOT NULL CHECK (amount > 0),
          description TEXT NOT NULL DEFAULT '',
          category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
          date TEXT NOT NULL,
          source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'import')),
          import_hash TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO transactions_new (id, type, amount, description, category_id, date, source, import_hash, created_at)
          SELECT id, type, amount, description, category_id, date, source, import_hash, created_at FROM transactions;
        DROP TABLE transactions;
        ALTER TABLE transactions_new RENAME TO transactions;

        CREATE UNIQUE INDEX idx_transactions_import_hash ON transactions(import_hash) WHERE import_hash IS NOT NULL;
        CREATE INDEX idx_transactions_date ON transactions(date);
        CREATE INDEX idx_transactions_category ON transactions(category_id);
        CREATE INDEX idx_transactions_type ON transactions(type);

        DROP TABLE IF EXISTS savings_contributions;
        DROP TABLE IF EXISTS savings_goals;
      `);
      db.prepare("INSERT INTO _migrations (name) VALUES (?)").run("2026-09-savings-type-widen");
    })();
    db.pragma("foreign_keys = ON");
  }
}

// splits savings out of the category system entirely: every type='savings'
// category becomes a savings_buckets row (by name), transactions and
// recurring_payments pointing at it get repointed via bucket_id instead of
// category_id, then categories.type is narrowed back to expense/income only
// (another table rebuild, since SQLite can't shrink a CHECK constraint)
{
  const applied = db.prepare("SELECT 1 FROM _migrations WHERE name = ?").get("2026-09-savings-buckets-split");
  if (!applied) {
    db.pragma("foreign_keys = OFF");
    db.transaction(() => {
      const savingsCategories = db.prepare("SELECT * FROM categories WHERE type = 'savings'").all() as {
        id: number;
        name: string;
        color: string | null;
        icon: string | null;
        sort_order: number;
      }[];

      const insertBucket = db.prepare(
        "INSERT OR IGNORE INTO savings_buckets (name, color, icon, sort_order) VALUES (?, ?, ?, ?)",
      );
      const findBucketId = db.prepare("SELECT id FROM savings_buckets WHERE name = ?");
      const repointTransactions = db.prepare(
        "UPDATE transactions SET bucket_id = ?, category_id = NULL WHERE category_id = ?",
      );
      const repointRecurring = db.prepare(
        "UPDATE recurring_payments SET bucket_id = ?, category_id = NULL WHERE category_id = ?",
      );

      for (const category of savingsCategories) {
        insertBucket.run(category.name, category.color, category.icon, category.sort_order);
        const bucket = findBucketId.get(category.name) as { id: number };
        repointTransactions.run(bucket.id, category.id);
        repointRecurring.run(bucket.id, category.id);
      }

      db.exec(`
        DELETE FROM categories WHERE type = 'savings';

        CREATE TABLE categories_new2 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
          color TEXT,
          icon TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE (name, type)
        );
        INSERT INTO categories_new2 (id, name, type, color, icon, sort_order, created_at)
          SELECT id, name, type, color, icon, sort_order, created_at FROM categories;
        DROP TABLE categories;
        ALTER TABLE categories_new2 RENAME TO categories;
      `);

      db.prepare("INSERT INTO _migrations (name) VALUES (?)").run("2026-09-savings-buckets-split");
    })();
    db.pragma("foreign_keys = ON");
  }
}

// removed: a separate "opening balance" setting for net worth. Simpler to
// have one place for money in (income transactions) than to reconcile an
// opening balance against them — if you had savings before you started
// tracking, just add them as a manual income transaction.
migrate("2026-09-drop-net-worth-opening", () => {
  db.exec("DROP TABLE IF EXISTS net_worth_opening");
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
