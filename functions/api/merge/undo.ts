export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const { sync_batch_id } = await request.json<any>();

  if (!sync_batch_id) {
    return new Response('sync_batch_id é obrigatório', { status: 400 });
  }

  const r = await env.DB
    .prepare('DELETE FROM transactions WHERE user_id = ? AND sync_batch_id = ?')
    .bind(userId, sync_batch_id).run();

  return Response.json({ ok: true, deleted: r.meta.changes });
};