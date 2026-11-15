export const onRequestDelete: PagesFunction<{ DB: D1Database }> = async ({ env, params, data }) => {
  const userId = (data as any).userId;
  await env.DB.prepare('DELETE FROM accounts WHERE id=? AND user_id=?').bind(params.id, userId).run();
  return Response.json({ ok: true });
};