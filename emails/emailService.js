const nodemailer = require('nodemailer');

// Use SendGrid for production (more reliable on cloud platforms)
// Falls back to Gmail if SendGrid is not configured
const transporter = process.env.SENDGRID_API_KEY
  ? nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    })
  : nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: '5compropertiesllc@gmail.com',
        pass: process.env.EMAIL_PASSWORD,
      },
    });

const sendEmail = async (to, subject, htmlContent) => {
  try {
    console.log('📧 Sending email to:', to);

    const fromEmail = process.env.SENDGRID_API_KEY 
      ? 'noreply@qosyne.com'  // Use SendGrid verified sender
      : '5compropertiesllc@gmail.com';  // Fallback to Gmail

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
