PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('checking','savings','credit','cash','investment')),
  initial_balance REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO "accounts" ("id","name","type","initial_balance","created_at") VALUES(1,'Conta principal','checking',0,'2026-11-15 04:57:57');
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  color TEXT NOT NULL DEFAULT '#6366f1'
, user_id TEXT REFERENCES users(id));
INSERT INTO "categories" ("id","name","type","color","user_id") VALUES(1,'Salario','income','#10b981',NULL);
INSERT INTO "categories" ("id","name","type","color","user_id") VALUES(2,'Alimentacao','expense','#ef4444',NULL);
INSERT INTO "categories" ("id","name","type","color","user_id") VALUES(3,'Transporte','expense','#f59e0b',NULL);
INSERT INTO "categories" ("id","name","type","color","user_id") VALUES(4,'Moradia','expense','#8b5cf6',NULL);
INSERT INTO "categories" ("id","name","type","color","user_id") VALUES(5,'Lazer','expense','#ec4899',NULL);
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL CHECK(amount > 0),
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
, user_id TEXT REFERENCES users(id));
INSERT INTO "transactions" ("id","account_id","category_id","description","amount","type","date","created_at","user_id") VALUES(1,1,NULL,'Almoço',25,'expense','2026-11-15','2026-11-15 05:05:08',NULL);
INSERT INTO "transactions" ("id","account_id","category_id","description","amount","type","date","created_at","user_id") VALUES(2,1,NULL,'Salario',3000,'income','2026-11-15','2026-11-15 05:06:05',NULL);
CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
INSERT INTO "users" ("id","email","password_hash","created_at") VALUES('e52d2197-99d1-4da0-a710-8c71ca034856','teste@gmail.com','bd6eef0831ba038ddcc4d84a17b47bea:9e83c4485a77ab1a8ec69a6d48679e4da60cd6f05b0e9c5bc13d9c1e42dde023',1794720891828);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE TABLE budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  amount REAL NOT NULL,
  UNIQUE(user_id, category_id, month)
);
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('accounts',1);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('categories',5);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('transactions',2);
CREATE INDEX idx_tx_date ON transactions(date);
CREATE INDEX idx_tx_account ON transactions(account_id);