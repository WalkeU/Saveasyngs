CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  color TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (name, type)
);

-- savings/investment destinations (e.g. "ETH", "Részvényszámla"), fully
-- independent of categories — a 'savings' transaction points here via
-- bucket_id instead of category_id
CREATE TABLE IF NOT EXISTS savings_buckets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  icon TEXT,
  -- free-text note, e.g. which stock/fund this bucket holds
  note TEXT,
  -- when set, this IS the bucket's total (overrides the sum of its
  -- transactions) — for holdings whose value moves on its own (stocks,
  -- crypto) and needs a manual mark-to-market instead of only transfers.
  -- A new transfer into a bucket that already has manual_value adds onto
  -- it, so it keeps representing the current total, not just principal.
  manual_value REAL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- manual override for "szabad (liquid) pénz" on the net worth page, for when
-- the calculated income-expense-savings figure doesn't match the real
-- liquid cash on hand (e.g. cash or accounts that aren't tracked as
-- transactions). Single row; a NULL value means "use the calculated figure",
-- same convention as savings_buckets.manual_value.
CREATE TABLE IF NOT EXISTS liquid_override (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value REAL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- app-wide display settings; single row. decimal_places controls how many
-- fraction digits money amounts are rounded/displayed to (forints have
-- none by default, but a bucket tracking e.g. crypto might want some).
-- transactions_batch_size controls how many rows Tranzakciók loads per
-- infinite-scroll batch.
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  decimal_places INTEGER NOT NULL DEFAULT 0,
  transactions_batch_size INTEGER NOT NULL DEFAULT 100,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- one-time data migrations, tracked by name so each runs at most once
CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- 'savings' = money moved from liquid cash into a savings_buckets row
  -- rather than actually spent; such rows use bucket_id, not category_id
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'savings')),
  amount REAL NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT '',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  bucket_id INTEGER REFERENCES savings_buckets(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'import')),
  -- hash of (date|type|amount|description), used to silently skip re-imported rows
  import_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_import_hash
  ON transactions(import_hash) WHERE import_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
-- idx_transactions_bucket is created in db.ts, after the bucket_id column
-- is guaranteed to exist (ALTER TABLE for pre-existing databases runs
-- after this schema exec, so the column may not exist yet here)

CREATE TABLE IF NOT EXISTS category_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  -- 'manual' = user added it on the rules page; 'learned' = suggested after
  -- the user categorized a transaction, and confirmed the suggestion
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'learned')),
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rules_category ON category_rules(category_id);

-- remembers the column mapping chosen for a given CSV header shape,
-- so re-importing from the same bank/export doesn't ask again
CREATE TABLE IF NOT EXISTS import_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  header_signature TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  date_column TEXT NOT NULL,
  description_column TEXT NOT NULL,
  amount_column TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- a bill/subscription/transfer you expect every month; used to flag
-- what hasn't shown up yet this month (see /api/recurring/missing)
CREATE TABLE IF NOT EXISTS recurring_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'savings')),
  amount REAL NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT '',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  bucket_id INTEGER REFERENCES savings_buckets(id) ON DELETE SET NULL,
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_recurring_category ON recurring_payments(category_id);
