const otpTemplate = (otp) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px; border-radius: 10px;">
    <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #004d61; margin: 0; font-size: 28px;">Qosyne</h1>
        <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Secure Verification</p>
      </div>
      
      <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">Hello,</p>
      
      <p style="color: #555; font-size: 15px; margin: 0 0 30px 0;">
        You requested a verification code to secure your Qosyne account. Use the code below to complete your verification.
      </p>
      
      <div style="background: #f0f4f8; border-left: 4px solid #004d61; padding: 20px; margin: 30px 0; border-radius: 4px;">
        <p style="color: #666; font-size: 13px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 2px;">Your Verification Code</p>
        <div style="background: white; padding: 15px; border-radius: 4px; text-align: center;">
          <p style="color: #004d61; font-size: 32px; font-weight: bold; margin: 0; letter-spacing: 5px; font-family: 'Courier New', monospace;">${otp}</p>
        </div>
      </div>
      
      <p style="color: #e74c3c; font-size: 14px; margin: 20px 0; text-align: center;">
        ⏱️ This code expires in <strong>10 minutes</strong>
      </p>
      
      <p style="color: #555; font-size: 14px; margin: 30px 0 0 0;">
        <strong>Security Tip:</strong> Never share this code with anyone. Qosyne staff will never ask for your verification code.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
        © ${new Date().getFullYear()} Qosyne. All rights reserved.<br>
        <a href="https://qosyncefrontend.vercel.app" style="color: #004d61; text-decoration: none;">Visit our website</a>
      </p>
    </div>
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
