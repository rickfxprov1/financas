import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Wallet, Trash2, AlertTriangle, Edit, Plus, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export function ManageAccounts({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [type, setType] = useState('checking');
  const [editId, setEditId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string; count: number } | null>(null);

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: () => fetch('/api/accounts').then(r => r.json()) });
  const { data: stats } = useQuery({ queryKey: ['accounts-stats'], queryFn: () => fetch('/api/accounts/stats').then(r => r.json()) });

  const addAcc = useMutation({
    mutationFn: (newAcc: any) => fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newAcc) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['accounts-stats'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Conta criada!');
      resetForm();
    }
  });

  const updateAcc = useMutation({
    mutationFn: (data: any) => fetch(`/api/accounts/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['yearly'] });
      toast.success('Conta atualizada!');
      resetForm();
    }
  });

  const delAcc = useMutation({
    mutationFn: (id: number) => fetch(`/api/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['accounts-stats'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['yearly'] });
      toast.success('Conta excluída!');
      setConfirmDelete(null);
    }
  });

  const resetForm = () => {
    setName(''); setBalance(''); setType('checking'); setEditId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name: name.trim(), type, initial_balance: Number(balance) || 0 };
    if (editId) {
      updateAcc.mutate(data);
    } else {
      addAcc.mutate(data);
    }
  };

  const handleEditClick = (a: any) => {
    setEditId(a.id);
    setName(a.name);
    setType(a.type);
    setBalance(a.initial_balance.toString());
  };

  const handleDeleteClick = (a: any) => {
    const count = stats?.[a.id] || 0;
    setConfirmDelete({ id: a.id, name: a.name, count });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2"><Wallet className="w-5 h-5 text-indigo-500" /> Minhas Contas</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><X className="w-5 h-5" /></button>
        </div>
        
        {/* FORMULÁRIO (ADD ou EDIT) */}
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 mb-6 shrink-0">
          {editId && (
            <div className="col-span-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 p-2.5 rounded-xl flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Edit className="w-3.5 h-3.5" /> Editando conta
              </span>
              <button 
                type="button" 
                onClick={resetForm} 
                className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline"
              >
                Cancelar
              </button>
            </div>
          )}
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="Nome (ex: Nubank)" 
            className="col-span-2 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200" 
            required 
          />
          <input 
            type="number" 
            step="0.01" 
            value={balance} 
            onChange={e => setBalance(e.target.value)} 
            placeholder="Saldo Inicial (R$)" 
            className="border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200" 
          />
          <select 
            value={type} 
            onChange={e => setType(e.target.value)} 
            className="border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
          >
            <option value="checking">Conta Corrente</option>
            <option value="savings">Poupança</option>
            <option value="credit">Cartão de Crédito</option>
            <option value="cash">Dinheiro</option>
            <option value="investment">Investimento</option>
          </select>
          <button 
            type="submit" 
            className={`col-span-2 font-medium px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 text-white ${
              editId 
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {editId ? <><Check className="w-4 h-4" /> Salvar Alterações</> : <><Plus className="w-4 h-4" /> Adicionar Conta</>}
          </button>
        </form>

        {/* LISTA DE CONTAS */}
        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {accounts?.map((a: any) => {
              const txCount = stats?.[a.id] || 0;
              const isEditing = editId === a.id;
              return (
                <li 
                  key={a.id} 
                  className={`py-3 flex justify-between items-center group rounded-lg px-2 -mx-2 transition-colors ${
                    isEditing ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{a.name}</span>
                    <span className="text-xs text-slate-500 capitalize">
                      {a.type === 'checking' ? 'Conta Corrente' : a.type === 'credit' ? 'Cartão' : a.type === 'savings' ? 'Poupança' : a.type === 'investment' ? 'Investimento' : a.type} • {txCount} transações
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-600 dark:text-slate-400 text-sm">R$ {a.initial_balance.toFixed(2)}</span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEditClick(a)} 
                        className={`p-2 rounded-lg transition ${
                          isEditing 
                            ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/40' 
                            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                        }`}
                        title="Editar conta"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(a)} 
                        className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition" 
                        title="Excluir conta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
            {(!accounts || accounts.length === 0) && (
              <li className="py-8 text-center text-slate-500 text-sm">
                Nenhuma conta cadastrada ainda.
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="bg-rose-100 dark:bg-rose-900/40 p-4 rounded-full mb-4">
                <AlertTriangle className="w-10 h-10 text-rose-600 dark:text-rose-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Excluir conta "{confirmDelete.name}"?</h2>
              <p className="text-sm text-slate-500 mt-2">
                Esta conta tem <strong className="text-rose-600 dark:text-rose-400">{confirmDelete.count} transações</strong>.
              </p>
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/50 p-3 rounded-xl mt-4">
                <p className="text-xs text-rose-700 dark:text-rose-400 font-semibold">
                  ⚠️ TODAS as {confirmDelete.count} transações serão APAGADAS junto com a conta.
                </p>
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                  Esta ação NÃO pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition">Cancelar</button>
              <button onClick={() => delAcc.mutate(confirmDelete.id)} className="flex-1 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-500/30 transition">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}