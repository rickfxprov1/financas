export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;

  let backup: any;
  try {
    backup = await request.json<any>();
  } catch {
    return new Response('Arquivo de backup inválido', { status: 400 });
  }

  if (!Array.isArray(backup?.transactions) || !Array.isArray(backup?.categories)) {
    return new Response('Arquivo de backup inválido', { status: 400 });
  }

  const accounts: any[] = Array.isArray(backup.accounts) ? backup.accounts : [];
  const budgets: any[] = Array.isArray(backup.budgets) ? backup.budgets : [];

  // Ordem segura para apagar (filhos antes dos pais)
  const tables = ['transactions', 'budgets', 'categories', 'accounts'] as const;

  // Guarda o maior id atual de cada tabela. Tudo que for inserido depois
  // terá id maior, então dá para separar "dados antigos" de "dados novos".
  const maxIds: Record<string, number> = {};
  for (const t of tables) {
    const row = await env.DB.prepare(`SELECT COALESCE(MAX(id), 0) AS m FROM ${t}`).first<{ m: number }>();
    maxIds[t] = row?.m ?? 0;
  }

  const accMap: Record<number, number> = {};
  const catMap: Record<number, number> = {};

  // Contas e categorias padrão (user_id NULL) são compartilhadas e NÃO entram no backup,
  // porque o export filtra por user_id. Elas também não são apagadas na restauração,
  // então as transações continuam apontando para elas com o id original.
  const sharedAccounts = await env.DB.prepare('SELECT id FROM accounts WHERE user_id IS NULL').all<{ id: number }>();
  const sharedCategories = await env.DB.prepare('SELECT id FROM categories WHERE user_id IS NULL').all<{ id: number }>();
  for (const r of sharedAccounts.results) accMap[r.id] = r.id;
  for (const r of sharedCategories.results) catMap[r.id] = r.id;

  let fallbackAccId: number | null = null;
  let orphanTx = 0;

  // Último recurso: conta usada se a conta original não veio no backup e também não é padrão
  const getFallbackAccount = async (): Promise<number> => {
    if (fallbackAccId === null) {
      const r = await env.DB.prepare(
        'INSERT INTO accounts (user_id, name, type, initial_balance) VALUES (?, ?, ?, ?)'
      ).bind(userId, 'Conta restaurada', 'checking', 0).run();
      fallbackAccId = r.meta.last_row_id as number;
    }
    return fallbackAccId;
  };

  try {
    // 1) Insere os dados novos ANTES de apagar os antigos
    for (const acc of accounts) {
      const r = await env.DB.prepare(
        'INSERT INTO accounts (user_id, name, type, initial_balance, created_at) VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))'
      ).bind(userId, acc.name, acc.type, acc.initial_balance ?? 0, acc.created_at ?? null).run();
      accMap[acc.id] = r.meta.last_row_id as number;
    }

    for (const cat of backup.categories) {
      const r = await env.DB.prepare(
        'INSERT INTO categories (user_id, name, type, color) VALUES (?, ?, ?, ?)'
      ).bind(userId, cat.name, cat.type, cat.color).run();
      catMap[cat.id] = r.meta.last_row_id as number;
    }

    for (const tx of backup.transactions) {
      const newCatId = tx.category_id != null && catMap[tx.category_id] ? catMap[tx.category_id] : null;

      let newAccId: number;
      if (tx.account_id != null && accMap[tx.account_id]) {
        newAccId = accMap[tx.account_id];
      } else {
        newAccId = await getFallbackAccount();
        orphanTx++;
      }

      await env.DB.prepare(
        'INSERT INTO transactions (user_id, account_id, category_id, description, amount, type, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))'
      ).bind(userId, newAccId, newCatId, tx.description, tx.amount, tx.type, tx.date, tx.created_at ?? null).run();
    }

    for (const b of budgets) {
      const newCatId = catMap[b.category_id];
      if (newCatId) {
        await env.DB.prepare(
          'INSERT INTO budgets (user_id, category_id, month, amount) VALUES (?, ?, ?, ?)'
        ).bind(userId, newCatId, b.month, b.amount).run();
      }
    }

    // 2) Tudo deu certo: agora apaga só os dados antigos DESTE usuário
    await env.DB.batch(
      tables.map((t) =>
        env.DB.prepare(`DELETE FROM ${t} WHERE user_id = ? AND id <= ?`).bind(userId, maxIds[t])
      )
    );

    return Response.json({
      ok: true,
      transacoes_sem_conta_original: orphanTx
    });
  } catch (err: any) {
    // Falhou: desfaz o que foi inserido e mantém os dados antigos intactos
    try {
      await env.DB.batch(
        tables.map((t) =>
          env.DB.prepare(`DELETE FROM ${t} WHERE user_id = ? AND id > ?`).bind(userId, maxIds[t])
        )
      );
    } catch {
      // se a limpeza também falhar, não esconde o erro original
    }
    return new Response(`Falha ao restaurar: ${err?.message ?? err}`, { status: 500 });
  }
};
