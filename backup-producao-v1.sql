PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('checking','savings','credit','cash','investment')),
  initial_balance REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO "accounts" ("id","name","type","initial_balance","created_at") VALUES(1,'Conta principal','checking',0,'2026-11-15 04:42:36');
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
INSERT INTO "categories" ("id","name","type","color","user_id") VALUES(6,'Cartão de crédito ','expense','#6366f1','8b3f4e5e-c3de-4d1d-a03e-7a041309ebe4');
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
INSERT INTO "transactions" ("id","account_id","category_id","description","amount","type","date","created_at","user_id") VALUES(1,1,NULL,'teste',100,'expense','2026-11-15','2026-11-15 05:46:31',NULL);
INSERT INTO "transactions" ("id","account_id","category_id","description","amount","type","date","created_at","user_id") VALUES(2,1,NULL,'teste',1000,'income','2026-11-15','2026-11-15 05:46:53',NULL);
INSERT INTO "transactions" ("id","account_id","category_id","description","amount","type","date","created_at","user_id") VALUES(3,1,2,'teste',200,'expense','2026-11-15','2026-11-15 05:51:44',NULL);
INSERT INTO "transactions" ("id","account_id","category_id","description","amount","type","date","created_at","user_id") VALUES(4,1,1,'teste',500,'income','2026-11-15','2026-11-15 05:52:11',NULL);
INSERT INTO "transactions" ("id","account_id","category_id","description","amount","type","date","created_at","user_id") VALUES(5,1,5,'teste',200,'expense','2026-11-15','2026-11-15 05:52:55',NULL);
INSERT INTO "transactions" ("id","account_id","category_id","description","amount","type","date","created_at","user_id") VALUES(17,1,2,'Mercado ',1000,'expense','2026-11-15','2026-11-15 12:11:22','8b3f4e5e-c3de-4d1d-a03e-7a041309ebe4');
INSERT INTO "transactions" ("id","account_id","category_id","description","amount","type","date","created_at","user_id") VALUES(18,1,NULL,'Recebimento ',1800,'income','2026-11-15','2026-11-15 12:11:59','8b3f4e5e-c3de-4d1d-a03e-7a041309ebe4');
INSERT INTO "transactions" ("id","account_id","category_id","description","amount","type","date","created_at","user_id") VALUES(19,1,6,'Cartão ',500,'expense','2026-11-15','2026-11-15 12:13:29','8b3f4e5e-c3de-4d1d-a03e-7a041309ebe4');
INSERT INTO "transactions" ("id","account_id","category_id","description","amount","type","date","created_at","user_id") VALUES(21,1,5,'teste',100,'expense','2026-11-15','2026-11-15 14:22:16','8b3f4e5e-c3de-4d1d-a03e-7a041309ebe4');
CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
INSERT INTO "users" ("id","email","password_hash","created_at") VALUES('8b3f4e5e-c3de-4d1d-a03e-7a041309ebe4','rickcavalcantiofc@gmail.com','11f7759d9df0913c90739996009b500f:2fb45613ce2d43ee52d01e299b51b0486fe9b3f964db91ec81a952162f9a24ae',1794721484052);
INSERT INTO "users" ("id","email","password_hash","created_at") VALUES('4cbb6398-9e34-4bd9-9b31-ea16bf003a71','teste@gmail.com','2b248b2cab072fa786ad516b1bb771dd:3d8742701b6397560b1316fbc2c65e7c4919b805eb4fc61df58ae2222906c041',1794729001118);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
INSERT INTO "sessions" ("token_hash","user_id","expires_at") VALUES('aa922e1092b11487ba4e9320030213f906a9aa23fe8aa2311ac6b1abed5dafbd','8b3f4e5e-c3de-4d1d-a03e-7a041309ebe4',1795349437106);
INSERT INTO "sessions" ("token_hash","user_id","expires_at") VALUES('cd85ecb715a47984418e478c41a486fe2bfb5131d929f123ae1a4991023904dd','8b3f4e5e-c3de-4d1d-a03e-7a041309ebe4',1795352327738);
INSERT INTO "sessions" ("token_hash","user_id","expires_at") VALUES('621f687eb4e3036431bc7d51e505790c534534f5eb9446affbf6e5d5a4887916','8b3f4e5e-c3de-4d1d-a03e-7a041309ebe4',1795357311617);
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
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('categories',6);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('transactions',21);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('budgets',7);
CREATE INDEX idx_tx_date ON transactions(date);
CREATE INDEX idx_tx_account ON transactions(account_id);
