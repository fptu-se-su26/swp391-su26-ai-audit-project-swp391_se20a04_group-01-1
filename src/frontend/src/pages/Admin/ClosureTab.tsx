import React from 'react';
import { RouteOff } from 'lucide-react';
import { RoadClosure } from './types';

interface Props {
    roadClosures: RoadClosure[];
}

export default function ClosureTab({ roadClosures }: Props) {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 mb-2">Hạn chế Giao thông và Cấm đường tạm thời</h3>
                <p className="text-xs text-slate-400">Các tuyến đường bị chặn sẽ được thiết kế để công cụ định tuyến tự động phân luồng tránh cấm đường.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-4 px-6">Tuyến đường hạn chế</th>
                            <th className="py-4 px-6">Do Sự kiện / Lý do</th>
                            <th className="py-4 px-6">Phương thức hạn chế</th>
                            <th className="py-4 px-6">Khung giờ ảnh hưởng</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
                        {roadClosures.map(closure => (
                            <tr key={closure.id} className="hover:bg-slate-50/50 transition">
                                <td className="py-4 px-6 font-semibold text-slate-800">
                                    <div className="flex items-center gap-2">
                                        <RouteOff size={18} className="text-red-500" />
                                        {closure.road_name}
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-slate-600 font-medium">{closure.event_title}</td>
                                <td className="py-4 px-6">
                                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                                        closure.restriction_type === 'CLOSED' ? 'bg-red-50 border-red-200 text-red-600' :
                                        closure.restriction_type === 'ONE_WAY' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                                        'bg-blue-50 border-blue-200 text-blue-600'
                                    }`}>
                                        {closure.restriction_type === 'CLOSED' ? 'Cấm hoàn toàn' :
                                         closure.restriction_type === 'ONE_WAY' ? 'Đường một chiều' : 'Hạn chế tốc độ'}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-xs text-slate-500 font-bold">{closure.time_frame}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
