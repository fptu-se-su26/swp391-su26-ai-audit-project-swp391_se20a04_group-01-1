import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
    if (!isOpen) return null;

    const isDanger = title.includes('nguy hiểm') || title.includes('sâu');

    return (
        <div 
            style={{
                animation: 'fadeIn 250ms ease-out forwards'
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
        >
            <div 
                style={{
                    animation: 'scaleUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                }}
                className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full mx-4"
            >
                <div className="flex items-center gap-3 mb-4">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isDanger ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
                    }`}>
                        <AlertTriangle size={20} />
                    </span>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                        {title}
                    </h3>
                </div>
                <p className="text-xs font-semibold text-slate-500 mb-6 leading-relaxed whitespace-pre-line">
                    {message}
                </p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all ${
                            isDanger
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-100'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
                        }`}
                    >
                        Xác nhận
                    </button>
                </div>
            </div>
        </div>
    );
}
