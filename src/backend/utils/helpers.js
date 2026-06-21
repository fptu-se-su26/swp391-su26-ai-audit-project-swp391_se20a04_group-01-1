// ============ HELPER FUNCTIONS ============

const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const isValidPassword = (password) => {
    return password && password.length >= 6;
};

const parseTimeToDate = (timeStr) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;
    return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
};

// ================= CHECK BAN STATUS =================

const checkBanStatus = (user) => {
    if (!user) {
        return {
            banned: false
        };
    }

    if (user.is_active === 0 || user.is_active === false) {
        return {
            banned: true,
            message: `Tài khoản đã bị khóa! Lý do: ${user.ban_reason || "Vi phạm chính sách."}`
        };
    }

    return {
        banned: false
    };
};

// Hàm format ngày tháng chính xác (Fix lỗi UTC)
const formatDateTime = (dateObj) => {
    if (!dateObj) return null;
    try {
        const date = new Date(dateObj);
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
        console.error('🔍 Error in formatDateTime:', error);
        return 'Error formatting date';
    }
};

module.exports = {
    isValidEmail,
    isValidPassword,
    parseTimeToDate,
    checkBanStatus,
    formatDateTime
};