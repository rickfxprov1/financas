import { X, CheckCircle2, AlertTriangle, FileUp } from 'lucide-react';

interface Props {
  imported: number;
  skipped: number;
  onClose: () => void;
}

export function ImportResultModal({ imported, skipped, onClose }: Props) {
  const hasSkipped = skipped > 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <FileUp className="w-5 h-5 text-emerald-500" /> Importação Concluída
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="bg-emerald-100 dark:bg-emerald-900/40 p-4 rounded-full mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{imported}</p>
          <p className="text-sm text-slate-500 mt-1">transações importadas com sucesso</p>
        </div>

        {hasSkipped && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 p-4 rounded-xl mb-6 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{skipped} linhas ignoradas</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Algumas linhas estavam inválidas (data, valor ou tipo incorretos). Verifique o formato e tente novamente.
              </p>
            </div>
          </div>
        )}

        <button onClick={onClose} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/30 transition">Concluir</button>
      </div>
    </div>
  );
}