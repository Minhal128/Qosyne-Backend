const otpTemplate = (otp) => `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Qosyne - OTP Verification</h2>
    <p>Your OTP code is: <strong>${otp}</strong></p>
    <p>Please enter this code within 10 minutes.</p>
  </div>
`;

const resetPasswordTemplate = (link) => `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Reset Your Password</h2>
    <p>Click the link below to reset your password:</p>
    <a href="${link}" style="padding: 10px; background: blue; color: white; text-decoration: none;">
      Reset Password
    </a>
  </div>
`;

const contactSupportTemplate = (data) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
    <h2 style="color: #004d61; text-align: center;">New Support Request</h2>
    <p style="font-size: 16px; color: #333;">Hello Support Team,</p>
    <p style="font-size: 16px; color: #333;">
      A user has submitted a support request with the details below:
    </p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <th style="text-align: left; padding: 8px; background: #f0f4f8;">Name</th>
        <td style="padding: 8px;">${data.name}</td>
      </tr>
      <tr>
        <th style="text-align: left; padding: 8px; background: #f0f4f8;">Email</th>
        <td style="padding: 8px;">${data.email}</td>
      </tr>
      <tr>
        <th style="text-align: left; padding: 8px; background: #f0f4f8;">Subject</th>
        <td style="padding: 8px;">${data.subject}</td>
      </tr>
      ${
        data.transactionId
          ? `
          <tr>
            <th style="text-align: left; padding: 8px; background: #f0f4f8;">Transaction ID</th>
            <td style="padding: 8px;">${data.transactionId}</td>
          </tr>
        `
          : ''
      }
      <tr>
        <th style="text-align: left; padding: 8px; background: #f0f4f8;">Message</th>
        <td style="padding: 8px;">${data.message}</td>
      </tr>
    </table>
    <p style="font-size: 16px; color: #333;">
      Please follow up with this user at your earliest convenience.
    </p>
    <p style="font-size: 14px; color: #999; text-align: center; margin-top: 30px;">
      © ${new Date().getFullYear()} Qosyne. All rights reserved.
    </p>
  </div>
`;

module.exports = {
  otpTemplate,
  resetPasswordTemplate,
  contactSupportTemplate,
};
