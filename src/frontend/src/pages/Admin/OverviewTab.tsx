import React from 'react';
import { Calendar, TrendingUp, TrendingDown, Clock, Car, Waves, BarChart3 } from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar, Legend
} from 'recharts';
import { DBEvent, TrafficAlert, FloodZone } from './types';

const chartDataTraffic = [
    { hour: '07:00', 'Kẹt xe': 45, 'Thông thoáng': 80 },
    { hour: '09:00', 'Kẹt xe': 85, 'Thông thoáng': 40 },
    { hour: '12:00', 'Kẹt xe': 60, 'Thông thoáng': 65 },
    { hour: '15:00', 'Kẹt xe': 50, 'Thông thoáng': 75 },
    { hour: '17:00', 'Kẹt xe': 95, 'Thông thoáng': 30 },
    { hour: '19:00', 'Kẹt xe': 70, 'Thông thoáng': 50 },
];

const chartDataEvents = [
    { name: 'Tháng 1', 'Sự kiện': 12 },
    { name: 'Tháng 2', 'Sự kiện': 18 },
    { name: 'Tháng 3', 'Sự kiện': 25 },
    { name: 'Tháng 4', 'Sự kiện': 40 },
    { name: 'Tháng 5', 'Sự kiện': 65 },
    { name: 'Tháng 6', 'Sự kiện': 85 },
];

interface Props {
    events: DBEvent[];
    trafficAlerts: TrafficAlert[];
    floodZones: FloodZone[];
}

export default function OverviewTab({ events, trafficAlerts, floodZones }: Props) {
    const liveCount = events.filter(e => e.status === 'approved').length;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Calendar size={24} />
                        </div>
                        <span className="flex items-center text-xs font-semibold text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full">
                            <TrendingUp size={14} className="mr-1" /> +12%
                        </span>
                    </div>
                    <h4 className="text-sm font-medium text-slate-500">Tổng sự kiện</h4>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{events.length}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                            <Clock size={24} />
                        </div>
                        <span className="flex items-center text-xs font-semibold text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full">
                            <TrendingUp size={14} className="mr-1" /> +2
                        </span>
                    </div>
                    <h4 className="text-sm font-medium text-slate-500">Sự kiện hoạt động (Approved)</h4>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{liveCount}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                            <Car size={24} />
                        </div>
                        <span className="flex items-center text-xs font-semibold text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
                            <TrendingDown size={14} className="mr-1" /> -5%
                        </span>
                    </div>
                    <h4 className="text-sm font-medium text-slate-500">Cảnh báo kẹt xe</h4>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{trafficAlerts.filter(t => t.is_active).length}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                            <Waves size={24} />
                        </div>
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                            Ổn định
                        </span>
                    </div>
                    <h4 className="text-sm font-medium text-slate-500">Điểm ngập báo động</h4>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{floodZones.filter(z => z.is_active && z.risk_level === 'HIGH').length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <BarChart3 size={18} className="text-blue-600" />
                        Biến động mật độ giao thông ngày thường (Phút cao điểm)
                    </h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartDataTraffic}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                                <YAxis stroke="#64748b" fontSize={11} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Bar dataKey="Kẹt xe" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Thông thoáng" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-500" />
                        Tổng quan Sự kiện được số hóa theo tháng
                    </h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartDataEvents}>
                                <defs>
                                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                                <YAxis stroke="#64748b" fontSize={11} />
                                <Tooltip />
                                <Area type="monotone" dataKey="Sự kiện" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorEvents)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-slate-800">Hoạt động điều phối gần đây</h3>
                    <button className="text-xs font-semibold text-blue-600 hover:text-blue-700">Xem toàn bộ nhật ký</button>
                </div>
                <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-700">Phê duyệt sự kiện "Lễ hội pháo hoa quốc tế DIFF 2026"</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0"></div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-700">Kích hoạt cảnh báo Đỏ: Ngập úng nghiêm trọng nút giao Hàm Nghi</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-700">Điều chỉnh lộ trình khẩn cấp: Đóng làn Cầu Rồng hướng Đông-Tây</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
