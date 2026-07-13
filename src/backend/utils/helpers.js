const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const isValidPassword = (password) => {
    return password && password.length >= 6;
};

const checkBanStatus = (user) => {
    if (!user) {
        return { banned: false };
    }

    if (user.is_active === 0 || user.is_active === false) {
        return {
            banned: true,
            message: `Tài khoản đã bị khóa! Lý do: ${user.ban_reason || "Vi phạm chính sách."}`
        };
    }

    return { banned: false };
};

const formatDateTime = (dateObj) => {
    if (!dateObj) return null;
    try {
        const date = new Date(dateObj);
        const options = {
            timeZone: 'Asia/Ho_Chi_Minh',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
        const formatter = new Intl.DateTimeFormat('en-GB', options);
        const parts = formatter.formatToParts(date);
        let day = '', month = '', year = '', hour = '', minute = '';
        for (const part of parts) {
            if (part.type === 'day') day = part.value;
            if (part.type === 'month') month = part.value;
            if (part.type === 'year') year = part.value;
            if (part.type === 'hour') hour = part.value;
            if (part.type === 'minute') minute = part.value;
        }
        return `${day}/${month}/${year} ${hour}:${minute}`;
    } catch (error) {
        console.error('🔍 Error in formatDateTime:', error);
        return 'Error formatting date';
    }
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

module.exports = {
    isValidEmail,
    isValidPassword,
    checkBanStatus,
    formatDateTime,
    parseTimeToDate
};
