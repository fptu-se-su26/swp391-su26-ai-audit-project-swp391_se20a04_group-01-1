import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as authService from '../../services/authService';
import toast from 'react-hot-toast';
import { validateEmail, validatePassword, getPasswordStrength } from '../../utils/validators';
import VerifyOTP from './VerifyOTP';

// Thêm vào component


const Register: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showVerifyOTP, setShowVerifyOTP] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [passwordStrength, setPasswordStrength] = useState({
    strength: 'weak' as 'weak' | 'medium' | 'strong',
    percentage: 0
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined
      }));
    }

    if (name === 'password') {
      setPasswordStrength(getPasswordStrength(value));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      newErrors.email = emailValidation.error;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.error;
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.registerUser({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      if (result.success) {
        setRegisteredEmail(formData.email);
        setShowVerifyOTP(true);
        toast.success('Đăng ký thành công! Vui lòng xác minh email');
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || 'Đăng ký thất bại';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength.strength === 'weak') return 'bg-red-500';
    if (passwordStrength.strength === 'medium') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (passwordStrength.strength === 'weak') return 'Yếu';
    if (passwordStrength.strength === 'medium') return 'Trung bình';
    return 'Mạnh';
  };

  // ✨ Hiển thị OTP verification screen
  if (showVerifyOTP) {
  return <VerifyOTP email={registeredEmail} />;
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">DN-Pulse</h1>
          <p className="text-gray-600">Tạo tài khoản mới</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your@email.com"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Mật khẩu
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {formData.password && (
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Độ mạnh</span>
                  <span className={`text-xs font-medium ${
                    passwordStrength.strength === 'weak' ? 'text-red-500' :
                    passwordStrength.strength === 'medium' ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>
                    {getStrengthLabel()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getStrengthColor()}`}
                    style={{ width: `${passwordStrength.percentage}%` }}
                  />
                </div>
              </div>
            )}
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password Input */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Xác nhận mật khẩu
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="••••••••"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="flex items-start">
            <input
              id="terms"
              type="checkbox"
              className="w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500 mt-1"
              required
            />
            <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
              Tôi đồng ý với{' '}
              <a href="#" className="text-blue-600 hover:text-blue-700">
                Điều khoản dịch vụ
              </a>{' '}
              và{' '}
              <a href="#" className="text-blue-600 hover:text-blue-700">
                Chính sách bảo mật
              </a>
            </label>
          </div>

          {/* Register Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        {/* Sign In Link */}
        <p className="text-center text-gray-600 mt-6">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;