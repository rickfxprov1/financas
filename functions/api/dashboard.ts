export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const url = new URL(request.url);
  const start = url.searchParams.get('start') || '1900-01-01';
  const end = url.searchParams.get('end') || '2100-01-01';
  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);

  const [saldo, mensal, porCategoria, recentes, budgets] = await Promise.all([
    // 1. Saldo (Soma o saldo inicial das contas do usuário + transações do período)
    env.DB.prepare(`
      SELECT (SELECT COALESCE(SUM(initial_balance),0) FROM accounts WHERE user_id = ?) +
             COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END),0) AS balance
      FROM transactions WHERE user_id = ? AND date >= ? AND date <= ?
    `).bind(userId, userId, start, end).first<{ balance: number }>(),
    
    // 2. Gráfico Mensal
    env.DB.prepare(`
      SELECT strftime('%Y-%m', date) AS month,
             SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
             SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
      FROM transactions WHERE user_id = ? AND date >= ? AND date <= ?
      GROUP BY month ORDER BY month ASC
    `).bind(userId, start, end).all(),
    
    // 3. Despesas por Categoria
    env.DB.prepare(`
      SELECT c.name, c.color, SUM(t.amount) AS total
      FROM transactions t JOIN categories c ON c.id = t.category_id
      WHERE t.type='expense' AND t.user_id = ? AND t.date >= ? AND t.date <= ?
      GROUP BY c.id ORDER BY total DESC
    `).bind(userId, start, end).all(),
    
    // 4. Transações Recentes
    env.DB.prepare(`
      SELECT t.*, c.color AS category_color, c.name AS category_name, a.name AS account_name
      FROM transactions t 
      LEFT JOIN categories c ON c.id=t.category_id
      LEFT JOIN accounts a ON a.id=t.account_id
      WHERE t.user_id = ? AND t.date >= ? AND t.date <= ? 
      ORDER BY t.date DESC, t.id DESC LIMIT 10
    `).bind(userId, start, end).all(),
    
    // 5. Orçamentos
    env.DB.prepare(`
      SELECT b.category_id, b.amount as budget_amount, c.name, c.color,
             COALESCE(SUM(t.amount), 0) as spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON t.category_id = b.category_id AND t.user_id = b.user_id AND strftime('%Y-%m', t.date) = b.month
      WHERE b.user_id = ? AND b.month = ?
      GROUP BY b.id
    `).bind(userId, month).all()
  ]);

  return Response.json({
    balance: saldo?.balance ?? 0,
    monthly: mensal.results,
    byCategory: porCategoria.results,
    recent: recentes.results,
    budgets: budgets.results
  });
};