// backend/emailService.js
const nodemailer = require('nodemailer');

// Ẩn log mật khẩu để bảo mật hơn
if (process.env.NODE_ENV !== 'test') {
    console.log('📧 Email config:', {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD ? '***' : 'MISSING',
    });
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// CHỈ test kết nối Gmail nếu KHÔNG PHẢI đang chạy Jest Test
if (process.env.NODE_ENV !== 'test') {
    transporter.verify((error, success) => {
        if (error) {
            console.error('❌ Gmail connection failed:', error);
        } else {
            console.log('✅ Gmail connection verified!');
        }
    });
}

const sendOtpEmail = async (to, otp) => {
    try {
        if (process.env.NODE_ENV !== 'test') {
            console.log(`📤 Attempting to send OTP to ${to}`);
        }
        
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: to,
            subject: '🔐 Password Reset OTP - DaNang EventMap',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563EB;">🔐 Password Reset Request</h2>
                    <p>Your OTP code is: <strong>${otp}</strong></p>
                    <p style="color: #ff6b6b;">⏱️ This code expires in 5 minutes.</p>
                </div>
            `,
        });

        if (process.env.NODE_ENV !== 'test') {
            console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`);
        }
        return true;
    } catch (error) {
        if (process.env.NODE_ENV !== 'test') {
            console.error('❌ Email send FAILED!', error);
        }
        return false;
    }
};

module.exports = { sendOtpEmail, transporter };