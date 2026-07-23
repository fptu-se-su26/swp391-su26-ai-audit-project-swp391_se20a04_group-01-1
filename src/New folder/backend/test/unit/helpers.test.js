const { isValidEmail, isValidPassword, checkBanStatus, formatDateTime, parseTimeToDate } = require('../../utils/helpers');

// ============================================================
// TEST SUITE: isValidEmail
// ============================================================
describe('isValidEmail()', () => {

    describe('Email hợp lệ', () => {
        test('email thông thường', () => {
            expect(isValidEmail('user@example.com')).toBe(true);
        });

        test('email của cơ quan nhà nước', () => {
            expect(isValidEmail('admin@danang.gov.vn')).toBe(true);
        });

        test('email có subdomain', () => {
            expect(isValidEmail('test@mail.fpt.edu.vn')).toBe(true);
        });

        test('email có dấu chấm trong phần local', () => {
            expect(isValidEmail('ho.ten@company.io')).toBe(true);
        });

        test('email có dấu cộng', () => {
            expect(isValidEmail('user+tag@gmail.com')).toBe(true);
        });

        test('email có chữ số', () => {
            expect(isValidEmail('user123@test.vn')).toBe(true);
        });
    });

    describe('Email không hợp lệ', () => {
        test('thiếu ký tự @', () => {
            expect(isValidEmail('userexample.com')).toBe(false);
        });

        test('thiếu tên miền', () => {
            expect(isValidEmail('user@')).toBe(false);
        });

        test('thiếu phần mở rộng (.com, .vn, ...)', () => {
            expect(isValidEmail('user@domain')).toBe(false);
        });

        test('chuỗi rỗng', () => {
            expect(isValidEmail('')).toBe(false);
        });

        test('chỉ có khoảng trắng', () => {
            expect(isValidEmail('   ')).toBe(false);
        });

        test('có khoảng trắng trong email', () => {
            expect(isValidEmail('user name@example.com')).toBe(false);
        });
    });
});

// ============================================================
// TEST SUITE: isValidPassword
// ============================================================
describe('isValidPassword()', () => {

    describe('Mật khẩu hợp lệ (>= 6 ký tự)', () => {
        test('đúng 6 ký tự', () => {
            expect(isValidPassword('123456')).toBe(true);
        });

        test('nhiều hơn 6 ký tự', () => {
            expect(isValidPassword('strongPassword@2024')).toBe(true);
        });

        test('có ký tự đặc biệt', () => {
            expect(isValidPassword('Pa$$w0rd!')).toBe(true);
        });

        test('chỉ toàn số', () => {
            expect(isValidPassword('12345678')).toBe(true);
        });
    });

    describe('Mật khẩu không hợp lệ (< 6 ký tự hoặc rỗng)', () => {
        test('5 ký tự', () => {
            expect(isValidPassword('12345')).toBe(false);
        });

        test('1 ký tự', () => {
            expect(isValidPassword('a')).toBe(false);
        });

        test('chuỗi rỗng → falsy (hàm trả về empty string)', () => {
            // isValidPassword('') trả về '' (falsy) vì: '' && ''>=6 === ''
            expect(isValidPassword('')).toBeFalsy();
        });

        test('undefined → falsy', () => {
            // isValidPassword(undefined) trả về undefined vì: undefined && ...
            expect(isValidPassword(undefined)).toBeFalsy();
        });

        test('null → falsy', () => {
            // isValidPassword(null) trả về null vì: null && ...
            expect(isValidPassword(null)).toBeFalsy();
        });
    });
});

// ============================================================
// TEST SUITE: checkBanStatus
// ============================================================
describe('checkBanStatus()', () => {

    test('user null → không bị ban', () => {
        const result = checkBanStatus(null);
        expect(result.banned).toBe(false);
    });

    test('user undefined → không bị ban', () => {
        const result = checkBanStatus(undefined);
        expect(result.banned).toBe(false);
    });

    test('user có is_active = 1 → không bị ban', () => {
        const user = { is_active: 1, ban_reason: null };
        const result = checkBanStatus(user);
        expect(result.banned).toBe(false);
    });

    test('user có is_active = true → không bị ban', () => {
        const user = { is_active: true };
        const result = checkBanStatus(user);
        expect(result.banned).toBe(false);
    });

    test('user có is_active = 0 → bị ban', () => {
        const user = { is_active: 0, ban_reason: 'Spam nội dung' };
        const result = checkBanStatus(user);
        expect(result.banned).toBe(true);
        expect(result.message).toContain('Spam nội dung');
    });

    test('user có is_active = false → bị ban', () => {
        const user = { is_active: false, ban_reason: null };
        const result = checkBanStatus(user);
        expect(result.banned).toBe(true);
        // Dùng lý do mặc định khi ban_reason là null
        expect(result.message).toContain('Vi phạm chính sách');
    });

    test('user bị ban → message chứa lý do ban', () => {
        const user = { is_active: 0, ban_reason: 'Đăng tin giả mạo' };
        const result = checkBanStatus(user);
        expect(result.message).toContain('Đăng tin giả mạo');
    });
});

// ============================================================
// TEST SUITE: formatDateTime
// ============================================================
describe('formatDateTime()', () => {

    test('input null → trả về null', () => {
        expect(formatDateTime(null)).toBeNull();
    });

    test('input undefined → trả về null', () => {
        expect(formatDateTime(undefined)).toBeNull();
    });

    test('Date hợp lệ → trả về chuỗi định dạng DD/MM/YYYY HH:mm', () => {
        // Dùng UTC để tránh timezone offset
        const date = new Date('2024-06-15T08:30:00Z');
        const result = formatDateTime(date);
        // Kết quả phụ thuộc timezone Asia/Ho_Chi_Minh (UTC+7)
        expect(result).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    });

    test('string ISO date hợp lệ → trả về chuỗi', () => {
        const result = formatDateTime('2024-01-20T10:00:00.000Z');
        expect(typeof result).toBe('string');
        expect(result).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    });
});

// ============================================================
// TEST SUITE: parseTimeToDate
// ============================================================
describe('parseTimeToDate()', () => {

    test('input null → trả về null', () => {
        expect(parseTimeToDate(null)).toBeNull();
    });

    test('input undefined → trả về null', () => {
        expect(parseTimeToDate(undefined)).toBeNull();
    });

    test('"08:30:00" → trả về Date object', () => {
        const result = parseTimeToDate('08:30:00');
        expect(result).toBeInstanceOf(Date);
        expect(result.getUTCHours()).toBe(8);
        expect(result.getUTCMinutes()).toBe(30);
        expect(result.getUTCSeconds()).toBe(0);
    });

    test('"23:59:59" → trả về Date cuối ngày đúng', () => {
        const result = parseTimeToDate('23:59:59');
        expect(result.getUTCHours()).toBe(23);
        expect(result.getUTCMinutes()).toBe(59);
        expect(result.getUTCSeconds()).toBe(59);
    });

    test('"00:00:00" → trả về nửa đêm', () => {
        const result = parseTimeToDate('00:00:00');
        expect(result.getUTCHours()).toBe(0);
        expect(result.getUTCMinutes()).toBe(0);
    });

    test('chuỗi có NaN → trả về null', () => {
        const result = parseTimeToDate('abc:def');
        expect(result).toBeNull();
    });
});
