import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Target } from 'lucide-react';
import { api } from './api';
import toast from 'react-hot-toast';

export function BudgetsModal({ onClose, cats }: { onClose: () => void, cats: any[] }) {
  const qc = useQueryClient();
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const month = new Date().toISOString().slice(0, 7);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount) return;
    await api.setBudget({ category_id: Number(categoryId), amount: Number(amount), month });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    toast.success('Orçamento salvo!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><Target className="w-5 h-5 text-indigo-500" /> Definir Orçamento</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Categoria</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required>
              <option value="">Escolha a categoria</option>
              {cats?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Limite Mensal (R$)</label>
            <input type="number" step="0.01" placeholder="Ex: 500,00" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 mt-2">Salvar Orçamento</button>
        </form>
      </div>
    </div>
  );
}