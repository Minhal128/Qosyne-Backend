const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  secure: true,
  auth: {
    user: '5compropertiesllc@gmail.com',
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmail = async (to, subject, htmlContent) => {
  try {
    console.log('sending email to .....', to);

    const info = await transporter.sendMail({
      from: `"Qosyne" <${process.env.EMAIL_USERNAME}>`,
      to,
      subject,
      html: htmlContent,
    });

    console.log('Email sent:', info.messageId);
  } catch (error) {
    console.error('Email send error:', error);
  }
};

module.exports = sendEmail;
