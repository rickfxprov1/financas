export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env, data }) => {
  const userId = (data as any).userId;
  const { results } = await env.DB.prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY id ASC').bind(userId).all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const b = await request.json<any>();
  
  if (!b.name || typeof b.name !== 'string' || b.name.trim().length === 0) {
    return Response.json({ error: 'Nome da conta é obrigatório' }, { status: 400 });
  }

  const r = await env.DB.prepare('INSERT INTO accounts (user_id, name, type, initial_balance) VALUES (?, ?, ?, ?)')
    .bind(userId, b.name.trim(), b.type || 'checking', b.initial_balance || 0).run();
  return Response.json({ id: r.meta.last_row_id }, { status: 201 });
};