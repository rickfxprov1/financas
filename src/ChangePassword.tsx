import { useState } from 'react';
import toast from 'react-hot-toast';

export function ChangePassword({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: newPass })
    });
    if (res.ok) {
      toast.success('Senha alterada com sucesso!');
      onClose();
    } else {
      toast.error(await res.text());
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Trocar Senha</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><i data-lucide="x" className="w-5 h-5"></i></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" placeholder="Senha Atual" value={current} onChange={e => setCurrent(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required />
          <input type="password" placeholder="Nova Senha" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required />
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30">Atualizar Senha</button>
        </form>
      </div>
    </div>
  );
}