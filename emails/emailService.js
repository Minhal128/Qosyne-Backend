const nodemailer = require('nodemailer');

// SMTP Configuration from environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // Use TLS (not SSL)
  auth: {
    user: process.env.SMTP_USER || '5compropertiesllc@gmail.com',
    pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
  },
});

const sendEmail = async (to, subject, htmlContent) => {
  try {
    console.log('📧 Sending email to:', to);

    const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || '5compropertiesllc@gmail.com';

    const info = await transporter.sendMail({
      from: `"Qosyne" <${fromEmail}>`,
      to,
      subject,
      html: htmlContent,
    });

    console.log('✅ Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    throw error;
  }
};

module.exports = sendEmail;
