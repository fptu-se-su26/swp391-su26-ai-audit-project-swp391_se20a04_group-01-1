import React from 'react';
import {
    Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight,
    AlertCircle, RefreshCw, Save, Calendar, X
} from 'lucide-react';
import { DBEvent, EventFormData } from './types';

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

export default function EventsTab({
    events, loadingEvents, searchTerm, setSearchTerm, statusFilter, setStatusFilter,
    currentPage, setCurrentPage, showModal, setShowModal, editingEvent, setEditingEvent,
    eventFormData, setEventFormData, handleApproveEvent, handleDeleteEvent, handleCreateEvent
}: Props) {
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
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer"
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="approved">Đã phê duyệt (Approved)</option>
                            <option value="pending">Chờ phê duyệt (Pending)</option>
                            <option value="cancelled">Đã hủy (Cancelled)</option>
                        </select>
                    </div>
                    <button
                        onClick={() => { setEditingEvent(null); setShowModal(true); }}
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
                                                                start_time: evt.start_time,
                                                                end_time: evt.end_time || '',
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
                    <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-slate-200 animate-slide-up">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                {editingEvent ? 'Chỉnh Sửa Sự Kiện' : 'Thêm Sự Kiện Mới'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
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

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Địa điểm tổ chức (*)</label>
                                <input
                                    required type="text"
                                    placeholder="Cảng Sông Hàn, Đà Nẵng"
                                    value={eventFormData.location_name}
                                    onChange={(e) => setEventFormData({ ...eventFormData, location_name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trạng thái ban đầu</label>
                                    <select
                                        value={eventFormData.status}
                                        onChange={(e) => setEventFormData({ ...eventFormData, status: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                                    >
                                        <option value="pending">Pending (Chờ duyệt)</option>
                                        <option value="approved">Approved (Duyệt ngay)</option>
                                        <option value="cancelled">Cancelled (Hủy bỏ)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loại danh mục</label>
                                    <select
                                        value={eventFormData.category_id}
                                        onChange={(e) => setEventFormData({ ...eventFormData, category_id: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                                    >
                                        <option value={1}>Lễ hội lớn (Festival)</option>
                                        <option value={2}>Hòa nhạc (Music Event)</option>
                                        <option value={3}>Thể thao (Sports)</option>
                                    </select>
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

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
