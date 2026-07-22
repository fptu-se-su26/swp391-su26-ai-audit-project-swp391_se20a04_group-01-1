import axios from "axios";

// [TASK 1.1] Dùng biến môi trường thay vì hard-code URL
// Cấu hình trong src/frontend/.env: VITE_API_URL=http://localhost:5001
const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "http://localhost:5001/api"; // fallback cho dev nếu chưa có .env

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: Thêm token vào mỗi request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// [TASK 1.2] Fix token refresh loop:
// Backend KHÔNG có endpoint /auth/refresh → interceptor cũ gây vòng lặp logout vô hạn.
// Giải pháp: Khi nhận 401, clear token và redirect về login ngay lập tức.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");

      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);
// ============ FORGOT PASSWORD API ============
export const poiAPI = {
  getAllPOIs: () => apiClient.get("/pois"),
  createPOI: (data: FormData) =>
    apiClient.post("/pois", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getMyPOIs: () => apiClient.get("/pois/my-pois"),
  updatePOI: (id: number, data: FormData) =>
    apiClient.put(`/pois/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deletePOI: (id: number) => apiClient.delete(`/pois/${id}`),
  getPendingPOIs: () => apiClient.get("/admin/pois/pending"),
  approvePOI: (id: number) => apiClient.put(`/admin/pois/${id}/approve`),
  rejectPOI: (id: number) => apiClient.put(`/admin/pois/${id}/reject`),
};
export const forgotPasswordAPI = {
  sendOtp: (email: string) =>
    apiClient.post("/auth/forgot-password", { email }),

  verifyOtp: (email: string, otp: string) =>
    apiClient.post("/auth/verify-otp", { email, otp }),

  resetPassword: (email: string, newPassword: string) =>
    apiClient.post("/auth/reset-password", { email, newPassword }),

  resendOtp: (email: string) => apiClient.post("/auth/resend-otp", { email }),
};
// ============ AUTH API ============

export const authAPI = {
  // Đăng ký
  register: (username: string, email: string, password: string) =>
    apiClient.post("/auth/register", {
      username,
      email,
      password,
    }),

  // Đăng nhập
  login: (email: string, password: string) =>
    apiClient.post("/auth/login", {
      email,
      password,
    }),

  // Xác minh email sau khi đăng ký
  verifyRegisterOTP: (email: string, otp: string) =>
    apiClient.post("/auth/verify-register-otp", {
      email,
      otp,
    }),

  // Gửi lại OTP đăng ký
  resendRegisterOTP: (email: string) =>
    apiClient.post("/auth/resend-register-otp", {
      email,
    }),
};

// ============ USER API ============

export const userAPI = {
  getProfile: () => apiClient.get("/user/profile"),

  updateProfile: (username: string) =>
    apiClient.put("/user/profile", { username }),
};

// ============ ADMIN API ============

export const adminAPI = {
  getUsers: () => apiClient.get("/admin/users"),

  deleteUser: (userId: string) => apiClient.delete(`/admin/users/${userId}`),

  getFloodZones: () => apiClient.get("/admin/flood-zones"),

  updateFloodZone: (id: number, isActive: boolean) =>
    apiClient.put(`/admin/flood-zones/${id}`, { is_active: isActive }),

  getTrafficAlerts: () => apiClient.get("/admin/traffic-alerts"),

  toggleTrafficAlert: (id: number, isActive: boolean) =>
    apiClient.put(`/admin/traffic-alerts/${id}/toggle`, {
      is_active: isActive,
    }),

  deleteTrafficAlert: (id: number) =>
    apiClient.delete(`/admin/traffic-alerts/${id}`),

  getPendingPOIs: () => apiClient.get("/admin/pois/pending"),

  approvePOI: (id: number) => apiClient.put(`/admin/pois/${id}/approve`),

  rejectPOI: (id: number) => apiClient.put(`/admin/pois/${id}/reject`),
};

export const trafficAlertAPI = {
  getTrafficAlerts: () => apiClient.get("/traffic-alerts"),
  createTrafficAlert: (data: any) => apiClient.post("/traffic-alerts", data),
};

export default apiClient;

export const eventAPI = {
  getAllEvents: (status?: string) =>
    apiClient.get("/events", { params: { status } }),
  getEventCategories: () => apiClient.get("/event-categories"),
  createEvent: (data: FormData | any) =>
    apiClient.post("/events", data, {
      headers:
        data instanceof FormData
          ? { "Content-Type": "multipart/form-data" }
          : { "Content-Type": "application/json" },
    }),
  updateEvent: (id: number, data: FormData | any) =>
    apiClient.put(`/events/${id}`, data, {
      headers:
        data instanceof FormData
          ? { "Content-Type": "multipart/form-data" }
          : { "Content-Type": "application/json" },
    }),
  deleteEvent: (id: number) => apiClient.delete(`/events/${id}`),
  toggleFavorite: (id: number) => apiClient.post(`/events/${id}/favorite`),
  getFavoriteEventIds: () => apiClient.get("/user/favorites/events"),
  getEventImages: (eventId: number) =>
    apiClient.get(`/events/${eventId}/images`),
  uploadEventImage: (eventId: number, formData: FormData) =>
    apiClient.post(`/events/${eventId}/images`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  deleteEventImage: (imageId: number) =>
    apiClient.delete(`/events/images/${imageId}`),
  incrementView: (eventId: number) => apiClient.post(`/events/${eventId}/view`),
};

export const adminEventImageAPI = {
  getImagesByStatus: (status: "pending" | "approved" | "rejected") =>
    apiClient.get("/admin/event-images", {
      params: { status },
    }),

  approveImage: (imageId: number) =>
    apiClient.put(`/admin/event-images/${imageId}/approve`, {}),

  rejectImage: (imageId: number, reason: string) =>
    apiClient.put(`/admin/event-images/${imageId}/reject`, {
      reason,
    }),
};
