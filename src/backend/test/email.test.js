const mockSendMail = jest.fn();
let verifyCallback;
const mockVerify = jest.fn((cb) => { verifyCallback = cb; });

jest.mock("nodemailer", () => ({
    createTransport: jest.fn(() => ({
        sendMail: mockSendMail,
        verify: mockVerify
    }))
}));

describe("emailService", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalPass = process.env.EMAIL_PASSWORD;

    beforeEach(() => {
        jest.resetModules(); // Reset module để chạy lại code top-level
        process.env.EMAIL_USER = "test@gmail.com";
        process.env.EMAIL_PASSWORD = "password";
        mockSendMail.mockClear();
        mockVerify.mockClear();
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
        process.env.EMAIL_PASSWORD = originalPass;
        jest.restoreAllMocks();
    });

    test("Send email success in test env", async () => {
        process.env.NODE_ENV = "test";
        const { sendOtpEmail } = require("../emailService");
        mockSendMail.mockResolvedValue({ messageId: "abc123" });
        
        const result = await sendOtpEmail("user@gmail.com", "123456");
        expect(result).toBe(true);
    });

    test("Send email fail in test env", async () => {
        process.env.NODE_ENV = "test";
        const { sendOtpEmail } = require("../emailService");
        mockSendMail.mockRejectedValue(new Error("SMTP Error"));
        
        const result = await sendOtpEmail("user@gmail.com", "123456");
        expect(result).toBe(false);
    });

    test("Coverage for dev environment logs (Success path)", async () => {
        process.env.NODE_ENV = "development";
        const { sendOtpEmail } = require("../emailService");
        
        // Kích hoạt callback verify thành công
        if (verifyCallback) verifyCallback(null, true);
        expect(console.log).toHaveBeenCalledWith('✅ Gmail connection verified!');

        // Gửi email thành công
        mockSendMail.mockResolvedValue({ messageId: "dev123" });
        await sendOtpEmail("dev@gmail.com", "111111");
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ Email sent successfully!'));
    });

    test("Coverage for dev environment logs (Fail path & missing pass)", async () => {
        process.env.NODE_ENV = "development";
        delete process.env.EMAIL_PASSWORD; // Mô phỏng thiếu mật khẩu
        const { sendOtpEmail } = require("../emailService");

        // Kích hoạt callback verify thất bại
        if (verifyCallback) verifyCallback(new Error("verify error"));
        expect(console.error).toHaveBeenCalledWith('❌ Gmail connection failed:', expect.any(Error));

        // Gửi email thất bại
        mockSendMail.mockRejectedValue(new Error("err"));
        await sendOtpEmail("dev@gmail.com", "222222");
        expect(console.error).toHaveBeenCalledWith('❌ Email send FAILED!', expect.any(Error));
    });
});