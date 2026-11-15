export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const b = await request.json<any>();
  await env.DB.prepare(`
    INSERT INTO budgets (user_id, category_id, month, amount) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, category_id, month) DO UPDATE SET amount = excluded.amount
  `).bind(userId, b.category_id, b.month, b.amount).run();
  return Response.json({ ok: true }, { status: 201 });
};