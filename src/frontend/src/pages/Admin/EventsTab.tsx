import React from 'react';
import {
    Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight,
    AlertCircle, RefreshCw, Save, Calendar, X
} from 'lucide-react';
import { DBEvent, EventFormData } from './types';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Props {
    events: DBEvent[];
    loadingEvents: boolean;
    searchTerm: string;
    setSearchTerm: (v: string) => void;
    statusFilter: string;
    setStatusFilter: (v: string) => void;
    currentPage: number;
    setCurrentPage: (v: number) => void;
    showModal: boolean;
    setShowModal: (v: boolean) => void;
    editingEvent: DBEvent | null;
    setEditingEvent: (v: DBEvent | null) => void;
    eventFormData: EventFormData;
    setEventFormData: (v: EventFormData) => void;
    handleApproveEvent: (id: number, currentStatus: string) => void;
    handleDeleteEvent: (id: number) => void;
    handleCreateEvent: (e: React.FormEvent) => void;
}

const ROWS_PER_PAGE = 5;

const formatDateTimeLocal = (dateStr: any) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

export default function EventsTab({
    events, loadingEvents, searchTerm, setSearchTerm, statusFilter, setStatusFilter,
    currentPage, setCurrentPage, showModal, setShowModal, editingEvent, setEditingEvent,
    eventFormData, setEventFormData, handleApproveEvent, handleDeleteEvent, handleCreateEvent
}: Props) {
    const [addressSuggestions, setAddressSuggestions] = React.useState<any[]>([]);
    const [showAddressSuggestions, setShowAddressSuggestions] = React.useState(false);
    const [loadingAddressSearch, setLoadingAddressSearch] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);

    const miniMapRef = React.useRef<any>(null);

    const handleMiniMapClick = async (event: any) => {
        const { lng, lat } = event.lngLat;
        let placeName = eventFormData.location_name;
        
        try {
            const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
            if (mapboxToken) {
                const response = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&language=vi`
                );
                const data = await response.json();
                if (data.features && data.features.length > 0) {
                    placeName = data.features[0].place_name_vi || data.features[0].place_name;
                }
            }
        } catch (err) {
            console.error("Lỗi giải mã tọa độ ngược khi click bản đồ:", err);
        }

        setEventFormData({
            ...eventFormData,
            latitude: lat,
            longitude: lng,
            location_name: placeName
        });
    };

    const handleMarkerDragEnd = async (event: any) => {
        const { lng, lat } = event.lngLat;
        let placeName = eventFormData.location_name;

        try {
            const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
            if (mapboxToken) {
                const response = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&language=vi`
                );
                const data = await response.json();
                if (data.features && data.features.length > 0) {
                    placeName = data.features[0].place_name_vi || data.features[0].place_name;
                }
            }
        } catch (err) {
            console.error("Lỗi giải mã tọa độ ngược khi kéo marker:", err);
        }

        setEventFormData({
            ...eventFormData,
            latitude: lat,
            longitude: lng,
            location_name: placeName
        });
    };

    React.useEffect(() => {
        if (editingEvent && eventFormData.location_name === editingEvent.location_name) {
            setAddressSuggestions([]);
            setShowAddressSuggestions(false);
            return;
        }

        if (!eventFormData.location_name.trim() || eventFormData.location_name.length < 3) {
            setAddressSuggestions([]);
            setShowAddressSuggestions(false);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setLoadingAddressSearch(true);
            try {
                const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
                if (!mapboxToken) return;
                const response = await fetch(
                    `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(eventFormData.location_name)}&access_token=${mapboxToken}&bbox=108.0,15.9,108.4,16.2&limit=5&language=vi`
                );
                const data = await response.json();
                if (data.features) {
                    const normalized = data.features.map((f: any) => ({
                        id: f.properties?.mapbox_id || f.id,
                        place_name: f.properties?.full_address || f.properties?.name || "",
                        place_name_vi: f.properties?.full_address || f.properties?.name || "",
                        center: f.geometry?.coordinates || [0, 0]
                    }));
                    setAddressSuggestions(normalized);
                    setShowAddressSuggestions(true);
                }
            } catch (error) {
                console.error("Lỗi tìm gợi ý địa điểm:", error);
            } finally {
                setLoadingAddressSearch(false);
            }
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [eventFormData.location_name, editingEvent]);

    const filteredEvents = events.filter(e => {
        const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.location_name && e.location_name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const paginatedEvents = filteredEvents.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);
    const totalPages = Math.ceil(filteredEvents.length / ROWS_PER_PAGE);

    return (
        <>
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm sự kiện, địa điểm..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer appearance-none font-semibold text-slate-700"
                            >
                                <option value="all">Tất cả trạng thái</option>
                                <option value="approved">Đã phê duyệt (Approved)</option>
                                <option value="pending">Chờ phê duyệt (Pending)</option>
                                <option value="cancelled">Đã hủy (Cancelled)</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-500">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setEditingEvent(null);
                            setEventFormData({
                                title: '',
                                short_description: '',
                                description: '',
                                location_name: '',
                                latitude: 16.0544,
                                longitude: 108.2022,
                                start_time: '',
                                end_time: '',
                                status: 'pending',
                                category_id: 1
                            });
                            setShowModal(true);
                        }}
                        className="bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-500/10 shrink-0"
                    >
                        <Plus size={16} /> Thêm sự kiện mới
                    </button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        {loadingEvents ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3">
                                <RefreshCw className="animate-spin text-blue-500" size={32} />
                                <p className="text-slate-500 text-sm">Đang lấy danh sách sự kiện...</p>
                            </div>
                        ) : filteredEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-2">
                                <AlertCircle className="text-slate-300" size={48} />
                                <p className="text-slate-600 font-semibold text-sm">Không tìm thấy sự kiện nào</p>
                                <p className="text-slate-400 text-xs">Vui lòng điều chỉnh từ khóa tìm kiếm hoặc lọc trạng thái.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="py-4 px-6">Tên sự kiện</th>
                                        <th className="py-4 px-6">Ngày / Giờ diễn ra</th>
                                        <th className="py-4 px-6">Trạng thái</th>
                                        <th className="py-4 px-6">Lượt xem</th>
                                        <th className="py-4 px-6 text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
                                    {paginatedEvents.map((evt) => (
                                        <tr key={evt.event_id} className="hover:bg-slate-50/50 transition">
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800">{evt.title}</span>
                                                    <span className="text-xs text-slate-400 mt-0.5">📍 {evt.location_name || 'Không xác định'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col text-slate-600 text-xs">
                                                    <span>{evt.start_time?.replace('T', ' ') || 'Chưa xác định'}</span>
                                                    <span className="text-[10px] text-slate-400">Đến {evt.end_time ? evt.end_time.replace('T', ' ') : 'Chưa xác định'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <button
                                                    onClick={() => handleApproveEvent(evt.event_id, evt.status)}
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${evt.status === 'approved'
                                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100/50'
                                                        : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100/50'
                                                    }`}
                                                >
                                                    {evt.status === 'approved' ? 'Approved' : 'Pending'}
                                                </button>
                                            </td>
                                            <td className="py-4 px-6 text-xs text-slate-500 font-bold">
                                                {evt.view_count.toLocaleString('vi-VN')}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setEditingEvent(evt);
                                                            setEventFormData({
                                                                title: evt.title,
                                                                short_description: evt.short_description || '',
                                                                description: evt.description || '',
                                                                location_name: evt.location_name || '',
                                                                latitude: evt.latitude,
                                                                longitude: evt.longitude,
                                                                start_time: formatDateTimeLocal(evt.start_time),
                                                                end_time: formatDateTimeLocal(evt.end_time),
                                                                status: evt.status,
                                                                category_id: evt.category_id || 1
                                                            });
                                                            setShowModal(true);
                                                        }}
                                                        className="text-blue-500 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg transition"
                                                        title="Sửa"
                                                    >
                                                        <Edit2 size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteEvent(evt.event_id)}
                                                        className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-xs text-slate-500">Trang {currentPage} / {totalPages}</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Thêm/Sửa Sự Kiện */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col border border-slate-200 animate-slide-up overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                {editingEvent ? 'Chỉnh Sửa Sự Kiện' : 'Thêm Sự Kiện Mới'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateEvent} className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
                                {/* Left Side: Form Fields (scrollable) */}
                                <div className="col-span-1 md:col-span-6 overflow-y-auto p-6 space-y-4 custom-scrollbar border-r border-slate-100 text-slate-700">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên sự kiện (*)</label>
                                        <input
                                            required type="text"
                                            placeholder="VD: Lễ hội pháo hoa quốc tế DIFF"
                                            value={eventFormData.title}
                                            onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Thời gian bắt đầu (*)</label>
                                            <input
                                                required type="datetime-local"
                                                value={eventFormData.start_time}
                                                onChange={(e) => setEventFormData({ ...eventFormData, start_time: e.target.value })}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Thời gian kết thúc (*)</label>
                                            <input
                                                required type="datetime-local"
                                                value={eventFormData.end_time}
                                                onChange={(e) => setEventFormData({ ...eventFormData, end_time: e.target.value })}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Địa điểm tổ chức (*)</label>
                                        <div className="relative">
                                            <input
                                                required type="text"
                                                placeholder="Nhập địa chỉ (ví dụ: 370 Võ Nguyên Giáp, Đà Nẵng)"
                                                value={eventFormData.location_name}
                                                onChange={(e) => setEventFormData({ ...eventFormData, location_name: e.target.value })}
                                                onFocus={() => setIsFocused(true)}
                                                onBlur={() => {
                                                    setTimeout(() => setIsFocused(false), 200);
                                                }}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            />
                                            {loadingAddressSearch && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <RefreshCw className="animate-spin text-slate-400" size={14} />
                                                </div>
                                            )}
                                        </div>
                                        
                                        {showAddressSuggestions && isFocused && addressSuggestions.length > 0 && (
                                            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                                                {addressSuggestions.map((item: any) => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => {
                                                            const [lng, lat] = item.center;
                                                            const fullName = item.place_name_vi || item.place_name;
                                                            setEventFormData({
                                                                ...eventFormData,
                                                                location_name: fullName,
                                                                latitude: lat,
                                                                longitude: lng
                                                            });
                                                            setShowAddressSuggestions(false);
                                                            
                                                            // Bay bản đồ tới vị trí gợi ý được chọn
                                                            miniMapRef.current?.flyTo({
                                                                center: [lng, lat],
                                                                zoom: 15,
                                                                duration: 1000
                                                            });
                                                        }}
                                                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
                                                    >
                                                        {item.place_name_vi || item.place_name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kinh độ (Longitude) (*)</label>
                                            <input
                                                required type="number" step="any"
                                                placeholder="VD: 108.2022"
                                                value={eventFormData.longitude || ''}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setEventFormData({ ...eventFormData, longitude: val });
                                                    miniMapRef.current?.setCenter([val, eventFormData.latitude || 16.0544]);
                                                }}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vĩ độ (Latitude) (*)</label>
                                            <input
                                                required type="number" step="any"
                                                placeholder="VD: 16.0544"
                                                value={eventFormData.latitude || ''}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setEventFormData({ ...eventFormData, latitude: val });
                                                    miniMapRef.current?.setCenter([eventFormData.longitude || 108.2022, val]);
                                                }}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trạng thái ban đầu</label>
                                            <div className="relative">
                                                <select
                                                    value={eventFormData.status}
                                                    onChange={(e) => setEventFormData({ ...eventFormData, status: e.target.value })}
                                                    className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none bg-white font-medium text-slate-700"
                                                >
                                                    <option value="pending">Pending (Chờ duyệt)</option>
                                                    <option value="approved">Approved (Duyệt ngay)</option>
                                                    <option value="cancelled">Cancelled (Hủy bỏ)</option>
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loại danh mục</label>
                                            <div className="relative">
                                                <select
                                                    value={eventFormData.category_id}
                                                    onChange={(e) => setEventFormData({ ...eventFormData, category_id: Number(e.target.value) })}
                                                    className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none bg-white font-medium text-slate-700"
                                                >
                                                    <option value={1}>Lễ hội lớn (Festival)</option>
                                                    <option value={2}>Hòa nhạc (Music Event)</option>
                                                    <option value={3}>Thể thao (Sports)</option>
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mô tả ngắn gọn</label>
                                        <input
                                            type="text"
                                            placeholder="Mô tả tóm tắt sự kiện dưới 100 chữ..."
                                            value={eventFormData.short_description}
                                            onChange={(e) => setEventFormData({ ...eventFormData, short_description: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chi tiết sự kiện</label>
                                        <textarea
                                            rows={3}
                                            placeholder="Nội dung giới thiệu chi tiết sự kiện cho người dùng..."
                                            value={eventFormData.description}
                                            onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Right Side: Interactive Mini Map */}
                                <div className="col-span-1 md:col-span-6 relative h-[300px] md:h-full min-h-[300px] bg-slate-100 flex flex-col">
                                    <div className="absolute inset-0">
                                        <Map
                                            ref={miniMapRef}
                                            initialViewState={{
                                                longitude: eventFormData.longitude || 108.2022,
                                                latitude: eventFormData.latitude || 16.0544,
                                                zoom: 14
                                            }}
                                            onClick={handleMiniMapClick}
                                            style={{ width: '100%', height: '100%' }}
                                            mapStyle="mapbox://styles/mapbox/streets-v12"
                                            mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
                                        >
                                            <NavigationControl position="bottom-right" />
                                            
                                            <Marker
                                                longitude={eventFormData.longitude || 108.2022}
                                                latitude={eventFormData.latitude || 16.0544}
                                                anchor="bottom"
                                                draggable={true}
                                                onDragEnd={handleMarkerDragEnd}
                                            >
                                                <div className="relative w-[30px] h-[36px] flex flex-col items-center justify-end cursor-pointer">
                                                    <svg width="30" height="36" viewBox="0 0 30 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="filter drop-shadow-md">
                                                        <ellipse cx="15" cy="32" rx="7" ry="2" fill="#64748b" opacity="0.4" />
                                                        <path
                                                            d="M15 0C6.72 0 0 6.72 0 15C0 22.92 15 33.33 15 33.33C15 33.33 30 22.92 30 15C30 6.72 23.28 0 15 0Z"
                                                            fill="#3B82F6"
                                                        />
                                                        <circle cx="15" cy="13" r="4" fill="white" />
                                                    </svg>
                                                </div>
                                            </Marker>
                                        </Map>
                                    </div>
                                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-200 shadow-md pointer-events-none text-[10px] font-bold text-slate-700 flex flex-col gap-0.5 max-w-[80%]">
                                        <span className="text-blue-600">📍 Ghim Vị Trí Sự Kiện</span>
                                        <span className="text-slate-400 font-semibold leading-normal">Nhấp chuột lên bản đồ hoặc Kéo thả ghim để định vị chính xác.</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-semibold transition"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-sm font-semibold transition shadow-md flex items-center gap-1"
                                >
                                    <Save size={16} /> Lưu sự kiện
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
