import { AUTH_CONFIG } from '../config/auth';

/**
 * Save token to localStorage
 */
export const saveToken = (token: string) => {
  localStorage.setItem(AUTH_CONFIG.tokenKey, token);
};

/**
 * Get token from localStorage
 */
export const getToken = (): string | null => {
  return localStorage.getItem(AUTH_CONFIG.tokenKey);
};

/**
 * Remove token from localStorage
 */
export const removeToken = () => {
  localStorage.removeItem(AUTH_CONFIG.tokenKey);
};

/**
 * Check if token exists
 */
export const hasToken = (): boolean => {
  return !!getToken();
};

/**
 * Save user to localStorage
 */
export const saveUser = (user: any) => {
  localStorage.setItem(AUTH_CONFIG.userKey, JSON.stringify(user));
};

/**
 * Get user from localStorage
 */
export const getUser = () => {
  const user = localStorage.getItem(AUTH_CONFIG.userKey);
  return user ? JSON.parse(user) : null;
};

/**
 * Remove user from localStorage
 */
export const removeUser = () => {
  localStorage.removeItem(AUTH_CONFIG.userKey);
};

/**
 * Parse JWT token (without verification - client-side only)
 */
export const parseJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = parseJWT(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    return Date.now() >= expirationTime;
  } catch (error) {
    return true;
  }
};