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
                window.location.href = `${import.meta.env.BASE_URL}login`;
                return Promise.reject(err);
            }
        }

        return Promise.reject(error);
    }
);

// ============ FORGOT PASSWORD API ============
export const poiAPI = {
    getAllPOIs: () => apiClient.get('/pois'),
};
export const forgotPasswordAPI = {
    sendOtp: (email: string) =>
        apiClient.post('/auth/forgot-password', { email }),

    verifyOtp: (email: string, otp: string) =>
        apiClient.post('/auth/verify-otp', { email, otp }),

    resetPassword: (email: string, newPassword: string) =>
        apiClient.post('/auth/reset-password', { email, newPassword }),

    resendOtp: (email: string) =>
        apiClient.post('/auth/resend-otp', { email }),
};
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

    getFloodZones: () =>
        apiClient.get('/admin/flood-zones'),

    updateFloodZone: (id: number, isActive: boolean) =>
        apiClient.put(`/admin/flood-zones/${id}`, { is_active: isActive }),

    getTrafficAlerts: () =>
        apiClient.get('/admin/traffic-alerts'),

    toggleTrafficAlert: (id: number, isActive: boolean) =>
        apiClient.put(`/admin/traffic-alerts/${id}/toggle`, { is_active: isActive }),
};

export const trafficAlertAPI = {
    getTrafficAlerts: () => apiClient.get('/traffic-alerts'),
    createTrafficAlert: (data: any) => apiClient.post('/traffic-alerts', data),
};

export default apiClient;

// Thêm vào trong api.ts
export const eventAPI = {
    getAllEvents: (status?: string) => apiClient.get('/events', { params: { status } }),
    getEventCategories: () => apiClient.get('/event-categories'),
    createEvent: (data: any) => apiClient.post('/events', data),
    updateEvent: (id: number, data: any) => apiClient.put(`/events/${id}`, data),
    deleteEvent: (id: number) => apiClient.delete(`/events/${id}`),
    toggleFavorite: (id: number) => apiClient.post(`/events/${id}/favorite`),
    getFavoriteEventIds: () => apiClient.get('/user/favorites/events'),
};