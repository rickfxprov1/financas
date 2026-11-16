export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const backup = await request.json<any>();

  if (!backup.transactions || !backup.categories) {
    return new Response('Arquivo de backup inválido', { status: 400 });
  }

  // Limpa dados antigos (1 único batch)
  await env.DB.batch([
    env.DB.prepare('DELETE FROM transactions WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM budgets WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM categories WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM accounts WHERE user_id = ?').bind(userId)
  ]);

  // Restaura Contas (geralmente poucas, precisa do ID novo)
  const accMap: Record<number, number> = {};
  if (backup.accounts) {
    for (const acc of backup.accounts) {
      const r = await env.DB.prepare('INSERT INTO accounts (user_id, name, type, initial_balance) VALUES (?, ?, ?, ?)')
        .bind(userId, acc.name, acc.type, acc.initial_balance).run();
      accMap[acc.id] = r.meta.last_row_id;
    }
  }

  // Restaura Categorias
  const catMap: Record<number, number> = {};
  for (const cat of backup.categories) {
    const r = await env.DB.prepare('INSERT INTO categories (user_id, name, type, color) VALUES (?, ?, ?, ?)')
      .bind(userId, cat.name, cat.type, cat.color).run();
    catMap[cat.id] = r.meta.last_row_id;
  }

  // Restaura Transações em lotes de 50 (evita estourar subrequests)
  const txStmts = backup.transactions.map((tx: any) => {
    const newCatId = tx.category_id && catMap[tx.category_id] ? catMap[tx.category_id] : null;
    const newAccId = tx.account_id && accMap[tx.account_id] ? accMap[tx.account_id] : null;
    return env.DB.prepare('INSERT INTO transactions (user_id, account_id, category_id, description, amount, type, date) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(userId, newAccId, newCatId, tx.description, tx.amount, tx.type, tx.date);
  });
  
  for (let i = 0; i < txStmts.length; i += 50) {
    await env.DB.batch(txStmts.slice(i, i + 50));
  }

  // Restaura Orçamentos em lotes
  if (backup.budgets && backup.budgets.length > 0) {
    const budgetStmts = backup.budgets
      .filter((b: any) => catMap[b.category_id])
      .map((b: any) => env.DB.prepare('INSERT INTO budgets (user_id, category_id, month, amount) VALUES (?, ?, ?, ?)')
        .bind(userId, catMap[b.category_id], b.month, b.amount));
    
    for (let i = 0; i < budgetStmts.length; i += 50) {
      await env.DB.batch(budgetStmts.slice(i, i + 50));
    }
  }

  return Response.json({ ok: true, counts: { accounts: Object.keys(accMap).length, categories: Object.keys(catMap).length, transactions: txStmts.length } });
};