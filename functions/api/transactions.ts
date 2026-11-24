export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const url = new URL(request.url);
  const start = url.searchParams.get('start') || '1900-01-01';
  const end = url.searchParams.get('end') || '2100-01-01';
  const accountIdParam = url.searchParams.get('account_id');
  const accountId = accountIdParam ? Number(accountIdParam) : null;
  const paidParam = url.searchParams.get('paid');
  const paidFilter = paidParam === '1' || paidParam === '0' ? ` AND t.type = 'expense' AND t.paid = ${paidParam}` : '';
  const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
  const categoryParam = url.searchParams.get('category_id');
  const typeParam = url.searchParams.get('type');
  let extraFilter = '';
  const extraParams: (string | number)[] = [];
  if (q) {
    extraFilter += " AND t.description LIKE ? ESCAPE '\\'";
    extraParams.push(`%${q.replace(/[\\%_]/g, m => '\\' + m)}%`);
  }
  if (categoryParam && Number.isInteger(Number(categoryParam))) {
    extraFilter += ' AND t.category_id = ?';
    extraParams.push(Number(categoryParam));
  }
  if (typeParam === 'income' || typeParam === 'expense') {
    extraFilter += ' AND t.type = ?';
    extraParams.push(typeParam);
  }
  const limit = parseInt(url.searchParams.get('limit') || '30');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  if (accountId) {
    const acc = await env.DB.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?')
      .bind(accountId, userId).first();
    if (!acc) return Response.json({ error: 'Conta inválida' }, { status: 403 });
  }

  const accFilter = accountId ? ' AND t.account_id = ?' : '';
  const accParam: number[] = accountId ? [accountId] : [];

  const { results } = await env.DB.prepare(`
    SELECT t.*, c.name AS category_name, c.color AS category_color, a.name AS account_name
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN accounts a ON a.id = t.account_id
    WHERE t.user_id = ? AND t.date >= ? AND t.date <= ?${accFilter}${paidFilter}${extraFilter}
    ORDER BY ${paidParam === '0' ? 't.date ASC, t.id ASC' : 't.date DESC, t.id DESC'}
    LIMIT ? OFFSET ?
  `).bind(userId, start, end, ...accParam, ...extraParams, limit, offset).all();
  
  return Response.json(results);
};

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const b = await request.json<any>();

  if (!b.description || typeof b.description !== 'string' || b.description.trim().length === 0) {
    return Response.json({ error: 'A descrição é obrigatória' }, { status: 400 });
  }
  if (!b.amount || Number(b.amount) <= 0 || isNaN(Number(b.amount))) {
    return Response.json({ error: 'O valor deve ser um número maior que zero' }, { status: 400 });
  }
  if (!['income', 'expense'].includes(b.type)) {
    return Response.json({ error: 'O tipo deve ser "income" ou "expense"' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date)) {
    return Response.json({ error: 'Formato de data inválido' }, { status: 400 });
  }

  const account = await env.DB.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?')
    .bind(b.account_id, userId).first();
  if (!account) return Response.json({ error: 'Conta não encontrada' }, { status: 403 });

  if (b.category_id) {
    const cat = await env.DB.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?')
      .bind(b.category_id, userId).first();
    if (!cat) return Response.json({ error: 'Categoria inválida' }, { status: 403 });
  }

  const repeat = Math.min(Math.max(parseInt(b.repeat) || 1, 1), 60);

  if (repeat === 1) {
    const r = await env.DB.prepare(`
      INSERT INTO transactions (user_id, account_id, category_id, description, amount, type, date, paid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(userId, b.account_id, b.category_id || null, b.description.trim(), Number(b.amount), b.type, b.date, b.paid ? 1 : 0).run();

    return Response.json({ id: r.meta.last_row_id, created: 1 }, { status: 201 });
  }

  // Repetição mensal (parcelas): a primeira usa o status informado, as demais ficam pendentes
  const desc = b.description.trim();
  const stmts: D1PreparedStatement[] = [];
  for (let i = 0; i < repeat; i++) {
    stmts.push(
      env.DB.prepare(`
        INSERT INTO transactions (user_id, account_id, category_id, description, amount, type, date, paid)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(userId, b.account_id, b.category_id || null, `${desc} (${i + 1}/${repeat})`, Number(b.amount), b.type, addMonths(b.date, i), i === 0 && b.paid ? 1 : 0)
    );
  }
  for (let i = 0; i < stmts.length; i += 50) {
    await env.DB.batch(stmts.slice(i, i + 50));
  }

  return Response.json({ created: repeat }, { status: 201 });
};

// Soma meses a uma data AAAA-MM-DD, ajustando o dia quando o mês é mais curto (31/01 -> 28/02)
function addMonths(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const total = (m - 1) + n;
  const year = y + Math.floor(total / 12);
  const month = total % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Marca várias despesas como pagas / pendentes de uma vez
export const onRequestPatch: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const b = await request.json<any>();
  const ids: number[] = Array.isArray(b.ids)
    ? [...new Set<number>(b.ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0))]
    : [];
  if (ids.length === 0) return Response.json({ error: 'Nenhuma transação selecionada' }, { status: 400 });
  if (ids.length > 500) return Response.json({ error: 'Selecione no máximo 500 lançamentos por vez' }, { status: 400 });

  const paid = b.paid ? 1 : 0;
  let updated = 0;
  for (let i = 0; i < ids.length; i += 50) {
    const results = await env.DB.batch(
      ids.slice(i, i + 50).map(id =>
        env.DB.prepare("UPDATE transactions SET paid = ? WHERE id = ? AND user_id = ? AND type = 'expense'").bind(paid, id, userId)
      )
    );
    updated += results.reduce((acc, r) => acc + (r.meta.changes || 0), 0);
  }
  return Response.json({ ok: true, updated });
};
