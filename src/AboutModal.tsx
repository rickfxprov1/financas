export function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 text-center">
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><i data-lucide="x" className="w-5 h-5"></i></button>
        </div>
        
        <div className="flex justify-center mb-4">
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-4 rounded-2xl shadow-lg shadow-emerald-500/30 text-white">
            <i data-lucide="bar-chart-3" className="w-8 h-8"></i>
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Finanças Pro</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">Versão 1.0.0</p>
        
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl text-sm text-slate-600 dark:text-slate-300 mb-6">
          <p>Seu gerenciador financeiro pessoal seguro e inteligente, construído na nuvem com Cloudflare.</p>
        </div>

        <button onClick={onClose} className="w-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-medium rounded-xl py-3 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
          Fechar
        </button>
      </div>
    </div>
  );
}