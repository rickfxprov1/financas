[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

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

Write-Host ">>> [1/5] Criando _utils.ts e Middleware..." -ForegroundColor Cyan

Write-Utf8File "functions/api/_utils.ts" @'
export async function sha256(text: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
  const hashArray = Array.from(new Uint8Array(derivedBits));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, originalHashHex] = storedHash.split(':');
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === originalHashHex;
}
'@

Write-Utf8File "functions/api/_middleware.ts" @'
import { sha256 } from './_utils';

export const onRequest: PagesFunction<{ DB: D1Database }> = async (context) => {
  const url = new URL(context.request.url);
  if (url.pathname.startsWith('/api/auth/')) {
    return context.next();
  }

  const cookie = context.request.headers.get('Cookie') || '';
  const match = cookie.match(/session=([^;]+)/);
  if (!match) {
    return new Response('Não autorizado', { status: 401 });
  }

  const tokenHash = await sha256(match[1]);
  const session = await context.env.DB.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .bind(tokenHash, Date.now()).first();

  if (!session) {
    return new Response('Sessão inválida ou expirada', { status: 401 });
  }

  return context.next();
};
'@

Write-Host ">>> [2/5] Criando rotas de Auth (Register, Login, Logout, Me)..." -ForegroundColor Cyan

Write-Utf8File "functions/api/auth/register.ts" @'
import { hashPassword } from '../_utils';

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const { email, password } = await request.json<any>();
  if (!email || !password) return new Response('Email e senha são obrigatórios', { status: 400 });

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return new Response('Email já cadastrado', { status: 409 });

  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();

  await env.DB.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .bind(userId, email, passwordHash, Date.now()).run();

  return new Response(JSON.stringify({ id: userId, email }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
'@

Write-Utf8File "functions/api/auth/login.ts" @'
import { verifyPassword, sha256 } from '../_utils';

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const { email, password } = await request.json<any>();
  if (!email || !password) return new Response('Email e senha são obrigatórios', { status: 400 });

  const user = await env.DB.prepare('SELECT id, password_hash FROM users WHERE email = ?').bind(email).first();
  if (!user) return new Response('Credenciais inválidas', { status: 401 });

  const isValid = await verifyPassword(password, user.password_hash as string);
  if (!isValid) return new Response('Credenciais inválidas', { status: 401 });

  const sessionToken = crypto.randomUUID();
  const tokenHash = await sha256(sessionToken);
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 dias

  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(tokenHash, user.id, expiresAt).run();

  const cookie = `session=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`;

  return new Response(JSON.stringify({ id: user.id, email }), {
    status: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie }
  });
};
'@

Write-Utf8File "functions/api/auth/logout.ts" @'
import { sha256 } from '../_utils';

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/session=([^;]+)/);
  if (match) {
    const tokenHash = await sha256(match[1]);
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
  }
  const expiredCookie = `session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
  return new Response('Logout realizado', { status: 200, headers: { 'Set-Cookie': expiredCookie } });
};
'@

Write-Utf8File "functions/api/auth/me.ts" @'
import { sha256 } from '../_utils';

export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return new Response('Não autenticado', { status: 401 });

  const tokenHash = await sha256(match[1]);
  const session = await env.DB.prepare(`
    SELECT u.id, u.email FROM sessions s JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).bind(tokenHash, Date.now()).first();

  if (!session) return new Response('Sessão inválida', { status: 401 });

  return new Response(JSON.stringify(session), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
'@

Write-Host ">>> [3/5] Criando AuthContext.tsx..." -ForegroundColor Cyan

Write-Utf8File "src/AuthContext.tsx" @'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AuthContextType {
  user: { id: string; email: string } | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => { setUser(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await res.text());
    const userData = await res.json();
    setUser(userData);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const register = async (email: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await res.text());
    await login(email, password);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
'@

Write-Host ">>> [4/5] Criando LoginPage.tsx..." -ForegroundColor Cyan

Write-Utf8File "src/LoginPage.tsx" @'
import { useState } from 'react';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center">Gerenciador Financeiro</h2>
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border rounded p-2"
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border rounded p-2"
            required
          />
          <button type="submit" className="w-full bg-indigo-600 text-white rounded p-2 hover:bg-indigo-700">
            {isRegister ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>
        <button
          onClick={() => { setIsRegister(!isRegister); setError(''); }}
          className="mt-4 text-sm text-indigo-600 hover:underline w-full text-center"
        >
          {isRegister ? 'Já tenho conta' : 'Criar conta'}
        </button>
      </div>
    </div>
  );
}
'@

Write-Host ">>> [5/5] Atualizando main.tsx e App.tsx..." -ForegroundColor Cyan

Write-Utf8File "src/main.tsx" @'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthContext';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
'@

Write-Utf8File "src/App.tsx" @'
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

  const addTx = useMutation({
    mutationFn: api.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  if (loading) return <div className="p-6 text-center">Carregando...</div>;
  if (!user) return <LoginPage />;

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
      <div className="flex justify-between items-center bg-white rounded-2xl p-6 shadow">
        <div>
          <span className="text-sm text-gray-500">Saldo atual</span>
          <div className="text-3xl font-bold">R$ {dash?.balance?.toFixed(2) ?? '0,00'}</div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.email}</span>
          <button onClick={logout} className="text-sm text-red-600 hover:underline font-medium">Sair</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow">
          <h3 className="font-semibold mb-4">Receitas x Despesas (12 meses)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dash?.monthly ?? []}>
              <XAxis dataKey="month" /><YAxis /><Tooltip />
              <Bar dataKey="income"  fill="#10b981" name="Receita" />
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

Write-Host "`n>>> ARQUIVOS DE AUTENTICACAO CRIADOS COM SUCESSO!" -ForegroundColor Green