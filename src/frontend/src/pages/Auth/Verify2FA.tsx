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
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Get temp token and email from localStorage
    const storedTempToken = localStorage.getItem('temp_token');
    const storedEmail = localStorage.getItem('pending_user_email');

    if (!storedTempToken) {
      toast.error('Phiên hết hạn, vui lòng đăng nhập lại');
      navigate('/login');
      return;
    }

    setTempToken(storedTempToken);
    setEmail(storedEmail);
  }, [navigate]);

  const handleVerify2FA = async () => {
    if (!code || code.length !== TOTP_CODE_LENGTH) {
      toast.error(`Vui lòng nhập mã ${TOTP_CODE_LENGTH} chữ số`);
      return;
    }

    if (!tempToken) {
      toast.error('Phiên hết hạn');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.verify2FA({
        code,
        temp_token: tempToken
      });

      if (result.success) {
        login(result.user, result.access_token);
        
        // Clear storage
        localStorage.removeItem('temp_token');
        localStorage.removeItem('pending_user_email');

        toast.success('Xác minh 2FA thành công!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || 'Xác minh 2FA thất bại';
      toast.error(errorMessage);
      setCode('');
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
          <div className="bg-blue-50 p-4 rounded-lg mb-8">
            <p className="text-sm text-center text-gray-700">
              Đang xác minh cho: <span className="font-bold">{email}</span>
            </p>
          </div>
        )}

        {/* Code Input */}
        <div className="mb-8">
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
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800">
            💡 Mở ứng dụng Google Authenticator, Microsoft Authenticator hoặc ứng dụng tương tự để lấy mã xác thực 6 chữ số.
          </p>
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerify2FA}
          disabled={isLoading || code.length !== TOTP_CODE_LENGTH}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition mb-4"
        >
          {isLoading ? 'Đang xác minh...' : 'Xác minh'}
        </button>

        {/* Back to Login */}
        <div className="text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            ← Quay lại đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
};

export default Verify2FA;