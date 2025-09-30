require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const walletRoutes = require('./routes/walletRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const supportRoutes = require('./routes/supportRoutes');
const taxSettingRoutes = require('./routes/taxSettingRoutes');
const dashboardRoutes = require('./routes/adminDashboard');
const walletIntegrationRoutes = require('./routes/walletIntegrationRoutes');
const userDataRoutes = require('./routes/userDataRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const qrDisplayRoutes = require('./routes/qrDisplayRoutes');
const healthRoutes = require('./routes/healthRoutes');
const rapydWalletRoutes = require('./routes/rapydWalletRoutes');
const realTimeRoutes = require('./routes/realTimeRoutes');
const wiseDirectRoutes = require('./routes/wiseDirectRoutes');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'], // Enables Prisma query logging for debugging
});

const app = express();

// Define the allowed origins for CORS
const allowedOrigins = [
  'https://qosyncefrontend.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://qosyne.vercel.app'
];

// Configure CORS options
const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
}));

// Legacy routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/tax-settings', taxSettingRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', healthRoutes);

// New wallet integration routes
app.use('/api/wallet-integration', walletIntegrationRoutes);
app.use('/api/webhooks', webhookRoutes);
// New generic user data routes (transactions, wallets)
app.use('/api', userDataRoutes);
// Real Rapyd wallet integration routes
app.use('/api/rapyd', rapydWalletRoutes);
// Real-time monitoring and dashboard routes
app.use('/api/realtime', realTimeRoutes);
// Direct Wise API routes
app.use('/api', wiseDirectRoutes);

// Root route (must be before QR display routes)
app.get('/', async (req, res) => {
  try {
    await prisma.$connect(); // Ensure database connection
    res.send('Qosyne Backend is Running 🚀');
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// QR code display routes (after specific routes)
app.use('/', qrDisplayRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    console.log(`✅ Qosyne Database Connected`);
  } catch (error) {
    console.error('❌ Database Connection Failed:', error);
  }
  console.log(`🚀 Server running on port ${PORT}`);
});
