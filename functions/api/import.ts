export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const { csvData } = await request.json<any>();
  
  const lines = csvData.split('\n').filter((l: string) => l.trim().length > 0);
  // Assume formato: Data,Descricao,Valor,Tipo
  const inserts = lines.map((line: string) => {
    const [date, description, amount, type] = line.split(',');
    if (!date || !description || !amount || !type) return null;
    return env.DB.prepare(`
      INSERT INTO transactions (user_id, account_id, description, amount, type, date)
      VALUES (?, 1, ?, ?, ?, ?)
    `).bind(userId, description.trim(), parseFloat(amount), type.trim(), date.trim());
  }).filter(Boolean);

  if (inserts.length > 0) await env.DB.batch(inserts as any[]);
  return Response.json({ imported: inserts.length });
};