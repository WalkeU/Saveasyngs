CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (name, type)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  amount REAL NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT '',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
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

CREATE TABLE IF NOT EXISTS savings_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  target_amount REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS savings_contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contributions_goal ON savings_contributions(goal_id);
