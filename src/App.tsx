import { useState, useRef, useEffect } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line, Legend, ReferenceLine } from 'recharts';
import {
  Menu, Wallet, Tags, Target, FileUp, DownloadCloud, UploadCloud, Key,
  HelpCircle, Info, Download, LogOut, BarChart3, RefreshCw, TrendingUp,
  Clock, PieChart as PieChartIcon, ArrowDownLeft, ArrowUpRight, Edit2,
  Trash2, Edit, Plus, Check, ArrowRight, PlusCircle, ChevronDown, ArrowRightLeft,
  Calendar, X, Receipt
} from 'lucide-react';
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
import { RestoreModal } from './RestoreModal';
import { ImportResultModal } from './ImportResultModal';
import { MergeModal } from './MergeModal';

const brl = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PIE_PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6', '#84cc16'];

// Valores compactos no eixo Y (ex.: -3k, 2,5k)
const compact = (v: number) => {
  const abs = Math.abs(v);
  if (abs < 1000) return String(v);
  const k = abs / 1000;
  return `${v < 0 ? '-' : ''}${k.toFixed(k % 1 === 0 ? 0 : 1).replace('.', ',')}k`;
};

export default function App() {
  const { user, loading, logout } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergeInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [showCats, setShowCats] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const [restoreData, setRestoreData] = useState<any>(null);
  const [restoreFileName, setRestoreFileName] = useState('');
  const [mergeData, setMergeData] = useState<any>(null);
  const [mergeFileName, setMergeFileName] = useState('');
  const [importResult, setImportResult] = useState<any>(null);
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<any>(null);

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [period, setPeriod] = useState('this_month');
  const currentYear = new Date().getFullYear();
  const [chartYear, setChartYear] = useState(currentYear);
  const [editId, setEditId] = useState<number | null>(null);

  const today = new Date().toLocaleDateString('sv-SE');
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('sv-SE');
  
  const [customStart, setCustomStart] = useState<string>(() => {
    return localStorage.getItem('custom_start') || firstOfMonth;
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return localStorage.getItem('custom_end') || today;
  });

  useEffect(() => {
    localStorage.setItem('custom_start', customStart);
  }, [customStart]);

  useEffect(() => {
    localStorage.setItem('custom_end', customEnd);
  }, [customEnd]);

  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    return localStorage.getItem('selected_account') || '';
  });

  useEffect(() => {
    localStorage.setItem('selected_account', selectedAccountId);
  }, [selectedAccountId]);
  
  const [form, setForm] = useState({ description: '', amount: '', type: 'expense', category_id: '', account_id: '', date: new Date().toLocaleDateString('sv-SE'), paid: false });
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [selected, setSelected] = useState<number[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  
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
  }, [darkMode]);

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
    } else if (period === 'next_month') {
      const start = new Date(y, m + 1, 1).toLocaleDateString('sv-SE');
      const end = new Date(y, m + 2, 0).toLocaleDateString('sv-SE');
      return { start, end, month: start.slice(0, 7) };
    } else if (period === 'this_year') {
      return { start: `${y}-01-01`, end: `${y}-12-31`, month: `${y}-01` };
    } else if (period === 'custom') {
      const s = customStart || firstOfMonth;
      const e = customEnd || today;
      const [start, end] = s <= e ? [s, e] : [e, s];
      return { start, end, month: start.slice(0, 7) };
    }
    return { start: '1900-01-01', end: '2100-01-01', month: now.toLocaleDateString('sv-SE').slice(0, 7) };
  };

  const dates = getFilterDates();
  const accountParam = selectedAccountId ? `&account_id=${selectedAccountId}` : '';
  const filterQuery = `?start=${dates.start}&end=${dates.end}&month=${dates.month}${accountParam}`;

  const { data: dash, isFetching: isDashLoading } = useQuery({ queryKey: ['dashboard', filterQuery], queryFn: () => api.dashboard(filterQuery), enabled: !!user });
  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: api.categories, enabled: !!user });
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: api.accounts, enabled: !!user });

  useEffect(() => {
    if (selectedAccountId && accounts && accounts.length > 0 && !accounts.find((a: any) => String(a.id) === selectedAccountId)) {
      setSelectedAccountId('');
    }
  }, [accounts, selectedAccountId]);

  useEffect(() => {
    if (selectedAccountId && !editId) {
      setForm(prev => ({ ...prev, account_id: selectedAccountId }));
    }
  }, [selectedAccountId, editId]);

  const { 
    data: txnsData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isFetching: isTxnsLoading 
  } = useInfiniteQuery({
    queryKey: ['transactions', filterQuery, paidFilter],
    queryFn: ({ pageParam = 0 }) => api.list(`${filterQuery}${paidFilter === 'paid' ? '&paid=1' : paidFilter === 'pending' ? '&paid=0' : ''}&limit=30&offset=${pageParam}`),
    getNextPageParam: (lastPage: any[], allPages: any[][]) => {
      return lastPage.length === 30 ? allPages.length * 30 : undefined;
    },
    initialPageParam: 0,
    enabled: !!user,
  });

  const txns = txnsData?.pages.flat() || [];
  const expenseIds: number[] = txns.filter((t: any) => t.type === 'expense').map((t: any) => t.id);
  const allSelected = expenseIds.length > 0 && expenseIds.every(id => selected.includes(id));

  useEffect(() => { setSelected([]); }, [filterQuery, paidFilter]);

  const toggleSelected = (id: number) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const { data: pendingBills } = useQuery({
    queryKey: ['transactions', 'pending-card', filterQuery],
    queryFn: () => api.list(`${filterQuery}&paid=0&limit=4`),
    enabled: !!user,
  });

  const yearQuery = `?start=${chartYear}-01-01&end=${chartYear}-12-31&month=${chartYear}-01${accountParam}`;
  const { data: yearData, isFetching: isYearLoading } = useQuery({
    queryKey: ['yearly', chartYear, selectedAccountId],
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
      setForm({ description: '', amount: '', type: 'expense', category_id: '', account_id: selectedAccountId || '', date: new Date().toLocaleDateString('sv-SE'), paid: false });
      toast.success(editId ? 'Atualizado!' : 'Lançado!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao salvar transação');
    }
  });

  const togglePaid = useMutation({
    mutationFn: ({ id, paid }: { id: number; paid: boolean }) => api.setPaid(id, paid),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(vars.paid ? 'Marcado como pago!' : 'Marcado como pendente');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao atualizar');
    }
  });

  const bulkPaid = useMutation({
    mutationFn: ({ ids, paid }: { ids: number[]; paid: boolean }) => api.setPaidBulk(ids, paid),
    onSuccess: (res: any, vars) => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      setSelected([]);
      setSelectMode(false);
      const n = res?.updated ?? vars.ids.length;
      toast.success(vars.paid ? `${n} marcada(s) como paga(s)!` : `${n} marcada(s) como pendente(s)`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao atualizar');
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
    saveTx.mutate({ ...form, paid: form.type === 'expense' ? form.paid : true, amount: Number(form.amount), account_id: Number(form.account_id), category_id: Number(form.category_id) || null });
  };

  const handleEdit = (t: any) => {
    setEditId(t.id);
    setForm({ description: t.description, amount: t.amount.toString(), type: t.type, category_id: t.category_id || '', account_id: t.account_id || '', date: t.date, paid: !!t.paid });
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
      
      const acc = data.accounts?.length || 0;
      const cat = data.categories?.length || 0;
      const tx = data.transactions?.length || 0;
      const bud = data.budgets?.length || 0;
      toast.success(`Backup: ${acc} contas, ${cat} categorias, ${tx} transações, ${bud} orçamentos`);
    } catch { toast.error('Erro no backup.'); }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setRestoreData(json);
        setRestoreFileName(file.name);
      } catch {
        toast.error('Arquivo inválido.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleMergeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setMergeData(json);
        setMergeFileName(file.name);
      } catch {
        toast.error('Arquivo inválido.');
      }
      if (mergeInputRef.current) mergeInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const selectedAccountName = accounts?.find((a: any) => String(a.id) === selectedAccountId)?.name;

  const openingBal = dash?.opening_balance ?? 0;
  const periodBal = dash?.period_balance ?? 0;
  const variationPerc = openingBal !== 0 
    ? (periodBal / Math.abs(openingBal)) * 100 
    : null;
  const hasOpeningBalance = openingBal !== 0;

  const pieData: any[] = (dash?.byCategory ?? []).map((c: any, i: number, arr: any[]) => {
    const colorRepeats = arr.filter((x: any) => x.color === c.color).length > 1;
    return { ...c, fill: colorRepeats ? PIE_PALETTE[i % PIE_PALETTE.length] : c.color };
  });

  const bills = dash?.bills;
  const billsTotal = (bills?.paid_total ?? 0) + (bills?.pending_total ?? 0);
  const billsCount = (bills?.paid_count ?? 0) + (bills?.pending_count ?? 0);
  const billsPerc = billsTotal > 0 ? Math.min(((bills?.paid_total ?? 0) / billsTotal) * 100, 100) : 0;

  const billStatus = (t: any): { label: string; cls: string } => {
    if (t.paid) return { label: 'Pago', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' };
    if (t.date < today) return { label: 'Vencida', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' };
    if (t.date === today) return { label: 'Vence hoje', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };
    return { label: 'A pagar', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors relative overflow-x-hidden">
      
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl"></div>
      </div>

      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative" ref={menuRef}>
                <button onClick={() => setShowMenu(!showMenu)} className="flex items-center justify-center p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all active:scale-95">
                  <Menu className="w-5 h-5" />
                </button>
                
                {showMenu && (
                  <div className="absolute left-0 mt-2 w-60 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Ferramentas</div>
                    <button onClick={() => { setShowAccounts(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"><Wallet className="w-4 h-4 text-slate-400" /> Contas / Carteiras</button>
                    <button onClick={() => { setShowCats(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"><Tags className="w-4 h-4 text-slate-400" /> Categorias</button>
                    <button onClick={() => { setShowBudget(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"><Target className="w-4 h-4 text-slate-400" /> Orçamentos</button>
                    <button onClick={() => { setShowImport(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"><FileUp className="w-4 h-4 text-slate-400" /> Importar CSV</button>
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                    <button onClick={() => { handleBackup(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"><DownloadCloud className="w-4 h-4 text-slate-400" /> Fazer Backup</button>
                    <button onClick={() => { fileInputRef.current?.click(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"><UploadCloud className="w-4 h-4 text-slate-400" /> Restaurar</button>
                    <button onClick={() => { mergeInputRef.current?.click(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors">
                      <ArrowRightLeft className="w-4 h-4 text-emerald-500" /> Sincronizar Backup
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                    <button onClick={() => { setShowPass(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"><Key className="w-4 h-4 text-slate-400" /> Trocar Senha</button>
                    <button onClick={() => { setShowHelp(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"><HelpCircle className="w-4 h-4 text-slate-400" /> Ajuda</button>
                    <button onClick={() => { setShowAbout(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"><Info className="w-4 h-4 text-slate-400" /> Sobre</button>

                    {installPrompt && (
                      <>
                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                        <button onClick={() => { handleInstall(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-3 transition-colors">
                          <Download className="w-4 h-4" /> Instalar App
                        </button>
                      </>
                    )}
                    
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                    <button onClick={logout} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"><LogOut className="w-4 h-4" /> Sair</button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/30 text-white flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-lg tracking-tight leading-none text-slate-900 dark:text-white">Finanças</span>
                  <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold tracking-widest uppercase mt-0.5">Pro</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <select value={period} onChange={e => setPeriod(e.target.value)} className="bg-slate-100/80 dark:bg-slate-800 border-none text-slate-700 dark:text-slate-200 rounded-xl px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors max-w-[130px] sm:max-w-none">
                <option value="this_month">Este Mês</option>
                <option value="last_month">Mês Passado</option>
                <option value="next_month">Próximo Mês</option>
                <option value="this_year">Este Ano</option>
                <option value="all">Todo</option>
                <option value="custom">Personalizado</option>
              </select>

              {accounts && accounts.length > 1 && (
                <select 
                  value={selectedAccountId} 
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="bg-slate-100/80 dark:bg-slate-800 border-none text-slate-700 dark:text-slate-200 rounded-xl px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors max-w-[110px] sm:max-w-none"
                  title="Filtrar por conta"
                >
                  <option value="">Todas as Contas</option>
                  {accounts.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
              
              <button onClick={handleRefresh} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95" title="Atualizar dados">
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <div onClick={() => setShowProfile(true)} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-500/30 cursor-pointer hover:ring-2 ring-emerald-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 transition-all" title="Editar Perfil">
                {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </div>

              <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95">
                {darkMode ? <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg> : <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
              </button>
              <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleRestore} />
              <input type="file" accept=".json" className="hidden" ref={mergeInputRef} onChange={handleMergeSelect} />
            </div>
          </div>

          {period === 'custom' && (
            <div className="pb-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 flex-1">
                <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">De</label>
                <input 
                  type="date" 
                  value={customStart} 
                  onChange={e => setCustomStart(e.target.value)}
                  max={customEnd}
                  className="bg-transparent border-none text-slate-700 dark:text-slate-200 text-sm font-semibold outline-none cursor-pointer w-full"
                />
              </div>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 flex-1">
                <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Até</label>
                <input 
                  type="date" 
                  value={customEnd} 
                  onChange={e => setCustomEnd(e.target.value)}
                  min={customStart}
                  className="bg-transparent border-none text-slate-700 dark:text-slate-200 text-sm font-semibold outline-none cursor-pointer w-full"
                />
              </div>
              <button 
                onClick={() => setPeriod('this_month')}
                className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center gap-1 justify-center"
                title="Limpar"
              >
                <X className="w-4 h-4" /> Limpar
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="w-full px-3 sm:px-4 lg:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        {showCats && <ManageCategories onClose={() => setShowCats(false)} />}
        {showPass && <ChangePassword onClose={() => setShowPass(false)} />}
        {showBudget && <BudgetsModal onClose={() => setShowBudget(false)} cats={cats || []} />}
        {showImport && (
          <ImportModal
            onClose={() => setShowImport(false)}
            onSuccess={(result) => {
              setShowImport(false);
              setImportResult(result);
            }}
          />
        )}
        {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
        {showAccounts && <ManageAccounts onClose={() => setShowAccounts(false)} />}
        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

        {restoreData && (
          <RestoreModal
            backupData={restoreData}
            fileName={restoreFileName}
            onClose={() => { setRestoreData(null); setRestoreFileName(''); }}
            onSuccess={() => {
              qc.invalidateQueries({ queryKey: ['dashboard'] });
              qc.invalidateQueries({ queryKey: ['transactions'] });
              qc.invalidateQueries({ queryKey: ['categories'] });
              qc.invalidateQueries({ queryKey: ['yearly'] });
              qc.invalidateQueries({ queryKey: ['accounts'] });
            }}
          />
        )}

        {mergeData && (
          <MergeModal
            backupData={mergeData}
            fileName={mergeFileName}
            onClose={() => { setMergeData(null); setMergeFileName(''); }}
            onSuccess={() => {
              qc.invalidateQueries({ queryKey: ['dashboard'] });
              qc.invalidateQueries({ queryKey: ['transactions'] });
              qc.invalidateQueries({ queryKey: ['categories'] });
              qc.invalidateQueries({ queryKey: ['yearly'] });
              qc.invalidateQueries({ queryKey: ['accounts'] });
            }}
          />
        )}

        {importResult && (
          <ImportResultModal
            imported={importResult.imported}
            skipped={importResult.skipped}
            onClose={() => setImportResult(null)}
          />
        )}

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
            <Clock className="w-4 h-4 text-emerald-500" />
            <span className="font-mono font-semibold text-sm md:text-lg text-slate-700 dark:text-slate-200 tracking-wider">
              {time.toLocaleTimeString('pt-BR')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          
          <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 rounded-3xl p-5 md:p-6 text-white shadow-2xl shadow-emerald-500/30 overflow-hidden flex flex-col justify-between group h-full">
            <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-emerald-50 font-semibold text-sm">
                  {selectedAccountId 
                    ? `Saldo em ${new Date(dates.end + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — ${selectedAccountName}`
                    : `Saldo em ${new Date(dates.end + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
                  }
                </p>
                <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              {isDashLoading ? (
                <div className="h-12 mt-2 bg-white/20 rounded-lg animate-pulse w-3/4"></div>
              ) : (
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mt-2 tracking-tight break-words">
                  {brl(dash?.closing_balance ?? 0)}
                </h2>
              )}
            </div>
            
            {!isDashLoading && (
              <div className="relative mt-4 pt-4 border-t border-white/25 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-50/80">Saldo Inicial ({new Date(dates.start + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})</span>
                  <span className="font-semibold text-emerald-100">{brl(dash?.opening_balance ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-50/80">Variação no Período</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-bold ${periodBal >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                      {periodBal >= 0 ? '▲ +' : '▼ -'}{brl(Math.abs(periodBal))}
                    </span>
                    {hasOpeningBalance && variationPerc !== null && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        periodBal >= 0 
                          ? 'bg-emerald-400/30 text-emerald-100' 
                          : 'bg-rose-400/30 text-rose-100'
                      }`}>
                        {variationPerc >= 0 ? '+' : ''}{variationPerc.toFixed(1)}%
                      </span>
                    )}
                    {!hasOpeningBalance && periodBal !== 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20 text-emerald-100">
                        Novo
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Contas Pagas</h3>
                <div className="bg-emerald-100 dark:bg-emerald-900/40 p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              {isDashLoading ? (
                <div className="h-10 mt-3 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse w-3/4"></div>
              ) : (
                <>
                  <p className="text-2xl sm:text-3xl font-black mt-2 tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums break-words">
                    {brl(bills?.paid_total ?? 0)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {bills?.paid_count ?? 0} de {billsCount} {billsCount === 1 ? 'conta paga' : 'contas pagas'} no período
                  </p>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden mt-4">
                    <div className="h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700" style={{ width: `${billsPerc}%` }}></div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 font-semibold text-right">{billsPerc.toFixed(0)}% pago</p>
                </>
              )}
            </div>

            {!isDashLoading && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> A pagar ({bills?.pending_count ?? 0})</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{brl(bills?.pending_total ?? 0)}</span>
                </div>
                {(bills?.overdue_count ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-rose-500 font-semibold">Vencidas ({bills.overdue_count})</span>
                    <span className="font-bold text-rose-500 tabular-nums">{brl(bills.overdue_total)}</span>
                  </div>
                )}
                {pendingBills && pendingBills.length > 0 && (
                  <ul className="pt-1 space-y-1.5">
                    {pendingBills.map((t: any) => (
                      <li key={t.id} className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{t.description}</p>
                          <p className={`text-[10px] font-semibold ${t.date < today ? 'text-rose-500' : 'text-slate-400'}`}>
                            {t.date < today ? 'Venceu ' : 'Vence '}{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {brl(t.amount)}
                          </p>
                        </div>
                        <button
                          onClick={() => togglePaid.mutate({ id: t.id, paid: true })}
                          disabled={togglePaid.isPending}
                          className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-2.5 py-1.5 rounded-lg transition active:scale-95 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={3} /> Pagar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {(bills?.pending_count ?? 0) > 0 && (
                  <button
                    onClick={() => { setPaidFilter('pending'); listRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                    className="w-full mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 py-2 rounded-xl transition"
                  >
                    Ver todas as pendentes
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 md:col-span-2 xl:col-span-1 flex flex-col">
            <div className="flex justify-between items-start mb-2 shrink-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Despesas por Categoria</h3>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Período</span>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center min-h-[180px]">
              {isDashLoading ? (
                <div className="w-32 h-32 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-emerald-500 animate-spin"></div>
              ) : dash?.byCategory && dash.byCategory.length > 0 ? (
                <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} dataKey="total" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={4} cornerRadius={8}>
                      {pieData.map((c: any) => <Cell key={c.name} fill={c.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} formatter={(v: any) => brl(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="w-full mt-3 space-y-1.5">
                  {pieData.slice(0, 5).map((c: any) => (
                    <li key={c.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.fill }}></span>
                        <span className="truncate">{c.name}</span>
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums ml-2 whitespace-nowrap">{brl(c.total)}</span>
                    </li>
                  ))}
                </ul>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                  <PieChartIcon className="w-8 h-8 opacity-40" />
                  <span>Nenhuma despesa registrada</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Fluxo de Caixa</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Receita x Despesa</span>
          </div>
          {isDashLoading ? (
            <div className="h-[250px] bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse w-full"></div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dash?.monthly ?? []} barGap={6}>
                <XAxis dataKey="month" tickFormatter={(m: string) => { const [y, mo] = String(m).split('-'); return mo ? `${monthNames[Number(mo) - 1]}/${y.slice(2)}` : m; }} axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} tickFormatter={compact} />
                <Tooltip cursor={{ fill: darkMode ? '#1e293b' : '#f1f5f9' }} contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#fff', border: 'none', borderRadius: '12px' }} formatter={(v: any) => brl(Number(v))} />
                <Legend wrapperStyle={{ paddingTop: '8px' }} iconType="circle" />
                <Bar dataKey="income" fill="#10b981" name="Receita" radius={[6, 6, 0, 0]} maxBarSize={56} />
                <Bar dataKey="expense" fill="#ef4444" name="Despesa" radius={[6, 6, 0, 0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

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
                <YAxis axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} tickFormatter={compact} />
                <ReferenceLine y={0} stroke={darkMode ? '#475569' : '#cbd5e1'} strokeDasharray="4 4" />
                <Tooltip cursor={{ fill: darkMode ? '#1e293b' : '#f1f5f9' }} contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', color: darkMode ? '#fff' : '#000' }} itemStyle={{ color: darkMode ? '#e2e8f0' : '#334155' }} labelStyle={{ color: darkMode ? '#fff' : '#0f172a', fontWeight: 700 }} formatter={(value: any) => typeof value === 'number' ? brl(value) : value} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                <Bar dataKey="income" fill="url(#income3D)" name="Receita" radius={[6, 6, 0, 0]} filter="url(#barShadow)" barSize={20} />
                <Bar dataKey="expense" fill="url(#expense3D)" name="Despesa" radius={[6, 6, 0, 0]} filter="url(#barShadow)" barSize={20} />
                <Line type="monotone" dataKey="cumulative" stroke="#6366f1" strokeWidth={3} name="Saldo Acumulado" dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: darkMode ? '#0f172a' : '#fff' }} activeDot={{ r: 7, stroke: '#6366f1', strokeWidth: 3, fill: darkMode ? '#0f172a' : '#fff' }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {dash?.budgets && dash.budgets.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
            <h3 className="font-bold mb-4 text-slate-800 dark:text-slate-200">
              Seus Orçamentos {selectedAccountId && `— ${selectedAccountName}`}
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
              {dash.budgets.map((b: any) => {
                const perc = Math.min((b.spent / b.budget_amount) * 100, 100);
                return (
                  <div key={b.category_id}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{b.name}</span>
                      <span className="text-slate-500 font-medium">{brl(b.spent)} / {brl(b.budget_amount)}</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          
          <div className="lg:col-span-1" ref={formRef}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 sticky top-24">
              <h3 className="font-bold mb-5 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <span className="bg-emerald-100 dark:bg-emerald-900/40 p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400">
                  {editId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
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
                {form.type === 'expense' && (
                  <button type="button" onClick={() => setForm({...form, paid: !form.paid})} className="w-full flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 text-sm font-medium transition-all hover:border-emerald-400" role="switch" aria-checked={form.paid}>
                    <span className="text-slate-700 dark:text-slate-200">Conta já paga</span>
                    <span className={`w-10 h-6 rounded-full p-0.5 transition-colors ${form.paid ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                      <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${form.paid ? 'translate-x-4' : ''}`}></span>
                    </span>
                  </button>
                )}
                <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 flex justify-center items-center gap-2 transition-all active:scale-95">
                  {editId ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  {editId ? 'Salvar' : 'Lançar'}
                </button>
                {editId && (
                  <button type="button" onClick={() => { setEditId(null); setForm({ description: '', amount: '', type: 'expense', category_id: '', account_id: selectedAccountId || '', date: new Date().toLocaleDateString('sv-SE'), paid: false }); }} className="w-full text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mt-1">Cancelar Edição</button>
                )}
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 xl:col-span-3" ref={listRef}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 overflow-hidden h-full">
              <div className="p-5 md:p-6 border-b border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">
                    Histórico {selectedAccountId && `— ${selectedAccountName}`}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{txns.length} lançamentos</span>
                </div>
                <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
                  {([['all', 'Todos'], ['paid', 'Pagas'], ['pending', 'Pendentes']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setPaidFilter(val)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${paidFilter === val ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {expenseIds.length > 0 && !selectMode && (
                  <button
                    onClick={() => setSelectMode(true)}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-3 py-1.5 rounded-lg transition active:scale-95"
                  >
                    Marcar várias
                  </button>
                )}
                {selectMode && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer select-none mr-1">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-emerald-500 cursor-pointer"
                        checked={allSelected}
                        onChange={() => setSelected(allSelected ? [] : expenseIds)}
                      />
                      Selecionar todas
                    </label>
                    {selected.length > 0 && (
                      <>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{selected.length} selecionada(s)</span>
                        <button
                          onClick={() => bulkPaid.mutate({ ids: selected, paid: true })}
                          disabled={bulkPaid.isPending}
                          className="text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition active:scale-95 disabled:opacity-50"
                        >
                          Marcar como pagas
                        </button>
                        <button
                          onClick={() => bulkPaid.mutate({ ids: selected, paid: false })}
                          disabled={bulkPaid.isPending}
                          className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition active:scale-95 disabled:opacity-50"
                        >
                          Marcar como pendentes
                        </button>
                      </>
                    )}
                    <button onClick={() => { setSelected([]); setSelectMode(false); }} className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1.5">
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
              
              {isTxnsLoading ? (
                <div className="p-6 space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse w-full"></div>)}
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {txns.map((t: any) => (
                    <li key={t.id} className={`p-4 sm:px-6 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors flex items-center justify-between group ${selected.includes(t.id) ? 'bg-emerald-50/70 dark:bg-emerald-900/10' : ''}`}>
                      <div className="flex items-center gap-3 sm:gap-4">
                        {selectMode && (t.type === 'expense' ? (
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0"
                            checked={selected.includes(t.id)}
                            onChange={() => toggleSelected(t.id)}
                            aria-label={`Selecionar ${t.description}`}
                          />
                        ) : (
                          <span className="w-4 shrink-0"></span>
                        ))}
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: t.category_color ? `${t.category_color}20` : (darkMode ? '#1e293b' : '#f1f5f9'), color: t.category_color || (darkMode ? '#cbd5e1' : '#64748b') }}>
                          {t.type === 'income' ? <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5" /> : <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center flex-wrap gap-x-2 gap-y-1">
                            {t.description}
                            {t.type === 'expense' && (
                              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${billStatus(t).cls}`}>{billStatus(t).label}</span>
                            )}
                          </p>
                          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-medium">
                            {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')} 
                            {t.category_name && ` • ${t.category_name}`}
                            {t.account_name && ` • ${t.account_name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-sm sm:text-base whitespace-nowrap tabular-nums ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {t.type === 'income' ? '+' : '-'} {brl(t.amount)}
                        </span>
                        {t.type === 'expense' && (t.paid ? (
                          <button
                            onClick={() => togglePaid.mutate({ id: t.id, paid: false })}
                            disabled={togglePaid.isPending}
                            title="Desfazer pagamento"
                            aria-label="Desfazer pagamento"
                            className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-emerald-500 text-white flex items-center justify-center shrink-0 transition-all active:scale-90 hover:bg-emerald-600 disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" strokeWidth={3} />
                          </button>
                        ) : (
                          <button
                            onClick={() => togglePaid.mutate({ id: t.id, paid: true })}
                            disabled={togglePaid.isPending}
                            title="Marcar como pago"
                            aria-label="Marcar como pago"
                            className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-2 rounded-xl shadow-sm shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" strokeWidth={3} /> <span>Pagar</span>
                          </button>
                        ))}
                        <div className="flex sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 items-center gap-1 bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 rounded-xl p-1 transition-all">
                          <button onClick={() => handleEdit(t)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setConfirmDeleteTx(t)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </li>
                  ))}
                  
                  {(!txns || txns.length === 0) && (
                    <li className="flex flex-col items-center justify-center p-12 sm:p-16 text-center">
                      <div className="bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-slate-800/50 p-5 rounded-2xl mb-4">
                        <Wallet className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300">
                        {selectedAccountId ? 'Nenhuma transação nesta conta' : 'Sua carteira está vazia'}
                      </h4>
                      <p className="text-sm text-slate-500 max-w-xs mt-1.5">
                        {selectedAccountId 
                          ? 'Esta conta não tem lançamentos no período selecionado.'
                          : 'Registre sua primeira despesa ou receita para começar a acompanhar suas finanças.'}
                      </p>
                      <button onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })} className="mt-6 text-sm font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition">
                        <PlusCircle className="w-4 h-4" /> Fazer um lançamento
                      </button>
                    </li>
                  )}

                  {hasNextPage && (
                    <li className="p-6 flex justify-center border-t border-slate-100 dark:border-slate-800">
                      <button 
                        onClick={() => fetchNextPage()} 
                        disabled={isFetchingNextPage}
                        className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-6 py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <ChevronDown className="w-4 h-4" />
                        {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {confirmDeleteTx && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            
            <div className="flex flex-col items-center text-center mb-5">
              <div className="bg-rose-100 dark:bg-rose-900/40 p-4 rounded-full mb-4 ring-4 ring-rose-50 dark:ring-rose-900/20">
                <Trash2 className="w-8 h-8 text-rose-600 dark:text-rose-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Excluir transação?</h2>
              <p className="text-sm text-slate-500 mt-1">Esta ação não pode ser desfeita</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 mb-5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Descrição</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate ml-2 max-w-[180px]">{confirmDeleteTx.description}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Valor</span>
                <span className={`font-bold ${confirmDeleteTx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {confirmDeleteTx.type === 'income' ? '+' : '-'} {brl(confirmDeleteTx.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Data</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {new Date(confirmDeleteTx.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
              {confirmDeleteTx.account_name && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Conta</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{confirmDeleteTx.account_name}</span>
                </div>
              )}
              {confirmDeleteTx.category_name && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Categoria</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{confirmDeleteTx.category_name}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setConfirmDeleteTx(null)} 
                className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition"
              >
                Cancelar
              </button>
              <button 
                onClick={() => { 
                  deleteTx.mutate(confirmDeleteTx.id); 
                  setConfirmDeleteTx(null); 
                }} 
                className="flex-1 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}