import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2, Tags } from 'lucide-react';
import toast from 'react-hot-toast';

export function ManageCategories({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');

  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: () => fetch('/api/categories').then(r => r.json()) });

  const addCat = useMutation({
    mutationFn: (newCat: any) => fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCat) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria criada!');
      setName('');
    }
  });

  const delCat = useMutation({
    mutationFn: (id: number) => fetch(`/api/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria excluída!');
    }
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><Tags className="w-5 h-5 text-indigo-500" /> Gerenciar Categorias</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={e => { e.preventDefault(); addCat.mutate({ name, color }); }} className="flex gap-2 mb-6">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nova categoria" className="border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl flex-1 outline-none focus:ring-2 focus:ring-indigo-500" required />
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-12 h-12 p-0 border-0 rounded-xl cursor-pointer bg-transparent" />
          <button type="submit" className="bg-indigo-600 text-white px-4 rounded-xl hover:bg-indigo-700 transition"><Plus className="w-5 h-5" /></button>
        </form>

        <ul className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 mb-2">
          {cats?.map((c: any) => (
            <li key={c.id} className="py-3 flex justify-between items-center group">
              <span className="flex items-center gap-3 font-medium">
                <span className="w-4 h-4 rounded-full shadow-sm" style={{ background: c.color }}></span>
                {c.name}
              </span>
              <button onClick={() => delCat.mutate(c.id)} className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}