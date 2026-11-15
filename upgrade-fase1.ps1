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

Write-Host ">>> [1/5] Garantindo dependencias..." -ForegroundColor Cyan
npm install react-hot-toast

Write-Host ">>> [2/5] Criando Backend (Categorias e Trocar Senha)..." -ForegroundColor Cyan

Write-Utf8File "functions/api/categories.ts" @'
export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env, data }) => {
  const userId = (data as any).userId;
  const { results } = await env.DB.prepare('SELECT * FROM categories WHERE user_id = ? OR user_id IS NULL ORDER BY name ASC').bind(userId).all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env, data }) => {
  const userId = (data as any).userId;
  const b = await request.json<any>();
  const r = await env.DB.prepare('INSERT INTO categories (user_id, name, type, color) VALUES (?, ?, ?, ?)')
    .bind(userId, b.name, b.type || 'expense', b.color || '#6366f1').run();
  return Response.json({ id: r.meta.last_row_id }, { status: 201 });
};
'@

Write-Utf8File "functions/api/categories/[id].ts" @'
export const onRequestDelete: PagesFunction<{ DB: D1Database }> = async ({ env, params, data }) => {
  const userId = (data as any).userId;
  await env.DB.prepare('DELETE FROM categories WHERE id=? AND user_id=?').bind(params.id, userId).run();
  return Response.json({ ok: true });
};
'@

Write-Utf8File "functions/api/auth/password.ts" @'
import { verifyPassword, hashPassword, sha256 } from '../_utils';

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return new Response('Não autorizado', { status: 401 });

  const tokenHash = await sha256(match[1]);
  const session = await env.DB.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?').bind(tokenHash, Date.now()).first();
  if (!session) return new Response('Sessão inválida', { status: 401 });

  const { currentPassword, newPassword } = await request.json<any>();
  const user = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(session.user_id).first();
  
  const isValid = await verifyPassword(currentPassword, user.password_hash as string);
  if (!isValid) return new Response('Senha atual incorreta', { status: 400 });

  const newHash = await hashPassword(newPassword);
  await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, session.user_id).run();
  return new Response('Senha atualizada', { status: 200 });
};
'@

Write-Host ">>> [3/5] Criando Componentes React (Modais)..." -ForegroundColor Cyan

Write-Utf8File "src/ManageCategories.tsx" @'
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export function ManageCategories({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [color, setColor] = useState('#6366f1');

  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: () => fetch('/api/categories').then(r => r.json()) });

  const addCat = useMutation({
    mutationFn: (newCat: any) => fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCat) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria criada!');
      setName('');
    }
  });

  const delCat = useMutation({
    mutationFn: (id: number) => fetch(`/api/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria excluída!');
    }
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold mb-4">Gerenciar Categorias</h2>
        
        <form onSubmit={e => { e.preventDefault(); addCat.mutate({ name, type, color }); }} className="flex gap-2 mb-6">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nova categoria" className="border p-2 rounded flex-1" required />
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-10 p-0 border-0 rounded cursor-pointer" />
          <button type="submit" className="bg-indigo-600 text-white px-4 rounded hover:bg-indigo-700">+</button>
        </form>

        <ul className="max-h-60 overflow-y-auto divide-y mb-4">
          {cats?.map((c: any) => (
            <li key={c.id} className="py-2 flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: c.color }}></span>
                {c.name}
              </span>
              <button onClick={() => delCat.mutate(c.id)} className="text-red-500 text-sm hover:underline">Excluir</button>
            </li>
          ))}
        </ul>

        <button onClick={onClose} className="w-full bg-gray-200 text-gray-800 rounded p-2 hover:bg-gray-300 font-medium">Fechar</button>
      </div>
    </div>
  );
}
'@

Write-Utf8File "src/ChangePassword.tsx" @'
import { useState } from 'react';
import toast from 'react-hot-toast';

export function ChangePassword({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: newPass })
    });
    if (res.ok) {
      toast.success('Senha alterada com sucesso!');
      onClose();
    } else {
      toast.error(await res.text());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-xl font-bold mb-4">Trocar Senha</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" placeholder="Senha Atual" value={current} onChange={e => setCurrent(e.target.value)} className="w-full border p-2 rounded" required />
          <input type="password" placeholder="Nova Senha" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full border p-2 rounded" required />
          <button type="submit" className="w-full bg-indigo-600 text-white rounded p-2 hover:bg-indigo-700 font-medium">Salvar</button>
        </form>
        <button onClick={onClose} className="w-full mt-2 text-gray-500 hover:underline text-sm">Cancelar</button>
      </div>
    </div>
  );
}
'@

Write-Host ">>> [4/5] Atualizando main.tsx (Toaster)..." -ForegroundColor Cyan
Write-Utf8File "src/main.tsx" @'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './AuthContext';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster position="bottom-right" />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
'@

Write-Host ">>> [5/5] Atualizando App.tsx (Botões e Exportar CSV)..." -ForegroundColor Cyan
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

export default function App() {
  const { user, loading, logout } = useAuth();
  const qc = useQueryClient();

  const [showCats, setShowCats] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ description: '', amount: '', type: 'expense', category_id: '', date: new Date().toISOString().split('T')[0] });

  const { data: dash } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard, enabled: !!user });
  const { data: txns } = useQuery({ queryKey: ['transactions'], queryFn: api.list, enabled: !!user });
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

  const exportCSV = () => {
    if (!txns) return;
    const headers = ['Data', 'Descrição', 'Valor', 'Tipo', 'Categoria'];
    const rows = txns.map((t: any) => [t.date, t.description, t.amount, t.type === 'income' ? 'Receita' : 'Despesa', t.category_name || 'Sem categoria']);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'financas.csv';
    link.click();
    toast.success('CSV exportado!');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {showCats && <ManageCategories onClose={() => setShowCats(false)} />}
      {showPass && <ChangePassword onClose={() => setShowPass(false)} />}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white rounded-2xl p-6 shadow gap-4">
        <div>
          <span className="text-sm text-gray-500">Saldo atual</span>
          <div className="text-3xl font-bold">R$ {dash?.balance?.toFixed(2) ?? '0,00'}</div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={() => setShowCats(true)} className="text-sm text-indigo-600 font-medium hover:underline">Categorias</button>
          <button onClick={() => setShowPass(true)} className="text-sm text-indigo-600 font-medium hover:underline">Trocar Senha</button>
          <button onClick={exportCSV} className="text-sm text-green-600 font-medium hover:underline">Exportar CSV</button>
          <div className="h-6 w-px bg-gray-300 hidden md:block"></div>
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
            <div className="flex h-[260px] items-center justify-center text-gray-400">Nenhuma despesa categorizada</div>
          )}
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
          <button type="submit" className="w-full bg-indigo-600 text-white rounded p-2 hover:bg-indigo-700 font-medium transition-colors">
            {editId ? 'Atualizar' : 'Lançar'}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm({ description: '', amount: '', type: 'expense', category_id: '', date: new Date().toISOString().split('T')[0] }); }} className="text-xs text-gray-500 w-full mt-1 hover:underline">Cancelar Edição</button>
          )}
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
                  <button onClick={() => handleEdit(t)} className="text-blue-500 hover:text-blue-700 text-sm font-medium">Editar</button>
                  <button onClick={() => { if(confirm('Excluir transação?')) deleteTx.mutate(t.id) }} className="text-red-500 hover:text-red-700 text-sm font-medium">Excluir</button>
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

Write-Host "`n>>> ARQUIVOS DA FASE 1 CRIADOS!" -ForegroundColor Green
Write-Host "Agora rode 'npm run deploy'." -ForegroundColor Yellow