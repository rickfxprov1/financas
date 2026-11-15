export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const url = new URL(request.url);
  const start = url.searchParams.get('start') || '1900-01-01';
  const end = url.searchParams.get('end') || '2100-01-01';

  const { results } = await env.DB.prepare(`
    SELECT t.*, c.name AS category_name, c.color AS category_color
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ? AND t.date >= ? AND t.date <= ?
    ORDER BY t.date DESC, t.id DESC LIMIT 500
  `).bind(userId, start, end).all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const b = await request.json<any>();
  const r = await env.DB.prepare(`
    INSERT INTO transactions (user_id, account_id, category_id, description, amount, type, date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(userId, b.account_id || 1, b.category_id || null, b.description, b.amount, b.type, b.date).run();
  return Response.json({ id: r.meta.last_row_id }, { status: 201 });
};