import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line, Legend } from 'recharts';
import toast from 'react-hot-toast';
import { api } from './api';
import { useAuth } from './AuthContext';
import { LoginPage } from './LoginPage';
import { ManageCategories } from './ManageCategories';
import { ChangePassword } from './ChangePassword';
import { BudgetsModal } from './BudgetsModal';
import { ImportModal } from './ImportModal';
import { AboutModal } from './AboutModal';
import { HelpModal } from './HelpModal';
import { ManageAccounts } from './ManageAccounts';
import { ProfileModal } from './ProfileModal';

export default function App() {
  const { user, loading, logout } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const [showCats, setShowCats] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [period, setPeriod] = useState('this_month');
  const currentYear = new Date().getFullYear();
  const [chartYear, setChartYear] = useState(currentYear);
  const [editId, setEditId] = useState<number | null>(null);
  
  const [form, setForm] = useState({ description: '', amount: '', type: 'expense', category_id: '', account_id: '', date: new Date().toISOString().split('T')[0] });
  
  const [time, setTime] = useState(new Date());

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    const timer = setTimeout(() => {
      // @ts-ignore
      if(window.lucide) window.lucide.createIcons();
    }, 10);
    return () => clearTimeout(timer);
  });

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowMenu(false); setShowCats(false); setShowPass(false); setShowBudget(false); setShowImport(false); setShowAbout(false); setShowHelp(false); setShowAccounts(false); setShowProfile(false);
  }, [user]);

  const getGreeting = () => {
    const hour = time.getHours();
    if (hour >= 0 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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

  const { data: dash, isFetching: isDashLoading } = useQuery({ queryKey: ['dashboard', filterQuery], queryFn: () => api.dashboard(filterQuery), enabled: !!user });
  const { data: txns, isFetching: isTxnsLoading } = useQuery({ queryKey: ['transactions', filterQuery], queryFn: () => api.list(filterQuery), enabled: !!user });
  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: api.categories, enabled: !!user });
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: () => fetch('/api/accounts').then(r => r.json()), enabled: !!user });

  const yearQuery = `?start=${chartYear}-01-01&end=${chartYear}-12-31&month=${chartYear}-01`;
  const { data: yearData, isFetching: isYearLoading } = useQuery({
    queryKey: ['yearly', chartYear],
    queryFn: () => api.dashboard(yearQuery),
    enabled: !!user,
  });

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const chartData: any[] = monthNames.map((name, i) => {
    const monthKey = `${chartYear}-${String(i + 1).padStart(2, '0')}`;
    const found = yearData?.monthly?.find((m: any) => m.month === monthKey);
    return {
      month: name,
      income: found?.income || 0,
      expense: found?.expense || 0,
      balance: (found?.income || 0) - (found?.expense || 0),
    };
  });

  let running = 0;
  chartData.forEach((d) => {
    running += d.balance;
    d.cumulative = running;
  });

  const saveTx = useMutation({
    mutationFn: (data: any) => editId ? api.update(editId, data) : api.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['yearly'] });
      setEditId(null);
      setForm({ description: '', amount: '', type: 'expense', category_id: '', account_id: '', date: new Date().toISOString().split('T')[0] });
      toast.success(editId ? 'Atualizado!' : 'Lançado!');
    },
  });

  const deleteTx = useMutation({
    mutationFn: api.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['yearly'] });
      toast.success('Excluído!');
    },
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <LoginPage />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount || !form.date) return;
    saveTx.mutate({ ...form, amount: Number(form.amount), account_id: Number(form.account_id) || 1, category_id: Number(form.category_id) || null });
  };

  const handleEdit = (t: any) => {
    setEditId(t.id);
    setForm({ description: t.description, amount: t.amount.toString(), type: t.type, category_id: t.category_id || '', account_id: t.account_id || '', date: t.date });
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('App instalado com sucesso!');
    }
    setInstallPrompt(null);
  };

  const handleBackup = async () => {
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `backup-financas-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      toast.success('Backup baixado!');
    } catch { toast.error('Erro no backup.'); }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Atenção: Isso vai substituir TODOS os seus dados. Continuar?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(json) });
        if (res.ok) {
          toast.success('Backup restaurado!');
          qc.invalidateQueries({ queryKey: ['dashboard'] });
          qc.invalidateQueries({ queryKey: ['transactions'] });
          qc.invalidateQueries({ queryKey: ['categories'] });
          qc.invalidateQueries({ queryKey: ['yearly'] });
          qc.invalidateQueries({ queryKey: ['accounts'] });
        } else { toast.error('Erro ao restaurar.'); }
      } catch { toast.error('Arquivo inválido.'); }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            <div className="flex items-center gap-4">
              <div className="relative" ref={menuRef}>
                <button onClick={() => setShowMenu(!showMenu)} className="flex items-center justify-center p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-lg transition">
                  <i data-lucide="menu" className="w-6 h-6"></i>
                </button>
                
                {showMenu && (
                  <div className="absolute left-0 mt-2 w-56 max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Ferramentas</div>
                    <button onClick={() => { setShowAccounts(true); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><i data-lucide="wallet" className="w-4 h-4"></i> Contas / Carteiras</button>
                    <button onClick={() => { setShowCats(true); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><i data-lucide="tags" className="w-4 h-4"></i> Categorias</button>
                    <button onClick={() => { setShowBudget(true); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><i data-lucide="target" className="w-4 h-4"></i> Orçamentos</button>
                    <button onClick={() => { setShowImport(true); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><i data-lucide="file-up" className="w-4 h-4"></i> Importar CSV</button>
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                    <button onClick={() => { handleBackup(); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><i data-lucide="download-cloud" className="w-4 h-4"></i> Fazer Backup</button>
                    <button onClick={() => { fileInputRef.current?.click(); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><i data-lucide="upload-cloud" className="w-4 h-4"></i> Restaurar</button>
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                    <button onClick={() => { setShowPass(true); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><i data-lucide="key" className="w-4 h-4"></i> Trocar Senha</button>
                    <button onClick={() => { setShowHelp(true); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><i data-lucide="help-circle" className="w-4 h-4"></i> Ajuda</button>
                    <button onClick={() => { setShowAbout(true); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><i data-lucide="info" className="w-4 h-4"></i> Sobre</button>

                    {installPrompt && (
                      <>
                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                        <button onClick={() => { handleInstall(); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2 font-medium">
                          <i data-lucide="download" className="w-4 h-4"></i> Instalar App
                        </button>
                      </>
                    )}
                    
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                    <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"><i data-lucide="log-out" className="w-4 h-4"></i> Sair</button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/30 text-white flex items-center justify-center">
                  <i data-lucide="bar-chart-3" className="w-6 h-6"></i>
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-xl tracking-tight leading-none text-slate-800 dark:text-white">Finanças</span>
                  <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold tracking-widest uppercase mt-0.5">Pro</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select value={period} onChange={e => setPeriod(e.target.value)} className="bg-slate-100 dark:bg-slate-700 border-none text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm font-medium outline-none cursor-pointer">
                <option value="this_month">Este Mês</option>
                <option value="last_month">Mês Passado</option>
                <option value="this_year">Este Ano</option>
                <option value="all">Todo o Período</option>
              </select>
              
              <button 
                onClick={() => { qc.invalidateQueries(); toast.success('Dados atualizados!'); }} 
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition" 
                title="Atualizar dados"
              >
                <i data-lucide="refresh-cw" className="w-5 h-5"></i>
              </button>

              {/* AVATAR NO HEADER */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shadow-sm cursor-pointer hover:ring-2 ring-indigo-400 transition-all" onClick={() => setShowProfile(true)} title="Editar Perfil">
                {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </div>

              <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition">
                <i data-lucide={darkMode ? "sun" : "moon"} className="w-5 h-5"></i>
              </button>
              <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleRestore} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {showCats && <ManageCategories onClose={() => setShowCats(false)} />}
        {showPass && <ChangePassword onClose={() => setShowPass(false)} />}
        {showBudget && <BudgetsModal onClose={() => setShowBudget(false)} cats={cats || []} />}
        {showImport && <ImportModal onClose={() => setShowImport(false)} />}
        {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
        {showAccounts && <ManageAccounts onClose={() => setShowAccounts(false)} />}
        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {getGreeting()}, <span className="text-indigo-600 dark:text-indigo-400">{user.name ? capitalize(user.name) : capitalize(user.email.split('@')[0])}</span>!
            </h1>
            <p className="text-sm text-slate-500 mt-1 capitalize">
              {time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <i data-lucide="clock" className="w-4 h-4 text-indigo-500"></i>
            <span className="font-mono font-medium text-lg text-slate-700 dark:text-slate-200 tracking-wider">
              {time.toLocaleTimeString('pt-BR')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/30">
            <p className="text-indigo-100 font-medium text-sm">Saldo no Período</p>
            {isDashLoading ? (
              <div className="h-10 mt-2 bg-white/20 rounded-lg animate-pulse w-3/4"></div>
            ) : (
              <h2 className="text-4xl font-bold mt-2">R$ {dash?.balance?.toFixed(2) ?? '0,00'}</h2>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 md:col-span-2">
            <h3 className="font-semibold mb-2">Despesas por Categoria</h3>
            {isDashLoading ? (
              <div className="flex h-[200px] items-center justify-center">
                <div className="w-32 h-32 rounded-full border-8 border-slate-200 dark:border-slate-700 border-t-indigo-500 animate-spin"></div>
              </div>
            ) : dash?.byCategory && dash.byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={dash.byCategory} dataKey="total" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={5}>
                    {dash.byCategory.map((c: any) => <Cell key={c.name} fill={c.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-slate-400">Nenhuma despesa registrada</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold mb-4">Fluxo de Caixa</h3>
          {isDashLoading ? (
            <div className="h-[250px] bg-slate-100 dark:bg-slate-700/50 rounded-xl animate-pulse w-full"></div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dash?.monthly ?? []}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b' }} />
                <Tooltip cursor={{ fill: darkMode ? '#334155' : '#f1f5f9' }} contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="income" fill="#10b981" name="Receita" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" name="Despesa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <div>
              <h3 className="font-semibold text-lg">Visão Anual</h3>
              <p className="text-xs text-slate-500">Receitas, Despesas e Tendência de Saldo Acumulado</p>
            </div>
            <select 
              value={chartYear} 
              onChange={e => setChartYear(Number(e.target.value))}
              className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-4 py-2 text-sm font-semibold outline-none cursor-pointer border border-slate-200 dark:border-slate-600 shadow-sm"
            >
              {[...Array(5)].map((_, i) => (
                <option key={i} value={currentYear - i}>{currentYear - i}</option>
              ))}
            </select>
          </div>

          {isYearLoading ? (
            <div className="h-[400px] bg-slate-100 dark:bg-slate-700/50 rounded-xl animate-pulse w-full"></div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="income3D" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="50%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#047857" />
                  </linearGradient>
                  <linearGradient id="expense3D" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" />
                    <stop offset="50%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#b91c1c" />
                  </linearGradient>
                  <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.25" />
                  </filter>
                </defs>
                
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 500 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                <Tooltip cursor={{ fill: darkMode ? '#334155' : '#f1f5f9' }} contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', color: darkMode ? '#fff' : '#000' }} formatter={(value: any) => typeof value === 'number' ? `R$ ${value.toFixed(2)}` : value} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                <Bar dataKey="income" fill="url(#income3D)" name="Receita" radius={[6, 6, 0, 0]} filter="url(#barShadow)" barSize={20} />
                <Bar dataKey="expense" fill="url(#expense3D)" name="Despesa" radius={[6, 6, 0, 0]} filter="url(#barShadow)" barSize={20} />
                <Line type="monotone" dataKey="cumulative" stroke="#6366f1" strokeWidth={3} name="Saldo Acumulado" dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: darkMode ? '#1e293b' : '#fff' }} activeDot={{ r: 7, stroke: '#6366f1', strokeWidth: 3, fill: darkMode ? '#1e293b' : '#fff' }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {dash?.budgets && dash.budgets.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold mb-4">Seus Orçamentos (Mês Atual)</h3>
            <div className="grid sm:grid-cols-2 gap-6">
              {dash.budgets.map((b: any) => {
                const perc = Math.min((b.spent / b.budget_amount) * 100, 100);
                return (
                  <div key={b.category_id}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">{b.name}</span>
                      <span className="text-slate-500">R$ {b.spent.toFixed(2)} / R$ {b.budget_amount.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                      <div className={`h-2 rounded-full ${perc >= 100 ? 'bg-red-500' : perc >= 80 ? 'bg-orange-400' : 'bg-emerald-500'}`} style={{ width: `${perc}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1" ref={formRef}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 sticky top-24">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <i data-lucide={editId ? "edit" : "plus-circle"} className="w-5 h-5 text-indigo-500"></i>
                {editId ? 'Editar Transação' : 'Nova Transação'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Descrição</label>
                  <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Valor (R$)</label>
                    <input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full border rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Tipo</label>
                    <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900">
                      <option value="expense">Despesa</option>
                      <option value="income">Receita</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-1">Conta / Carteira</label>
                  <select value={form.account_id} onChange={e => setForm({...form, account_id: e.target.value})} className="w-full border rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900">
                    <option value="">Selecione a conta...</option>
                    {accounts?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Categoria</label>
                  <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} className="w-full border rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900">
                    <option value="">Sem categoria</option>
                    {cats?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Data</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border rounded-lg p-2.5 bg-slate-50 dark:bg-slate-900" required />
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium py-3 rounded-lg flex justify-center items-center gap-2">
                  <i data-lucide={editId ? "check" : "arrow-right"} className="w-4 h-4"></i>
                  {editId ? 'Salvar Alterações' : 'Lançar'}
                </button>
                {editId && (
                  <button type="button" onClick={() => { setEditId(null); setForm({ description: '', amount: '', type: 'expense', category_id: '', account_id: '', date: new Date().toISOString().split('T')[0] }); }} className="w-full text-sm text-slate-500 mt-2">Cancelar Edição</button>
                )}
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden h-full">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-semibold">Histórico de Transações</h3>
              </div>
              
              {isTxnsLoading ? (
                <div className="p-6 space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700/50 rounded-xl animate-pulse w-full"></div>)}
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {txns?.map((t: any) => (
                    <li key={t.id} className="p-4 sm:px-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: t.category_color ? `${t.category_color}20` : (darkMode ? '#334155' : '#e2e8f0'), color: t.category_color || (darkMode ? '#cbd5e1' : '#64748b') }}>
                          <i data-lucide={t.type === 'income' ? 'arrow-down-left' : 'arrow-up-right'} className="w-5 h-5"></i>
                        </div>
                        <div>
                          <p className="font-medium text-sm sm:text-base">{t.description}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')} 
                            {t.category_name && ` • ${t.category_name}`}
                            {t.account_name && ` • ${t.account_name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`font-semibold ${t.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                          {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                        </span>
                        <div className="hidden group-hover:flex items-center gap-1 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-1">
                          <button onClick={() => handleEdit(t)} className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-md"><i data-lucide="edit-2" className="w-4 h-4"></i></button>
                          <button onClick={() => { if(confirm('Excluir transação?')) deleteTx.mutate(t.id) }} className="p-1.5 text-slate-500 hover:text-red-600 rounded-md"><i data-lucide="trash-2" className="w-4 h-4"></i></button>
                        </div>
                      </div>
                    </li>
                  ))}
                  
                  {(!txns || txns.length === 0) && (
                    <li className="flex flex-col items-center justify-center p-12 text-center">
                      <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-full mb-4">
                        <i data-lucide="wallet" className="w-10 h-10 text-slate-400 dark:text-slate-500"></i>
                      </div>
                      <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Sua carteira está vazia</h4>
                      <p className="text-sm text-slate-500 max-w-xs mt-1">Você ainda não tem transações neste período. Que tal registrar sua primeira despesa ou receita?</p>
                      <button onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })} className="mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                        <i data-lucide="plus-circle" className="w-4 h-4"></i> Fazer um lançamento agora
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}