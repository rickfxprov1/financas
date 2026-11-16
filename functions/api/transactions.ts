export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const url = new URL(request.url);
  const start = url.searchParams.get('start') || '1900-01-01';
  const end = url.searchParams.get('end') || '2100-01-01';
  const limit = parseInt(url.searchParams.get('limit') || '30');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const { results } = await env.DB.prepare(`
    SELECT t.*, c.name AS category_name, c.color AS category_color, a.name AS account_name
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN accounts a ON a.id = t.account_id
    WHERE t.user_id = ? AND t.date >= ? AND t.date <= ?
    ORDER BY t.date DESC, t.id DESC
    LIMIT ? OFFSET ?
  `).bind(userId, start, end, limit, offset).all();
  
  return Response.json(results);
};

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const b = await request.json<any>();

  if (!b.description || typeof b.description !== 'string' || b.description.trim().length === 0) {
    return Response.json({ error: 'A descrição é obrigatória' }, { status: 400 });
  }
  if (!b.amount || Number(b.amount) <= 0 || isNaN(Number(b.amount))) {
    return Response.json({ error: 'O valor deve ser um número maior que zero' }, { status: 400 });
  }
  if (!['income', 'expense'].includes(b.type)) {
    return Response.json({ error: 'O tipo deve ser "income" ou "expense"' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date)) {
    return Response.json({ error: 'Formato de data inválido' }, { status: 400 });
  }

  const account = await env.DB.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?')
    .bind(b.account_id, userId).first();
  if (!account) return Response.json({ error: 'Conta não encontrada' }, { status: 403 });

  if (b.category_id) {
    const cat = await env.DB.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?')
      .bind(b.category_id, userId).first();
    if (!cat) return Response.json({ error: 'Categoria inválida' }, { status: 403 });
  }

  const r = await env.DB.prepare(`
    INSERT INTO transactions (user_id, account_id, category_id, description, amount, type, date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(userId, b.account_id, b.category_id || null, b.description.trim(), Number(b.amount), b.type, b.date).run();
  
  return Response.json({ id: r.meta.last_row_id }, { status: 201 });
};