export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const backup = await request.json<any>();

  if (!backup.transactions || !backup.categories) {
    return new Response('Arquivo de backup inválido', { status: 400 });
  }

  // 1. Limpa os dados atuais do usuário
  await env.DB.batch([
    env.DB.prepare('DELETE FROM transactions WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM budgets WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM categories WHERE user_id = ?').bind(userId)
  ]);

  // 2. Restaura as Categorias e cria um mapa de IDs antigos para novos
  const catMap: Record<number, number> = {};
  for (const cat of backup.categories) {
    const r = await env.DB.prepare('INSERT INTO categories (user_id, name, type, color) VALUES (?, ?, ?, ?)')
      .bind(userId, cat.name, cat.type, cat.color).run();
    catMap[cat.id] = r.meta.last_row_id;
  }

  // 3. Restaura as Transações usando os novos IDs de categoria
  for (const tx of backup.transactions) {
    const newCatId = tx.category_id && catMap[tx.category_id] ? catMap[tx.category_id] : null;
    await env.DB.prepare('INSERT INTO transactions (user_id, account_id, category_id, description, amount, type, date) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(userId, tx.account_id || 1, newCatId, tx.description, tx.amount, tx.type, tx.date).run();
  }

  // 4. Restaura os Orçamentos
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