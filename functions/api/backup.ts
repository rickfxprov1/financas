export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env, data }) => {
  const userId = (data as any).userId;
  
  const [categories, transactions, budgets] = await Promise.all([
    env.DB.prepare('SELECT * FROM categories WHERE user_id = ?').bind(userId).all(),
    env.DB.prepare('SELECT * FROM transactions WHERE user_id = ?').bind(userId).all(),
    env.DB.prepare('SELECT * FROM budgets WHERE user_id = ?').bind(userId).all()
  ]);

  return Response.json({
    version: '1.0',
    exported_at: new Date().toISOString(),
    categories: categories.results,
    transactions: transactions.results,
    budgets: budgets.results
  });
};