import { useState } from 'react';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-4">
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-4 rounded-2xl shadow-lg shadow-indigo-500/30 text-white mb-4">
            <i data-lucide="bar-chart-3" className="w-8 h-8"></i>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Finanças</h2>
          <p className="text-indigo-400 text-xs font-bold tracking-widest uppercase mt-1">Open Finance</p>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg mb-4 text-center">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <i data-lucide="mail" className="absolute left-3 top-3.5 w-5 h-5 text-slate-400"></i>
            <input
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-500"
              required
            />
          </div>
          <div className="relative">
            <i data-lucide="lock" className="absolute left-3 top-3.5 w-5 h-5 text-slate-400"></i>
            <input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-500"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2 mt-2"
          >
            {isLoading ? 'Processando...' : (isRegister ? 'Criar Conta' : 'Entrar')}
          </button>
        </form>
        
        <button
          onClick={() => { setIsRegister(!isRegister); setError(''); }}
          className="mt-6 text-sm text-slate-400 hover:text-indigo-400 transition-colors w-full text-center"
        >
          {isRegister ? 'Já tenho uma conta' : 'Ainda não tenho conta'}
        </button>
      </div>
    </div>
  );
}