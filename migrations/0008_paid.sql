ALTER TABLE transactions ADD COLUMN paid INTEGER NOT NULL DEFAULT 0;
-- Lançamentos que já existem são considerados pagos
UPDATE transactions SET paid = 1;
