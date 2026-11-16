import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Wallet, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function ManageAccounts({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [type, setType] = useState('checking');

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: () => fetch('/api/accounts').then(r => r.json()) });

  const addAcc = useMutation({
    mutationFn: (newAcc: any) => fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newAcc) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Conta criada!');
      setName(''); setBalance('');
    }
  });

  const delAcc = useMutation({
    mutationFn: (id: number) => fetch(`/api/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Conta excluída!');
    }
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><Wallet className="w-5 h-5 text-indigo-500" /> Minhas Contas</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={e => { e.preventDefault(); addAcc.mutate({ name, type, initial_balance: Number(balance) || 0 }); }} className="grid grid-cols-2 gap-3 mb-6">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome (ex: Nubank)" className="col-span-2 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required />
          <input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="Saldo Inicial (R$)" className="border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
          <select value={type} onChange={e => setType(e.target.value)} className="border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="checking">Conta Corrente</option>
            <option value="savings">Poupança</option>
            <option value="credit">Cartão de Crédito</option>
            <option value="cash">Dinheiro</option>
          </select>
          <button type="submit" className="col-span-2 bg-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-indigo-700 font-medium transition">Adicionar Conta</button>
        </form>

        <ul className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 mb-2">
          {accounts?.map((a: any) => (
            <li key={a.id} className="py-3 flex justify-between items-center group">
              <div className="flex flex-col">
                <span className="font-bold text-slate-800 dark:text-slate-200">{a.name}</span>
                <span className="text-xs text-slate-500 capitalize">{a.type === 'checking' ? 'Conta Corrente' : a.type === 'credit' ? 'Cartão' : a.type}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-slate-600 dark:text-slate-400">R$ {a.initial_balance.toFixed(2)}</span>
                <button onClick={() => { if(confirm('Excluir esta conta apagará TODAS as transações vinculadas. Continuar?')) delAcc.mutate(a.id) }} className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"><Trash2 className="w-4 h-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}