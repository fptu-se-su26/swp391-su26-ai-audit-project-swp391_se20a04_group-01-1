export const GOOGLE_CLIENT_ID = 
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || 
  'your-google-client-id.apps.googleusercontent.com';

export const AUTH_CONFIG = {
  googleClientId: GOOGLE_CLIENT_ID,
  tokenKey: 'auth_token',
  userKey: 'auth_user',
  refreshTokenKey: 'refresh_token'
};

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true
};

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_SECONDS = 300;
export const TOTP_CODE_LENGTH = 6;