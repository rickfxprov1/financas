[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

function Write-Utf8File {
    param([string]$Path, [string]$Content)
    $fullPath = [System.IO.Path]::Combine((Get-Location).Path, $Path)
    $dir = Split-Path -Parent $fullPath
    if ($dir -and -not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    [System.IO.File]::WriteAllText($fullPath, $Content, [System.Text.UTF8Encoding]::new($false))
}

Write-Host ">>> [1/4] Atualizando Backend (Middleware, Dashboard, Transactions, Categorias)..." -ForegroundColor Cyan

Write-Utf8File "functions/api/_middleware.ts" @'
import { sha256 } from './_utils';

export const onRequest: PagesFunction<{ DB: D1Database }> = async (context) => {
  const url = new URL(context.request.url);
  if (url.pathname.startsWith('/api/auth/')) {
    return context.next();
  }

  const cookie = context.request.headers.get('Cookie') || '';
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return new Response('Não autorizado', { status: 401 });

  const tokenHash = await sha256(match[1]);
  const session = await context.env.DB.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .bind(tokenHash, Date.now()).first();

  if (!session) return new Response('Sessão inválida ou expirada', { status: 401 });

  (context as any).data = { userId: session.user_id };
  return context.next();
};
'@

Write-Utf8File "functions/api/transactions.ts" @'
export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env, data }) => {
  const userId = (data as any).userId;
  const { results } = await env.DB.prepare(`
    SELECT t.*, c.name AS category_name, c.color AS category_color, a.name AS account_name
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN accounts a ON a.id = t.account_id
    WHERE t.user_id = ?
    ORDER BY t.date DESC, t.id DESC LIMIT 500
  `).bind(userId).all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const b = await request.json<any>();
  if (!b.description || !b.amount || !b.date || !b.type) {
    return Response.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
  }
  const r = await env.DB.prepare(`
    INSERT INTO transactions (user_id, account_id, category_id, description, amount, type, date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(userId, b.account_id || 1, b.category_id || null, b.description, b.amount, b.type, b.date).run();
  return Response.json({ id: r.meta.last_row_id }, { status: 201 });
};
'@

Write-Utf8File "functions/api/transactions/[id].ts" @'
export const onRequestPut: PagesFunction<{ DB: D1Database }> = async ({ request, env, params, data }) => {
  const userId = (data as any).userId;
  const id = params.id;
  const b = await request.json<any>();
  await env.DB.prepare(`
    UPDATE transactions SET category_id=?, description=?, amount=?, type=?, date=? WHERE id=? AND user_id=?
  `).bind(b.category_id || null, b.description, b.amount, b.type, b.date, id, userId).run();
  return Response.json({ ok: true });
};

export const onRequestDelete: PagesFunction<{ DB: D1Database }> = async ({ env, params, data }) => {
  const userId = (data as any).userId;
  await env.DB.prepare('DELETE FROM transactions WHERE id=? AND user_id=?').bind(params.id, userId).run();
  return Response.json({ ok: true });
};
'@

Write-Utf8File "functions/api/dashboard.ts" @'
export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env, data }) => {
  const userId = (data as any).userId;
  
  const [saldo, mensal, porCategoria, recentes] = await Promise.all([
    env.DB.prepare(`
      SELECT (SELECT COALESCE(SUM(initial_balance),0) FROM accounts) +
             COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END),0) AS balance
      FROM transactions WHERE user_id = ?
    `).bind(userId).first<{ balance: number }>(),
    env.DB.prepare(`
      SELECT strftime('%Y-%m', date) AS month,
             SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
             SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
      FROM transactions WHERE user_id = ? GROUP BY month ORDER BY month DESC LIMIT 12
    `).bind(userId).all(),
    env.DB.prepare(`
      SELECT c.name, c.color, SUM(t.amount) AS total
      FROM transactions t JOIN categories c ON c.id = t.category_id
      WHERE t.type='expense' AND t.user_id = ? AND strftime('%Y-%m', t.date)=strftime('%Y-%m','now')
      GROUP BY c.id ORDER BY total DESC
    `).bind(userId).all(),
    env.DB.prepare(`
      SELECT t.*, c.color AS category_color, c.name AS category_name
      FROM transactions t LEFT JOIN categories c ON c.id=t.category_id
      WHERE t.user_id = ? ORDER BY t.date DESC, t.id DESC LIMIT 10
    `).bind(userId).all(),
  ]);
  return Response.json({
    balance: saldo?.balance ?? 0,
    monthly: mensal.results.reverse(),
    byCategory: porCategoria.results,
    recent: recentes.results,
  });
};
'@

Write-Utf8File "functions/api/categories.ts" @'
export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  return Response.json(results);
};
'@

Write-Host ">>> [2/4] Atualizando Frontend (api.ts, App.tsx)..." -ForegroundColor Cyan

Write-Utf8File "src/api.ts" @'
const j = (r: Response) => { if (!r.ok) throw new Error(r.statusText); return r.json(); };
export const api = {
  list:     ()        => fetch('/api/transactions').then(j),
  create:   (tx: any) => fetch('/api/transactions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(tx) }).then(j),
  update:   (id: number, tx: any) => fetch(`/api/transactions/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(tx) }).then(j),
  remove:   (id: number) => fetch(`/api/transactions/${id}`, { method:'DELETE' }).then(j),
  dashboard:()        => fetch('/api/dashboard').then(j),
  categories:()       => fetch('/api/categories').then(j),
};
'@

Write-Utf8File "src/App.tsx" @'
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from './api';
import { useAuth } from './AuthContext';
import { LoginPage } from './LoginPage';

export default function App() {
  const { user, loading, logout } = useAuth();
  const qc = useQueryClient();

  const { data: dash } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard, enabled: !!user });
  const { data: txns } = useQuery({ queryKey: ['transactions'], queryFn: api.list, enabled: !!user });
  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: api.categories, enabled: !!user });

  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ description: '', amount: '', type: 'expense', category_id: '', date: new Date().toISOString().split('T')[0] });

  const saveTx = useMutation({
    mutationFn: (data: any) => editId ? api.update(editId, data) : api.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      setEditId(null);
      setForm({ description: '', amount: '', type: 'expense', category_id: '', date: new Date().toISOString().split('T')[0] });
    },
  });

  const deleteTx = useMutation({
    mutationFn: api.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  if (loading) return <div className="p-6 text-center">Carregando...</div>;
  if (!user) return <LoginPage />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount || !form.date) return;
    saveTx.mutate({ ...form, amount: Number(form.amount), account_id: 1, category_id: Number(form.category_id) || null });
  };

  const handleEdit = (t: any) => {
    setEditId(t.id);
    setForm({ description: t.description, amount: t.amount.toString(), type: t.type, category_id: t.category_id || '', date: t.date });
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white rounded-2xl p-6 shadow gap-4">
        <div>
          <span className="text-sm text-gray-500">Saldo atual</span>
          <div className="text-3xl font-bold">R$ {dash?.balance?.toFixed(2) ?? '0,00'}</div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 font-medium">{user.email}</span>
          <button onClick={logout} className="text-sm text-red-600 hover:underline font-semibold">Sair</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow">
          <h3 className="font-semibold mb-4">Receitas x Despesas (12 meses)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dash?.monthly ?? []}>
              <XAxis dataKey="month" /><YAxis /><Tooltip />
              <Bar dataKey="income" fill="#10b981" name="Receita" />
              <Bar dataKey="expense" fill="#ef4444" name="Despesa" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow">
          <h3 className="font-semibold mb-4">Despesas por categoria (mês)</h3>
          <ResponsiveContainer width="100%" height={260}>
            {dash?.byCategory && dash.byCategory.length > 0 ? (
              <PieChart>
                <Pie data={dash.byCategory} dataKey="total" nameKey="name" innerRadius={60}>
                  {dash.byCategory.map((c: any) => <Cell key={c.name} fill={c.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">Nenhuma despesa categorizada</div>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow grid md:grid-cols-8 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="text-xs text-gray-500">Descrição</label>
          <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded p-2" required />
        </div>
        <div>
          <label className="text-xs text-gray-500">Valor</label>
          <input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full border rounded p-2" required />
        </div>
        <div>
          <label className="text-xs text-gray-500">Tipo</label>
          <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border rounded p-2">
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-gray-500">Categoria</label>
          <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} className="w-full border rounded p-2">
            <option value="">Sem categoria</option>
            {cats?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Data</label>
          <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border rounded p-2" required />
        </div>
        <div>
          <button type="submit" className="w-full bg-indigo-600 text-white rounded p-2 hover:bg-indigo-700 font-medium">
            {editId ? 'Atualizar' : 'Lançar'}
          </button>
          {editId && <button type="button" onClick={() => { setEditId(null); setForm({ description: '', amount: '', type: 'expense', category_id: '', date: new Date().toISOString().split('T')[0] }); }} className="text-xs text-gray-500 w-full mt-1 hover:underline">Cancelar Edição</button>}
        </div>
      </form>

      <div className="bg-white rounded-2xl p-6 shadow">
        <h3 className="font-semibold mb-4">Últimos lançamentos</h3>
        <ul className="divide-y">
          {txns?.map((t: any) => (
            <li key={t.id} className="py-3 flex justify-between items-center group">
              <div className="flex flex-col">
                <span className="font-medium">{t.description}</span>
                {t.category_name && <span className="text-xs text-gray-500">{t.category_name}</span>}
              </div>
              <div className="flex items-center gap-4">
                <span className={t.type === 'income' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                </span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button onClick={() => handleEdit(t)} className="text-blue-500 hover:text-blue-700 text-sm">Editar</button>
                  <button onClick={() => { if(confirm('Excluir transação?')) deleteTx.mutate(t.id) }} className="text-red-500 hover:text-red-700 text-sm">Excluir</button>
                </div>
              </div>
            </li>
          ))}
          {(!txns || txns.length === 0) && <li className="py-3 text-gray-500 text-center">Nenhum lançamento ainda.</li>}
        </ul>
      </div>
    </div>
  );
}
'@

Write-Host ">>> [3/4] Criando arquivos PWA..." -ForegroundColor Cyan
$manifest = @"
{
  "name": "Finanças Open Finance",
  "short_name": "Finanças",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f3f4f6",
  "theme_color": "#4f46e5",
  "icons": [
    {
      "src": "https://cdn-icons-png.flaticon.com/512/2489/2489756.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
"@
Write-Utf8File "public/manifest.json" $manifest

if (Test-Path "index.html") {
    $html = Get-Content "index.html" -Raw
    if ($html -notmatch 'manifest.json') {
        $html = $html -replace '</head>', '<link rel="manifest" href="/manifest.json" />`n</head>'
        Write-Utf8File "index.html" $html
    }
}

Write-Host "`n>>> UPGRADE CONCLUIDO!" -ForegroundColor Green
Write-Host "Agora rode 'npm run deploy' para subir tudo!" -ForegroundColor Yellow