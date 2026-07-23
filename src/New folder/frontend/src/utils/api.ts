import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import API_BASE_URL from '../config/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Add token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const authStore = useAuthStore.getState();

    if (error.response?.status === 401) {
      // Token expired or invalid
      authStore.logout();
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      window.location.href = `${import.meta.env.BASE_URL}login`;
      toast.error('Phiên đăng nhập đã hết hạn');
    } else if (error.response?.status === 403) {
      toast.error('Bạn không có quyền truy cập');
    } else if (error.response?.status === 429) {
      // Rate limited
      const retryAfter = error.response.headers['retry-after'];
      toast.error(`Quá nhiều lần yêu cầu. Vui lòng thử lại sau ${retryAfter} giây`);
    }

    return Promise.reject(error);
  }
);

export default api;