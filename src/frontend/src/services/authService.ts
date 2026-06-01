import api from '../utils/api';
import { API_ENDPOINTS } from '../config/api';

export const setup2FA = async () => {
    const response = await api.post(API_ENDPOINTS.SETUP_2FA);
    return response.data;
};

export const confirm2FA = async (code: string) => {
    const response = await api.post(API_ENDPOINTS.CONFIRM_2FA, { code });
    return response.data;
};

interface Verify2FAData {
    code: string;
    temp_token: string;
}

export const verify2FA = async (data: Verify2FAData) => {
    const response = await api.post(API_ENDPOINTS.VERIFY_2FA, data);
    return response.data;
};

export const registerUser = async (data: any) => {
    const username = data.email.split('@')[0];
    const response = await api.post('/auth/register', {
        username,
        email: data.email,
        password: data.password
    });
    localStorage.setItem('pending_user_id', data.email);
    return {
        success: true,
        message: response.data.message,
        data: response.data
    };
};

export const verifyOTP = async (data: { userId: string; otp: string }) => {
    // There is no separate signup OTP flow on the backend right now,
    // so we mock the success response to allow registration to proceed.
    return {
        success: true,
        message: 'OTP verified successfully (mocked)'
    };
};

export const resendOTP = async (userId: string, type: string) => {
    return {
        success: true,
        message: 'OTP resent successfully (mocked)'
    };
};

export const loginWithGoogle = async (token: string) => {
    const response = await api.post('/auth/google', { token });
    return {
        success: true,
        user: response.data.user,
        access_token: response.data.token
    };
};