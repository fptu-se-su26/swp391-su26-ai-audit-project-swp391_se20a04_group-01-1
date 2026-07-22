import React from 'react';
import { Calendar, Clock, Car, Waves, BarChart3, TrendingUp, Info } from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar, Legend
} from 'recharts';
import { DBEvent, TrafficAlert, FloodZone } from './types';

interface Props {
    events: DBEvent[];
    trafficAlerts: TrafficAlert[];
    floodZones: FloodZone[];
}

export default function OverviewTab({ events, trafficAlerts, floodZones }: Props) {
    const liveCount = events.filter(e => e.status === 'approved').length;
    const pendingCount = events.filter(e => e.status === 'pending').length;
    const featuredCount = events.filter(e => e.is_featured).length;
    const resolvedTrafficCount = trafficAlerts.filter(t => !t.is_active).length;
    const activeTrafficCount = trafficAlerts.filter(t => t.is_active).length;
    const highRiskFloodCount = floodZones.filter(z => z.is_active && z.risk_level === 'HIGH').length;
    const activeFloodZonesCount = floodZones.filter(z => z.is_active).length;

    // 1. Dữ liệu biểu đồ sự cố giao thông thực tế: Phân loại theo loại sự cố
    const chartDataTraffic = React.useMemo(() => {
        return [
            {
                name: 'Kẹt xe',
                'Đang hoạt động': trafficAlerts.filter(t => t.type === 'CONGESTION' && t.is_active).length,
                'Đã giải tỏa': trafficAlerts.filter(t => t.type === 'CONGESTION' && !t.is_active).length,
            },
            {
                name: 'Tai nạn',
                'Đang hoạt động': trafficAlerts.filter(t => t.type === 'ACCIDENT' && t.is_active).length,
                'Đã giải tỏa': trafficAlerts.filter(t => t.type === 'ACCIDENT' && !t.is_active).length,
            },
            {
                name: 'Thi công',
                'Đang hoạt động': trafficAlerts.filter(t => t.type === 'CONSTRUCTION' && t.is_active).length,
                'Đã giải tỏa': trafficAlerts.filter(t => t.type === 'CONSTRUCTION' && !t.is_active).length,
            },
        ];
    }, [trafficAlerts]);

    // 2. Dữ liệu biểu đồ sự kiện theo tháng thực tế (6 tháng gần nhất)
    const chartDataEvents = React.useMemo(() => {
        const months = [
            { name: 'Tháng 1', count: 0 },
            { name: 'Tháng 2', count: 0 },
            { name: 'Tháng 3', count: 0 },
            { name: 'Tháng 4', count: 0 },
            { name: 'Tháng 5', count: 0 },
            { name: 'Tháng 6', count: 0 },
            { name: 'Tháng 7', count: 0 },
            { name: 'Tháng 8', count: 0 },
            { name: 'Tháng 9', count: 0 },
            { name: 'Tháng 10', count: 0 },
            { name: 'Tháng 11', count: 0 },
            { name: 'Tháng 12', count: 0 },
        ];

        events.forEach(event => {
            if (!event.start_time) return;
            const date = new Date(event.start_time);
            const m = date.getMonth();
            if (m >= 0 && m < 12) {
                months[m].count++;
            }
        });

        const currentMonth = new Date().getMonth();
        const result = [];
        for (let i = 5; i >= 0; i--) {
            let idx = currentMonth - i;
            if (idx < 0) idx += 12;
            result.push({
                name: months[idx].name,
                'Sự kiện': months[idx].count
            });
        }
        return result;
    }, [events]);

    // 3. Hoạt động điều phối gần đây thực tế
    const activities = React.useMemo(() => {
        const list: { id: string; text: string; dateStr: string; date: Date; color: string }[] = [];
        
        events.forEach(e => {
            const date = e.updated_at ? new Date(e.updated_at) : new Date(e.created_at || Date.now());
            const dateStr = date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
            
            if (e.status === 'approved') {
                list.push({
                    id: `e-app-${e.event_id}`,
                    text: `Phê duyệt sự kiện "${e.title}" tại khu vực ${e.location_name}`,
                    dateStr,
                    date,
                    color: 'bg-emerald-500'
                });
            } else if (e.status === 'pending') {
                list.push({
                    id: `e-pend-${e.event_id}`,
                    text: `Hệ thống nhận yêu cầu phê duyệt sự kiện mới: "${e.title}"`,
                    dateStr,
                    date,
                    color: 'bg-amber-500'
                });
            }
        });

        trafficAlerts.forEach(t => {
            const date = new Date(t.created_at || Date.now());
            const dateStr = date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
            list.push({
                id: `t-${t.id}-${t.is_active ? 'act' : 'res'}`,
                text: `${t.is_active ? 'Kích hoạt' : 'Giải tỏa'} cảnh báo ${t.severity === 'HIGH' ? 'Đỏ (Nguy hiểm)' : 'Thường'}: ${t.title} tại ${t.location}`,
                dateStr,
                date,
                color: t.is_active ? 'bg-red-500' : 'bg-blue-500'
            });
        });

        // Sắp xếp giảm dần theo thời gian
        list.sort((a, b) => b.date.getTime() - a.date.getTime());
        return list.slice(0, 5); // Lấy tối đa 5 hoạt động gần nhất
    }, [events, trafficAlerts]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200 text-left">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Calendar size={24} />
                        </div>
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                            {featuredCount} nổi bật
                        </span>
                    </div>
                    <h4 className="text-sm font-medium text-slate-500">Tổng sự kiện</h4>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{events.length}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200 text-left">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                            <Clock size={24} />
                        </div>
                        {pendingCount > 0 ? (
                            <span className="flex items-center text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full animate-pulse">
                                {pendingCount} chờ duyệt
                            </span>
                        ) : (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                Đã duyệt hết
                            </span>
                        )}
                    </div>
                    <h4 className="text-sm font-medium text-slate-500">Sự kiện hoạt động (Approved)</h4>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{liveCount}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200 text-left">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                            <Car size={24} />
                        </div>
                        {resolvedTrafficCount > 0 && (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                {resolvedTrafficCount} đã giải tỏa
                            </span>
                        )}
                    </div>
                    <h4 className="text-sm font-medium text-slate-500">Sự cố giao thông hoạt động</h4>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{activeTrafficCount}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200 text-left">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                            <Waves size={24} />
                        </div>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                            {activeFloodZonesCount} khu vực ngập
                        </span>
                    </div>
                    <h4 className="text-sm font-medium text-slate-500">Điểm ngập báo động đỏ</h4>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{highRiskFloodCount}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2 text-left">
                        <BarChart3 size={18} className="text-orange-600" />
                        Phân loại Sự cố Giao thông hiện tại
                    </h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartDataTraffic}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Bar dataKey="Đang hoạt động" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Đã giải tỏa" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2 text-left">
                        <TrendingUp size={18} className="text-blue-600" />
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
                                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="Sự kiện" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorEvents)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-slate-800">Hoạt động điều phối gần đây</h3>
                </div>
                {activities.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                        <Info size={16} />
                        Chưa ghi nhận hoạt động điều phối nào gần đây.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activities.map((act) => (
                            <div key={act.id} className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition border border-slate-50 hover:border-slate-100">
                                <div className={`w-2 h-2 rounded-full ${act.color} mt-2 shrink-0`}></div>
                                <div className="flex-1 flex justify-between items-center gap-4">
                                    <p className="text-sm font-semibold text-slate-700 leading-relaxed">{act.text}</p>
                                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap shrink-0">{act.dateStr}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
