const { PrismaClient } = require('@prisma/client');
const sendOtp = require('../utils/authUtils');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const sendEmail = require('../emails/emailService');

const prisma = new PrismaClient();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

exports.getProfile = async (req, res) => {
  const user = await prisma.users.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      designation: true,
      phoneNumber: true,
      dateOfBirth: true,
      emailNotification: true,
      smsNotification: true,
      createdAt: true,
    },
  });

  if (!user)
    return res.status(404).json({ error: 'User not found', status_code: 404 });

  res.status(200).json({
    data: { user },
    message: 'User profile fetched successfully',
    status_code: 200,
  });
};

exports.updateProfile = async (req, res) => {
  const userId = req.user.userId;
  const {
    name,
    designation,
    phoneNumber,
    dateOfBirth,
    emailNotification,
    smsNotification,
  } = req.body;

  // Make sure dateOfBirth is in a proper format if provided
  let dob = undefined;
  if (dateOfBirth) {
    dob = new Date(dateOfBirth);
    if (isNaN(dob)) {
      return res.status(400).json({
        error: 'Invalid date format for dateOfBirth',
        status_code: 400,
      });
    }
  }

  if (
    (smsNotification && typeof smsNotification !== 'boolean') ||
    (emailNotification && typeof emailNotification !== 'boolean')
  ) {
    return res.status(400).json({ error: 'notification must be a boolean' });
  }

  // Handle profile picture upload if file is present
  let pic;
  if (req.files && req.files.file) {
    const file = req.files.file;

    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        message: 'Please upload an image file',
        status_code: 400,
      });
    }

    const formData = new FormData();
    // Read the temp file and append it to formData
    const fileStream = fs.createReadStream(file.tempFilePath);
    formData.append('file', fileStream);
    formData.append('upload_preset', 'community_upload');

    const uploadRes = await axios.post(
      'https://api.cloudinary.com/v1_1/dwgehqnsz/upload',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      },
    );
    pic = uploadRes.data.secure_url;

    // Clean up the temp file
    fs.unlinkSync(file.tempFilePath);
  }

  const updatedUser = await prisma.users.update({
    where: { id: userId },
    data: {
      designation,
      phoneNumber,
      dateOfBirth: dob,
      emailNotification,
      smsNotification,
      name,
      ...(pic && { pic }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      designation: true,
      phoneNumber: true,
      dateOfBirth: true,
      emailNotification: true,
      smsNotification: true,
      pic: true,
    },
  });

  if (!updatedUser) {
    return res.status(404).json({
      error: 'User not found',
      status_code: 404,
    });
  }

  res.status(201).json({
    message: 'Profile updated successfully',
    data: updatedUser,
    status_code: 201,
  });
};

exports.changeEmailRequest = async (req, res) => {
  try {
    const { userId } = req.user;
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

    // Check if the new email is already in use by an ACTIVE user
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
  } catch (error) {
    console.error('Error sending OTP for email change:', error);
    res.status(500).json({ message: 'Server error', data: null });
  }
};

exports.changeEmailVerify = async (req, res) => {
  try {
    const { userId } = req.user;
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

    // Verify OTP (Ensuring OTP is linked to correct email)
    const otpRecord = await prisma.tokens.findFirst({
      where: { token: otpToken, type: 'OTP', userId },
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

    // Ensure the user still exists and is not soft deleted
    const user = await prisma.users.findUnique({
      where: { id: userId, isDeleted: false },
    });
    if (!user) {
      return res.status(404).json({
        message: 'User not found or account deleted',
        data: null,
        status_code: 404,
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
    res.status(500).json({ message: 'Server error', data: null });
  }
};

exports.getAllUsers = async (req, res) => {
  const users = await prisma.users.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isDeleted: true,
      isVerified: true,
      pic: true,
      designation: true,
      phoneNumber: true,
      dateOfBirth: true,
      emailNotification: true,
      smsNotification: true,
      createdAt: true,
      updatedAt: true,
      wallet: {
        select: {
          balance: true,
        },
      },
      connectedWallets: {
        select: {
          provider: true,
          balance: true,
          currency: true,
          accountEmail: true,
          isActive: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.status(200).json({
    data: users,
    message: 'All users fetched successfully',
    status_code: 200,
  });
};

exports.toggleUserDeletion = async (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({
      message: 'Invalid user ID',
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

  const updated = await prisma.users.update({
    where: { id: userId },
    data: {
      isDeleted: !user.isDeleted,
    },
    select: {
      id: true,
      name: true,
      email: true,
      isDeleted: true,
    },
  });

  res.status(200).json({
    data: updated,
    message: `User ${updated.isDeleted ? 'soft deleted' : 'restored'} successfully`,
    status_code: 200,
  });
};

exports.sendMail = async (req, res) => {
  const {to,subject,htmlContent} =req.body;
  let data = await sendEmail(to,subject,htmlContent)
  res.status(200).json({
    data: data,
    message: `Email Sentsss`,
    status_code: 200,
  });
};
