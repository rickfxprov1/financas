export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const url = new URL(request.url);
  const start = url.searchParams.get('start') || '1900-01-01';
  const end = url.searchParams.get('end') || '2100-01-01';
  const accountIdParam = url.searchParams.get('account_id');
  const accountId = accountIdParam ? Number(accountIdParam) : null;
  
  const now = new Date();
  const brazilDate = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const month = url.searchParams.get('month') || brazilDate.toISOString().slice(0, 7);

  if (accountId) {
    const acc = await env.DB.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?')
      .bind(accountId, userId).first();
    if (!acc) return new Response('Conta inválida', { status: 403 });
  }

  const accFilter = accountId ? ' AND account_id = ?' : '';
  const accFilterAlias = accountId ? ' AND t.account_id = ?' : '';
  const accParam: number[] = accountId ? [accountId] : [];

  const initialBalanceQuery = accountId
    ? '(SELECT COALESCE(initial_balance, 0) FROM accounts WHERE id = ? AND user_id = ?)'
    : '(SELECT COALESCE(SUM(initial_balance), 0) FROM accounts WHERE user_id = ?)';
  const initialBalanceParam = accountId ? [accountId, userId] : [userId];

  const [saldo, periodResult, mensal, porCategoria, recentes, budgets] = await Promise.all([
    env.DB.prepare(`
      SELECT ${initialBalanceQuery} +
             COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END), 0) AS balance
      FROM transactions WHERE user_id = ? AND date <= date('now')${accFilter}
    `).bind(...initialBalanceParam, userId, ...accParam).first<{ balance: number }>(),

    env.DB.prepare(`
      SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END), 0) AS period_balance
      FROM transactions WHERE user_id = ? AND date >= ? AND date <= ?${accFilter}
    `).bind(userId, start, end, ...accParam).first<{ period_balance: number }>(),

    env.DB.prepare(`
      SELECT strftime('%Y-%m', date) AS month,
             SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
             SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
      FROM transactions WHERE user_id = ? AND date >= ? AND date <= ?${accFilter}
      GROUP BY month ORDER BY month ASC
    `).bind(userId, start, end, ...accParam).all(),

    env.DB.prepare(`
      SELECT c.name, c.color, SUM(t.amount) AS total
      FROM transactions t JOIN categories c ON c.id = t.category_id
      WHERE t.type='expense' AND t.user_id = ? AND t.date >= ? AND t.date <= ?${accFilterAlias}
      GROUP BY c.id ORDER BY total DESC
    `).bind(userId, start, end, ...accParam).all(),

    env.DB.prepare(`
      SELECT t.*, c.color AS category_color, c.name AS category_name, a.name AS account_name
      FROM transactions t
      LEFT JOIN categories c ON c.id=t.category_id
      LEFT JOIN accounts a ON a.id=t.account_id
      WHERE t.user_id = ? AND t.date >= ? AND t.date <= ?${accFilterAlias}
      ORDER BY t.date DESC, t.id DESC LIMIT 10
    `).bind(userId, start, end, ...accParam).all(),

    env.DB.prepare(`
      SELECT b.category_id, b.amount as budget_amount, c.name, c.color,
             COALESCE(SUM(t.amount), 0) as spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON t.category_id = b.category_id
        AND t.user_id = b.user_id
        AND t.type = 'expense'
        AND strftime('%Y-%m', t.date) = b.month${accFilterAlias}
      WHERE b.user_id = ? AND b.month = ?
      GROUP BY b.id
    `).bind(...accParam, userId, month).all()
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