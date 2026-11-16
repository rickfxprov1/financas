// Parser de CSV que entende campos entre aspas
function parseCSVLine(line: string): string[] {
  const row: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  row.push(current.trim());
  return row;
}

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const { csvData, account_id } = await request.json<any>();
  
  if (!account_id) {
    return Response.json({ error: 'Selecione uma conta para importar' }, { status: 400 });
  }

  // Verifica se a conta pertence ao usuário (IDOR)
  const account = await env.DB.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?')
    .bind(account_id, userId).first();
  if (!account) return Response.json({ error: 'Conta inválida' }, { status: 403 });

  const lines = csvData.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
  const inserts: D1PreparedStatement[] = [];
  let skipped = 0;

  for (const line of lines) {
    const [date, description, amount, type] = parseCSVLine(line);
    
    // Pula cabeçalho
    if (['data', 'descrição', 'descricao'].includes((date || '').toLowerCase())) continue;
    
    // Valida linha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) { skipped++; continue; }
    if (!description || description.length === 0) { skipped++; continue; }
    if (!['income', 'expense'].includes(type)) { skipped++; continue; }
    
    // Aceita vírgula ou ponto como separador decimal
    const numAmount = parseFloat((amount || '').replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) { skipped++; continue; }
    
    inserts.push(env.DB.prepare('INSERT INTO transactions (user_id, account_id, description, amount, type, date) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(userId, account_id, description, numAmount, type, date));
  }

  // Insere em lotes de 50
  for (let i = 0; i < inserts.length; i += 50) {
    await env.DB.batch(inserts.slice(i, i + 50));
  }

  return Response.json({ imported: inserts.length, skipped });
};