export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env, data }) => {
  const userId = (data as any).userId;
  const { results } = await env.DB
    .prepare('SELECT account_id, COUNT(*) as count FROM transactions WHERE user_id = ? GROUP BY account_id')
    .bind(userId).all();
  
  const stats: Record<number, number> = {};
  for (const r of results) {
    stats[r.account_id as number] = r.count as number;
  }
  return Response.json(stats);
};