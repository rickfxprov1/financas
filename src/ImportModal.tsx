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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">Importar CSV</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><i data-lucide="x" className="w-5 h-5"></i></button>
        </div>
        <p className="text-xs text-slate-500 mb-4">Cole os dados no formato: <code className="bg-slate-100 dark:bg-slate-900 px-1 rounded text-indigo-500">Data,Descrição,Valor,Tipo</code></p>
        
        <textarea 
          value={text} onChange={e => setText(e.target.value)} 
          className="w-full border border-slate-300 dark:border-slate-600 p-4 rounded-xl h-48 font-mono text-sm bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 mb-4" 
          placeholder="2026-11-15,Almoço,25.50,expense"
        />
        
        <div className="flex gap-2">
          <button onClick={handleImport} className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl p-3 shadow-lg transition-all active:scale-95">Importar Dados</button>
        </div>
      </div>
    </div>
  );
}