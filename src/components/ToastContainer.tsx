import React from 'react';
import { Radio, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useOrbit } from '../context/OrbitContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useOrbit();

  if (toasts.length === 0) return null;

  return (
    <div
      id="orbit-toast-container"
      aria-live="polite"
      className="fixed bottom-16 md:bottom-6 right-4 md:right-8 z-50 flex flex-col gap-2 pointer-events-none select-none max-w-sm w-full"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto bg-[#101419] border border-[#293138] rounded-sm p-3.5 shadow-2xl flex items-start gap-3 text-[#F1F1ED] animate-in slide-in-from-bottom-3 duration-150"
        >
          {t.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-[#B7E66A] shrink-0 mt-0.5" />
          ) : t.type === 'alert' ? (
            <AlertCircle className="w-4 h-4 text-[#FF5A4F] shrink-0 mt-0.5" />
          ) : (
            <Radio className="w-4 h-4 text-[#FF5A4F] shrink-0 mt-0.5" />
          )}

          <div className="flex-1 overflow-hidden">
            <h4 className="font-display font-bold text-xs uppercase tracking-wide text-[#F1F1ED]">
              {t.title}
            </h4>
            {t.description && (
              <p className="font-sans text-[11px] text-[#91A0AE] mt-0.5 leading-snug">
                {t.description}
              </p>
            )}
          </div>

          <button
            onClick={() => removeToast(t.id)}
            className="text-[#60707F] hover:text-[#F1F1ED] p-0.5 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
