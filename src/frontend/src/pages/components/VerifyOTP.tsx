import React, { useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

interface VerifyOTPProps {
  email: string;
  onSuccess?: () => void;
}

const VerifyOTP: React.FC<VerifyOTPProps> = ({ email, onSuccess }) => {
  const [otp, setOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/verify-otp', {
        email,
        otp
      });

      console.log(' OTP verified:', response.data);
      
      // Save token
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
      
      toast.success('Email xác thực thành công!');
      
      // Call callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Redirect to home
      setTimeout(() => {
        window.location.href = import.meta.env.BASE_URL;
      }, 1500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'OTP không chính xác';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await api.post('/auth/resend-otp', { email });
      toast.success('OTP đã gửi lại!');
      setOTP('');
      setError('');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Lỗi gửi lại OTP';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Xác thực Email</h1>
          <p className="text-gray-600">
            Nhập mã OTP gửi đến<br />
            <span className="font-semibold text-gray-900">{email}</span>
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* OTP Form */}
        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
              Mã OTP (6 chữ số)
            </label>
            <input
              id="otp"
              type="text"
              placeholder="000000"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOTP(value);
              }}
              maxLength={6}
              pattern="\d{6}"
              required
              className="w-full px-4 py-3 text-center text-lg tracking-widest border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-2">Nhập 6 chữ số</p>
          </div>

          {/* Verify Button */}
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Đang xác thực...' : 'Xác thực'}
          </button>
        </form>

        {/* Resend OTP */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm mb-3">
            Không nhận được mã OTP?
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendLoading ? 'Đang gửi...' : 'Gửi lại OTP'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;