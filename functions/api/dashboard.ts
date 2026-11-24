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

  const todayBR = brazilDate.toISOString().slice(0, 10);
  const weekBR = new Date(brazilDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [saldoInicial, saldoFinal, periodResult, mensal, porCategoria, recentes, budgets, bills, alerts] = await Promise.all([
    // SALDO INICIAL: initial_balance + transações ANTES do início do período
    env.DB.prepare(`
      SELECT ${initialBalanceQuery} +
             COALESCE((SELECT SUM(CASE WHEN type='income' THEN amount ELSE -amount END)
                       FROM transactions
                       WHERE user_id = ? AND date < ?${accFilter}), 0) AS opening_balance
    `).bind(...initialBalanceParam, userId, start, ...accParam).first<{ opening_balance: number }>(),

    // SALDO FINAL: initial_balance + transações até o fim do período
    env.DB.prepare(`
      SELECT ${initialBalanceQuery} +
             COALESCE((SELECT SUM(CASE WHEN type='income' THEN amount ELSE -amount END)
                       FROM transactions
                       WHERE user_id = ? AND date <= ?${accFilter}), 0) AS closing_balance
    `).bind(...initialBalanceParam, userId, end, ...accParam).first<{ closing_balance: number }>(),

    // RESULTADO DO PERÍODO
    env.DB.prepare(`
      SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END), 0) AS period_balance
      FROM transactions WHERE user_id = ? AND date >= ? AND date <= ?${accFilter}
    `).bind(userId, start, end, ...accParam).first<{ period_balance: number }>(),

    // GRÁFICO MENSAL
    env.DB.prepare(`
      SELECT strftime('%Y-%m', date) AS month,
             SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
             SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
      FROM transactions WHERE user_id = ? AND date >= ? AND date <= ?${accFilter}
      GROUP BY month ORDER BY month ASC
    `).bind(userId, start, end, ...accParam).all(),

    // PIZZA POR CATEGORIA
    env.DB.prepare(`
      SELECT c.name, c.color, SUM(t.amount) AS total
      FROM transactions t JOIN categories c ON c.id = t.category_id
      WHERE t.type='expense' AND t.user_id = ? AND t.date >= ? AND t.date <= ?${accFilterAlias}
      GROUP BY c.id ORDER BY total DESC
    `).bind(userId, start, end, ...accParam).all(),

    // RECENTES
    env.DB.prepare(`
      SELECT t.*, c.color AS category_color, c.name AS category_name, a.name AS account_name
      FROM transactions t
      LEFT JOIN categories c ON c.id=t.category_id
      LEFT JOIN accounts a ON a.id=t.account_id
      WHERE t.user_id = ? AND t.date >= ? AND t.date <= ?${accFilterAlias}
      ORDER BY t.date DESC, t.id DESC LIMIT 10
    `).bind(userId, start, end, ...accParam).all(),

    // ORÇAMENTOS
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
    `).bind(...accParam, userId, month).all(),

    // CONTAS (despesas) PAGAS x PENDENTES NO PERÍODO
    env.DB.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN paid = 1 THEN amount ELSE 0 END), 0) AS paid_total,
        COALESCE(SUM(CASE WHEN paid = 1 THEN 1 ELSE 0 END), 0) AS paid_count,
        COALESCE(SUM(CASE WHEN paid = 0 THEN amount ELSE 0 END), 0) AS pending_total,
        COALESCE(SUM(CASE WHEN paid = 0 THEN 1 ELSE 0 END), 0) AS pending_count,
        COALESCE(SUM(CASE WHEN paid = 0 AND date < ? THEN amount ELSE 0 END), 0) AS overdue_total,
        COALESCE(SUM(CASE WHEN paid = 0 AND date < ? THEN 1 ELSE 0 END), 0) AS overdue_count
      FROM transactions
      WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?${accFilter}
    `).bind(todayBR, todayBR, userId, start, end, ...accParam).first(),

    // ALERTAS (independem do período): despesas pendentes vencidas, de hoje e dos próximos 7 dias
    env.DB.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN date < ? THEN 1 ELSE 0 END), 0) AS overdue_count,
        COALESCE(SUM(CASE WHEN date < ? THEN amount ELSE 0 END), 0) AS overdue_total,
        COALESCE(SUM(CASE WHEN date = ? THEN 1 ELSE 0 END), 0) AS today_count,
        COALESCE(SUM(CASE WHEN date = ? THEN amount ELSE 0 END), 0) AS today_total,
        COALESCE(SUM(CASE WHEN date > ? AND date <= ? THEN 1 ELSE 0 END), 0) AS week_count,
        COALESCE(SUM(CASE WHEN date > ? AND date <= ? THEN amount ELSE 0 END), 0) AS week_total
      FROM transactions
      WHERE user_id = ? AND type = 'expense' AND paid = 0${accFilter}
    `).bind(todayBR, todayBR, todayBR, todayBR, todayBR, weekBR, todayBR, weekBR, userId, ...accParam).first()
  ]);

  return Response.json({
    opening_balance: saldoInicial?.opening_balance ?? 0,
    closing_balance: saldoFinal?.closing_balance ?? 0,
    balance: saldoFinal?.closing_balance ?? 0,
    period_balance: periodResult?.period_balance ?? 0,
    monthly: mensal.results,
    byCategory: porCategoria.results,
    recent: recentes.results,
    budgets: budgets.results,
    alerts: alerts ?? { overdue_count: 0, overdue_total: 0, today_count: 0, today_total: 0, week_count: 0, week_total: 0 },
    bills: bills ?? { paid_total: 0, paid_count: 0, pending_total: 0, pending_count: 0, overdue_total: 0, overdue_count: 0 }
  });
};