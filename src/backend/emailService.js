const nodemailer = require('nodemailer');

console.log('📧 Email config:', {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD : 'MISSING',
});

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
        console.log(`📤 Attempting to send OTP to ${to}`);
        console.log(`🔐 Using email: ${process.env.EMAIL_USER}`);
        
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

        console.log(`✅ Email sent successfully!`);
        console.log(`📬 Message ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Email send FAILED!');
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Full error:', error);
        return false;
    }
};

module.exports = { sendOtpEmail };