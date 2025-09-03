const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { OAuth2Client } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');
const sendEmail = require('../emails/emailService');
const templates = require('../emails/emailTemplates');
const sendOtp = require('../utils/authUtils');

const prisma = new PrismaClient();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const SECRET_KEY = process.env.JWT_SECRET;

// Store OTP in-memory (use Redis or DB in production)
const otpStorage = {};

// ✅ Utility function for email validation
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ✅ Utility function for password strength validation
const isValidPassword = (password) => password.length >= 6;

// Register User
// Register User (Updated to Create Wallet)
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({
      error: 'Name, email, and password are required',
      status_code: 400,
    });
  if (!isValidEmail(email))
    return res.status(400).json({
      error: 'Invalid email format',
      status_code: 400,
    });
  if (!isValidPassword(password))
    return res.status(400).json({
      error: 'Password must be at least 6 characters long',
      status_code: 400,
    });

  const existingUser = await prisma.users.findUnique({
    where: {
      email_isDeleted: {
        email: email,
        isDeleted: false,
      },
    },
  });
  if (existingUser)
    return res.status(400).json({
      error: 'Email already exists',
      status_code: 400,
    });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.users.create({
    data: {
      name,
      email,
      role: role || 'USER',
      isVerified: false,
      isDeleted: false,
    },
  });

  // ✅ Automatically Create Wallet for New User
  await prisma.wallet.create({
    data: { userId: user.id, balance: 0.0 },
  });

  // Store password in passwords table
  await prisma.passwords.create({
    data: {
      userId: user.id,
      password: hashedPassword,
      dateRequested: new Date(),
      isEnabled: true,
    },
  });

  // Note: Qosyne wallet creation removed - users will connect external wallets instead

  await sendOtp(user.id, email, 'OTP');

  res.status(201).json({
    message: 'User registered successfully. Please verify your email.',
    data: user,
    status_code: 201,
  });
};

// Login User
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: 'Email and password are required',
      data: null,
      status_code: 400,
    });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({
      message: 'Invalid email format',
      data: null,
      status_code: 400,
    });
  }

  // Find user who is NOT soft deleted
  const user = await prisma.users.findUnique({
    where: {
      email_isDeleted: {
        email: email,
        isDeleted: false,
      },
    },
  });
  if (!user) {
    return res.status(400).json({
      message: 'User not found or account deleted',
      data: null,
      status_code: 400,
    });
  }

  if (!user.isVerified) {
    return res.status(403).json({
      message: 'Account not verified. Please verify your email first.',
      data: null,
      status_code: 403,
    });
  }

  // Get latest active password
  const userPassword = await prisma.passwords.findFirst({
    where: { userId: user.id, isEnabled: true },
    orderBy: { dateRequested: 'desc' },
  });

  if (!userPassword) {
    return res.status(400).json({
      message: 'No active password found',
      data: null,
      status_code: 400,
    });
  }

  const isMatch = await bcrypt.compare(password, userPassword.password);
  if (!isMatch) {
    return res.status(400).json({
      message: 'Invalid password',
      data: null,
      status_code: 400,
    });
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, SECRET_KEY, {
    expiresIn: '7d',
  });

  res.status(201).json({
    message: 'Login successful',
    data: { token, user },
    status_code: 201,
  });
};

// Send OTP for Email Verification
exports.sendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email)
    return res.status(400).json({
      error: 'Email is required',
      status_code: 400,
    });

  const user = await prisma.users.findUnique({
    where: {
      email_isDeleted: {
        email: email,
        isDeleted: false,
      },
    },
  });
  if (!user)
    return res.status(400).json({
      error: 'User not found',
      status_code: 400,
    });

  await sendOtp(user.id, email, 'OTP');

  res.status(201).json({ message: 'OTP sent successfully', status_code: 201 });
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({
      error: 'Email and OTP are required',
      status_code: 400,
    });

  // Find user first
  const user = await prisma.users.findUnique({
    where: {
      email_isDeleted: {
        email: email,
        isDeleted: false,
      },
    },
  });

  if (!user) {
    return res.status(400).json({
      error: 'User not found',
      status_code: 400,
    });
  }

  // Find OTP record for this user
  const otpRecord = await prisma.tokens.findFirst({
    where: { 
      userId: user.id,
      type: 'OTP',
      token: JSON.stringify(parseInt(otp))
    },
  });

  if (!otpRecord)
    return res.status(400).json({
      error: 'Invalid or expired OTP',
      status_code: 400,
    });

  // Mark user as verified
  await prisma.users.update({
    where: {
      email_isDeleted: {
        email: email,
        isDeleted: false,
      },
    },
    data: { isVerified: true },
  });

  // Delete OTP after verification
  await prisma.tokens.delete({ where: { id: otpRecord.id } });

  res.status(201).json({
    message: 'OTP verified successfully. Your account is now verified.',
    status_code: 201,
  });
};

// Forgot Password (Request Reset)
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email)
    return res.status(400).json({
      error: 'Email is required',
      status_code: 400,
    });

  const user = await prisma.users.findUnique({
    where: {
      email_isDeleted: {
        email: email,
        isDeleted: false,
      },
    },
  });
  if (!user)
    return res.status(400).json({
      error: 'User not found',
      status_code: 400,
    });

  // 🔹 Check if an active password reset OTP already exists
  const activeOtp = await prisma.tokens.findFirst({
    where: { userId: user.id, type: 'PASSWORD' },
  });

  if (activeOtp)
    return res.status(400).json({
      error: 'A password reset OTP is already active',
      status_code: 400,
    });

  // 🔹 Disable the latest enabled password before proceeding
  await prisma.passwords.updateMany({
    where: { userId: user.id, isEnabled: true },
    data: { isEnabled: false, dateCompleted: new Date() },
  });

  // 🔹 Send OTP for password reset
  await sendOtp(user.id, email, 'PASSWORD');

  res
    .status(201)
    .json({ message: 'Password reset OTP sent.', status_code: 201 });
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword)
    return res.status(400).json({
      error: 'All fields are required',
      status_code: 400,
    });
  if (!isValidPassword(newPassword))
    return res.status(400).json({
      error: 'Password must be at least 6 characters long',
      status_code: 400,
    });

  const user = await prisma.users.findUnique({
    where: {
      email_isDeleted: {
        email: email,
        isDeleted: false,
      },
    },
  });
  if (!user)
    return res.status(400).json({
      error: 'User not found',
      status_code: 400,
    });

  // Disable previous password
  await prisma.passwords.updateMany({
    where: { userId: user.id, isEnabled: true },
    data: { isEnabled: false, dateCompleted: new Date() },
  });

  // Store new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.passwords.create({
    data: {
      userId: user.id,
      password: hashedPassword,
      dateRequested: new Date(),
      isEnabled: true, // Mark the new password as active
    },
  });

  res
    .status(201)
    .json({ message: 'Password updated successfully', status_code: 201 });
};

// ✅ Update Password from Current Password
exports.updatePassword = async (req, res) => {
  try {
    const { userId } = req.user; // Assuming userId is extracted from JWT middleware
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current and new password are required',
        status_code: 400,
      });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters long',
        status_code: 400,
      });
    }

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        status_code: 404,
      });
    }

    // Get the latest enabled password
    const userPassword = await prisma.passwords.findFirst({
      where: { userId: user.id, isEnabled: true },
      orderBy: { dateRequested: 'desc' },
    });

    if (!userPassword) {
      return res.status(400).json({
        message: 'No active password found',
        status_code: 400,
      });
    }

    // Check if current password matches
    const isMatch = await bcrypt.compare(
      currentPassword,
      userPassword.password,
    );
    if (!isMatch) {
      return res.status(400).json({
        message: 'Incorrect current password',
        status_code: 400,
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Disable the previous password
    await prisma.passwords.updateMany({
      where: { userId: user.id, isEnabled: true },
      data: { isEnabled: false, dateCompleted: new Date() },
    });

    // Store the new password
    await prisma.passwords.create({
      data: {
        userId: user.id,
        password: hashedPassword,
        dateRequested: new Date(),
        isEnabled: true,
      },
    });

    res
      .status(201)
      .json({ message: 'Password updated successfully', status_code: 201 });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({
      message: 'Server error',
      status_code: 500,
    });
  }
};

/**
 * Google Login/Register
 * If user doesn't exist, registers them first
 */
exports.googleLogin = async (req, res) => {
  // const { idToken, email, name } = req.body;
  const { email, name } = req.body;

  // Skip token verification for now
  if (!email || !name) {
    return res.status(400).json({
      message: 'Email is required',
      data: null,
      status_code: 400,
    });
  }

  /*
  // Token verification commented out for now
  if (!idToken) {
    return res.status(400).json({
      message: 'Google token is required',
      data: null,
      status_code: 400,
    });
  }

  // Verify the Google token
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  // Ensure the email in the token matches the provided email (if any)
  const verifiedEmail = payload.email;
  if (email && email !== verifiedEmail) {
    return res.status(400).json({
      message: 'Email mismatch between token and request',
      data: null,
      status_code: 400,
    });
  }
  */

  // Using email directly from request body
  const verifiedEmail = email;

  // Check if user already exists
  let user = await prisma.users.findUnique({
    where: {
      email_isDeleted: {
        email: verifiedEmail,
        isDeleted: false,
      },
    },
  });

  if (!user) {
    // User doesn't exist, create a new account
    user = await prisma.users.create({
      data: {
        name,
        email: verifiedEmail,
        role: 'USER',
        isVerified: true, // Google has already verified the email
        isDeleted: false,
      },
    });

    // Insert into connectedWallets for Qosyne
    await prisma.connectedWallets.create({
      data: {
        userId: user.id,
        provider: 'QOSYNE',
        walletId: `qosyne_${user.id}`,
        accountEmail: verifiedEmail,
        fullName: user.name,
        currency: 'USD',
      },
    });

    console.log(`New user registered via Google: ${verifiedEmail}`);
  }
  // Generate JWT token
  const token = jwt.sign({ userId: user.id, role: user.role }, SECRET_KEY, {
    expiresIn: '7d',
  });

  return res.status(201).json({
    message: 'Google authentication successful',
    data: { token, user },
    status_code: 201,
  });
};

// ✅ Request Change Email - Send OTP to New Email
exports.changeEmailRequest = async (req, res) => {
  const { userId } = req.user; // Extracted from JWT middleware
  const { newEmail } = req.body;

  if (!newEmail) {
    return res.status(400).json({
      message: 'New email is required',
      data: null,
      status_code: 400,
    });
  }
  if (!isValidEmail(newEmail)) {
    return res.status(400).json({
      message: 'Invalid email format',
      data: null,
      status_code: 400,
    });
  }

  // Check if email is already in use
  const existingUser = await prisma.users.findUnique({
    where: {
      email: {
        email_isDeleted: {
          email: newEmail,
          isDeleted: false,
        },
      },
    },
  });
  if (existingUser) {
    return res.status(400).json({
      message: 'Email is already in use',
      data: null,
      status_code: 400,
    });
  }

  // Send OTP to the new email
  await sendOtp(userId, newEmail, 'OTP');

  res.status(201).json({
    message: 'OTP sent to new email for verification',
    status_code: 201,
  });
};

exports.changeEmailVerify = async (req, res) => {
  try {
    const { userId } = req.user; // Extracted from JWT middleware
    const { newEmail, otpToken } = req.body;

    if (!newEmail || !otpToken) {
      return res.status(400).json({
        message: 'New email and OTP token are required',
        data: null,
        status_code: 400,
      });
    }
    if (!isValidEmail(newEmail)) {
      return res.status(400).json({
        message: 'Invalid email format',
        data: null,
        status_code: 400,
      });
    }

    // Verify OTP
    const otpRecord = await prisma.tokens.findUnique({
      where: { token: otpToken, type: 'OTP' },
    });
    if (!otpRecord) {
      return res.status(400).json({
        message: 'Invalid or expired OTP',
        data: null,
        status_code: 400,
      });
    }

    // Check if email is already used by an active user
    const existingUser = await prisma.users.findUnique({
      where: {
        email_isDeleted: {
          email: newEmail,
          isDeleted: false,
        },
      },
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Email is already in use by an active account',
        data: null,
        status_code: 400,
      });
    }

    // Update user's email
    await prisma.users.update({
      where: { id: userId },
      data: { email: newEmail },
    });

    // Delete OTP after successful verification
    await prisma.tokens.delete({ where: { id: otpRecord.id } });

    res.status(201).json({
      message: 'Email changed successfully',
      data: { newEmail },
      status_code: 201,
    });
  } catch (error) {
    console.error('Error changing email:', error);
    res.status(500).json({
      message: 'Server error',
      data: null,
      status_code: 500,
    });
  }
};

exports.softDeleteUser = async (req, res) => {
  try {
    const { userId } = req.user;

    // Soft delete: Set isDeleted = true
    await prisma.users.update({
      where: { id: userId },
      data: { isDeleted: null },
    });

    res
      .status(201)
      .json({ message: 'Account deleted successfully', status_code: 201 });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      message: 'Server error',
      data: null,
      status_code: 500,
    });
  }
};

exports.generateSsoLink = async (req, res) => {
  try {
    const { token, redirectPath = '/' } = req.body;
    const { userId } = req.user;

    if (!token) {
      return res.status(400).json({
        error: 'Token is required',
        status_code: 400,
      });
    }

    // Generate frontend URL with the token
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const ssoUrl = `${baseUrl}${redirectPath}?token=${token}`;

    return res.status(200).json({
      message: 'SSO link generated successfully',
      data: {
        ssoUrl,
      },
      status_code: 200,
    });
  } catch (error) {
    console.error('Error generating SSO link:', error);
    return res.status(500).json({
      error: error.message,
      status_code: 500,
    });
  }
};


