export type ResultInfo = {
  kind: 'success' | 'error';
  title: string;
  message?: string;
  items?: { label: string; value: number }[];
  warning?: string;
  note?: string;
};

export function ResultModal({ info, onClose }: { info: ResultInfo; onClose: () => void }) {
  const ok = info.kind === 'success';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 text-center"
      >
        <div className={`mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center ${ok ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
            {ok ? <path d="M5 13l4 4L19 7" /> : <path d="M6 6l12 12M18 6L6 18" />}
          </svg>
        </div>

        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{info.title}</h2>

        {info.message && (
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 break-words">{info.message}</p>
        )}

        {info.items && info.items.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {info.items.map((item) => (
              <div key={item.label} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl py-3 px-2">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{item.label}</div>
              </div>
            ))}
          </div>
        )}

        {info.warning && (
          <div className="mt-4 text-left text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-xl p-3">
            {info.warning}
          </div>
        )}

        {info.note && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">{info.note}</p>
        )}

        <button
          onClick={onClose}
          className={`w-full mt-6 font-medium rounded-xl py-3 transition-colors ${ok ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600'}`}
        >
          OK
        </button>
      </div>
    </div>
  );
}
