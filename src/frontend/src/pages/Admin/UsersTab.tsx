import React from 'react';
import { Users, AlertTriangle, X } from 'lucide-react';
import { ManageUser } from './types';

interface Props {
    adminUsers: ManageUser[];
    showBanModal: boolean;
    setShowBanModal: (v: boolean) => void;
    userToBan: ManageUser | null;
    setUserToBan: (v: ManageUser | null) => void;
    banReason: string;
    setBanReason: (v: string) => void;
    handleBanSubmit: (e: React.FormEvent) => void;
    handleUnbanUser: (userId: number) => void;
}

export default function UsersTab({
    adminUsers, showBanModal, setShowBanModal, userToBan, setUserToBan,
    banReason, setBanReason, handleBanSubmit, handleUnbanUser
}: Props) {
    return (
        <>
            <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
                    <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <Users size={18} className="text-purple-500" /> Quản lý & Khóa tài khoản (Ban User)
                    </h3>
                    <p className="text-xs text-slate-400 mb-6">Danh sách người dùng đăng ký ứng dụng. Cho phép Admin khóa/mở khóa tài khoản vi phạm chính sách.</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3 px-4">User</th>
                                    <th className="py-3 px-4">Email</th>
                                    <th className="py-3 px-4">Vai trò</th>
                                    <th className="py-3 px-4 text-center">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs font-medium text-slate-700 divide-y divide-slate-100">
                                {adminUsers?.map((user) => (
                                    <tr key={user.user_id} className="hover:bg-slate-50/50 transition">
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col text-left">
                                                <span className="font-bold text-slate-800">{user.username}</span>
                                                {user.ban_reason && (
                                                    <span className="text-[10px] text-red-500 font-semibold mt-0.5">Lý do khóa: {user.ban_reason}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-500 text-left">{user.email}</td>
                                        <td className="py-3 px-4 text-left">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {user.role === 'admin' ? (
                                                <span className="text-[10px] text-slate-400 font-medium italic">Không thể khóa Admin</span>
                                            ) : user.is_active ? (
                                                <button
                                                    onClick={() => { setUserToBan(user); setBanReason(''); setShowBanModal(true); }}
                                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-bold transition"
                                                >
                                                    Khóa (Ban)
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleUnbanUser(user.user_id)}
                                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-lg font-bold transition"
                                                >
                                                    Mở khóa
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal: Ban User */}
            {showBanModal && userToBan && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col border border-slate-200 animate-slide-up">
                        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 animate-pulse" />
                                Khóa Tài Khoản: {userToBan.username}
                            </h3>
                            <button
                                onClick={() => { setShowBanModal(false); setUserToBan(null); }}
                                className="text-white/80 hover:text-white transition"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleBanSubmit} className="p-6 space-y-4">
                            <p className="text-sm text-slate-500 text-left">
                                Vui lòng nhập lý do khóa tài khoản này. Người dùng sẽ không thể đăng nhập vào ứng dụng cho đến khi được mở khóa.
                            </p>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 text-left">Lý do khóa (*)</label>
                                <input
                                    required type="text"
                                    placeholder="VD: Vi phạm điều khoản, spam báo cáo giả..."
                                    value={banReason}
                                    onChange={(e) => setBanReason(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => { setShowBanModal(false); setUserToBan(null); }}
                                    className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-semibold transition"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={!banReason}
                                    className="px-5 py-2.5 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition shadow-md"
                                >
                                    Khóa tài khoản
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
