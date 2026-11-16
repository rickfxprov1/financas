import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, RefreshCw, CheckCircle2, Loader2, Wallet, Tags, Receipt, Target, ArrowRightLeft, Building2, RotateCcw } from 'lucide-react';
import { api } from './api';
import toast from 'react-hot-toast';

interface Props {
  backupData: any;
  fileName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function MergeModal({ backupData, fileName, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'preview' | 'loading' | 'result'>('preview');
  const [result, setResult] = useState<any>(null);
  const [targetAccountId, setTargetAccountId] = useState<string>('');

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: api.accounts });

  const counts = {
    accounts: backupData.accounts?.length || 0,
    categories: backupData.categories?.length || 0,
    transactions: backupData.transactions?.length || 0,
    budgets: backupData.budgets?.length || 0,
  };

  const handleConfirm = async () => {
    setStep('loading');
    try {
      const res = await fetch('/api/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backup: backupData,
          target_account_id: targetAccountId ? Number(targetAccountId) : null,
        })
      });
      if (res.ok) {
        const data = await res.json();
        setResult({ ...data.stats, sync_batch_id: data.sync_batch_id });
        setStep('result');
        onSuccess();
      } else {
        toast.error('Erro ao sincronizar backup');
        onClose();
      }
    } catch {
      toast.error('Arquivo inválido');
      onClose();
    }
  };

  const handleUndo = async () => {
    if (!confirm(`Desfazer sincronização? Isso vai apagar as ${result.transactions_added} transações adicionadas.`)) return;
    try {
      const res = await fetch('/api/merge/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sync_batch_id: result.sync_batch_id })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.deleted} transações removidas`);
        onSuccess();
        onClose();
      } else {
        toast.error('Erro ao desfazer');
      }
    } catch {
      toast.error('Erro ao desfazer');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        
        {step === 'preview' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <ArrowRightLeft className="w-5 h-5 text-emerald-500" /> Sincronizar Backup
              </h2>
              <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 p-4 rounded-xl mb-4 flex gap-3">
              <RefreshCw className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Modo Mesclar</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                  As suas transações atuais <strong>serão mantidas</strong>. Apenas as novas serão adicionadas.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl mb-4">
              <p className="text-xs text-slate-500 mb-1">Arquivo selecionado:</p>
              <p className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate">{fileName}</p>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-500" />
                Conta de Destino
              </label>
              <select
                value={targetAccountId}
                onChange={e => setTargetAccountId(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              >
                <option value="">Manter contas originais do backup</option>
                {accounts?.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                {targetAccountId
                  ? `⚠️ Todas as transações serão redirecionadas para a conta selecionada (as contas originais do backup serão ignoradas).`
                  : `As transações manterão as contas originais do backup. Se a conta não existir, será criada automaticamente.`
                }
              </p>
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

            <p className="text-xs text-slate-500 mb-4 text-center">
              ℹ️ Transações duplicadas (mesma data, descrição, valor e conta) serão <strong>ignoradas automaticamente</strong>.
            </p>

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition">Cancelar</button>
              <button onClick={handleConfirm} className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-emerald-800 transition">Sincronizar</button>
            </div>
          </>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Sincronizando dados...</h2>
            <p className="text-sm text-slate-500 mt-1">Comparando transações e mesclando.</p>
          </div>
        )}

        {step === 'result' && result && (
          <>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="bg-emerald-100 dark:bg-emerald-900/40 p-4 rounded-full mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Sincronização Concluída!</h2>
              <p className="text-sm text-slate-500 mt-1">Seus dados foram mesclados com sucesso.</p>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl">
                <div className="flex items-center gap-2"><Receipt className="w-4 h-4 text-emerald-500" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Transações adicionadas</span></div>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{result.transactions_added}</span>
              </div>
              {result.transactions_redirected > 0 && (
                <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
                  <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-500" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Redirecionadas para conta destino</span></div>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{result.transactions_redirected}</span>
                </div>
              )}
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                <div className="flex items-center gap-2"><RefreshCw className="w-4 h-4 text-slate-400" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Duplicadas ignoradas</span></div>
                <span className="text-xl font-bold text-slate-500">{result.transactions_skipped}</span>
              </div>
              {!targetAccountId && (
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                  <div className="flex items-center gap-2"><Wallet className="w-4 h-4 text-slate-400" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Contas criadas / reusadas</span></div>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{result.accounts_created} / {result.accounts_reused}</span>
                </div>
              )}
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                <div className="flex items-center gap-2"><Tags className="w-4 h-4 text-slate-400" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Categorias criadas / reusadas</span></div>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{result.categories_created} / {result.categories_reused}</span>
              </div>
              {result.budgets_synced > 0 && (
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                  <div className="flex items-center gap-2"><Target className="w-4 h-4 text-slate-400" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Orçamentos sincronizados</span></div>
                  <span className="text-xl font-bold text-slate-600 dark:text-slate-300">{result.budgets_synced}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button onClick={onClose} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/30 transition">Concluir</button>
              <button onClick={handleUndo} className="w-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 font-medium rounded-xl py-3 hover:bg-rose-200 dark:hover:bg-rose-900/50 transition flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Desfazer Sincronização
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}