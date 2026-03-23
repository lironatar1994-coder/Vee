require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY
    }
});

async function testEmail() {
    try {
        const info = await transporter.sendMail({
            from: 'onboarding@resend.dev',
            to: 'lironatar1994@gmail.com',
            subject: 'Test Email from Vee',
            text: 'Hello, this is a test email sent from Vee.'
        });
        console.log('✅ Email sent successfully:', info.messageId);
    } catch (err) {
        console.error('❌ Failed to send email:', err);
    }
}

testEmail();
