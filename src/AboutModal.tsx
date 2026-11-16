import { X, BarChart3, Sparkles, Shield, Zap, Palette, Bug, Filter, RefreshCw, Database, Lock, ListFilter, TrendingUp } from 'lucide-react';

export function AboutModal({ onClose }: { onClose: () => void }) {
  const updates = [
    { 
      Icon: Filter, 
      title: 'Filtro por Conta', 
      desc: 'Seletor no topo permite visualizar saldo, gráficos, orçamentos e histórico de cada conta individualmente. A escolha é lembrada entre sessões.',
      isNew: true 
    },
    { 
      Icon: RefreshCw, 
      title: 'Sincronização de Backup', 
      desc: 'Mescla inteligente de backups sem duplicar transações. Escolha uma conta de destino ou mantenha as originais. Possibilidade de desfazer com um clique.',
      isNew: true 
    },
    { 
      Icon: Shield, 
      title: 'Proteção contra Perda de Dados', 
      desc: 'Ao excluir uma conta, o sistema avisa exatamente quantas transações serão apagadas. Ação requer confirmação explícita.',
      isNew: true 
    },
    { 
      Icon: Lock, 
      title: 'Segurança de Sessão Aprimorada', 
      desc: 'Sessão de 1 dia com renovação automática (sliding window), limpeza de sessões expiradas, invalidação global ao trocar senha e verificação periódica.',
      isNew: false 
    },
    { 
      Icon: ListFilter, 
      title: 'Paginação de Transações', 
      desc: 'Carregamento de 30 itens por vez com botão "Carregar Mais". Interface leve mesmo com milhares de lançamentos.',
      isNew: false 
    },
    { 
      Icon: Palette, 
      title: 'Interface Premium', 
      desc: 'Design glassmorphism, gradientes, ícones Lucide-React, responsividade completa mobile/desktop e Dark Mode.',
      isNew: false 
    },
    { 
      Icon: Database, 
      title: 'Robustez de Dados', 
      desc: 'Restore em lote (batch), Import CSV com suporte a vírgulas e formato brasileiro, backups detalhados com contagens.',
      isNew: false 
    },
    { 
      Icon: Zap, 
      title: 'Estabilidade', 
      desc: 'ErrorBoundary global, refresh seguro, tratamento de sessão expirada e migração completa para Lucide-React (sem bugs de DOM).',
      isNew: false 
    },
    { 
      Icon: TrendingUp, 
      title: 'Cálculos Corretos', 
      desc: 'Saldo real (independente do período) separado do resultado do período. Orçamentos que ignoram receitas na contagem de gastos.',
      isNew: false 
    },
    { 
      Icon: Bug, 
      title: 'Correções da Auditoria', 
      desc: 'Isolamento multiusuário, IDOR, validação de inputs, fuso horário, encoding, e mais 15 correções técnicas.',
      isNew: false 
    },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        <div className="flex justify-end mb-2 shrink-0">
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="flex flex-col items-center text-center shrink-0">
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-4 rounded-2xl shadow-lg shadow-emerald-500/30 text-white mb-4">
            <BarChart3 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Finanças Pro</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-slate-500">Versão</span>
            <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full">2.5.0</span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl text-sm text-slate-600 dark:text-slate-300 mt-4 shrink-0">
          <p>Seu gerenciador financeiro pessoal seguro e inteligente, construído na nuvem com Cloudflare.</p>
          <p className="mt-1 text-xs text-slate-500">Múltiplas contas, orçamentos, gráficos 3D, backup inteligente e PWA instalável.</p>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2 sticky top-0 bg-white dark:bg-slate-800 py-1">
            <Sparkles className="w-3.5 h-3.5" />
            O que há de novo na v2.5.0
          </h3>
          
          <ul className="space-y-2">
            {updates.map((u, i) => (
              <li 
                key={i} 
                className={`flex gap-3 p-3 rounded-xl border ${
                  u.isNew 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50' 
                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700/50'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 h-fit ${
                  u.isNew 
                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  <u.Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{u.title}</h4>
                    {u.isNew && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500 text-white px-1.5 py-0.5 rounded">Novo</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{u.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <button onClick={onClose} className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-medium rounded-xl py-3 hover:from-emerald-600 hover:to-emerald-800 transition-colors shrink-0 shadow-lg shadow-emerald-500/30">
          Entendi
        </button>
      </div>
    </div>
  );
}