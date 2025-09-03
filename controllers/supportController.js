const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const sendEmail = require('../emails/emailService');
const { contactSupportTemplate } = require('../emails/emailTemplates');

exports.sendContactSupport = async (req, res) => {
  const userId = req.user.userId;
  const { name, email, subject, transactionId, message } = req.body;

  // 1) Basic validation
  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      error: 'Missing required fields',
      status_code: 400,
    });
  }

  // Fetch user's info from the database
  const user = await prisma.users.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true }, // Fetch necessary fields only
  });

  // 2) Limit message length (by words)
  const words = message.trim().split(/\s+/);
  if (words.length > 2000) {
    return res.status(400).json({
      error: 'Message exceeds 2000-word limit.',
      status_code: 400,
    });
  }

  // 3) Check how many requests have been sent in the last 6 hours from this email
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

  const recentRequestsCount = await prisma.contactSupports.count({
    where: {
      userId,
      createdAt: {
        gte: sixHoursAgo,
      },
    },
  });

  if (recentRequestsCount >= 3) {
    return res.status(429).json({
      error: 'You have reached the limit of 3 support requests in 6 hours.',
      status_code: 429,
    });
  }

  // 4) Store in Database
  const supportRecord = await prisma.contactSupports.create({
    data: {
      name: user.name,
      email: user.email,
      subject,
      transactionId: transactionId ? parseInt(transactionId) : null,
      message,
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });

  // 5) Send Email to Support Team
  const supportEmail = process.env.SUPPORT_EMAIL || 'rafayfarrukh941@gmail.com';
  await sendEmail(
    supportEmail,
    `[Qosyne] Support Request - ${subject}`,
    contactSupportTemplate({
      name,
      email,
      subject,
      transactionId,
      message,
    }),
  );

  return res.status(201).json({
    message: 'Your request has been submitted. We will contact you soon!',
    data: { record: supportRecord },
    status_code: 201,
  });
};

exports.getAllSupportRequests = async (req, res) => {
  const requests = await prisma.contactSupports.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  res.status(200).json({
    message: "Support requests fetched successfully",
    data: requests,
    status_code: 200,
  });
};
