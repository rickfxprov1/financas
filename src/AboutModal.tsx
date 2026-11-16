import { X, BarChart3, Sparkles, Shield, Zap, Palette, Bug, Check } from 'lucide-react';

export function AboutModal({ onClose }: { onClose: () => void }) {
  const updates = [
    { Icon: Shield, title: 'Segurança reforçada', desc: 'Correções de IDOR, isolamento multiusuário e validação de inputs em todas as rotas.' },
    { Icon: Zap, title: 'Estabilidade', desc: 'ErrorBoundary global, refresh seguro e tratamento de sessão expirada.' },
    { Icon: Palette, title: 'UI Premium', desc: 'Nova interface fintech com glassmorphism, gradientes e design responsivo mobile/desktop.' },
    { Icon: Sparkles, title: 'Migração Lucide-React', desc: 'Ícones agora são componentes React puros, eliminando o bug de tela branca (removeChild).' },
    { Icon: Bug, title: 'Correções de cálculo', desc: 'Saldo real independente do período e orçamentos que ignoram receitas.' },
    { Icon: Check, title: 'Robustez nos dados', desc: 'Restore com batch, Import CSV suportando vírgulas e formato brasileiro.' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-end mb-2 shrink-0">
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><X className="w-5 h-5" /></button>
        </div>
        
        {/* Logo + Nome */}
        <div className="flex flex-col items-center text-center shrink-0">
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-4 rounded-2xl shadow-lg shadow-emerald-500/30 text-white mb-4">
            <BarChart3 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Finanças Pro</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-slate-500">Versão</span>
            <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full">2.3.0</span>
          </div>
        </div>

        {/* Descrição */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl text-sm text-slate-600 dark:text-slate-300 mt-6 shrink-0">
          <p>Seu gerenciador financeiro pessoal seguro e inteligente, construído na nuvem com Cloudflare.</p>
        </div>

        {/* Changelog */}
        <div className="mt-6 flex-1 overflow-y-auto pr-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            O que há de novo
          </h3>
          
          <ul className="space-y-3">
            {updates.map((u, i) => (
              <li key={i} className="flex gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-lg shrink-0 h-fit">
                  <u.Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{u.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{u.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <button onClick={onClose} className="w-full mt-4 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-medium rounded-xl py-3 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shrink-0">
          Fechar
        </button>
      </div>
    </div>
  );
}