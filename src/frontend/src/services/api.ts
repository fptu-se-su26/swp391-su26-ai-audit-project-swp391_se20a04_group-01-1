import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor: Thêm token vào mỗi request
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor: Xử lý lỗi token
apiClient.interceptors.response.use(
    (response) => response,
    async (error: any) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const token = localStorage.getItem('token');
                const response = await axios.post(`${API_URL}/auth/refresh`, {
                    token: token,
                });
                const newToken = response.data.token;
                localStorage.setItem('token', newToken);
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return apiClient(originalRequest);
            } catch (err) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(err);
            }
        }

        return Promise.reject(error);
    }
);

// ============ AUTH API ============

export const authAPI = {
    register: (username: string, email: string, password: string) =>
        apiClient.post('/auth/register', { username, email, password }),

    // ✅ FIX: Khớp với response của backend
    login: (email: string, password: string) =>
        apiClient.post('/auth/login', { email, password }),

    refreshToken: (token: string) =>
        apiClient.post('/auth/refresh', { token }),
};

// ============ USER API ============

export const userAPI = {
    getProfile: () =>
        apiClient.get('/user/profile'),

    updateProfile: (username: string) =>
        apiClient.put('/user/profile', { username }),
};

// ============ ADMIN API ============

export const adminAPI = {
    getUsers: () =>
        apiClient.get('/admin/users'),

    deleteUser: (userId: string) =>
        apiClient.delete(`/admin/users/${userId}`),
};

export default apiClient;
