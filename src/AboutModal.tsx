import { X, BarChart3, Sparkles, Shield, Zap, Palette, Bug, Filter, RefreshCw, Database, Lock, ListFilter, TrendingUp, Calendar, Edit, Trash2 } from 'lucide-react';

export function AboutModal({ onClose }: { onClose: () => void }) {
  const newFeatures = [
    { 
      Icon: Trash2, 
      title: 'Modal Premium de Exclusão', 
      desc: 'Ao excluir uma transação, um modal elegante mostra todos os detalhes (descrição, valor, data, conta e categoria) antes de confirmar a ação.' 
    },
    { 
      Icon: Edit, 
      title: 'Edição de Contas', 
      desc: 'Agora você pode editar o nome, saldo inicial e tipo de qualquer conta existente. O formulário se preenche automaticamente ao clicar no lápis.' 
    },
    { 
      Icon: Calendar, 
      title: 'Período Personalizado', 
      desc: 'Escolha qualquer intervalo de datas (De / Até) para analisar suas finanças. Datas salvas entre sessões, com validação automática.' 
    },
    { 
      Icon: TrendingUp, 
      title: 'Análise de Saldo do Período', 
      desc: 'Card de saldo mostra o saldo inicial, saldo final do período, variação em R$ e variação em %. Análise completa em uma olhada.' 
    },
  ];

  const previousFeatures = [
    { 
      Icon: Filter, 
      title: 'Filtro por Conta', 
      desc: 'Seletor no topo permite visualizar saldo, gráficos, orçamentos e histórico de cada conta individualmente. A escolha é lembrada entre sessões.' 
    },
    { 
      Icon: RefreshCw, 
      title: 'Sincronização de Backup', 
      desc: 'Mescla inteligente de backups sem duplicar transações. Escolha uma conta de destino ou mantenha as originais. Possibilidade de desfazer.' 
    },
    { 
      Icon: Shield, 
      title: 'Proteção contra Perda de Dados', 
      desc: 'Ao excluir uma conta, o sistema avisa exatamente quantas transações serão apagadas. Ação requer confirmação explícita.' 
    },
    { 
      Icon: Lock, 
      title: 'Segurança de Sessão', 
      desc: 'Sessão de 1 dia com renovação automática (sliding window), limpeza de sessões expiradas, invalidação global ao trocar senha.' 
    },
    { 
      Icon: ListFilter, 
      title: 'Paginação de Transações', 
      desc: 'Carregamento de 30 itens por vez com botão "Carregar Mais". Interface leve mesmo com milhares de lançamentos.' 
    },
    { 
      Icon: Palette, 
      title: 'Interface Premium', 
      desc: 'Design glassmorphism, gradientes, ícones Lucide-React, responsividade completa mobile/desktop e Dark Mode.' 
    },
    { 
      Icon: Database, 
      title: 'Robustez de Dados', 
      desc: 'Restore em lote (batch), Import CSV com suporte a vírgulas e formato brasileiro, backups detalhados com contagens.' 
    },
    { 
      Icon: Zap, 
      title: 'Estabilidade', 
      desc: 'ErrorBoundary global, refresh seguro, tratamento de sessão expirada e migração completa para Lucide-React.' 
    },
    { 
      Icon: Bug, 
      title: 'Correções da Auditoria', 
      desc: 'Isolamento multiusuário, IDOR, validação de inputs, fuso horário, encoding, e mais 15 correções técnicas.' 
    },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-end mb-2 shrink-0">
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><X className="w-5 h-5" /></button>
        </div>
        
        {/* Logo + Nome + Versão */}
        <div className="flex flex-col items-center text-center shrink-0">
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-4 rounded-2xl shadow-lg shadow-emerald-500/30 text-white mb-4">
            <BarChart3 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Finanças Pro</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-slate-500">Versão</span>
            <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full">2.9.0</span>
          </div>
        </div>

        {/* Descrição */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl text-sm text-slate-600 dark:text-slate-300 mt-4 shrink-0">
          <p>Seu gerenciador financeiro pessoal seguro e inteligente, construído na nuvem com Cloudflare.</p>
          <p className="mt-1 text-xs text-slate-500">Múltiplas contas, orçamentos, gráficos 3D, backup inteligente e PWA instalável.</p>
        </div>

        {/* Changelog */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          {/* NOVIDADES v2.9.0 */}
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-3 flex items-center gap-2 sticky top-0 bg-white dark:bg-slate-800 py-1">
            <Sparkles className="w-3.5 h-3.5" />
            Novidades da v2.9.0
          </h3>
          
          <ul className="space-y-2 mb-6">
            {newFeatures.map((u, i) => (
              <li 
                key={i} 
                className="flex gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50"
              >
                <div className="p-2 rounded-lg shrink-0 h-fit bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                  <u.Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{u.title}</h4>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500 text-white px-1.5 py-0.5 rounded">Novo</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{u.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* RECURSOS ANTERIORES */}
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            Recursos anteriores
          </h3>
          
          <ul className="space-y-2">
            {previousFeatures.map((u, i) => (
              <li 
                key={i} 
                className="flex gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50"
              >
                <div className="p-2 rounded-lg shrink-0 h-fit bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                  <u.Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{u.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{u.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <button onClick={onClose} className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-medium rounded-xl py-3 hover:from-emerald-600 hover:to-emerald-800 transition-colors shrink-0 shadow-lg shadow-emerald-500/30">
          Entendi
        </button>
      </div>
    </div>
  );
}