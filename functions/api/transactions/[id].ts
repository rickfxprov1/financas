export const onRequestPut: PagesFunction<{ DB: D1Database }> = async ({ request, env, params, data }) => {
  const userId = (data as any).userId;
  const id = params.id;
  const b = await request.json<any>();
  await env.DB.prepare(`
    UPDATE transactions SET category_id=?, description=?, amount=?, type=?, date=? WHERE id=? AND user_id=?
  `).bind(b.category_id || null, b.description, b.amount, b.type, b.date, id, userId).run();
  return Response.json({ ok: true });
};

export const onRequestDelete: PagesFunction<{ DB: D1Database }> = async ({ env, params, data }) => {
  const userId = (data as any).userId;
  await env.DB.prepare('DELETE FROM transactions WHERE id=? AND user_id=?').bind(params.id, userId).run();
  return Response.json({ ok: true });
};