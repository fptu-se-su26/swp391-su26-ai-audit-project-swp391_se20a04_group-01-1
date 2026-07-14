import React from 'react';
import { ShieldAlert, CloudRain, Ban } from 'lucide-react';

interface AlertData {
    id: number;
    type: string;
    title: string;
    content: string;
    location: string;
    time: string;
}

interface AlertBannerProps {
    isOpen: boolean;
    countdown: number;
    alerts: AlertData[];
    onClose: () => void;
}

export function AlertBanner({ isOpen, countdown, alerts, onClose }: AlertBannerProps) {
    if (!isOpen) return null;

    return (
        <div className="absolute top-24 max-md:top-36 left-1/2 -translate-x-1/2 z-20 w-[460px] max-md:w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden shadow-danger">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <ShieldAlert size={18} className="animate-bounce" />
                    <div>
                        <div className="text-xs font-bold">Cảnh báo hôm nay</div>
                        <div className="text-[10px] opacity-90">Hệ thống ghi nhận thông báo cấm đường và ngập nước</div>
                    </div>
                </div>
                <button onClick={onClose} className="text-white/80 hover:text-white bg-white/10 p-1 rounded-full text-xs">✕</button>
            </div>

            <div className="p-3 flex flex-col gap-2 max-h-56 overflow-y-auto scrollbar-none">
                {alerts.slice(0, 2).map((alert) => (
                    <div key={alert.id} className="flex gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="shrink-0 mt-0.5">
                            {alert.type === 'flood' ? <CloudRain className="text-blue-500" size={16} /> : <Ban className="text-red-500" size={16} />}
                        </div>
                        <div>
                            <h4 className="text-[11px] font-bold text-slate-900">{alert.title}</h4>
                            <p className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">{alert.content}</p>
                            <span className="text-[9px] text-slate-400 mt-1 block">📍 {alert.location}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-slate-50 text-center py-2 text-[10px] text-red-500 font-bold border-t border-slate-100 tracking-wide">
                ⚠️ Cảnh báo sẽ tự động đóng sau {countdown}s
            </div>
        </div>
    );
}
