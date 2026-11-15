export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const backup = await request.json<any>();

  if (!backup.transactions || !backup.categories) {
    return new Response('Arquivo de backup inválido', { status: 400 });
  }

  // Limpa dados antigos
  await env.DB.batch([
    env.DB.prepare('DELETE FROM transactions WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM budgets WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM categories WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM accounts WHERE user_id = ?').bind(userId)
  ]);

  // Restaura Contas
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

  // Restaura Transações
  for (const tx of backup.transactions) {
    const newCatId = tx.category_id && catMap[tx.category_id] ? catMap[tx.category_id] : null;
    const newAccId = tx.account_id && accMap[tx.account_id] ? accMap[tx.account_id] : null;
    await env.DB.prepare('INSERT INTO transactions (user_id, account_id, category_id, description, amount, type, date) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(userId, newAccId, newCatId, tx.description, tx.amount, tx.type, tx.date).run();
  }

  // Restaura Orçamentos
  if (backup.budgets) {
    for (const b of backup.budgets) {
      const newCatId = catMap[b.category_id];
      if (newCatId) {
        await env.DB.prepare('INSERT INTO budgets (user_id, category_id, month, amount) VALUES (?, ?, ?, ?)')
          .bind(userId, newCatId, b.month, b.amount).run();
      }
    }
  }

  return Response.json({ ok: true });
};