import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import * as authService from '../../services/authService';
import * as userService from '../../services/userService';
import toast from 'react-hot-toast';

const SecuritySettings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  useEffect(() => {
    // Check if user is admin
    if (user?.role !== 'admin') {
      toast.error('Bạn không có quyền truy cập trang này');
      navigate('/dashboard');
      return;
    }

    fetchSecuritySettings();
  }, [user, navigate]);

  const fetchSecuritySettings = async () => {
    try {
      setIsLoading(true);
      const result = await userService.getSecuritySettings();
      setSettings(result.data);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || 'Lỗi khi lấy cài đặt bảo mật';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      setIsLoading(true);
      const result = await authService.setup2FA();

      if (result.success) {
        setQRCode(result.data.qrCode);
        setTotpSecret(result.data.secret);
        setShowQRCode(true);
        toast.success('QR Code đã được tạo. Vui lòng scan với ứng dụng authenticator');
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || 'Lỗi khi thiết lập 2FA';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm2FA = async () => {
    if (!confirmCode || confirmCode.length !== 6) {
      toast.error('Vui lòng nhập mã 6 chữ số');
      return;
    }

    setIsConfirming(true);
    try {
      const result = await authService.confirm2FA(confirmCode);

      if (result.success) {
        toast.success('2FA đã được bật thành công!');
        setShowQRCode(false);
        setConfirmCode('');
        setQRCode(null);
        setTotpSecret(null);
        await fetchSecuritySettings();
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || 'Xác minh 2FA thất bại';
      toast.error(errorMessage);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      toast.error('Vui lòng nhập mật khẩu');
      return;
    }

    try {
      setIsLoading(true);
      const result = await userService.disable2FA({ password: disablePassword });

      if (result.success) {
        toast.success('2FA đã được tắt thành công!');
        setShowDisable2FA(false);
        setDisablePassword('');
        await fetchSecuritySettings();
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || 'Lỗi khi tắt 2FA';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cài đặt bảo mật</h1>
          <p className="text-gray-600">Quản lý cài đặt bảo mật của tài khoản</p>
        </div>

        {/* Security Info Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Thông tin tài khoản</h2>

          {/* Email */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Email</p>
            <p className="text-lg font-medium text-gray-900">{settings?.email}</p>
            <p className={`text-sm mt-2 ${settings?.is_verified ? 'text-green-600' : 'text-red-600'}`}>
              {settings?.is_verified ? '✓ Đã xác minh' : '✗ Chưa xác minh'}
            </p>
          </div>

          {/* Account Created */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Ngày tạo tài khoản</p>
            <p className="text-lg font-medium text-gray-900">
              {new Date(settings?.created_at).toLocaleDateString('vi-VN')}
            </p>
          </div>

          {/* Last Updated */}
          <div>
            <p className="text-sm text-gray-600 mb-1">Cập nhật lần cuối</p>
            <p className="text-lg font-medium text-gray-900">
              {new Date(settings?.updated_at).toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>

        {/* Two-Factor Authentication Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Xác thực hai yếu tố (2FA)</h2>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              settings?.two_factor_enabled
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {settings?.two_factor_enabled ? 'Đã bật' : 'Chưa bật'}
            </div>
          </div>

          <p className="text-gray-600 mb-6">
            2FA thêm một lớp bảo mật bổ sung cho tài khoản của bạn. Khi bật, bạn sẽ cần nhập mã từ ứng dụng authenticator ngoài việc nhập mật khẩu.
          </p>

          {!settings?.two_factor_enabled ? (
            <>
              {/* Setup 2FA */}
              {!showQRCode ? (
                <button
                  onClick={handleSetup2FA}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isLoading ? 'Đang thiết lập...' : 'Bật 2FA'}
                </button>
              ) : (
                <div className="space-y-6">
                  {/* QR Code */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <p className="text-sm text-gray-600 mb-4 text-center">
                      Quét mã QR bằng ứng dụng Google Authenticator hoặc tương tự:
                    </p>
                    {qrCode && (
                      <div className="flex justify-center mb-4">
                        <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                      </div>
                    )}
                    {totpSecret && (
                      <div className="bg-white p-4 rounded border border-gray-300">
                        <p className="text-xs text-gray-600 mb-2">Nhập thủ công nếu không thể quét:</p>
                        <p className="text-sm font-mono text-center text-gray-900 break-all">
                          {totpSecret}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nhập mã xác thực 6 chữ số:
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={confirmCode}
                      onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                    />
                  </div>

                  {/* Confirm Button */}
                  <button
                    onClick={handleConfirm2FA}
                    disabled={isConfirming || confirmCode.length !== 6}
                    className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {isConfirming ? 'Đang xác minh...' : 'Xác nhận và bật 2FA'}
                  </button>

                  {/* Cancel Button */}
                  <button
                    onClick={() => {
                      setShowQRCode(false);
                      setConfirmCode('');
                      setQRCode(null);
                      setTotpSecret(null);
                    }}
                    className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-400 transition"
                  >
                    Hủy
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Disable 2FA */
            <>
              {!showDisable2FA ? (
                <button
                  onClick={() => setShowDisable2FA(true)}
                  className="w-full bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition"
                >
                  Tắt 2FA
                </button>
              ) : (
                <div className="space-y-4 bg-red-50 p-6 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800 font-medium">
                    ⚠️ Tắt 2FA sẽ giảm bảo mật của tài khoản
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nhập mật khẩu để xác nhận:
                    </label>
                    <input
                      type="password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleDisable2FA}
                      disabled={isLoading || !disablePassword}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {isLoading ? 'Đang xử lý...' : 'Tắt 2FA'}
                    </button>

                    <button
                      onClick={() => {
                        setShowDisable2FA(false);
                        setDisablePassword('');
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-400 transition"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;