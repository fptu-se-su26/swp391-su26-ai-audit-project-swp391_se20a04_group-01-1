import React from 'react';
import { Plus, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { TrafficAlert } from './types';

interface Props {
    trafficAlerts: TrafficAlert[];
    toggleTrafficStatus: (id: number) => void;
    showTrafficModal: boolean;
    setShowTrafficModal: (v: boolean) => void;
    trafficFormData: {
        title: string;
        location: string;
        type: 'CONGESTION' | 'ACCIDENT' | 'CONSTRUCTION';
        severity: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    setTrafficFormData: (v: any) => void;
    handleCreateTrafficAlert: (e: React.FormEvent) => void;
}

export default function TrafficTab({
    trafficAlerts, toggleTrafficStatus,
    showTrafficModal, setShowTrafficModal,
    trafficFormData, setTrafficFormData, handleCreateTrafficAlert
}: Props) {
    return (
        <>
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                    <h3 className="text-base font-bold text-slate-800">Thông báo Sự cố giao thông thời gian thực</h3>
                    <button
                        onClick={() => setShowTrafficModal(true)}
                        className="bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl hover:bg-orange-700 transition flex items-center gap-2 text-sm shadow-md"
                    >
                        <Plus size={16} /> Báo cáo sự cố khẩn
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {trafficAlerts.map(alert => (
                        <div key={alert.id} className={`bg-white rounded-2xl border p-5 shadow-sm relative overflow-hidden transition ${alert.is_active ? 'border-orange-200' : 'border-slate-200 opacity-60'}`}>
                            <div className={`absolute top-0 left-0 w-full h-1 ${!alert.is_active ? 'bg-slate-300' :
                                alert.severity === 'HIGH' ? 'bg-red-500' :
                                alert.severity === 'MEDIUM' ? 'bg-orange-500' : 'bg-blue-500'
                            }`} />

                            <div className="flex items-start justify-between mt-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                                    alert.type === 'CONGESTION' ? 'bg-orange-50 border-orange-200 text-orange-600' :
                                    alert.type === 'ACCIDENT' ? 'bg-red-50 border-red-200 text-red-600' :
                                    'bg-blue-50 border-blue-200 text-blue-600'
                                }`}>
                                    {alert.type === 'CONGESTION' ? 'Kẹt xe' : alert.type === 'ACCIDENT' ? 'Tai nạn' : 'Thi công'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">{alert.created_at}</span>
                            </div>

                            <h4 className="font-bold text-slate-800 text-sm mt-3 leading-snug">{alert.title}</h4>
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">📍 {alert.location}</p>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                                <span className={`text-xs font-bold ${
                                    alert.severity === 'HIGH' ? 'text-red-500' :
                                    alert.severity === 'MEDIUM' ? 'text-orange-500' : 'text-blue-500'
                                }`}>
                                    Cấp độ: {alert.severity}
                                </span>
                                <button
                                    onClick={() => toggleTrafficStatus(alert.id)}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${alert.is_active
                                        ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                                        : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                                    }`}
                                >
                                    {alert.is_active ? 'Gỡ cảnh báo' : 'Kích hoạt lại'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal: Báo cáo sự cố */}
            {showTrafficModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col border border-slate-200 animate-slide-up">
                        <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Báo Cáo Sự Cố Giao Thông Khẩn
                            </h3>
                            <button onClick={() => setShowTrafficModal(false)} className="text-white/80 hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTrafficAlert} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mô tả sự cố (*)</label>
                                <input
                                    required type="text"
                                    placeholder="VD: Kẹt xe kéo dài, có va chạm..."
                                    value={trafficFormData.title}
                                    onChange={(e) => setTrafficFormData({ ...trafficFormData, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Địa điểm xảy ra (*)</label>
                                <input
                                    required type="text"
                                    placeholder="VD: Nút giao Lê Duẩn - Bạch Đằng"
                                    value={trafficFormData.location}
                                    onChange={(e) => setTrafficFormData({ ...trafficFormData, location: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phân loại sự cố</label>
                                    <select
                                        value={trafficFormData.type}
                                        onChange={(e) => setTrafficFormData({ ...trafficFormData, type: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
                                    >
                                        <option value="CONGESTION">Kẹt xe nghiêm trọng</option>
                                        <option value="ACCIDENT">Tai nạn giao thông</option>
                                        <option value="CONSTRUCTION">Đường đang thi công</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mức độ cảnh báo</label>
                                    <select
                                        value={trafficFormData.severity}
                                        onChange={(e) => setTrafficFormData({ ...trafficFormData, severity: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
                                    >
                                        <option value="LOW">Thấp (LOW)</option>
                                        <option value="MEDIUM">Trung bình (MEDIUM)</option>
                                        <option value="HIGH">Báo động Đỏ (HIGH)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowTrafficModal(false)}
                                    className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-semibold transition"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-orange-600 text-white hover:bg-orange-700 rounded-xl text-sm font-semibold transition shadow-md flex items-center gap-1"
                                >
                                    <CheckCircle2 size={16} /> Kích hoạt Cảnh báo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
