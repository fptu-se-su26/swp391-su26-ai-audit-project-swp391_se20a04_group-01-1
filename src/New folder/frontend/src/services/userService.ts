import api from '../utils/api';
import { API_ENDPOINTS } from '../config/api';

interface UpdateProfileData {
  avatar_url?: string;
  username?: string;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface DisableTwoFAData {
  password: string;
}

/**
 * Get user profile
 */
export const getProfile = async () => {
  const response = await api.get(API_ENDPOINTS.GET_PROFILE);
  return response.data;
};

/**
 * Update user profile
 */
export const updateProfile = async (data: UpdateProfileData) => {
  const response = await api.put(API_ENDPOINTS.UPDATE_PROFILE, data);
  return response.data;
};

/**
 * Change password (Đã bỏ /api vì baseURL đã có sẵn)
 */
export const changePassword = async (data: ChangePasswordData) => {
  const response = await api.put('/user/change-password', data);
  return response.data;
};

/**
 * Get security settings
 */
export const getSecuritySettings = async () => {
  const response = await api.get(API_ENDPOINTS.GET_SECURITY_SETTINGS);
  return response.data;
};

/**
 * Disable 2FA (Đã bỏ /api)
 */
export const disable2FA = async (data: DisableTwoFAData) => {
  const response = await api.delete('/auth/disable-2fa', { data });
  return response.data;
};

// ============ API ADMIN ============

/**
 * Get all users for admin management (Đã bỏ /api)
 */
export const getAllUsers = async () => {
  const response = await api.get('/admin/users');
  return response; 
};

/**
 * Ban user account with reason (Đã bỏ /api)
 */
export const banUser = async (id: number, reason: string) => {
  const response = await api.put(`/admin/users/${id}/ban`, { ban_reason: reason });
  return response.data;
};

/**
 * Unban user account (Đã bỏ /api)
 */
export const unbanUser = async (id: number) => {
  const response = await api.put(`/admin/users/${id}/unban`);
  return response.data;
};