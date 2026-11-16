import { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, Database, Wallet, Tags, Receipt, Target, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  backupData: any;
  fileName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RestoreModal({ backupData, fileName, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'preview' | 'loading' | 'result'>('preview');
  const [result, setResult] = useState<any>(null);

  const counts = {
    accounts: backupData.accounts?.length || 0,
    categories: backupData.categories?.length || 0,
    transactions: backupData.transactions?.length || 0,
    budgets: backupData.budgets?.length || 0,
  };

  const handleConfirm = async () => {
    setStep('loading');
    try {
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData)
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data.counts);
        setStep('result');
        onSuccess();
      } else {
        toast.error('Erro ao restaurar backup');
        onClose();
      }
    } catch {
      toast.error('Arquivo inválido');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
        
        {step === 'preview' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Database className="w-5 h-5 text-indigo-500" /> Restaurar Backup
              </h2>
              <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 p-4 rounded-xl mb-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Atenção!</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Esta ação vai <strong>substituir TODOS</strong> os seus dados atuais pelo conteúdo do arquivo.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl mb-4">
              <p className="text-xs text-slate-500 mb-1">Arquivo selecionado:</p>
              <p className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate">{fileName}</p>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Conteúdo do backup:</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-emerald-500" /><span className="text-xs text-slate-500">Contas</span></div>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{counts.accounts}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2 mb-1"><Tags className="w-4 h-4 text-indigo-500" /><span className="text-xs text-slate-500">Categorias</span></div>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{counts.categories}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2 mb-1"><Receipt className="w-4 h-4 text-blue-500" /><span className="text-xs text-slate-500">Transações</span></div>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{counts.transactions}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-orange-500" /><span className="text-xs text-slate-500">Orçamentos</span></div>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{counts.budgets}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition">Cancelar</button>
              <button onClick={handleConfirm} className="flex-1 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-500/30 hover:from-rose-600 hover:to-red-700 transition">Confirmar</button>
            </div>
          </>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Restaurando dados...</h2>
            <p className="text-sm text-slate-500 mt-1">Isso pode levar alguns segundos.</p>
          </div>
        )}

        {step === 'result' && result && (
          <>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="bg-emerald-100 dark:bg-emerald-900/40 p-4 rounded-full mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Backup Restaurado!</h2>
              <p className="text-sm text-slate-500 mt-1">Todos os dados foram recuperados com sucesso.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-700/30">
                <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-emerald-500" /><span className="text-xs text-emerald-700 dark:text-emerald-400">Contas</span></div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{result.accounts}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-700/30">
                <div className="flex items-center gap-2 mb-1"><Tags className="w-4 h-4 text-emerald-500" /><span className="text-xs text-emerald-700 dark:text-emerald-400">Categorias</span></div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{result.categories}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-700/30">
                <div className="flex items-center gap-2 mb-1"><Receipt className="w-4 h-4 text-emerald-500" /><span className="text-xs text-emerald-700 dark:text-emerald-400">Transações</span></div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{result.transactions}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-700/30">
                <div className="flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-emerald-500" /><span className="text-xs text-emerald-700 dark:text-emerald-400">Orçamentos</span></div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{result.budgets}</p>
              </div>
            </div>

            <button onClick={onClose} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/30 transition">Concluir</button>
          </>
        )}
      </div>
    </div>
  );
}