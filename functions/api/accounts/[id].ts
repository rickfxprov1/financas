export const onRequestPut: PagesFunction<{ DB: D1Database }> = async ({ request, env, params, data }) => {
  const userId = (data as any).userId;
  const id = params.id;
  const b = await request.json<any>();

  if (!b.name || typeof b.name !== 'string' || b.name.trim().length === 0) {
    return Response.json({ error: 'Nome da conta é obrigatório' }, { status: 400 });
  }
  if (!['checking', 'savings', 'credit', 'cash', 'investment'].includes(b.type)) {
    return Response.json({ error: 'Tipo de conta inválido' }, { status: 400 });
  }
  const initialBalance = Number(b.initial_balance);
  if (isNaN(initialBalance)) {
    return Response.json({ error: 'Saldo inicial inválido' }, { status: 400 });
  }

  // Verifica que a conta pertence ao usuário
  const existing = await env.DB.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?')
    .bind(id, userId).first();
  if (!existing) {
    return Response.json({ error: 'Conta não encontrada' }, { status: 404 });
  }

  await env.DB.prepare(`
    UPDATE accounts SET name = ?, type = ?, initial_balance = ? WHERE id = ? AND user_id = ?
  `).bind(b.name.trim(), b.type, initialBalance, id, userId).run();

  return Response.json({ ok: true });
};

export const onRequestDelete: PagesFunction<{ DB: D1Database }> = async ({ env, params, data }) => {
  const userId = (data as any).userId;
  await env.DB.prepare('DELETE FROM accounts WHERE id=? AND user_id=?').bind(params.id, userId).run();
  return Response.json({ ok: true });
};