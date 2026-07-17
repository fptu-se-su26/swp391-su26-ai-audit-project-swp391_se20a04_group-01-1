import React, { useState, useEffect } from 'react';
import { RouteOff, Plus, Trash2, Calendar, Clock, AlertCircle, Sparkles, RefreshCw, Edit2, AlertTriangle } from 'lucide-react';
import { RoadClosure, DBEvent } from './types';
import { eventRoadService } from '../../services/eventRoadService';
import toast from 'react-hot-toast';
import { showPremiumToast } from '../../utils/toastUtils';

function formatToDatetimeLocal(dateStr?: string | null): string {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
        return '';
    }
}

interface Props {
    roadClosures: RoadClosure[];
    events: DBEvent[];
    onRefresh: () => void;
}

export default function ClosureTab({ roadClosures, events, onRefresh }: Props) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Autocomplete for Start/End closure points
    const [startQuery, setStartQuery] = useState('');
    const [endQuery, setEndQuery] = useState('');
    const [startCoord, setStartCoord] = useState<[number, number] | null>(null);
    const [endCoord, setEndCoord] = useState<[number, number] | null>(null);

    const [startSuggestions, setStartSuggestions] = useState<any[]>([]);
    const [endSuggestions, setEndSuggestions] = useState<any[]>([]);
    const [showStartSuggestions, setShowStartSuggestions] = useState(false);
    const [showEndSuggestions, setShowEndSuggestions] = useState(false);
    const [focusField, setFocusField] = useState<'start' | 'end' | null>(null);

    // Custom confirm modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        onCancel: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: () => {}
    });

    const showCustomConfirm = (
        title: string,
        message: string,
        onConfirm: () => void,
        onCancel: () => void = () => {}
    ) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                onConfirm();
            },
            onCancel: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                onCancel();
            }
        });
    };
    const [generatingPath, setGeneratingPath] = useState(false);

    // Fetch start suggestions
    useEffect(() => {
        if (!startQuery.trim() || startQuery.length < 3) {
            setStartSuggestions([]);
            setShowStartSuggestions(false);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            try {
                const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
                if (!mapboxToken) return;
                const response = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(startQuery)}.json?access_token=${mapboxToken}&bbox=108.0,15.9,108.4,16.2&limit=5&language=vi`
                );
                const data = await response.json();
                if (data.features) {
                    setStartSuggestions(data.features);
                    setShowStartSuggestions(true);
                }
            } catch (error) {
                console.error("Lỗi tìm kiếm gợi ý điểm đầu:", error);
            }
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [startQuery]);

    // Fetch end suggestions
    useEffect(() => {
        if (!endQuery.trim() || endQuery.length < 3) {
            setEndSuggestions([]);
            setShowEndSuggestions(false);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            try {
                const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
                if (!mapboxToken) return;
                const response = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(endQuery)}.json?access_token=${mapboxToken}&bbox=108.0,15.9,108.4,16.2&limit=5&language=vi`
                );
                const data = await response.json();
                if (data.features) {
                    setEndSuggestions(data.features);
                    setShowEndSuggestions(true);
                }
            } catch (error) {
                console.error("Lỗi tìm kiếm gợi ý điểm cuối:", error);
            }
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [endQuery]);

    const handleGeneratePath = async () => {
        if (!startCoord || !endCoord) return;
        setError('');
        setGeneratingPath(true);
        try {
            const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
            if (!token) {
                throw new Error('Không tìm thấy Mapbox Access Token. Hãy kiểm tra file frontend .env');
            }

            const coordsString = `${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}`;
            const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&overview=full&access_token=${token}`
            );
            const data = await response.json();
            
            if (response.ok && data.routes && data.routes.length > 0) {
                const snappedCoords = data.routes[0].geometry.coordinates;
                setFormData(prev => ({
                    ...prev,
                    geojson_coords: JSON.stringify(snappedCoords)
                }));
            } else {
                throw new Error(data.message || 'Không tìm thấy tuyến đường nối giữa 2 điểm này.');
            }
        } catch (err: any) {
            setError('Lỗi khi vẽ tuyến đường cấm: ' + err.message);
        } finally {
            setGeneratingPath(false);
        }
    };
    
    // Form fields
    const [formData, setFormData] = useState({
        event_id: '',
        road_name: '',
        restriction_type: 'CLOSED',
        restriction_start: '',
        restriction_end: '',
        geojson_coords: '',
        bypass_coords: '',
        description: '',
        days_of_week: '',
        start_time_of_day: '',
        end_time_of_day: ''
    });

    const handleDelete = async (id: number) => {
        showCustomConfirm(
            'Xác nhận xóa',
            'Bạn có chắc chắn muốn xóa tuyến đường hạn chế này không?',
            async () => {
                try {
                    await eventRoadService.deleteEventRoad(id);
                    showPremiumToast('Xóa đường cấm thành công!', 'success');
                    onRefresh();
                } catch (err: any) {
                    showPremiumToast('Không thể xóa: ' + err.message, 'error');
                }
            }
        );
    };

    const handleCloseModal = () => {
        setFormData({
            event_id: '',
            road_name: '',
            restriction_type: 'CLOSED',
            restriction_start: '',
            restriction_end: '',
            geojson_coords: '',
            bypass_coords: '',
            description: '',
            days_of_week: '',
            start_time_of_day: '',
            end_time_of_day: ''
        });
        setEditingId(null);
        setError('');
        setStartQuery('');
        setEndQuery('');
        setStartCoord(null);
        setEndCoord(null);
        setStartSuggestions([]);
        setEndSuggestions([]);
        setShowAddModal(false);
    };

    const handleEditClick = async (id: number) => {
        try {
            const data = await eventRoadService.getEventRoads();
            const originalRoad = data.find(r => r.road_id === id);
            if (!originalRoad) {
                showPremiumToast('Không tìm thấy thông tin chi tiết của tuyến đường cấm này.', 'error');
                return;
            }

            setFormData({
                event_id: originalRoad.event_id.toString(),
                road_name: originalRoad.road_name,
                restriction_type: originalRoad.restriction_type,
                restriction_start: originalRoad.restriction_start ? new Date(originalRoad.restriction_start).toISOString().slice(0, 16) : '',
                restriction_end: originalRoad.restriction_end ? new Date(originalRoad.restriction_end).toISOString().slice(0, 16) : '',
                geojson_coords: originalRoad.geojson_coords ? JSON.stringify(originalRoad.geojson_coords) : '',
                bypass_coords: originalRoad.bypass_coords ? JSON.stringify(originalRoad.bypass_coords) : '',
                description: originalRoad.description || '',
                days_of_week: originalRoad.days_of_week || '',
                start_time_of_day: originalRoad.start_time_of_day || '',
                end_time_of_day: originalRoad.end_time_of_day || ''
            });
            setEditingId(id);
            setShowAddModal(true);
        } catch (err: any) {
            showPremiumToast('Không thể tải chi tiết tuyến đường cấm: ' + err.message, 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!formData.event_id || !formData.road_name || !formData.restriction_start || !formData.restriction_end) {
            setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
            return;
        }

        setSubmitting(true);
        try {
            // Parse coordinates from string inputs
            let geojson = null;
            let bypass = null;
            
            if (formData.geojson_coords.trim()) {
                try {
                    geojson = JSON.parse(formData.geojson_coords);
                } catch (e) {
                    throw new Error('Định dạng tọa độ GeoJSON không hợp lệ (Phải là mảng JSON, vd: [[108.2, 16.0], [108.21, 16.01]])');
                }
            }
            
            if (formData.bypass_coords.trim()) {
                try {
                    bypass = JSON.parse(formData.bypass_coords);
                } catch (e) {
                    throw new Error('Định dạng tọa độ Bypass không hợp lệ (Phải là mảng JSON, vd: [[108.22, 16.02]])');
                }
            }

            const roadData = {
                event_id: parseInt(formData.event_id),
                road_name: formData.road_name,
                restriction_type: formData.restriction_type as any,
                restriction_start: formData.restriction_start,
                restriction_end: formData.restriction_end,
                polyline_encoded: null,
                geojson_coords: geojson,
                bypass_coords: bypass,
                description: formData.description,
                days_of_week: formData.days_of_week.trim() || null,
                start_time_of_day: formData.start_time_of_day || null,
                end_time_of_day: formData.end_time_of_day || null
            };

            if (editingId) {
                await eventRoadService.updateEventRoad(editingId, roadData);
                showPremiumToast('Cập nhật đường cấm thành công!', 'success');
            } else {
                await eventRoadService.createEventRoad(roadData);
                showPremiumToast('Đăng ký đường cấm thành công!', 'success');
            }

            handleCloseModal();
            onRefresh();
        } catch (err: any) {
            setError(err.message || 'Lỗi khi lưu thông tin cấm đường.');
            showPremiumToast(err.message || 'Lỗi khi lưu thông tin cấm đường.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const daysList = [
        { label: 'CN', value: 0 },
        { label: 'T2', value: 1 },
        { label: 'T3', value: 2 },
        { label: 'T4', value: 3 },
        { label: 'T5', value: 4 },
        { label: 'T6', value: 5 },
        { label: 'T7', value: 6 }
    ];

    const handleDayToggle = (dayVal: number) => {
        let currentDays = formData.days_of_week ? formData.days_of_week.split(',').map(d => d.trim()).filter(Boolean) : [];
        const dayStr = dayVal.toString();
        if (currentDays.includes(dayStr)) {
            currentDays = currentDays.filter(d => d !== dayStr);
        } else {
            currentDays.push(dayStr);
        }
        currentDays.sort((a, b) => parseInt(a) - parseInt(b));
        setFormData(prev => ({ ...prev, days_of_week: currentDays.join(',') }));
    };

    const [snapping, setSnapping] = useState(false);

    const handleSnapToStreets = async () => {
        setError('');
        if (!formData.geojson_coords.trim()) {
            setError('Vui lòng nhập ít nhất 2 điểm tọa độ (điểm bắt đầu và điểm kết thúc) vào ô Tọa độ GeoJSON trước.');
            return;
        }

        let coords: [number, number][] = [];
        try {
            coords = JSON.parse(formData.geojson_coords);
            if (!Array.isArray(coords) || coords.length < 2) {
                throw new Error('Tọa độ phải là một mảng chứa ít nhất 2 điểm, ví dụ: [[lng1, lat1], [lng2, lat2]]');
            }
            for (const pt of coords) {
                if (!Array.isArray(pt) || pt.length !== 2 || typeof pt[0] !== 'number' || typeof pt[1] !== 'number') {
                    throw new Error('Mỗi điểm tọa độ phải là một cặp số [kinh độ, vĩ độ].');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Cú pháp mảng tọa độ không hợp lệ. Vui lòng nhập đúng định dạng JSON: [[lng1, lat1], [lng2, lat2]]');
            return;
        }

        setSnapping(true);
        try {
            const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
            if (!token) {
                throw new Error('Không tìm thấy Mapbox Access Token. Hãy kiểm tra file frontend .env');
            }

            const coordsString = coords.map(c => `${c[0]},${c[1]}`).join(';');
            const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&overview=full&access_token=${token}`
            );
            const data = await response.json();
            
            if (response.ok && data.routes && data.routes.length > 0) {
                const snappedCoords = data.routes[0].geometry.coordinates;
                setFormData(prev => ({
                    ...prev,
                    geojson_coords: JSON.stringify(snappedCoords)
                }));
                showPremiumToast(`Căn chỉnh thành công! Đã lấy ${snappedCoords.length} điểm tọa độ khớp với bản đồ.`, 'success');
            } else {
                throw new Error(data.message || 'Không tìm thấy tuyến đường đi qua các điểm này.');
            }
        } catch (err: any) {
            setError('Lỗi khi tự động căn chỉnh: ' + err.message);
        } finally {
            setSnapping(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in text-slate-800">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-black text-slate-800 mb-1">Hạn chế Giao thông và Cấm đường tạm thời</h3>
                    <p className="text-xs text-slate-400 font-medium">Các tuyến đường bị cấm trong sự kiện sẽ được công cụ định tuyến tự động phân luồng tránh đi vào.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-red-500/10 flex items-center gap-1.5 active:scale-95 transition-all"
                >
                    <Plus size={16} />
                    Thêm đường cấm
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-4 px-6">Tuyến đường hạn chế</th>
                            <th className="py-4 px-6">Do Sự kiện / Lý do</th>
                            <th className="py-4 px-6">Phương thức hạn chế</th>
                            <th className="py-4 px-6">Khung giờ ảnh hưởng</th>
                            <th className="py-4 px-6 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
                        {roadClosures.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                                    Không có dữ liệu cấm đường nào được ghi nhận.
                                </td>
                            </tr>
                        ) : (
                            roadClosures.map(closure => (
                                <tr key={closure.id} className="hover:bg-slate-50/50 transition">
                                    <td className="py-4 px-6 font-semibold text-slate-800">
                                        <div className="flex items-center gap-2">
                                            <RouteOff size={18} className="text-red-500 shrink-0" />
                                            {closure.road_name}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-slate-600 font-semibold">{closure.event_title}</td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                                            closure.restriction_type === 'CLOSED' ? 'bg-red-50 border-red-200 text-red-600' :
                                            closure.restriction_type === 'ONE_WAY' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                                            'bg-blue-50 border-blue-200 text-blue-600'
                                        }`}>
                                            {closure.restriction_type === 'CLOSED' ? 'Cấm hoàn toàn' :
                                             closure.restriction_type === 'ONE_WAY' ? 'Đường một chiều' :
                                             closure.restriction_type === 'LIMITED' ? 'Hạn chế đi lại' : 'Cấm đỗ xe'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-xs text-slate-500 font-bold">{closure.time_frame}</td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex justify-end gap-1.5">
                                            <button
                                                onClick={() => handleEditClick(closure.id)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition active:scale-90"
                                                title="Sửa cung đường cấm"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(closure.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition active:scale-90"
                                                title="Xóa cung đường cấm"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ADD ROAD RESTRICTION MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-100 shadow-2xl relative animate-scale-in text-slate-700">
                        {/* Sticky Header */}
                        <div className="p-6 pb-0 flex-none">
                            <h4 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
                                <RouteOff className="text-red-500" />
                                {editingId ? 'Cập nhật Tuyến đường Cấm do Sự kiện' : 'Đăng ký Tuyến đường Cấm do Sự kiện'}
                            </h4>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-xs font-medium flex items-center gap-2 mb-4">
                                    <AlertCircle size={16} className="shrink-0" />
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Scrollable Form Body & Sticky Footer */}
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                            <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-4">
                                <div className="grid grid-cols-2 gap-4 pt-1">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Sự kiện kích hoạt *</label>
                                        <div className="relative">
                                            <select
                                                value={formData.event_id}
                                                onChange={e => {
                                                    const selectedId = e.target.value;
                                                    const selectedEvent = events.find(evt => String(evt.event_id) === String(selectedId));
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        event_id: selectedId,
                                                        restriction_start: selectedEvent ? formatToDatetimeLocal(selectedEvent.start_time) : prev.restriction_start,
                                                        restriction_end: selectedEvent ? formatToDatetimeLocal(selectedEvent.end_time) : prev.restriction_end
                                                    }));
                                                }}
                                                className="w-full text-xs font-semibold pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 appearance-none cursor-pointer"
                                                required
                                            >
                                                <option value="">-- Chọn sự kiện --</option>
                                                {events.map(evt => (
                                                    <option key={evt.event_id} value={evt.event_id}>
                                                        {evt.title} ({evt.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'})
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Tên tuyến đường *</label>
                                        <input
                                            type="text"
                                            placeholder="Ví dụ: Bạch Đằng (đoạn từ Cầu Rồng đến Cầu Sông Hàn)"
                                            value={formData.road_name}
                                            onChange={e => setFormData(prev => ({ ...prev, road_name: e.target.value }))}
                                            className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Kiểu hạn chế</label>
                                        <div className="relative">
                                            <select
                                                value={formData.restriction_type}
                                                onChange={e => setFormData(prev => ({ ...prev, restriction_type: e.target.value }))}
                                                className="w-full text-xs font-semibold pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 appearance-none cursor-pointer"
                                            >
                                                <option value="CLOSED">Cấm hoàn toàn (CLOSED)</option>
                                                <option value="LIMITED">Hạn chế đi lại (LIMITED)</option>
                                                <option value="ONE_WAY">Đường một chiều (ONE_WAY)</option>
                                                <option value="NO_PARKING">Cấm đỗ xe (NO_PARKING)</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Bắt đầu sự kiện *</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.restriction_start}
                                            onChange={e => setFormData(prev => ({ ...prev, restriction_start: e.target.value }))}
                                            className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Kết thúc sự kiện *</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.restriction_end}
                                            onChange={e => setFormData(prev => ({ ...prev, restriction_end: e.target.value }))}
                                            className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Tự động tạo tọa độ bằng cách tìm gợi ý địa chỉ điểm đầu/cuối */}
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
                                    <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                        <Sparkles size={14} className="text-red-500" />
                                        Tự động tạo tọa độ bằng cách tìm kiếm địa chỉ (Khuyên dùng)
                                    </h5>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative">
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Điểm bắt đầu cấm</label>
                                            <input
                                                type="text"
                                                placeholder="Tìm địa chỉ bắt đầu (VD: Cầu Rồng)"
                                                value={startQuery}
                                                onChange={e => setStartQuery(e.target.value)}
                                                onFocus={() => setFocusField('start')}
                                                onBlur={() => setTimeout(() => setFocusField(null), 200)}
                                                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                            />
                                            {showStartSuggestions && focusField === 'start' && startSuggestions.length > 0 && (
                                                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                                                    {startSuggestions.map((item: any) => (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const [lng, lat] = item.center;
                                                                setStartCoord([lng, lat]);
                                                                setStartQuery(item.place_name_vi || item.place_name);
                                                                setShowStartSuggestions(false);
                                                            }}
                                                            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition"
                                                        >
                                                            {item.place_name_vi || item.place_name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Điểm kết thúc cấm</label>
                                            <input
                                                type="text"
                                                placeholder="Tìm địa chỉ kết thúc (VD: Cầu Sông Hàn)"
                                                value={endQuery}
                                                onChange={e => setEndQuery(e.target.value)}
                                                onFocus={() => setFocusField('end')}
                                                onBlur={() => setTimeout(() => setFocusField(null), 200)}
                                                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                            />
                                            {showEndSuggestions && focusField === 'end' && endSuggestions.length > 0 && (
                                                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                                                    {endSuggestions.map((item: any) => (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const [lng, lat] = item.center;
                                                                setEndCoord([lng, lat]);
                                                                setEndQuery(item.place_name_vi || item.place_name);
                                                                setShowEndSuggestions(false);
                                                            }}
                                                            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition"
                                                        >
                                                            {item.place_name_vi || item.place_name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {startCoord && endCoord && (
                                        <button
                                            type="button"
                                            onClick={handleGeneratePath}
                                            disabled={generatingPath}
                                            className="w-full bg-red-50 hover:bg-red-100 disabled:bg-red-50/50 text-red-600 disabled:text-red-300 font-bold text-xs py-2 px-4 rounded-xl border border-red-200 transition-all flex items-center justify-center gap-1.5 active:scale-98 shadow-sm"
                                        >
                                            {generatingPath ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                            {generatingPath ? 'Đang vẽ tuyến đường...' : '📍 Vẽ đoạn đường cấm giữa 2 điểm này'}
                                        </button>
                                    )}
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-xs font-bold text-slate-500">Tọa độ GeoJSON của đoạn đường cấm (LineString) *</label>
                                        <button
                                            type="button"
                                            onClick={handleSnapToStreets}
                                            disabled={snapping}
                                            className="text-red-500 hover:text-red-600 disabled:text-red-300 font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95"
                                        >
                                            {snapping ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                            {snapping ? 'Đang căn chỉnh...' : 'Căn chỉnh theo bản đồ (Snap to Streets)'}
                                        </button>
                                    </div>
                                    <textarea
                                        rows={2}
                                        placeholder="[[108.224, 16.061], [108.225, 16.072]]"
                                        value={formData.geojson_coords}
                                        onChange={e => setFormData(prev => ({ ...prev, geojson_coords: e.target.value }))}
                                        className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                    />
                                    <span className="text-[10px] text-slate-400 font-semibold">Mảng chứa các tọa độ [kinh độ, vĩ độ] của đoạn đường cấm. Bạn có thể tìm địa chỉ ở khung trên rồi bấm Vẽ để tự động sinh tọa độ.</span>
                                </div>

                                <div className="border-t border-slate-100 pt-3">
                                    <h5 className="text-xs font-black text-slate-800 mb-2.5 flex items-center gap-1.5">
                                        <Clock size={14} className="text-red-500" />
                                        Khung giờ cấm đường lặp lại hàng ngày/tuần (Tùy chọn)
                                    </h5>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Thứ trong tuần (Nhấp để chọn)</label>
                                            <div className="flex gap-1">
                                                {daysList.map(day => {
                                                    const isActive = (formData.days_of_week || '').split(',').map(d => d.trim()).includes(day.value.toString());
                                                    return (
                                                        <button
                                                            key={day.value}
                                                            type="button"
                                                            onClick={() => handleDayToggle(day.value)}
                                                            className={`w-8 h-8 text-[10px] font-bold rounded-lg border transition-all flex items-center justify-center ${
                                                                isActive 
                                                                    ? 'bg-red-500 border-red-500 text-white shadow-sm shadow-red-500/20' 
                                                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            {day.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Giờ bắt đầu</label>
                                                <input
                                                    type="time"
                                                    value={formData.start_time_of_day}
                                                    onChange={e => setFormData(prev => ({ ...prev, start_time_of_day: e.target.value }))}
                                                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Giờ kết thúc</label>
                                                <input
                                                    type="time"
                                                    value={formData.end_time_of_day}
                                                    onChange={e => setFormData(prev => ({ ...prev, end_time_of_day: e.target.value }))}
                                                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1.5 block font-semibold">Để trống nếu muốn cấm đường liên tục 24/7 trong suốt thời gian diễn ra sự kiện.</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Tọa độ điểm trung gian tránh đi vòng (Waypoints Tránh)</label>
                                    <textarea
                                        rows={2}
                                        placeholder="[[108.2315, 16.0503]]"
                                        value={formData.bypass_coords}
                                        onChange={e => setFormData(prev => ({ ...prev, bypass_coords: e.target.value }))}
                                        className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                    />
                                    <span className="text-[10px] text-slate-400 font-semibold">Tọa độ các nút giao thông an toàn để Mapbox tìm đường đi tránh qua. Ví dụ: [[lng, lat]]</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Mô tả chi tiết / Ghi chú</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Chi tiết về kế hoạch cấm đường..."
                                        value={formData.description}
                                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                    />
                                </div>
                            </div>

                            {/* Sticky Footer */}
                            <div className="p-6 pt-4 border-t border-slate-100 flex-none flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2.5 px-4 rounded-xl transition"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-md transition"
                                >
                                    {submitting ? 'Đang lưu...' : 'Lưu thông tin'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* CUSTOM CONFIRM MODAL DIALOG */}
            {confirmModal.isOpen && (
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
                        className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full mx-4 text-left font-sans"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-red-50 text-red-500">
                                <AlertTriangle size={20} />
                            </span>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                                {confirmModal.title}
                            </h3>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 mb-6 leading-relaxed whitespace-pre-line">
                            {confirmModal.message}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={confirmModal.onCancel}
                                className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className="px-5 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-md shadow-red-100 transition-all"
                            >
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
