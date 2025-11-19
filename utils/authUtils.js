const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const sendEmail = require('../emails/emailService');
const templates = require('../emails/emailTemplates');

const prisma = new PrismaClient();

const sendOtp = async (userId, email, type) => {
  // OTP validity period: 10 minutes
  const OTP_VALIDITY_MINUTES = 10;
  const tenMinutesAgo = new Date(Date.now() - OTP_VALIDITY_MINUTES * 60 * 1000);

  // Check if the user already has 3 active (non-expired) OTPs
  const activeOtpCount = await prisma.tokens.count({
    where: { 
      userId, 
      type: 'OTP',
      dateCreated: {
        gte: tenMinutesAgo
      }
    },
  });

  if (activeOtpCount >= 3) {
    throw new Error('You have reached the maximum limit of active OTPs. Please try again in 10 minutes.');
  }

  // Clean up expired OTPs (older than 10 minutes)
  await prisma.tokens.deleteMany({
    where: {
      userId,
      type: 'OTP',
      dateCreated: {
        lt: tenMinutesAgo
      }
    }
  });

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
