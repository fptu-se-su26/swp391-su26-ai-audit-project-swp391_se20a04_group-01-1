import api from '../utils/api';
import { API_ENDPOINTS } from '../config/api';

interface UpdateProfileData {
  avatar_url?: string;
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
 * Change password
 */
export const changePassword = async (data: ChangePasswordData) => {
  const response = await api.put(API_ENDPOINTS.CHANGE_PASSWORD, data);
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
 * Disable 2FA
 */
export const disable2FA = async (data: DisableTwoFAData) => {
  const response = await api.delete(API_ENDPOINTS.DISABLE_2FA, { data });
  return response.data;
};