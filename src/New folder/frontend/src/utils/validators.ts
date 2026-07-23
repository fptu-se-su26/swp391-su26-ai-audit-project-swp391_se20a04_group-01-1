import { PASSWORD_REQUIREMENTS, OTP_LENGTH, TOTP_CODE_LENGTH } from '../config/auth';

// Thêm hàm validate username vào file validators.ts
export const validateUsername = (username: string): { valid: boolean; error?: string } => {
  if (!username) {
    return { valid: false, error: 'Tên đăng nhập là bắt buộc' };
  }
  if (username.length < 4 || username.length > 20) {
    return { valid: false, error: 'Tên đăng nhập phải từ 4 đến 20 ký tự' };
  }
  if (!/^[a-zA-Z]/.test(username)) {
    return { valid: false, error: 'Tên đăng nhập phải bắt đầu bằng chữ cái' };
  }
  if (/\s/.test(username)) {
    return { valid: false, error: 'Tên đăng nhập không được chứa khoảng trắng' };
  }
  // Chỉ cho phép chữ cái không dấu, số và dấu gạch dưới
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới (_)' };
  }
  return { valid: true };
};

/**
 * Validate email
 */
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email) {
    return { valid: false, error: 'Email là bắt buộc' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Email không hợp lệ' };
  }

  return { valid: true };
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password) {
    return { valid: false, error: 'Mật khẩu là bắt buộc' };
  }

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    return {
      valid: false,
      error: `Mật khẩu phải có ít nhất ${PASSWORD_REQUIREMENTS.minLength} ký tự`
    };
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, error: 'Mật khẩu phải chứa ít nhất 1 chữ hoa' };
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, error: 'Mật khẩu phải chứa ít nhất 1 chữ thường' };
  }

  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    return { valid: false, error: 'Mật khẩu phải chứa ít nhất 1 số' };
  }

  return { valid: true };
};

/**
 * Validate OTP
 */
export const validateOTP = (otp: string): { valid: boolean; error?: string } => {
  if (!otp) {
    return { valid: false, error: 'OTP là bắt buộc' };
  }

  if (!/^\d+$/.test(otp)) {
    return { valid: false, error: 'OTP phải là các chữ số' };
  }

  if (otp.length !== OTP_LENGTH) {
    return { valid: false, error: `OTP phải là ${OTP_LENGTH} chữ số` };
  }

  return { valid: true };
};

/**
 * Validate TOTP code
 */
export const validateTOTPCode = (code: string): { valid: boolean; error?: string } => {
  if (!code) {
    return { valid: false, error: 'Mã 2FA là bắt buộc' };
  }

  if (!/^\d+$/.test(code)) {
    return { valid: false, error: 'Mã 2FA phải là các chữ số' };
  }

  if (code.length !== TOTP_CODE_LENGTH) {
    return { valid: false, error: `Mã 2FA phải là ${TOTP_CODE_LENGTH} chữ số` };
  }

  return { valid: true };
};

/**
 * Get password strength indicator
 */
export const getPasswordStrength = (password: string): {
  strength: 'weak' | 'medium' | 'strong';
  percentage: number;
} => {
  let strength = 0;

  if (password.length >= PASSWORD_REQUIREMENTS.minLength) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/\d/.test(password)) strength += 25;

  if (strength <= 25) {
    return { strength: 'weak', percentage: 25 };
  } else if (strength <= 50) {
    return { strength: 'weak', percentage: 50 };
  } else if (strength <= 75) {
    return { strength: 'medium', percentage: 75 };
  } else {
    return { strength: 'strong', percentage: 100 };
  }
};