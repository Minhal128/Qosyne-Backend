const sendEmail = require('./emails/emailService');
const templates = require('./emails/emailTemplates');

const testSendGridOTP = async () => {
  try {
    console.log('🧪 Testing SendGrid OTP Email Service...\n');

    // Test OTP
    const testOTP = 123456;
    const testEmail = 'rminhal783@gmail.com'; // Using the EMAIL_TESTING from .env

    console.log('📧 Test Configuration:');
    console.log(`   - Email: ${testEmail}`);
    console.log(`   - OTP: ${testOTP}`);
    console.log(`   - API Key: ${process.env.SENDGRID_API_KEY ? '✅ Configured' : '❌ Missing'}\n`);

    // Generate OTP email HTML
    const htmlContent = templates.otpTemplate(testOTP);

    // Send test email
    console.log('📤 Sending test OTP email...');
    const result = await sendEmail(
      testEmail,
      'OTP Verification - Test',
      htmlContent
    );

    console.log('\n✅ SUCCESS! Email sent successfully');
    console.log(`   - Message ID: ${result.messageId}`);
    console.log(`   - Response: ${result.response}`);
    console.log('\n📧 Check your email inbox for the OTP verification email');

  } catch (error) {
    console.error('\n❌ ERROR: Failed to send OTP email');
    console.error(`   - Error: ${error.message}`);
    console.error(`   - Details: ${error.toString()}`);

    if (error.response) {
      console.error(`   - Response Status: ${error.response.status}`);
      console.error(`   - Response Body: ${JSON.stringify(error.response.body, null, 2)}`);
    }
  }
};

// Run the test
testSendGridOTP();
