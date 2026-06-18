import React from 'react';
import toast from 'react-hot-toast';
import { X, CheckCircle2, AlertTriangle } from 'lucide-react';

export const showPremiumToast = (message: string, type: 'success' | 'error' = 'success') => {
    toast.custom((t) => (
        <div
            className={`${
                t.visible ? 'animate-fade-in' : 'animate-fade-out'
            } max-w-sm w-full bg-white shadow-xl rounded-2xl border border-slate-100 p-3.5 pointer-events-auto flex items-center justify-between gap-3.5 transition-all duration-300`}
        >
            <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                    {type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                </span>
                <p className="text-[11px] font-semibold text-slate-700 leading-snug">{message}</p>
            </div>
            <button
                onClick={() => toast.dismiss(t.id)}
                className="w-6 h-6 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            >
                <X size={14} />
            </button>
        </div>
    ), {
        duration: 4000,
        position: 'top-right'
    });
};
