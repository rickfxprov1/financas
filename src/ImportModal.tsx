import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import toast from 'react-hot-toast';

export function ImportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [accountId, setAccountId] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: api.accounts });

  const handleImport = async () => {
    if (!text.trim()) return toast.error('Cole os dados do CSV.');
    if (!accountId) return toast.error('Selecione uma conta para importar.');

    setIsImporting(true);
    try {
      const res = await api.importCSV(text, Number(accountId));
      if (res.imported > 0) {
        toast.success(`${res.imported} transações importadas! ${res.skipped > 0 ? `(${res.skipped} linhas inválidas ignoradas)` : ''}`);
        qc.invalidateQueries({ queryKey: ['dashboard'] });
        qc.invalidateQueries({ queryKey: ['transactions'] });
        onClose();
      } else {
        toast.error('Nenhuma transação válida encontrada. Verifique o formato.');
      }
    } catch {
      toast.error('Erro ao importar. Verifique os dados.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">Importar CSV</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><i data-lucide="x" className="w-5 h-5"></i></button>
        </div>
        <p className="text-xs text-slate-500 mb-4">Formato: <code className="bg-slate-100 dark:bg-slate-900 px-1 rounded text-indigo-500">Data,Descrição,Valor,Tipo</code> (use aspas se a descrição tiver vírgula)</p>

        <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">Conta de Destino</label>
        <select
          value={accountId}
          onChange={e => setAccountId(e.target.value)}
          className="w-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl mb-3 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Selecione a conta...</option>
          {accounts?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        
        <textarea 
          value={text} onChange={e => setText(e.target.value)} 
          className="w-full border border-slate-300 dark:border-slate-600 p-4 rounded-xl h-48 font-mono text-sm bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 mb-4" 
          placeholder={'2026-11-15,Almoço,25.50,expense\n2026-11-16,"Padaria, pão",8.50,expense'}
        />
        
        <button 
          onClick={handleImport}
          disabled={isImporting}
          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl p-3 shadow-lg transition-all active:scale-95 disabled:opacity-50"
        >
          {isImporting ? 'Importando...' : 'Importar Dados'}
        </button>
      </div>
    </div>
  );
}