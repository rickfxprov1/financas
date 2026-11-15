export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env, data }) => {
  const userId = (data as any).userId;
  const { results } = await env.DB.prepare('SELECT * FROM accounts WHERE user_id = ? OR user_id IS NULL ORDER BY id ASC').bind(userId).all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const b = await request.json<any>();
  const r = await env.DB.prepare('INSERT INTO accounts (user_id, name, type, initial_balance) VALUES (?, ?, ?, ?)')
    .bind(userId, b.name, b.type || 'checking', b.initial_balance || 0).run();
  return Response.json({ id: r.meta.last_row_id }, { status: 201 });
};