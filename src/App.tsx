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
  
  const [form, setForm] = useState({ description: '', amount: '', type: 'expense', category_id: '', account_id: '', date: new Date().toLocaleDateString('sv-SE') });
  
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
      const start = new Date(y, m, 1).toLocaleDateString('sv-SE');
      const end = new Date(y, m + 1, 0).toLocaleDateString('sv-SE');
      return { start, end, month: start.slice(0, 7) };
    } else if (period === 'last_month') {
      const start = new Date(y, m - 1, 1).toLocaleDateString('sv-SE');
      const end = new Date(y, m, 0).toLocaleDateString('sv-SE');
      return { start, end, month: start.slice(0, 7) };
    } else if (period === 'this_year') {
      return { start: `${y}-01-01`, end: `${y}-12-31`, month: `${y}-01` };
    }
    return { start: '1900-01-01', end: '2100-01-01', month: now.toLocaleDateString('sv-SE').slice(0, 7) };
  };

  const dates = getFilterDates();
  const filterQuery = `?start=${dates.start}&end=${dates.end}&month=${dates.month}`;

  const { data: dash, isFetching: isDashLoading } = useQuery({ queryKey: ['dashboard', filterQuery], queryFn: () => api.dashboard(filterQuery), enabled: !!user });
  const { data: txns, isFetching: isTxnsLoading } = useQuery({ queryKey: ['transactions', filterQuery], queryFn: () => api.list(filterQuery), enabled: !!user });
  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: api.categories, enabled: !!user });
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: api.accounts, enabled: !!user });

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
      setForm({ description: '', amount: '', type: 'expense', category_id: '', account_id: '', date: new Date().toLocaleDateString('sv-SE') });
      toast.success(editId ? 'Atualizado!' : 'Lançado!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao salvar transação');
    }
  });

  const deleteTx = useMutation({
    mutationFn: api.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['yearly'] });
      toast.success('Excluído!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao excluir transação');
    }
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <LoginPage />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount || !form.date) return;
    if (!form.account_id) return toast.error('Selecione uma conta para o lançamento.');
    saveTx.mutate({ ...form, amount: Number(form.amount), account_id: Number(form.account_id), category_id: Number(form.category_id) || null });
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

  const handleRefresh = () => {
    try {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['yearly'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Dados atualizados!');
    } catch (err) {
      toast.error('Erro ao atualizar dados');
      console.error(err);
    }
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors relative overflow-x-hidden">
      
      {/* Bg decorativo */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* NAVBAR GLASSMORPHISM */}
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative" ref={menuRef}>
                <button onClick={() => setShowMenu(!showMenu)} className="flex items-center justify-center p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all active:scale-95">
                  <i data-lucide="menu" className="w-5 h-5"></i>
                </button>
                
                {showMenu && (
                  <div className="absolute left-0 mt-2 w-60 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Ferramentas</div>
                    <button onClick={() => { setShowAccounts(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"><i data-lucide="wallet" className="w-4 h-4 text-slate-400"></i> Contas / Carteiras</button>
                    <button onClick={() => { setShowCats(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"><i data-lucide="tags" className="w-4 h-4 text-slate-400"></i> Categorias</button>
                    <button onClick={() => { setShowBudget(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"><i data-lucide="target" className="w-4 h-4 text-slate-400"></i> Orçamentos</button>
                    <button onClick={() => { setShowImport(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"><i data-lucide="file-up" className="w-4 h-4 text-slate-400"></i> Importar CSV</button>
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                    <button onClick={() => { handleBackup(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"><i data-lucide="download-cloud" className="w-4 h-4 text-slate-400"></i> Fazer Backup</button>
                    <button onClick={() => { fileInputRef.current?.click(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"><i data-lucide="upload-cloud" className="w-4 h-4 text-slate-400"></i> Restaurar</button>
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                    <button onClick={() => { setShowPass(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"><i data-lucide="key" className="w-4 h-4 text-slate-400"></i> Trocar Senha</button>
                    <button onClick={() => { setShowHelp(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"><i data-lucide="help-circle" className="w-4 h-4 text-slate-400"></i> Ajuda</button>
                    <button onClick={() => { setShowAbout(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"><i data-lucide="info" className="w-4 h-4 text-slate-400"></i> Sobre</button>

                    {installPrompt && (
                      <>
                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                        <button onClick={() => { handleInstall(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-3 transition-colors">
                          <i data-lucide="download" className="w-4 h-4"></i> Instalar App
                        </button>
                      </>
                    )}
                    
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                    <button onClick={logout} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"><i data-lucide="log-out" className="w-4 h-4"></i> Sair</button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/30 text-white flex items-center justify-center">
                  <i data-lucide="bar-chart-3" className="w-5 h-5"></i>
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-lg tracking-tight leading-none text-slate-900 dark:text-white">Finanças</span>
                  <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold tracking-widest uppercase mt-0.5">Pro</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* SELETOR DE PERÍODO */}
              <select value={period} onChange={e => setPeriod(e.target.value)} className="bg-slate-100/80 dark:bg-slate-800 border-none text-slate-700 dark:text-slate-200 rounded-xl px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors max-w-[100px] sm:max-w-none">
                <option value="this_month">Este Mês</option>
                <option value="last_month">Mês Passado</option>
                <option value="this_year">Este Ano</option>
                <option value="all">Todo</option>
              </select>
              
              {/* BOTÃO DE REFRESH SEGURO */}
              <button 
                onClick={handleRefresh} 
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95" 
                title="Atualizar dados"
              >
                <i data-lucide="refresh-cw" className="w-4 h-4 sm:w-5 sm:h-5"></i>
              </button>

              <div onClick={() => setShowProfile(true)} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-500/30 cursor-pointer hover:ring-2 ring-emerald-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 transition-all" title="Editar Perfil">
                {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </div>

              <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95">
                <i data-lucide={darkMode ? "sun" : "moon"} className="w-4 h-4 sm:w-5 sm:h-5"></i>
              </button>
              <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleRestore} />
            </div>
          </div>
        </div>
      </nav>

      <main className="w-full px-3 sm:px-4 lg:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        {showCats && <ManageCategories onClose={() => setShowCats(false)} />}
        {showPass && <ChangePassword onClose={() => setShowPass(false)} />}
        {showBudget && <BudgetsModal onClose={() => setShowBudget(false)} cats={cats || []} />}
        {showImport && <ImportModal onClose={() => setShowImport(false)} />}
        {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
        {showAccounts && <ManageAccounts onClose={() => setShowAccounts(false)} />}
        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

        {/* Header saudação */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="w-full sm:w-auto">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
              {getGreeting()}, <span className="bg-gradient-to-r from-emerald-500 to-emerald-700 bg-clip-text text-transparent">{user.name ? capitalize(user.name) : capitalize(user.email.split('@')[0])}</span>!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 capitalize font-medium">
              {time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
            <i data-lucide="clock" className="w-4 h-4 text-emerald-500"></i>
            <span className="font-mono font-semibold text-sm md:text-lg text-slate-700 dark:text-slate-200 tracking-wider">
              {time.toLocaleTimeString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Grid de cards topo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          
          {/* Card Saldo Premium */}
          <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 rounded-3xl p-5 md:p-6 text-white shadow-2xl shadow-emerald-500/30 overflow-hidden flex flex-col justify-between group h-full">
            <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-emerald-50 font-semibold text-sm">Saldo Atual</p>
                <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                  <i data-lucide="trending-up" className="w-4 h-4"></i>
                </div>
              </div>
              {isDashLoading ? (
                <div className="h-12 mt-2 bg-white/20 rounded-lg animate-pulse w-3/4"></div>
              ) : (
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mt-2 tracking-tight break-words">R$ {dash?.balance?.toFixed(2) ?? '0,00'}</h2>
              )}
            </div>
            
            {!isDashLoading && (
              <div className="relative mt-4 pt-4 border-t border-white/25">
                <p className="text-emerald-50 text-xs mb-1 font-medium">Resultado do Período</p>
                <p className={`text-lg font-bold ${dash?.period_balance >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                  {dash?.period_balance >= 0 ? '▲ +' : '▼ '} R$ {Math.abs(dash?.period_balance || 0).toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* Card Pizza */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 md:col-span-2 flex flex-col">
            <div className="flex justify-between items-start mb-2 shrink-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Despesas por Categoria</h3>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Período</span>
            </div>
            
            <div className="flex-1 flex items-center justify-center min-h-[180px]">
              {isDashLoading ? (
                <div className="w-32 h-32 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-emerald-500 animate-spin"></div>
              ) : dash?.byCategory && dash.byCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={dash.byCategory} dataKey="total" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={4} cornerRadius={8}>
                      {dash.byCategory.map((c: any) => <Cell key={c.name} fill={c.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                  <i data-lucide="pie-chart" className="w-8 h-8 opacity-40"></i>
                  <span>Nenhuma despesa registrada</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gráfico Fluxo */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Fluxo de Caixa</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Receita x Despesa</span>
          </div>
          {isDashLoading ? (
            <div className="h-[250px] bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse w-full"></div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dash?.monthly ?? []}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                <Tooltip cursor={{ fill: darkMode ? '#1e293b' : '#f1f5f9' }} contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#fff', border: 'none', borderRadius: '12px' }} formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`} />
                <Bar dataKey="income" fill="#10b981" name="Receita" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" name="Despesa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gráfico Anual */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Visão Anual</h3>
              <p className="text-xs text-slate-500 mt-0.5">Receitas, Despesas e Tendência de Saldo</p>
            </div>
            <select 
              value={chartYear} 
              onChange={e => setChartYear(Number(e.target.value))}
              className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none cursor-pointer border border-slate-200 dark:border-slate-700 hover:border-emerald-400 transition-colors"
            >
              {[...Array(5)].map((_, i) => (
                <option key={i} value={currentYear - i}>{currentYear - i}</option>
              ))}
            </select>
          </div>

          {isYearLoading ? (
            <div className="h-[400px] bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse w-full"></div>
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
                <Tooltip cursor={{ fill: darkMode ? '#1e293b' : '#f1f5f9' }} contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', color: darkMode ? '#fff' : '#000' }} formatter={(value: any) => typeof value === 'number' ? `R$ ${value.toFixed(2)}` : value} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                <Bar dataKey="income" fill="url(#income3D)" name="Receita" radius={[6, 6, 0, 0]} filter="url(#barShadow)" barSize={20} />
                <Bar dataKey="expense" fill="url(#expense3D)" name="Despesa" radius={[6, 6, 0, 0]} filter="url(#barShadow)" barSize={20} />
                <Line type="monotone" dataKey="cumulative" stroke="#6366f1" strokeWidth={3} name="Saldo Acumulado" dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: darkMode ? '#0f172a' : '#fff' }} activeDot={{ r: 7, stroke: '#6366f1', strokeWidth: 3, fill: darkMode ? '#0f172a' : '#fff' }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Orçamentos */}
        {dash?.budgets && dash.budgets.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
            <h3 className="font-bold mb-4 text-slate-800 dark:text-slate-200">Seus Orçamentos (Mês Atual)</h3>
            <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
              {dash.budgets.map((b: any) => {
                const perc = Math.min((b.spent / b.budget_amount) * 100, 100);
                return (
                  <div key={b.category_id}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{b.name}</span>
                      <span className="text-slate-500 font-medium">R$ {b.spent.toFixed(2)} / R$ {b.budget_amount.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div className={`h-2.5 rounded-full transition-all duration-700 ${perc >= 100 ? 'bg-gradient-to-r from-rose-500 to-red-600' : perc >= 80 ? 'bg-gradient-to-r from-orange-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-600'}`} style={{ width: `${perc}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Grid Form + Lista */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          
          {/* Formulário moderno */}
          <div className="lg:col-span-1" ref={formRef}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 sticky top-24">
              <h3 className="font-bold mb-5 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <span className="bg-emerald-100 dark:bg-emerald-900/40 p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400">
                  <i data-lucide={editId ? "edit" : "plus"} className="w-4 h-4"></i>
                </span>
                {editId ? 'Editar Transação' : 'Nova Transação'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Descrição</label>
                  <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Valor</label>
                    <input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Tipo</label>
                    <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                      <option value="expense">Despesa</option>
                      <option value="income">Receita</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Conta</label>
                  <select value={form.account_id} onChange={e => setForm({...form, account_id: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" required>
                    <option value="">Selecione...</option>
                    {accounts?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Categoria</label>
                  <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all">
                    <option value="">Sem categoria</option>
                    {cats?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Data</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" required />
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 flex justify-center items-center gap-2 transition-all active:scale-95">
                  <i data-lucide={editId ? "check" : "arrow-right"} className="w-4 h-4"></i>
                  {editId ? 'Salvar' : 'Lançar'}
                </button>
                {editId && (
                  <button type="button" onClick={() => { setEditId(null); setForm({ description: '', amount: '', type: 'expense', category_id: '', account_id: '', date: new Date().toLocaleDateString('sv-SE') }); }} className="w-full text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mt-1">Cancelar Edição</button>
                )}
              </form>
            </div>
          </div>

          {/* Lista de transações */}
          <div className="lg:col-span-2 xl:col-span-3">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 overflow-hidden h-full">
              <div className="p-5 md:p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Histórico</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{txns?.length || 0} lançamentos</span>
                </div>
              </div>
              
              {isTxnsLoading ? (
                <div className="p-6 space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse w-full"></div>)}
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {txns?.map((t: any) => (
                    <li key={t.id} className="p-4 sm:px-6 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: t.category_color ? `${t.category_color}20` : (darkMode ? '#1e293b' : '#f1f5f9'), color: t.category_color || (darkMode ? '#cbd5e1' : '#64748b') }}>
                          <i data-lucide={t.type === 'income' ? 'arrow-down-left' : 'arrow-up-right'} className="w-4 h-4 sm:w-5 sm:h-5"></i>
                        </div>
                        <div>
                          <p className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">{t.description}</p>
                          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-medium">
                            {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')} 
                            {t.category_name && ` • ${t.category_name}`}
                            {t.account_name && ` • ${t.account_name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-sm sm:text-base whitespace-nowrap ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                        </span>
                        <div className="hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 rounded-xl p-1 transition-all">
                          <button onClick={() => handleEdit(t)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition"><i data-lucide="edit-2" className="w-4 h-4"></i></button>
                          <button onClick={() => { if(confirm('Excluir transação?')) deleteTx.mutate(t.id) }} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition"><i data-lucide="trash-2" className="w-4 h-4"></i></button>
                        </div>
                      </div>
                    </li>
                  ))}
                  
                  {(!txns || txns.length === 0) && (
                    <li className="flex flex-col items-center justify-center p-12 sm:p-16 text-center">
                      <div className="bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-slate-800/50 p-5 rounded-2xl mb-4">
                        <i data-lucide="wallet" className="w-10 h-10 text-emerald-500 dark:text-emerald-400"></i>
                      </div>
                      <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300">Sua carteira está vazia</h4>
                      <p className="text-sm text-slate-500 max-w-xs mt-1.5">Registre sua primeira despesa ou receita para começar a acompanhar suas finanças.</p>
                      <button onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })} className="mt-6 text-sm font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition">
                        <i data-lucide="plus-circle" className="w-4 h-4"></i> Fazer um lançamento
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