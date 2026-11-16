export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const url = new URL(request.url);
  const start = url.searchParams.get('start') || '1900-01-01';
  const end = url.searchParams.get('end') || '2100-01-01';
  
  // FIX ONDA 4B: Usa fuso do Brasil (UTC-3) para o "mês atual" padrão
  const now = new Date();
  const brazilDate = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const month = url.searchParams.get('month') || brazilDate.toISOString().slice(0, 7);

  const [saldo, periodResult, mensal, porCategoria, recentes, budgets] = await Promise.all([
    // 1. Saldo REAL (Saldo inicial de todas as contas + TODAS as transações até hoje)
    env.DB.prepare(`
      SELECT (SELECT COALESCE(SUM(initial_balance),0) FROM accounts WHERE user_id = ?) +
             COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END),0) AS balance
      FROM transactions WHERE user_id = ? AND date <= date('now')
    `).bind(userId, userId).first<{ balance: number }>(),

    // 2. Resultado do Período (Receitas - Despesas do filtro selecionado)
    env.DB.prepare(`
      SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END),0) AS period_balance
      FROM transactions WHERE user_id = ? AND date >= ? AND date <= ?
    `).bind(userId, start, end).first<{ period_balance: number }>(),
    
    // 3. Gráfico Mensal
    env.DB.prepare(`
      SELECT strftime('%Y-%m', date) AS month,
             SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
             SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
      FROM transactions WHERE user_id = ? AND date >= ? AND date <= ?
      GROUP BY month ORDER BY month ASC
    `).bind(userId, start, end).all(),
    
    // 4. Despesas por Categoria
    env.DB.prepare(`
      SELECT c.name, c.color, SUM(t.amount) AS total
      FROM transactions t JOIN categories c ON c.id = t.category_id
      WHERE t.type='expense' AND t.user_id = ? AND t.date >= ? AND t.date <= ?
      GROUP BY c.id ORDER BY total DESC
    `).bind(userId, start, end).all(),
    
    // 5. Transações Recentes
    env.DB.prepare(`
      SELECT t.*, c.color AS category_color, c.name AS category_name, a.name AS account_name
      FROM transactions t 
      LEFT JOIN categories c ON c.id=t.category_id
      LEFT JOIN accounts a ON a.id=t.account_id
      WHERE t.user_id = ? AND t.date >= ? AND t.date <= ? 
      ORDER BY t.date DESC, t.id DESC LIMIT 10
    `).bind(userId, start, end).all(),
    
    // 6. Orçamentos (só despesas)
    env.DB.prepare(`
      SELECT b.category_id, b.amount as budget_amount, c.name, c.color,
             COALESCE(SUM(t.amount), 0) as spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON t.category_id = b.category_id 
        AND t.user_id = b.user_id 
        AND t.type = 'expense' 
        AND strftime('%Y-%m', t.date) = b.month
      WHERE b.user_id = ? AND b.month = ?
      GROUP BY b.id
    `).bind(userId, month).all()
  ]);

  return Response.json({
    balance: saldo?.balance ?? 0,
    period_balance: periodResult?.period_balance ?? 0,
    monthly: mensal.results,
    byCategory: porCategoria.results,
    recent: recentes.results,
    budgets: budgets.results
  });
};