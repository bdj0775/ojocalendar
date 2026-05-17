import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useStore } from '../../store/useStore';

const ICONS = {
  success: <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />,
  error:   <XCircle    size={18} className="text-red-500 flex-shrink-0" />,
  info:    <Info       size={18} className="text-blue-500 flex-shrink-0" />,
};

const BG = {
  success: 'border-emerald-200 bg-emerald-50',
  error:   'border-red-200   bg-red-50',
  info:    'border-blue-200  bg-blue-50',
};

const AUTO_DISMISS_MS = 4000;

export default function Toast() {
  const { toast, hideToast } = useStore();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hideToast, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [toast, hideToast]);

  if (!toast) return null;

  return (
    <div
      role="alert"
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] flex items-start gap-2.5 px-4 py-3 rounded-2xl border shadow-lg max-w-[90vw] w-max animate-[slideUp_0.2s_ease] ${BG[toast.type]}`}
    >
      {ICONS[toast.type]}
      <span className="text-sm font-medium text-slate-800 leading-snug whitespace-pre-line">
        {toast.message}
      </span>
      <button onClick={hideToast} className="ml-1 text-slate-400 hover:text-slate-600">
        <X size={14} />
      </button>
    </div>
  );
}
