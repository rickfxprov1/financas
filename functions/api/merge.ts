export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const body = await request.json<any>();
  const backup = body.backup;
  const targetAccountId = body.target_account_id ? Number(body.target_account_id) : null;

  if (!backup || !backup.transactions || !backup.categories) {
    return new Response('Arquivo de backup inválido', { status: 400 });
  }

  if (targetAccountId) {
    const acc = await env.DB
      .prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?')
      .bind(targetAccountId, userId).first();
    if (!acc) return new Response('Conta de destino inválida', { status: 403 });
  }

  const syncBatchId = crypto.randomUUID();

  const stats = {
    accounts_created: 0, accounts_reused: 0,
    categories_created: 0, categories_reused: 0,
    transactions_added: 0, transactions_skipped: 0, transactions_redirected: 0,
    budgets_synced: 0,
  };

  const accMap: Record<number, number> = {};
  if (!targetAccountId) {
    const { results: existingAccounts } = await env.DB
      .prepare('SELECT id, name FROM accounts WHERE user_id = ?').bind(userId).all();
    const accByName: Record<string, number> = {};
    for (const a of existingAccounts) accByName[a.name as string] = a.id as number;

    if (backup.accounts) {
      for (const acc of backup.accounts) {
        if (accByName[acc.name]) {
          accMap[acc.id] = accByName[acc.name]; stats.accounts_reused++;
        } else {
          const r = await env.DB
            .prepare('INSERT INTO accounts (user_id, name, type, initial_balance) VALUES (?, ?, ?, ?)')
            .bind(userId, acc.name, acc.type, acc.initial_balance).run();
          accMap[acc.id] = r.meta.last_row_id as number;
          accByName[acc.name] = r.meta.last_row_id as number;
          stats.accounts_created++;
        }
      }
    }
  }

  const { results: existingCats } = await env.DB
    .prepare('SELECT id, name, type FROM categories WHERE user_id = ?').bind(userId).all();
  const catByKey: Record<string, number> = {};
  for (const c of existingCats) catByKey[`${c.name}__${c.type}`] = c.id as number;

  const catMap: Record<number, number> = {};
  for (const cat of backup.categories) {
    const key = `${cat.name}__${cat.type}`;
    if (catByKey[key]) {
      catMap[cat.id] = catByKey[key]; stats.categories_reused++;
    } else {
      const r = await env.DB
        .prepare('INSERT INTO categories (user_id, name, type, color) VALUES (?, ?, ?, ?)')
        .bind(userId, cat.name, cat.type, cat.color).run();
      catMap[cat.id] = r.meta.last_row_id as number;
      catByKey[key] = r.meta.last_row_id as number;
      stats.categories_created++;
    }
  }

  const { results: existingTx } = await env.DB
    .prepare('SELECT date, description, amount, type, account_id FROM transactions WHERE user_id = ?')
    .bind(userId).all();
  const txKey = (date: string, desc: string, amount: number, type: string, accId: number) =>
    `${date}__${desc.trim().toLowerCase()}__${Number(amount).toFixed(2)}__${type}__${accId}`;
  const existingKeys = new Set(
    existingTx.map((t: any) => txKey(t.date, t.description, t.amount, t.type, t.account_id))
  );

  const insertStmts: D1PreparedStatement[] = [];
  for (const tx of backup.transactions) {
    const newCatId = tx.category_id && catMap[tx.category_id] ? catMap[tx.category_id] : null;
    let newAccId: number | null = null;
    if (targetAccountId) {
      newAccId = targetAccountId; stats.transactions_redirected++;
    } else {
      newAccId = tx.account_id && accMap[tx.account_id] ? accMap[tx.account_id] : null;
    }
    if (!newAccId) { stats.transactions_skipped++; continue; }

    const key = txKey(tx.date, tx.description, tx.amount, tx.type, newAccId);
    if (existingKeys.has(key)) { stats.transactions_skipped++; continue; }

    insertStmts.push(
      env.DB.prepare('INSERT INTO transactions (user_id, account_id, category_id, description, amount, type, date, sync_batch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(userId, newAccId, newCatId, tx.description, tx.amount, tx.type, tx.date, syncBatchId)
    );
    existingKeys.add(key);
    stats.transactions_added++;
  }

  for (let i = 0; i < insertStmts.length; i += 50) {
    await env.DB.batch(insertStmts.slice(i, i + 50));
  }

  if (backup.budgets && backup.budgets.length > 0) {
    const budgetStmts = backup.budgets
      .filter((b: any) => catMap[b.category_id])
      .map((b: any) => env.DB
        .prepare(`INSERT INTO budgets (user_id, category_id, month, amount) VALUES (?, ?, ?, ?)
                  ON CONFLICT(user_id, category_id, month) DO UPDATE SET amount = excluded.amount`)
        .bind(userId, catMap[b.category_id], b.month, b.amount)
      );
    for (let i = 0; i < budgetStmts.length; i += 50) {
      await env.DB.batch(budgetStmts.slice(i, i + 50));
    }
    stats.budgets_synced = budgetStmts.length;
  }

  return Response.json({ ok: true, stats, sync_batch_id: syncBatchId });
};