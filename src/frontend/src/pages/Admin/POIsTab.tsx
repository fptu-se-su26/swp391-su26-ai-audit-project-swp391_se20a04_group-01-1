import React, { useState, useEffect } from 'react';
import { MapPin, Search, CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import { poiAPI } from '../../services/api';
import { showPremiumToast } from '../../utils/toastUtils';

interface POIsTabProps {
    onRefresh?: () => void;
}

export default function POIsTab({ onRefresh }: POIsTabProps) {
    const [pendingPOIs, setPendingPOIs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Custom confirm modal for rejecting POIs
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        poiId: number | null;
        poiName: string;
    }>({
        isOpen: false,
        poiId: null,
        poiName: ''
    });

    const fetchPendingPOIs = async () => {
        try {
            setLoading(true);
            const response = await poiAPI.getPendingPOIs();
            if (response.data && response.data.data) {
                setPendingPOIs(response.data.data);
            }
        } catch (error) {
            console.error("Lỗi khi tải POI chờ duyệt:", error);
            showPremiumToast("Lỗi khi tải danh sách địa điểm chờ duyệt", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingPOIs();
    }, []);

    const handleApprove = async (id: number) => {
        try {
            await poiAPI.approvePOI(id);
            showPremiumToast("Đã duyệt địa điểm thành công!", "success");
            fetchPendingPOIs();
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error(error);
            showPremiumToast("Lỗi khi duyệt địa điểm", "error");
        }
    };

    const handleOpenRejectModal = (poi: any) => {
        setConfirmModal({
            isOpen: true,
            poiId: poi.poi_id,
            poiName: poi.name
        });
    };

    const handleConfirmReject = async () => {
        if (!confirmModal.poiId) return;
        const id = confirmModal.poiId;
        setConfirmModal({ isOpen: false, poiId: null, poiName: '' });
        
        try {
            await poiAPI.rejectPOI(id);
            showPremiumToast("Đã từ chối địa điểm", "success");
            fetchPendingPOIs();
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error(error);
            showPremiumToast("Lỗi khi từ chối địa điểm", "error");
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <MapPin className="text-orange-500" />
                        Địa Điểm Chờ Duyệt
                    </h2>
                    <p className="text-slate-500 mt-1">Danh sách các địa điểm người dùng đóng góp cần được duyệt.</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600 border-b border-slate-100">ID</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600 border-b border-slate-100">Tên địa điểm</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600 border-b border-slate-100">Địa chỉ</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600 border-b border-slate-100">Tọa độ</th>
                            <th className="px-6 py-4 text-sm font-semibold text-slate-600 border-b border-slate-100 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Đang tải dữ liệu...</td>
                            </tr>
                        ) : pendingPOIs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <MapPin size={32} className="text-slate-300" />
                                        <p>Không có địa điểm nào đang chờ duyệt</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            pendingPOIs.map((poi) => (
                                <tr key={poi.poi_id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-slate-500">#{poi.poi_id}</td>
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-slate-800">{poi.name}</p>
                                        {poi.description && <p className="text-xs text-slate-500 truncate max-w-xs mt-1">{poi.description}</p>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {poi.address || <span className="italic text-slate-400">Không có</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">
                                            {Number(poi.longitude).toFixed(4)}, {Number(poi.latitude).toFixed(4)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleApprove(poi.poi_id)}
                                                className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                                                title="Duyệt"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleOpenRejectModal(poi)}
                                                className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                title="Từ chối"
                                            >
                                                <XCircle size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* CUSTOM CONFIRM MODAL TỪ CHỐI POI */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full text-left font-sans animate-scale-up">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-rose-50 text-rose-600 border border-rose-100">
                                <AlertTriangle size={20} />
                            </span>
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                                    Xác nhận từ chối
                                </h3>
                                <p className="text-xs text-slate-400">Địa điểm đóng góp</p>
                            </div>
                        </div>
                        <p className="text-xs font-semibold text-slate-600 mb-6 leading-relaxed">
                            Bạn có chắc chắn muốn từ chối địa điểm <strong className="text-slate-800">"{confirmModal.poiName}"</strong> không?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirmModal({ isOpen: false, poiId: null, poiName: '' })}
                                className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleConfirmReject}
                                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-1"
                            >
                                <XCircle size={14} />
                                Xác nhận từ chối
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
