import React from 'react';
import {
    Users, Key, Shield, CheckCircle2, AlertCircle, Lock, Copy, Eye, EyeOff
} from 'lucide-react';
import { showPremiumToast } from '../../utils/toastUtils';

interface Props {
    // Profile
    profileForm: { username: string; email: string; };
    setProfileForm: (v: any) => void;
    profileMessage: string;
    profileError: boolean;
    handleUpdateProfileSubmit: (e: React.FormEvent) => void;
    // Password
    hasPassword: boolean;
    pwdFormData: { currentPassword: string; newPassword: string; confirmPassword: string; };
    setPwdFormData: (v: any) => void;
    pwdMessage: string;
    pwdError: boolean;
    showPwd: { current: boolean; new: boolean; confirm: boolean; };
    setShowPwd: (v: any) => void;
    handleChangePasswordSubmit: (e: React.FormEvent) => void;
    // 2FA
    twoFactorEnabled: boolean;
    twoFaQRCode: string | null;
    twoFaSecret: string | null;
    totpConfirmCode: string;
    setTotpConfirmCode: (v: string) => void;
    showTwoFaQR: boolean;
    setShowTwoFaQR: (v: boolean) => void;
    showDisable2FaInput: boolean;
    setShowDisable2FaInput: (v: boolean) => void;
    disable2FaPassword: string;
    setDisable2FaPassword: (v: string) => void;
    twoFaMessage: string;
    twoFaError: boolean;
    isConfirming2FA: boolean;
    handleSetup2FA: () => void;
    handleConfirm2FA: () => void;
    handleDisable2FA: () => void;
    setTwoFaQRCode: (v: string | null) => void;
    setTwoFaSecret: (v: string | null) => void;
    setTwoFaError: (v: boolean) => void;
    setTwoFaMessage: (v: string) => void;
}

export default function SettingsTab({
    profileForm, setProfileForm, profileMessage, profileError, handleUpdateProfileSubmit,
    hasPassword, pwdFormData, setPwdFormData, pwdMessage, pwdError, showPwd, setShowPwd,
    handleChangePasswordSubmit, twoFactorEnabled, twoFaQRCode, twoFaSecret, totpConfirmCode,
    setTotpConfirmCode, showTwoFaQR, setShowTwoFaQR, showDisable2FaInput, setShowDisable2FaInput,
    disable2FaPassword, setDisable2FaPassword, twoFaMessage, twoFaError, isConfirming2FA,
    handleSetup2FA, handleConfirm2FA, handleDisable2FA,
    setTwoFaQRCode, setTwoFaSecret, setTwoFaError, setTwoFaMessage
}: Props) {
    return (
        <div className="space-y-8 animate-fade-in max-w-5xl">
            {/* Thông tin cá nhân Admin */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Users size={18} className="text-blue-500" /> Thông tin cá nhân Admin
                </h3>

                {profileMessage && (
                    <div className={`p-3 rounded-xl text-xs font-semibold mb-4 border ${
                        profileError ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                        {profileMessage}
                    </div>
                )}

                <form onSubmit={handleUpdateProfileSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên hiển thị (*)</label>
                            <input
                                type="text"
                                required
                                value={profileForm.username}
                                onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Địa chỉ Email (Không thể sửa)</label>
                            <input
                                type="email"
                                disabled
                                value={profileForm.email}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-400 cursor-not-allowed font-medium"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="px-5 py-2 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition shadow-md"
                        >
                            Lưu thông tin
                        </button>
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Đổi Mật Khẩu */}
                {/* Đổi Mật Khẩu */}
                {hasPassword !== false && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Key size={18} className="text-blue-500" />
                            Thay đổi mật khẩu tài khoản
                        </h3>
                        <p className="text-xs text-slate-400 mb-6">
                            Đảm bảo mật khẩu của bạn có độ dài tối thiểu 8 ký tự và bao gồm các chữ cái, chữ số.
                        </p>

                        <form onSubmit={handleChangePasswordSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
                            <div className="space-y-4">
                                {pwdMessage && (
                                    <div className={`p-3 rounded-xl text-xs font-semibold ${pwdError ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                        {pwdMessage}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mật khẩu hiện tại</label>
                                    <div className="relative">
                                        <input
                                            type={showPwd.current ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={pwdFormData.currentPassword}
                                            onChange={(e) => setPwdFormData({ ...pwdFormData, currentPassword: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 pr-10"
                                        />
                                        <button type="button" onClick={() => setShowPwd({ ...showPwd, current: !showPwd.current })} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition">
                                            {showPwd.current ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mật khẩu mới</label>
                                    <div className="relative">
                                        <input
                                            type={showPwd.new ? "text" : "password"}
                                            placeholder="Mật khẩu mới (tối thiểu 8 ký tự)"
                                            value={pwdFormData.newPassword}
                                            onChange={(e) => setPwdFormData({ ...pwdFormData, newPassword: e.target.value })}
                                            className={`w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 pr-10 transition-colors ${
                                                pwdFormData.newPassword && pwdFormData.confirmPassword && pwdFormData.newPassword === pwdFormData.confirmPassword
                                                ? 'border-emerald-500 focus:ring-emerald-500/20'
                                                : pwdFormData.newPassword && pwdFormData.confirmPassword && pwdFormData.newPassword !== pwdFormData.confirmPassword
                                                ? 'border-red-500 focus:ring-red-500/20'
                                                : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                                            }`}
                                        />
                                        <button type="button" onClick={() => setShowPwd({ ...showPwd, new: !showPwd.new })} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition">
                                            {showPwd.new ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase">Xác nhận mật khẩu mới</label>
                                        {pwdFormData.newPassword && pwdFormData.confirmPassword && pwdFormData.newPassword === pwdFormData.confirmPassword && (
                                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> Trùng khớp</span>
                                        )}
                                        {pwdFormData.newPassword && pwdFormData.confirmPassword && pwdFormData.newPassword !== pwdFormData.confirmPassword && (
                                            <span className="text-[10px] font-bold text-red-600 flex items-center gap-1"><AlertCircle size={12} /> Không khớp</span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPwd.confirm ? "text" : "password"}
                                            placeholder="Nhập lại mật khẩu mới"
                                            value={pwdFormData.confirmPassword}
                                            onChange={(e) => setPwdFormData({ ...pwdFormData, confirmPassword: e.target.value })}
                                            className={`w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 pr-10 transition-colors ${
                                                pwdFormData.newPassword && pwdFormData.confirmPassword && pwdFormData.newPassword === pwdFormData.confirmPassword
                                                ? 'border-emerald-500 focus:ring-emerald-500/20'
                                                : pwdFormData.newPassword && pwdFormData.confirmPassword && pwdFormData.newPassword !== pwdFormData.confirmPassword
                                                ? 'border-red-500 focus:ring-red-500/20'
                                                : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                                            }`}
                                        />
                                        <button type="button" onClick={() => setShowPwd({ ...showPwd, confirm: !showPwd.confirm })} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition">
                                            {showPwd.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={pwdFormData.newPassword !== pwdFormData.confirmPassword && pwdFormData.confirmPassword.length > 0}
                                className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm shadow-md mt-6"
                            >
                                Cập nhật mật khẩu
                            </button>
                        </form>
                    </div>
                )}

                {/* Bảo mật 2 lớp (2FA) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Shield size={18} className="text-emerald-500" />
                                Xác thực 2 lớp (2FA)
                            </h3>
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${twoFactorEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                {twoFactorEnabled ? 'Đã bật' : 'Chưa kích hoạt'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-6">
                            Bảo vệ tài khoản quản trị bằng lớp bảo mật bổ sung. Khi đăng nhập thiết bị lạ, bạn sẽ cần cung cấp mã 6 chữ số từ ứng dụng Google Authenticator.
                        </p>

                        {twoFaMessage && (
                            <div className={`p-3 rounded-xl text-xs font-semibold mb-4 border ${twoFaError ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                {twoFaMessage}
                            </div>
                        )}

                        {twoFactorEnabled && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs text-emerald-700">
                                    <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
                                    <span>Tài khoản của bạn đã được bảo vệ bởi xác thực hai lớp (2FA).</span>
                                </div>
                                {showDisable2FaInput ? (
                                    <div className="space-y-3 p-4 bg-slate-50 border border-slate-150 rounded-xl">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mật khẩu xác nhận</label>
                                        <input
                                            type="password"
                                            placeholder="Nhập mật khẩu hiện tại"
                                            value={disable2FaPassword}
                                            onChange={(e) => setDisable2FaPassword(e.target.value)}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={handleDisable2FA} className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-lg hover:bg-red-700 transition text-xs shadow-sm">
                                                Xân nhận Tắt 2FA
                                            </button>
                                            <button onClick={() => { setShowDisable2FaInput(false); setDisable2FaPassword(''); }} className="px-3 bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg hover:bg-slate-300 transition text-xs">
                                                Hủy
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setShowDisable2FaInput(true)} className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold py-2.5 rounded-xl transition text-sm shadow-sm">
                                        Tắt xác thực 2 lớp
                                    </button>
                                )}
                            </div>
                        )}

                        {!twoFactorEnabled && showTwoFaQR && (
                            <div className="space-y-4 p-4 border border-slate-100 bg-slate-50/50 rounded-xl">
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <span className="text-xs font-semibold text-slate-600">Quét mã dưới đây bằng Google Authenticator</span>
                                    {twoFaQRCode && (
                                        <div className="p-2 bg-white border border-slate-200 rounded-xl shadow-inner">
                                            <img src={twoFaQRCode} alt="Mã QR 2FA" className="w-40 h-40" />
                                        </div>
                                    )}
                                    {twoFaSecret && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-600">
                                            <span>Key: {twoFaSecret}</span>
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(twoFaSecret || ''); showPremiumToast('Đã copy mã bí mật!', 'success'); }}
                                                className="text-blue-500 hover:text-blue-600" title="Copy mã bí mật" type="button"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã xác thực OTP (6 chữ số)</label>
                                    <input
                                        type="text" maxLength={6} placeholder="Nhập mã 6 chữ số"
                                        value={totpConfirmCode}
                                        onChange={(e) => setTotpConfirmCode(e.target.value.trim().replace(/\D/g, ''))}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleConfirm2FA} disabled={isConfirming2FA} className="flex-1 bg-emerald-600 text-white font-semibold py-2 rounded-lg hover:bg-emerald-700 transition text-xs shadow-sm disabled:opacity-50">
                                            {isConfirming2FA ? 'Đang xác thực...' : 'Xác thực & Kích hoạt'}
                                        </button>
                                        <button
                                            onClick={() => { setShowTwoFaQR(false); setTwoFaQRCode(null); setTwoFaSecret(null); setTotpConfirmCode(''); setTwoFaError(false); setTwoFaMessage(''); }}
                                            className="px-3 bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg hover:bg-slate-300 transition text-xs"
                                        >
                                            Hủy bỏ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!twoFactorEnabled && !showTwoFaQR && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500">
                                    <Lock size={20} className="shrink-0 text-slate-400" />
                                    <span>Lớp bảo mật chưa được cấu hình. Nhấp nút bên dưới để bắt đầu thiết lập.</span>
                                </div>
                                <button onClick={handleSetup2FA} className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 transition text-sm shadow-md">
                                    Thiết lập xác thực 2 lớp (2FA)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}