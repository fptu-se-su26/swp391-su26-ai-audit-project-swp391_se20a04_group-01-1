import React from 'react';
import { Waves } from 'lucide-react';
import { FloodZone } from './types';

interface Props {
    floodZones: FloodZone[];
    toggleFloodStatus: (id: number) => void;
}

export default function FloodTab({ floodZones, toggleFloodStatus }: Props) {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 mb-2">Quản lý điểm ngập úng đô thị</h3>
                <p className="text-xs text-slate-400">Các điểm ngập sẽ hiển thị vùng đệm màu đỏ trên bản đồ để cảnh báo định tuyến tránh lũ của người dùng.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-4 px-6">Khu vực ngập úng</th>
                            <th className="py-4 px-6">Quận huyện</th>
                            <th className="py-4 px-6">Mức độ rủi ro</th>
                            <th className="py-4 px-6">Cập nhật lần cuối</th>
                            <th className="py-4 px-6 text-center">Trạng thái Cảnh báo</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
                        {floodZones.map(zone => (
                            <tr key={zone.id} className="hover:bg-slate-50/50 transition">
                                <td className="py-4 px-6 font-semibold text-slate-800">
                                    <div className="flex items-center gap-2">
                                        <Waves size={18} className={zone.is_active ? 'text-blue-500' : 'text-slate-400'} />
                                        {zone.name}
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-slate-500">{zone.district}</td>
                                <td className="py-4 px-6">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                        zone.risk_level === 'HIGH' ? 'bg-red-100 text-red-700' :
                                        zone.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                        {zone.risk_level}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-xs text-slate-400">{zone.last_updated}</td>
                                <td className="py-4 px-6 text-center">
                                    <button
                                        onClick={() => toggleFloodStatus(zone.id)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border transition ${zone.is_active
                                            ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100/50'
                                            : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                                        }`}
                                    >
                                        {zone.is_active ? 'Đang ngập (Bật vùng đệm)' : 'Bình thường (Tắt)'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
