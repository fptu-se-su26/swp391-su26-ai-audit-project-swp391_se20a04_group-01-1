const nodemailer = require('nodemailer');

// Đảm bảo tên biến môi trường khớp với file .env của bạn
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// Test kết nối Gmail
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Gmail connection failed:', error);
    } else {
        console.log('✅ Gmail connection verified!');
    }
});

const sendOtpEmail = async (to, otp) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: to,
            subject: 'Password Reset OTP - DaNang EventMap',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563EB;">🔐 Xác thực tài khoản</h2>
                    <p>Mã OTP của bạn là: <strong>${otp}</strong></p>
                    <p style="color: #ff6b6b;">⏱️ Mã có hiệu lực trong 5 phút.</p>
                </div>
            `,
        });
        return true;
    } catch (error) {
        console.error('❌ Email send FAILED:', error.message);
        return false;
    }
};

module.exports = { sendOtpEmail };