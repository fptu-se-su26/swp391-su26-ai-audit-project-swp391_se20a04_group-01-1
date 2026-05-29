import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import * as authService from '../../services/authService';
import toast from 'react-hot-toast';
import { GOOGLE_CLIENT_ID } from '../../config/auth';

declare global {
  interface Window {
    google: any;
  }
}

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  useEffect(() => {
    if (!window.google) {
      console.error('Google SDK not loaded');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleLogin
    });

    window.google.accounts.id.renderButton(
      document.getElementById('google-login-button'),
      {
        theme: 'outline',
        size: 'large',
        text: 'signin_with'
      }
    );
  }, []);

  const handleGoogleLogin = async (response: any) => {
    try {
      const result = await authService.loginWithGoogle(response.credential);

      if (result.success) {
        login(result.user, result.access_token);
        toast.success('Đăng nhập thành công!');
        onSuccess?.();
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error(error.response?.data?.error?.message || 'Đăng nhập Google thất bại');
    }
  };

  return <div id="google-login-button" />;
};

export default GoogleLoginButton;