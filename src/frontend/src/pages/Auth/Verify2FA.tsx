import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import * as authService from '../../services/authService';
import OTPInput from '../components/OTPInput';
import toast from 'react-hot-toast';
import { TOTP_CODE_LENGTH } from '../../config/auth';

const Verify2FA: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  
  // States cơ bản
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  // States xử lý chặn nhập sai nhiều lần
  const [retryCount, setRetryCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const MAX_RETRIES = 5;

  useEffect(() => {
    // Lấy data từ localStorage
    const storedTempToken = localStorage.getItem('temp_token');
    const storedEmail = localStorage.getItem('pending_user_email');
    const tokenExpiry = localStorage.getItem('temp_token_expiry');

    // Kiểm tra token có tồn tại không
    if (!storedTempToken) {
      toast.error('Phiên hết hạn, vui lòng đăng nhập lại');
      handleBackToLogin();
      return;
    }

    // Kiểm tra token có bị quá hạn không (Nếu bạn có lưu temp_token_expiry)
    if (tokenExpiry && new Date() > new Date(tokenExpiry)) {
      toast.error('Phiên xác thực 2FA đã hết hạn');
      handleBackToLogin();
      return;
    }

    setTempToken(storedTempToken);
    setEmail(storedEmail);
  }, [navigate]);

  // Hook theo dõi số lần nhập sai
  useEffect(() => {
    if (retryCount >= MAX_RETRIES) {
      setIsBlocked(true);
      toast.error('Quá nhiều lần nhập sai. Vui lòng đăng nhập lại.');
      
      // Đợi 2 giây để user đọc thông báo rồi đá về trang Login
      const timer = setTimeout(() => {
        handleBackToLogin();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [retryCount]);

  const handleBackToLogin = () => {
    setRetryCount(0);
    setIsBlocked(false);
    localStorage.removeItem('temp_token');
    localStorage.removeItem('pending_user_email');
    localStorage.removeItem('temp_token_expiry');
    navigate('/login');
  };

  const handleVerify2FA = async (completedCode?: string | React.MouseEvent) => {
    if (isBlocked) return;

    // Ưu tiên lấy mã truyền trực tiếp (khi auto-submit), nếu không có mới lấy State (khi user tự bấm nút)
    const finalCode = typeof completedCode === 'string' ? completedCode : code;

    // Validate logic
    if (!finalCode || finalCode.length !== TOTP_CODE_LENGTH || !/^\d{6}$/.test(finalCode)) {
      toast.error(`Vui lòng nhập đúng mã ${TOTP_CODE_LENGTH} chữ số`);
      return;
    }

    if (!tempToken) {
      toast.error('Phiên hết hạn');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.verify2FA({
        code: finalCode,
        temp_token: tempToken
      });

      if (result?.success && result?.access_token && result?.user) {
        
        // 1. THÊM BA DÒNG NÀY: Lưu dữ liệu để ProtectedRoute nhận diện được bạn đã đăng nhập
        localStorage.setItem("token", result.access_token);
        localStorage.setItem("userRole", result.user.role);
        localStorage.setItem("user", JSON.stringify(result.user));

        login(result.user, result.access_token);
        
        // Clear storage
        localStorage.removeItem('temp_token');
        localStorage.removeItem('pending_user_email');
        localStorage.removeItem('temp_token_expiry');

        toast.success('Xác minh 2FA thành công!');
        
        // 2. SỬA ĐOẠN ĐIỀU HƯỚNG: Phân luồng cho Admin và User
        if (result.user.role === "admin") {
          window.location.href = "/admin/dashboard";
        } else {
          window.location.href = "/dashboard";
        }
        
      } else {
        throw new Error(result?.error?.message || 'Xác minh 2FA thất bại');
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Phiên đã hết hạn, vui lòng đăng nhập lại');
        handleBackToLogin();
      } else {
        // Gom chung các lỗi 400 hoặc lỗi mạng vào đây để tăng retry count
        const errorMsg = error.response?.data?.error?.message || error.message || 'Mã OTP không chính xác';
        toast.error(errorMsg);
        setRetryCount(prev => prev + 1);
        setCode(''); // Reset lại ô input để user nhập lại
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Xác minh 2FA</h1>
          <p className="text-gray-600">Nhập mã từ ứng dụng authenticator của bạn</p>
        </div>

        {/* Email Display */}
        {email && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-center text-gray-700">
              Đang xác minh cho: <span className="font-bold">{email}</span>
            </p>
          </div>
        )}

        {/* Cảnh báo số lần thử */}
        {retryCount > 0 && !isBlocked && (
          <div className="text-center text-sm font-medium text-amber-600 bg-amber-50 p-2 rounded-lg mb-6 border border-amber-200">
            ⚠️ Nhập sai: Bạn còn {MAX_RETRIES - retryCount} lần thử
          </div>
        )}

        {/* Cảnh báo bị khóa */}
        {isBlocked && (
          <div className="text-center text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg mb-6 border border-red-200">
            🚫 Đang chuyển hướng về trang đăng nhập...
          </div>
        )}

        {/* Code Input */}
        <div className="mb-8 pointer-events-auto" style={{ opacity: isBlocked ? 0.5 : 1, pointerEvents: isBlocked ? 'none' : 'auto' }}>
          <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
            Mã xác thực (6 chữ số)
          </label>
          <OTPInput
            length={TOTP_CODE_LENGTH}
            value={code}
            onChange={setCode}
            onComplete={handleVerify2FA}
          />
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            💡 Mở ứng dụng Google Authenticator hoặc Microsoft Authenticator để lấy mã xác thực.
          </p>
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerify2FA}
          disabled={isLoading || isBlocked || code.length !== TOTP_CODE_LENGTH}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition mb-4"
        >
          {isLoading ? 'Đang xác minh...' : 'Xác minh'}
        </button>

        {/* Back to Login */}
        <div className="text-center">
          <button
            onClick={handleBackToLogin}
            disabled={isLoading || isBlocked}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium disabled:opacity-50"
          >
            ← Quay lại đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
};

export default Verify2FA;