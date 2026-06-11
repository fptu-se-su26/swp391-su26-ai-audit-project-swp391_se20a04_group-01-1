import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import API_BASE_URL from '../config/api';

// Tạo instance axios
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Tự động gắn Token và xử lý đường dẫn
api.interceptors.request.use(
  (config) => {
    // 1. Gắn Token nếu có
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Chống trùng lặp /api/api/: Nếu URL có bắt đầu bằng /api, loại bỏ nó để tránh trùng với baseURL
    if (config.url && config.url.startsWith('/api')) {
      config.url = config.url.replace('/api', '');
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Xử lý lỗi tập trung
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const authStore = useAuthStore.getState();

    if (error.response?.status === 401) {
      // Chỉ logout khi token thật sự hết hạn hoặc invalid (401), 
      // không logout khi do nhập sai mật khẩu hiện tại (chúng ta sẽ dùng 400 cho lỗi đó ở server)
      const errorMessage = (error.response.data as any)?.message || '';
      
      if (errorMessage !== "Mật khẩu hiện tại không chính xác!") {
        authStore.logout();
        localStorage.removeItem('auth_token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        toast.error('Phiên đăng nhập đã hết hạn');
      }
    } else if (error.response?.status === 403) {
      toast.error('Bạn không có quyền truy cập');
    } else if (error.response?.status === 429) {
      toast.error('Quá nhiều yêu cầu, vui lòng thử lại sau.');
    }

    return Promise.reject(error);
  }
);

export default api;