import { useQuery } from '@tanstack/react-query';
import { X, BarChart3, Download } from 'lucide-react';
import { api } from './api';

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6', '#84cc16'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const brl = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
const fmtMonth = (m: string) => {
  const [y, mo] = String(m).split('-');
  return mo ? `${MONTHS[Number(mo) - 1]}/${y}` : m;
};

interface Props {
  onClose: () => void;
  filterQuery: string;
  periodLabel: string;
  accountName?: string;
}

export function ReportsModal({ onClose, filterQuery, periodLabel, accountName }: Props) {
  const { data: dash, isLoading: loadingDash } = useQuery({
    queryKey: ['dashboard', filterQuery],
    queryFn: () => api.dashboard(filterQuery),
  });
  const { data: txs, isLoading: loadingTx } = useQuery({
    queryKey: ['transactions', 'report', filterQuery],
    queryFn: () => api.list(`${filterQuery}&limit=500&offset=0`),
  });

  const loading = loadingDash || loadingTx;
  const monthly: any[] = dash?.monthly ?? [];
  const income = monthly.reduce((acc, m) => acc + (m.income || 0), 0);
  const expense = monthly.reduce((acc, m) => acc + (m.expense || 0), 0);
  const result = income - expense;
  const bills = dash?.bills;

  const categories: any[] = (dash?.byCategory ?? []).map((c: any, i: number, arr: any[]) => {
    const repeats = arr.filter((x: any) => x.color === c.color).length > 1;
    return { ...c, fill: repeats ? PALETTE[i % PALETTE.length] : c.color };
  });
  const categoriesTotal = categories.reduce((acc, c) => acc + c.total, 0);

  const list: any[] = txs ?? [];
  const topExpenses = list
    .filter(t => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const handleExport = () => {
    const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Data', 'Descrição', 'Tipo', 'Valor', 'Categoria', 'Conta', 'Situação'].join(';'),
      ...list.map(t => [
        fmtDate(t.date),
        esc(t.description),
        t.type === 'income' ? 'Receita' : 'Despesa',
        String(t.amount).replace('.', ','),
        esc(t.category_name || ''),
        esc(t.account_name || ''),
        t.type === 'expense' ? (t.paid ? 'Pago' : 'Pendente') : '',
      ].join(';')),
    ];
    const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-financas-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const tile = (label: string, value: string, cls: string) => (
    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-lg sm:text-xl font-black mt-1 tabular-nums break-words ${cls}`}>{value}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-start mb-5 gap-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <BarChart3 className="w-6 h-6 text-emerald-500" />
              Relatórios
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {periodLabel}{accountName ? ` • ${accountName}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto pr-1 space-y-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-700/50 rounded-2xl animate-pulse"></div>)}
            </div>
          ) : (
            <>
              <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {tile('Receitas', brl(income), 'text-emerald-500')}
                {tile('Despesas', brl(expense), 'text-rose-500')}
                {tile('Resultado', `${result >= 0 ? '+' : '-'} ${brl(Math.abs(result))}`, result >= 0 ? 'text-emerald-500' : 'text-rose-500')}
                {tile('Despesas pagas', brl(bills?.paid_total ?? 0), 'text-emerald-600 dark:text-emerald-400')}
                {tile('A pagar', brl(bills?.pending_total ?? 0), 'text-slate-700 dark:text-slate-200')}
                {tile('Vencidas', brl(bills?.overdue_total ?? 0), (bills?.overdue_count ?? 0) > 0 ? 'text-rose-500' : 'text-slate-400')}
              </section>

              <section>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3">Despesas por categoria</h3>
                {categories.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhuma despesa categorizada no período.</p>
                ) : (
                  <ul className="space-y-3">
                    {categories.map(c => {
                      const perc = categoriesTotal > 0 ? (c.total / categoriesTotal) * 100 : 0;
                      return (
                        <li key={c.name}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.fill }}></span>
                              <span className="truncate">{c.name}</span>
                            </span>
                            <span className="text-slate-500 font-medium tabular-nums whitespace-nowrap ml-2">
                              {brl(c.total)} <span className="text-slate-400">({perc.toFixed(0)}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${perc}%`, backgroundColor: c.fill }}></div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3">Maiores despesas</h3>
                {topExpenses.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhuma despesa no período.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {topExpenses.map(t => (
                      <li key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{t.description}</p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {fmtDate(t.date)}{t.category_name ? ` • ${t.category_name}` : ''} • {t.paid ? 'Pago' : 'Pendente'}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-rose-500 tabular-nums whitespace-nowrap">- {brl(t.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3">Mês a mês</h3>
                {monthly.length === 0 ? (
                  <p className="text-sm text-slate-400">Sem lançamentos no período.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-slate-400 text-right">
                          <th className="text-left font-bold pb-2">Mês</th>
                          <th className="font-bold pb-2">Receitas</th>
                          <th className="font-bold pb-2">Despesas</th>
                          <th className="font-bold pb-2">Resultado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 tabular-nums">
                        {monthly.map(m => {
                          const r = (m.income || 0) - (m.expense || 0);
                          return (
                            <tr key={m.month} className="text-right">
                              <td className="text-left py-2 font-semibold text-slate-700 dark:text-slate-300">{fmtMonth(m.month)}</td>
                              <td className="py-2 text-emerald-500">{brl(m.income || 0)}</td>
                              <td className="py-2 text-rose-500">{brl(m.expense || 0)}</td>
                              <td className={`py-2 font-bold ${r >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{brl(r)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {list.length >= 500 && (
                <p className="text-[11px] text-slate-400">Listas e exportação consideram os 500 lançamentos mais recentes do período.</p>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={handleExport}
            disabled={loading || list.length === 0}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/30 flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button onClick={onClose} className="px-5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
