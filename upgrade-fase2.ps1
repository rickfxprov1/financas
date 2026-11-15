[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if (-not (Test-Path "package.json")) {
    Write-Error "Rode este script DENTRO da pasta 'financas'."
    exit 1
}

function Write-Utf8File {
    param([string]$Path, [string]$Content)
    $fullPath = [System.IO.Path]::Combine((Get-Location).Path, $Path)
    $dir = Split-Path -Parent $fullPath
    if ($dir -and -not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    [System.IO.File]::WriteAllText($fullPath, $Content, [System.Text.UTF8Encoding]::new($false))
}

Write-Host ">>> [1/6] Criando tabela de Orçamentos no Banco de Dados..." -ForegroundColor Cyan
$migration = @"
CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  amount REAL NOT NULL,
  UNIQUE(user_id, category_id, month)
);
"@
Write-Utf8File "migration3.sql" $migration

# O "2>&1 | Out-Null" evita que o PowerShell trave com os avisos do Wrangler
& npx wrangler d1 execute financas-db --local --file=./migration3.sql 2>&1 | Out-Null
& npx wrangler d1 execute financas-db --remote --file=./migration3.sql 2>&1 | Out-Null

Write-Host ">>> [2/6] Atualizando API (Filtros, Orçamentos e Importação)..." -ForegroundColor Cyan

# Atualiza Transações (Filtros de data)
Write-Utf8File "functions/api/transactions.ts" @'
export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const url = new URL(request.url);
  const start = url.searchParams.get('start') || '1900-01-01';
  const end = url.searchParams.get('end') || '2100-01-01';

  const { results } = await env.DB.prepare(`
    SELECT t.*, c.name AS category_name, c.color AS category_color
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ? AND t.date >= ? AND t.date <= ?
    ORDER BY t.date DESC, t.id DESC LIMIT 500
  `).bind(userId, start, end).all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const b = await request.json<any>();
  const r = await env.DB.prepare(`
    INSERT INTO transactions (user_id, account_id, category_id, description, amount, type, date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(userId, b.account_id || 1, b.category_id || null, b.description, b.amount, b.type, b.date).run();
  return Response.json({ id: r.meta.last_row_id }, { status: 201 });
};
'@

# Atualiza Dashboard (Filtros + Orçamentos)
Write-Utf8File "functions/api/dashboard.ts" @'
export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const url = new URL(request.url);
  const start = url.searchParams.get('start') || '1900-01-01';
  const end = url.searchParams.get('end') || '2100-01-01';
  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);

  const [saldo, mensal, porCategoria, recentes, budgets] = await Promise.all([
    env.DB.prepare(`
      SELECT (SELECT COALESCE(SUM(initial_balance),0) FROM accounts) +
             COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END),0) AS balance
      FROM transactions WHERE user_id = ? AND date >= ? AND date <= ?
    `).bind(userId, start, end).first<{ balance: number }>(),
    env.DB.prepare(`
      SELECT strftime('%Y-%m', date) AS month,
             SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
             SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
      FROM transactions WHERE user_id = ? AND date >= ? AND date <= ?
      GROUP BY month ORDER BY month ASC
    `).bind(userId, start, end).all(),
    env.DB.prepare(`
      SELECT c.name, c.color, SUM(t.amount) AS total
      FROM transactions t JOIN categories c ON c.id = t.category_id
      WHERE t.type='expense' AND t.user_id = ? AND t.date >= ? AND t.date <= ?
      GROUP BY c.id ORDER BY total DESC
    `).bind(userId, start, end).all(),
    env.DB.prepare(`
      SELECT t.*, c.color AS category_color, c.name AS category_name
      FROM transactions t LEFT JOIN categories c ON c.id=t.category_id
      WHERE t.user_id = ? AND t.date >= ? AND t.date <= ? ORDER BY t.date DESC LIMIT 10
    `).bind(userId, start, end).all(),
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
'@

# Rota de Orçamentos
Write-Utf8File "functions/api/budgets.ts" @'
export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const b = await request.json<any>();
  await env.DB.prepare(`
    INSERT INTO budgets (user_id, category_id, month, amount) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, category_id, month) DO UPDATE SET amount = excluded.amount
  `).bind(userId, b.category_id, b.month, b.amount).run();
  return Response.json({ ok: true }, { status: 201 });
};
'@

# Rota de Importação CSV
Write-Utf8File "functions/api/import.ts" @'
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
'@

Write-Host ">>> [3/6] Atualizando src/api.ts..." -ForegroundColor Cyan
Write-Utf8File "src/api.ts" @'
const j = (r: Response) => { if (!r.ok) throw new Error(r.statusText); return r.json(); };

export const api = {
  list:     (filter: string = '') => fetch(`/api/transactions${filter}`).then(j),
  create:   (tx: any) => fetch('/api/transactions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(tx) }).then(j),
  update:   (id: number, tx: any) => fetch(`/api/transactions/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(tx) }).then(j),
  remove:   (id: number) => fetch(`/api/transactions/${id}`, { method:'DELETE' }).then(j),
  dashboard:(filter: string = '') => fetch(`/api/dashboard${filter}`).then(j),
  categories:() => fetch('/api/categories').then(j),
  setBudget:(data: any) => fetch('/api/budgets', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).then(j),
  importCSV:(csvData: string) => fetch('/api/import', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ csvData }) }).then(j),
};
'@

Write-Host ">>> [4/6] Criando Componentes de Orçamento e Importação..." -ForegroundColor Cyan

Write-Utf8File "src/BudgetsModal.tsx" @'
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import toast from 'react-hot-toast';

export function BudgetsModal({ onClose, cats }: { onClose: () => void, cats: any[] }) {
  const qc = useQueryClient();
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const month = new Date().toISOString().slice(0, 7);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount) return;
    await api.setBudget({ category_id: Number(categoryId), amount: Number(amount), month });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    toast.success('Orçamento salvo!');
    setAmount('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-xl font-bold mb-4">Definir Orçamento</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full border p-2 rounded" required>
            <option value="">Escolha a categoria</option>
            {cats?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="number" step="0.01" placeholder="Limite Mensal (R$)" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border p-2 rounded" required />
          <button type="submit" className="w-full bg-indigo-600 text-white rounded p-2 hover:bg-indigo-700 font-medium">Salvar Orçamento</button>
        </form>
        <button onClick={onClose} className="w-full mt-2 text-gray-500 hover:underline text-sm">Fechar</button>
      </div>
    </div>
  );
}
'@

Write-Utf8File "src/ImportModal.tsx" @'
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import toast from 'react-hot-toast';

export function ImportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');

  const handleImport = async () => {
    if (!text.trim()) return;
    const res = await api.importCSV(text);
    if (res.imported > 0) {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`${res.imported} transações importadas!`);
      onClose();
    } else {
      toast.error('Nenhuma transação válida encontrada.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <h2 className="text-xl font-bold mb-2">Importar CSV</h2>
        <p className="text-xs text-gray-500 mb-4">Formato exigido: <code>Data,Descrição,Valor,Tipo</code> (Ex: 2026-11-15,Almoço,25.50,expense)</p>
        
        <textarea 
          value={text} onChange={e => setText(e.target.value)} 
          className="w-full border p-2 rounded h-40 font-mono text-sm mb-4" 
          placeholder="2026-11-15,Almoço,25.50,expense"
        />
        
        <div className="flex gap-2">
          <button onClick={handleImport} className="flex-1 bg-green-600 text-white rounded p-2 hover:bg-green-700 font-medium">Importar</button>
          <button onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 rounded p-2 hover:bg-gray-300 font-medium">Cancelar</button>
        </div>
      </div>
    </div>
  );
}
'@

Write-Host ">>> [5/6] Criando App.tsx final com Filtros e Orçamentos..." -ForegroundColor Cyan
Write-Utf8File "src/App.tsx" @'
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { api } from './api';
import { useAuth } from './AuthContext';
import { LoginPage } from './LoginPage';
import { ManageCategories } from './ManageCategories';
import { ChangePassword } from './ChangePassword';
import { BudgetsModal } from './BudgetsModal';
import { ImportModal } from './ImportModal';

export default function App() {
  const { user, loading, logout } = useAuth();
  const qc = useQueryClient();

  const [showCats, setShowCats] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [showImport, setShowImport] = useState(false);
  
  const [period, setPeriod] = useState('this_month');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ description: '', amount: '', type: 'expense', category_id: '', date: new Date().toISOString().split('T')[0] });

  // Calcula as datas baseadas no filtro selecionado
  const getFilterDates = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    if (period === 'this_month') {
      const start = new Date(y, m, 1).toISOString().split('T')[0];
      const end = new Date(y, m + 1, 0).toISOString().split('T')[0];
      return { start, end, month: start.slice(0, 7) };
    } else if (period === 'last_month') {
      const start = new Date(y, m - 1, 1).toISOString().split('T')[0];
      const end = new Date(y, m, 0).toISOString().split('T')[0];
      return { start, end, month: start.slice(0, 7) };
    } else if (period === 'this_year') {
      return { start: `${y}-01-01`, end: `${y}-12-31`, month: `${y}-01` };
    }
    return { start: '1900-01-01', end: '2100-01-01', month: now.toISOString().slice(0, 7) };
  };

  const dates = getFilterDates();
  const filterQuery = `?start=${dates.start}&end=${dates.end}&month=${dates.month}`;

  const { data: dash } = useQuery({ queryKey: ['dashboard', filterQuery], queryFn: () => api.dashboard(filterQuery), enabled: !!user });
  const { data: txns } = useQuery({ queryKey: ['transactions', filterQuery], queryFn: () => api.list(filterQuery), enabled: !!user });
  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: api.categories, enabled: !!user });

  const saveTx = useMutation({
    mutationFn: (data: any) => editId ? api.update(editId, data) : api.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      setEditId(null);
      setForm({ description: '', amount: '', type: 'expense', category_id: '', date: new Date().toISOString().split('T')[0] });
      toast.success(editId ? 'Atualizado!' : 'Lançado!');
    },
  });

  const deleteTx = useMutation({
    mutationFn: api.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Excluído!');
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
      {showCats && <ManageCategories onClose={() => setShowCats(false)} />}
      {showPass && <ChangePassword onClose={() => setShowPass(false)} />}
      {showBudget && <BudgetsModal onClose={() => setShowBudget(false)} cats={cats || []} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white rounded-2xl p-6 shadow gap-4">
        <div>
          <span className="text-sm text-gray-500">Saldo no período</span>
          <div className="text-3xl font-bold">R$ {dash?.balance?.toFixed(2) ?? '0,00'}</div>
        </div>
        
        {/* Filtro de Período */}
        <div className="flex flex-wrap items-center gap-4">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="border rounded p-1 text-sm font-medium text-gray-700 bg-gray-50">
            <option value="this_month">Este Mês</option>
            <option value="last_month">Mês Passado</option>
            <option value="this_year">Este Ano</option>
            <option value="all">Todo o Período</option>
          </select>

          <div className="h-6 w-px bg-gray-300 hidden md:block"></div>
          <button onClick={() => setShowCats(true)} className="text-sm text-indigo-600 font-medium hover:underline">Categorias</button>
          <button onClick={() => setShowBudget(true)} className="text-sm text-indigo-600 font-medium hover:underline">Orçamentos</button>
          <button onClick={() => setShowImport(true)} className="text-sm text-indigo-600 font-medium hover:underline">Importar</button>
          <button onClick={() => setShowPass(true)} className="text-sm text-indigo-600 font-medium hover:underline">Senha</button>
          <button onClick={logout} className="text-sm text-red-600 hover:underline font-semibold">Sair</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow">
          <h3 className="font-semibold mb-4">Receitas x Despesas</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dash?.monthly ?? []}>
              <XAxis dataKey="month" /><YAxis /><Tooltip />
              <Bar dataKey="income" fill="#10b981" name="Receita" />
              <Bar dataKey="expense" fill="#ef4444" name="Despesa" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow">
          <h3 className="font-semibold mb-4">Despesas por categoria</h3>
          {dash?.byCategory && dash.byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={dash.byCategory} dataKey="total" nameKey="name" innerRadius={60}>
                  {dash.byCategory.map((c: any) => <Cell key={c.name} fill={c.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] items-center justify-center text-gray-400">Nenhuma despesa</div>
          )}
        </div>
      </div>

      {/* Orçamentos */}
      {dash?.budgets && dash.budgets.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow">
          <h3 className="font-semibold mb-4">Seus Orçamentos (Mês Atual)</h3>
          <div className="space-y-4">
            {dash.budgets.map((b: any) => {
              const perc = Math.min((b.spent / b.budget_amount) * 100, 100);
              return (
                <div key={b.category_id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{b.name}</span>
                    <span className="text-gray-500">R$ {b.spent.toFixed(2)} / R$ {b.budget_amount.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full ${perc >= 100 ? 'bg-red-500' : perc >= 80 ? 'bg-orange-400' : 'bg-green-500'}`} style={{ width: `${perc}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          <button type="submit" className="w-full bg-indigo-600 text-white rounded p-2 hover:bg-indigo-700 font-medium transition-colors">
            {editId ? 'Atualizar' : 'Lançar'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-2xl p-6 shadow">
        <h3 className="font-semibold mb-4">Lançamentos do período</h3>
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
                  <button onClick={() => handleEdit(t)} className="text-blue-500 hover:text-blue-700 text-sm font-medium">Editar</button>
                  <button onClick={() => { if(confirm('Excluir transação?')) deleteTx.mutate(t.id) }} className="text-red-500 hover:text-red-700 text-sm font-medium">Excluir</button>
                </div>
              </div>
            </li>
          ))}
          {(!txns || txns.length === 0) && <li className="py-3 text-gray-500 text-center">Nenhum lançamento neste período.</li>}
        </ul>
      </div>
    </div>
  );
}
'@

Write-Host "`n>>> UPGRADE FASE 2 CONCLUIDO!" -ForegroundColor Green
Write-Host "Agora rode 'npm run deploy'." -ForegroundColor Yellow