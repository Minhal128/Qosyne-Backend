const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const sendEmail = require('../emails/emailService');
const templates = require('../emails/emailTemplates');

const prisma = new PrismaClient();

const sendOtp = async (userId, email, type) => {
  // Check if the user already has 3 active OTPs
  const activeOtpCount = await prisma.tokens.count({
    where: { userId, type: 'OTP' },
  });

  if (activeOtpCount >= 3) {
    throw new Error('You have reached the maximum limit of active OTPs.');
  }

  // Generate a new OTP
  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpToken = uuidv4();
  
  // Log OTP for testing purposes
  console.log(`🔐 OTP for ${email}: ${otp}`);

  // Save OTP in the database
  await prisma.tokens.create({
    data: {
      userId,
      token: JSON.stringify(otp),
      type: 'OTP',
    },
  });

  // Send OTP via email
  try {
    await sendEmail(email, 'OTP Verification', templates.otpTemplate(otp));
    console.log(`✅ OTP email sent successfully to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${email}:`, error);
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }

  return otpToken;
};

module.exports = sendOtp;
