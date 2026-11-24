export const onRequestPut: PagesFunction<{ DB: D1Database }> = async ({ request, env, params, data }) => {
  const userId = (data as any).userId;
  const id = params.id;
  const b = await request.json<any>();
  await env.DB.prepare(`
    UPDATE transactions SET category_id=?, description=?, amount=?, type=?, date=?, paid=COALESCE(?, paid) WHERE id=? AND user_id=?
  `).bind(b.category_id || null, b.description, b.amount, b.type, b.date, b.paid === undefined ? null : (b.paid ? 1 : 0), id, userId).run();
  return Response.json({ ok: true });
};

// Marca / desmarca uma despesa como paga
export const onRequestPatch: PagesFunction<{ DB: D1Database }> = async ({ request, env, params, data }) => {
  const userId = (data as any).userId;
  const b = await request.json<any>();
  const r = await env.DB.prepare('UPDATE transactions SET paid=? WHERE id=? AND user_id=?')
    .bind(b.paid ? 1 : 0, params.id, userId).run();
  if (!r.meta.changes) return Response.json({ error: 'Transação não encontrada' }, { status: 404 });
  return Response.json({ ok: true });
};

export const onRequestDelete: PagesFunction<{ DB: D1Database }> = async ({ env, params, data }) => {
  const userId = (data as any).userId;
  await env.DB.prepare('DELETE FROM transactions WHERE id=? AND user_id=?').bind(params.id, userId).run();
  return Response.json({ ok: true });
};