export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const b = await request.json<any>();

  if (!b.category_id || Number(b.amount) <= 0) {
    return Response.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  // Prevenção de IDOR
  const cat = await env.DB.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?')
    .bind(b.category_id, userId).first();
  if (!cat) return Response.json({ error: 'Categoria inválida' }, { status: 403 });

  await env.DB.prepare(`
    INSERT INTO budgets (user_id, category_id, month, amount) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, category_id, month) DO UPDATE SET amount = excluded.amount
  `).bind(userId, b.category_id, b.month, Number(b.amount)).run();
  
  return Response.json({ ok: true }, { status: 201 });
};