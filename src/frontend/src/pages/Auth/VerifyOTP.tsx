import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as authService from '../../services/authService';
import OTPInput from '../components/OTPInput';
import toast from 'react-hot-toast';
import { OTP_EXPIRY_SECONDS } from '../../config/auth';

interface VerifyOTPProps {
  email?: string;
}

const VerifyOTP: React.FC<VerifyOTPProps> = ({ email }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_SECONDS);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    // Get userId from state or localStorage
    const stateUserId = (location.state as any)?.userId;
    const storedUserId = localStorage.getItem('pending_user_id');
    const id = stateUserId || storedUserId;

    if (!id) {
      toast.error('Vui lòng đăng ký trước');
      navigate('/register');
      return;
    }

    setUserId(id);
    localStorage.setItem('pending_user_id', id);
  }, [location, navigate]);

  // Timer for OTP expiry
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Vui lòng nhập OTP 6 chữ số');
      return;
    }

    if (!userId) {
      toast.error('Lỗi: không tìm thấy user ID');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.verifyOTP({
        userId,
        otp
      });

      if (result.success) {
        toast.success('Email xác minh thành công!');
        localStorage.removeItem('pending_user_id');
        // Redirect to login
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || 'Xác minh OTP thất bại';
      toast.error(errorMessage);
      setOtp(''); // Clear input
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!userId) return;

    setIsResending(true);
    try {
      const result = await authService.resendOTP(userId, 'email_verify');

      if (result.success) {
        toast.success('OTP đã được gửi lại');
        setTimeLeft(OTP_EXPIRY_SECONDS);
        setCanResend(false);
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || 'Gửi lại OTP thất bại';
      toast.error(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Xác minh Email</h1>
          <p className="text-gray-600">Nhập mã OTP đã được gửi đến email của bạn</p>
        </div>

        {/* Email Info */}
        <div className="bg-blue-50 p-4 rounded-lg mb-8">
          <p className="text-sm text-center text-gray-700">
            Mã OTP đã được gửi đến email đăng ký {email ? `(${email})` : ''}
          </p>
        </div>

        {/* OTP Input */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
            Nhập mã 6 chữ số
          </label>
          <OTPInput
            length={6}
            value={otp}
            onChange={setOtp}
            onComplete={handleVerifyOTP}
          />
        </div>

        {/* Timer */}
        <div className="text-center mb-8">
          {timeLeft > 0 ? (
            <p className="text-sm text-gray-600">
              Mã OTP hết hạn trong: <span className="font-bold text-red-500">{formatTime(timeLeft)}</span>
            </p>
          ) : (
            <p className="text-sm text-red-500 font-medium">Mã OTP đã hết hạn</p>
          )}
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerifyOTP}
          disabled={isLoading || otp.length !== 6}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition mb-4"
        >
          {isLoading ? 'Đang xác minh...' : 'Xác minh'}
        </button>

        {/* Resend OTP */}
        <div className="text-center">
          <p className="text-sm text-gray-600">Chưa nhận được mã?</p>
          <button
            onClick={handleResendOTP}
            disabled={!canResend || isResending}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? 'Đang gửi...' : 'Gửi lại OTP'}
          </button>
        </div>

        {/* Divider */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => navigate('/register')}
            className="w-full text-center text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            ← Quay lại đăng ký
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;