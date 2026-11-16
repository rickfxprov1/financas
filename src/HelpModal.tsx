import { X, HelpCircle, Wallet, PlusCircle, Target, Tags, DownloadCloud, Moon } from 'lucide-react';

export function HelpModal({ onClose }: { onClose: () => void }) {
  const topics = [
    { Icon: Wallet, title: 'Visão Geral', desc: 'Acompanhe seu saldo no período selecionado, a divisão de despesas por categoria e o fluxo de caixa mensal.' },
    { Icon: PlusCircle, title: 'Lançamentos', desc: 'Use o formulário no canto inferior esquerdo para adicionar receitas e despesas. Você pode editá-los ou excluí-los no histórico.' },
    { Icon: Target, title: 'Orçamentos', desc: 'Defina limites mensais de gastos para cada categoria. O sistema avisará com barras de progresso se você estiver chegando perto do limite.' },
    { Icon: Tags, title: 'Categorias', desc: 'Crie e personalize suas categorias com cores diferentes para facilitar a visualização nos gráficos.' },
    { Icon: DownloadCloud, title: 'Backup e Dados', desc: 'Na aba de Ferramentas, você pode baixar um backup completo em JSON ou importar transações em massa via CSV.' },
    { Icon: Moon, title: 'Tema e PWA', desc: 'Alterne entre modo claro e escuro no topo da tela. Use a opção "Instalar App" no menu para ter o app no seu celular ou PC.' }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <HelpCircle className="w-6 h-6 text-indigo-500" />
            Central de Ajuda
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto pr-2 space-y-4">
          {topics.map((t, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
              <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-lg shrink-0 h-fit">
                <t.Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">{t.title}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onClose} className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-xl py-3 hover:from-indigo-700 hover:to-violet-700 transition-colors shadow-lg">
          Entendi
        </button>
      </div>
    </div>
  );
}