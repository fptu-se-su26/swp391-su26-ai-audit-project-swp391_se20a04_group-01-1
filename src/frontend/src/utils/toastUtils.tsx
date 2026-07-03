import React from 'react';
import toast from 'react-hot-toast';
import { X, Check, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export const showPremiumToast = (message: string, type: ToastType = 'success', duration = 4000) => {
    toast.custom((t) => {
        // Cấu hình Icon, tiền tố, và màu thanh tiến trình
        let IconElement = <Check size={14} />;
        let iconBgClass = 'bg-emerald-500 text-white';
        let barColor = 'bg-emerald-500';
        let prefix = 'Thành công';

        if (type === 'error') {
            IconElement = <X size={14} />;
            iconBgClass = 'bg-rose-500 text-white';
            barColor = 'bg-rose-500';
            prefix = 'Lỗi';
        } else if (type === 'warning') {
            IconElement = <AlertTriangle size={18} className="text-amber-500" />;
            iconBgClass = 'bg-amber-50'; // Warning thường có nền vàng nhạt cho triangle icon
            barColor = 'bg-amber-500';
            prefix = 'Cảnh báo';
        } else if (type === 'info') {
            IconElement = <Info size={14} />;
            iconBgClass = 'bg-sky-500 text-white';
            barColor = 'bg-sky-500';
            prefix = 'Thông tin';
        }

        return (
            <div
                className={`${
                    t.visible ? 'animate-fade-in' : 'animate-fade-out'
                } relative overflow-hidden max-w-md w-full bg-white shadow-xl rounded-2xl border border-slate-100/80 p-4 pointer-events-auto flex items-center justify-between gap-4 transition-all duration-300`}
                style={{
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 16px -6px rgba(0, 0, 0, 0.05)'
                }}
            >
                {/* Style nhúng nội bộ vẽ thanh progress bar co lại */}
                <style>{`
                    @keyframes toastProgressShrink {
                        from { width: 100%; }
                        to { width: 0%; }
                    }
                `}</style>

                <div className="flex items-center gap-3.5">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${iconBgClass}`}>
                        {IconElement}
                    </span>
                    <p className="text-[12px] font-medium text-slate-700 leading-snug text-left">
                        <span className="font-bold text-slate-900">{prefix}:</span> {message}
                    </p>
                </div>
                
                <button
                    type="button"
                    onClick={() => toast.dismiss(t.id)}
                    className="w-6 h-6 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                >
                    <X size={14} />
                </button>

                {/* Thanh tiến trình thời gian co dần ở đáy */}
                <div 
                    style={{ 
                        animation: `toastProgressShrink ${duration}ms linear forwards`
                    }} 
                    className={`absolute bottom-0 left-0 h-[3px] rounded-r-full ${barColor}`} 
                />
            </div>
        );
    }, {
        duration: duration,
        position: 'top-right'
    });
};