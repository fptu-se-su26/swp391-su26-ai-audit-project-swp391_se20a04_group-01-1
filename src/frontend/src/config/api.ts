const API_BASE_URL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : 'http://localhost:5001/api';

export const API_ENDPOINTS = {
  // Auth
  REGISTER: `${API_BASE_URL}/auth/register`,
  LOGIN: `${API_BASE_URL}/auth/login`,
  VERIFY_OTP: `${API_BASE_URL}/auth/verify-otp`,
  RESEND_OTP: `${API_BASE_URL}/auth/resend-otp`,
  VERIFY_2FA: `${API_BASE_URL}/auth/verify-2fa`,
  GOOGLE_LOGIN: `${API_BASE_URL}/auth/google-login`,
  SETUP_2FA: `${API_BASE_URL}/auth/setup-2fa`,
  CONFIRM_2FA: `${API_BASE_URL}/auth/confirm-2fa`,

  // User
  GET_PROFILE: `${API_BASE_URL}/user/profile`,
  UPDATE_PROFILE: `${API_BASE_URL}/user/profile`,
  CHANGE_PASSWORD: `${API_BASE_URL}/user/change-password`,
  GET_SECURITY_SETTINGS: `${API_BASE_URL}/user/security-settings`,
  DISABLE_2FA: `${API_BASE_URL}/user/disable-2fa`,

  // Preferences
  GET_PREFERENCES: `${API_BASE_URL}/user/preferences`,
  UPDATE_PREFERENCES: `${API_BASE_URL}/user/preferences`,

  // Favorite POIs
  FAVORITE_POIS: `${API_BASE_URL}/user/favorites/pois`,
  FAVORITE_POIS_DETAILS: `${API_BASE_URL}/user/favorites/pois/details`,
  TOGGLE_FAVORITE_POI: (id: number) => `${API_BASE_URL}/pois/${id}/favorite`
};

export default API_BASE_URL;