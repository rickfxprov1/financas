# ============================================================
#  TERMINA SETUP FINANCAS v3 - à prova de colchetes e encoding
#  Salve em: C:\Users\RickFX\Downloads\Gerenciador Financeiro\financas
# ============================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

if (-not (Test-Path "package.json")) {
    Write-Error "Rode este script DENTRO da pasta 'financas'."
    exit 1
}
Write-Host "Diretorio: $(Get-Location)" -ForegroundColor Cyan

# Funcao robusta (lida com [id] no path e escreve UTF-8 sem BOM)
function Write-Utf8File {
    param([string]$Path, [string]$Content)
    $fullPath = [System.IO.Path]::Combine((Get-Location).Path, $Path)
    $dir = Split-Path -Parent $fullPath
    if ($dir -and -not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    [System.IO.File]::WriteAllText($fullPath, $Content, [System.Text.UTF8Encoding]::new($false))
}

# ---- [1/4] Identificar banco ----
Write-Host "`n>>> [1/4] Identificando banco D1..." -ForegroundColor Cyan
$DatabaseId = $null
$listRaw = & npx wrangler d1 list --json 2>&1 | Out-String
$jsonStart = $listRaw.IndexOf('[')
if ($jsonStart -ge 0) {
    try {
        $dbs = $listRaw.Substring($jsonStart) | ConvertFrom-Json
        $match = $dbs | Where-Object { $_.name -eq 'financas-db' }
        if ($match) { $DatabaseId = $match.uuid }
    } catch {}
}
if (-not $DatabaseId) { $DatabaseId = "a9f67ddb-774c-4955-b3f3-c3910f0c096e" }
Write-Host "Banco: financas-db ($DatabaseId)" -ForegroundColor Green

# ---- [2/4] Garantir wrangler.toml e dependencias ----
Write-Host "`n>>> [2/4] Configurando wrangler.toml e dependencias..." -ForegroundColor Cyan
$wranglerContent = @"
name = "financas"
compatibility_date = "2026-01-01"
pages_build_output_dir = "./dist"

[[d1_databases]]
binding = "DB"
database_name = "financas-db"
database_id = "$DatabaseId"
"@
Write-Utf8File "wrangler.toml" $wranglerContent
Write-Host "wrangler.toml OK" -ForegroundColor Green

$pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
$needInstall = $false
if (-not $pkg.dependencies.recharts) { $needInstall = $true }
if (-not $pkg.dependencies.'@tanstack/react-query') { $needInstall = $true }
if ($needInstall) {
    Write-Host "Instalando recharts e @tanstack/react-query..." -ForegroundColor Gray
    npm install recharts @tanstack/react-query
} else {
    Write-Host "Dependencias ja instaladas. Pulando." -ForegroundColor Green
}

# ---- [3/4] Functions (API) ----
Write-Host "`n>>> [3/4] Criando arquivos de API..." -ForegroundColor Cyan

Write-Utf8File "functions/api/transactions.ts" @'
export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env }) => {
  const { results } = await env.DB.prepare(`
    SELECT t.*, c.name AS category_name, c.color AS category_color, a.name AS account_name
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN accounts a ON a.id = t.account_id
    ORDER BY t.date DESC, t.id DESC LIMIT 500
  `).all();
  return Response.json(results);
};
export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const b = await request.json<any>();
  if (!b.description || !b.amount || !b.date || !b.type || !b.account_id) {
    return Response.json({ error: 'Campos obrigatorios faltando' }, { status: 400 });
  }
  const r = await env.DB.prepare(`
    INSERT INTO transactions (account_id, category_id, description, amount, type, date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(b.account_id, b.category_id ?? null, b.description, b.amount, b.type, b.date).run();
  return Response.json({ id: r.meta.last_row_id }, { status: 201 });
};
'@

Write-Utf8File "functions/api/transactions/[id].ts" @'
export const onRequestPut: PagesFunction<{ DB: D1Database }> = async ({ request, env, params }) => {
  const id = params.id;
  const b = await request.json<any>();
  await env.DB.prepare(`
    UPDATE transactions SET account_id=?, category_id=?, description=?, amount=?, type=?, date=? WHERE id=?
  `).bind(b.account_id, b.category_id ?? null, b.description, b.amount, b.type, b.date, id).run();
  return Response.json({ ok: true });
};
export const onRequestDelete: PagesFunction<{ DB: D1Database }> = async ({ env, params }) => {
  await env.DB.prepare('DELETE FROM transactions WHERE id=?').bind(params.id).run();
  return Response.json({ ok: true });
};
'@

Write-Utf8File "functions/api/dashboard.ts" @'
export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env }) => {
  const [saldo, mensal, porCategoria, recentes] = await Promise.all([
    env.DB.prepare(`
      SELECT (SELECT COALESCE(SUM(initial_balance),0) FROM accounts) +
             COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END),0) AS balance
      FROM transactions
    `).first<{ balance: number }>(),
    env.DB.prepare(`
      SELECT strftime('%Y-%m', date) AS month,
             SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
             SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
      FROM transactions GROUP BY month ORDER BY month DESC LIMIT 12
    `).all(),
    env.DB.prepare(`
      SELECT c.name, c.color, SUM(t.amount) AS total
      FROM transactions t JOIN categories c ON c.id = t.category_id
      WHERE t.type='expense' AND strftime('%Y-%m', t.date)=strftime('%Y-%m','now')
      GROUP BY c.id ORDER BY total DESC
    `).all(),
    env.DB.prepare(`
      SELECT t.*, c.color AS category_color, c.name AS category_name
      FROM transactions t LEFT JOIN categories c ON c.id=t.category_id
      ORDER BY t.date DESC, t.id DESC LIMIT 10
    `).all(),
  ]);
  return Response.json({
    balance: saldo?.balance ?? 0,
    monthly: mensal.results.reverse(),
    byCategory: porCategoria.results,
    recent: recentes.results,
  });
};
'@
Write-Host "3 arquivos de API criados." -ForegroundColor Green

# ---- [4/4] Frontend ----
Write-Host "`n>>> [4/4] Criando arquivos do frontend..." -ForegroundColor Cyan

Write-Utf8File "src/api.ts" @'
const j = (r: Response) => { if (!r.ok) throw new Error(r.statusText); return r.json(); };
export const api = {
  list:     ()        => fetch('/api/transactions').then(j),
  create:   (tx: any) => fetch('/api/transactions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(tx) }).then(j),
  update:   (id: number, tx: any) => fetch(`/api/transactions/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(tx) }).then(j),
  remove:   (id: number) => fetch(`/api/transactions/${id}`, { method:'DELETE' }).then(j),
  dashboard:()        => fetch('/api/dashboard').then(j),
};
'@

Write-Utf8File "src/App.tsx" @'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from './api';

export default function App() {
  const qc = useQueryClient();
  const { data: dash } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard });
  const { data: txns } = useQuery({ queryKey: ['transactions'], queryFn: api.list });
  const addTx = useMutation({
    mutationFn: api.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    addTx.mutate({
      description: f.get('description'),
      amount: Number(f.get('amount')),
      type: f.get('type'),
      date: f.get('date'),
      account_id: 1,
      category_id: Number(f.get('category_id')) || null,
    });
    e.currentTarget.reset();
  };
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow">
        <span className="text-sm text-gray-500">Saldo atual</span>
        <div className="text-3xl font-bold">R$ {dash?.balance?.toFixed(2) ?? '0,00'}</div>
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
          <h3 className="font-semibold mb-4">Despesas por categoria (mes)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={dash?.byCategory ?? []} dataKey="total" nameKey="name" innerRadius={60}>
                {dash?.byCategory?.map((c: any) => <Cell key={c.name} fill={c.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow grid md:grid-cols-6 gap-3">
        <input name="description" placeholder="Descricao" className="border rounded p-2 md:col-span-2" required />
        <input name="amount" type="number" step="0.01" placeholder="Valor" className="border rounded p-2" required />
        <select name="type" className="border rounded p-2">
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
        </select>
        <input name="date" type="date" className="border rounded p-2" required />
        <button className="bg-indigo-600 text-white rounded p-2 hover:bg-indigo-700">Lancar</button>
      </form>
      <div className="bg-white rounded-2xl p-6 shadow">
        <h3 className="font-semibold mb-4">Ultimos lancamentos</h3>
        <ul className="divide-y">
          {txns?.map((t: any) => (
            <li key={t.id} className="py-2 flex justify-between">
              <span>{t.description}</span>
              <span className={t.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
'@

Write-Utf8File "src/main.tsx" @'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
const queryClient = new QueryClient();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
  </React.StrictMode>
);
'@

Write-Utf8File "src/index.css" "body { margin: 0; background: #f3f4f6; font-family: system-ui, sans-serif; }`n"

# Tailwind via CDN
if (Test-Path "index.html") {
    $html = Get-Content "index.html" -Raw
    if ($html -notmatch 'cdn.tailwindcss.com') {
        $html = $html -replace '</head>', '<script src="https://cdn.tailwindcss.com"></script></head>'
        Write-Utf8File "index.html" $html
        Write-Host "Tailwind CDN adicionado ao index.html" -ForegroundColor Green
    } else {
        Write-Host "Tailwind CDN ja presente." -ForegroundColor Green
    }
}

Write-Host "`n>>> TUDO PRONTO!" -ForegroundColor Green
Write-Host ""
Write-Host "Agora rode:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "E abra http://localhost:5173 no navegador." -ForegroundColor Yellow