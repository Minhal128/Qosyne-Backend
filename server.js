require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const { PrismaClient } = require("@prisma/client");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const walletRoutes = require("./routes/walletRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const supportRoutes = require("./routes/supportRoutes");
const taxSettingRoutes = require("./routes/taxSettingRoutes");
const dashboardRoutes = require("./routes/adminDashboard");
const walletIntegrationRoutes = require("./routes/walletIntegrationRoutes");
const userDataRoutes = require("./routes/userDataRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const qrDisplayRoutes = require("./routes/qrDisplayRoutes");
const healthRoutes = require("./routes/healthRoutes");
const rapydWalletRoutes = require("./routes/rapydWalletRoutes");
const realTimeRoutes = require("./routes/realTimeRoutes");
const wiseDirectRoutes = require("./routes/wiseDirectRoutes");
const rapydRoutes = require("./routes/rapydRoutes");
const applePayRoutes = require("./routes/applePayRoutes");
const unifiedTransactionRoutes = require("./routes/unifiedTransactionRoutes");
const sandboxMonitorRoutes = require("./routes/sandboxMonitorRoutes");
const squareInvoiceRoutes = require("./routes/squareInvoiceRoutes");

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"], // Enables Prisma query logging for debugging
});

const app = express();

// Global CORS fallback middleware: reflect request origin when allowed and handle OPTIONS preflight
// This runs before the cors() package to ensure serverless or proxy setups still respond

app.use((req, res, next) => {
  try {
    const reqOrigin = req.headers.origin;
    // Echo back the request origin (allows any origin). If none, set to '*'.
    res.header("Access-Control-Allow-Origin", reqOrigin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
  } catch (e) {
    // fall back silently
  }
  next();
});

// Configure CORS options using the allowedOrigins defined above
const corsOptions = {
  // origin: true tells the cors middleware to reflect the request Origin, allowing any origin
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
// Parse application/x-www-form-urlencoded bodies globally so endpoints that receive
// `response_mode=form_post` (Apple's form_post) will have their body parsed.
app.use(express.urlencoded({ extended: true }));
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  }),
);

// Legacy routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/tax-settings", taxSettingRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", healthRoutes);

// New wallet integration routes
app.use("/api/wallet-integration", walletIntegrationRoutes);
app.use("/api/webhooks", webhookRoutes);
// New generic user data routes (transactions, wallets)
app.use("/api", userDataRoutes);
// Real Rapyd wallet integration routes
app.use("/api/rapyd", rapydWalletRoutes);
// Real-time monitoring and dashboard routes
app.use("/api/realtime", realTimeRoutes);
// Direct Wise API routes
app.use("/api", wiseDirectRoutes);
// Rapyd-powered money transfer routes
app.use("/api/rapyd", rapydRoutes);
app.use("/api", applePayRoutes);
// Unified transaction system routes
app.use("/api/transactions", unifiedTransactionRoutes);
// Sandbox monitoring dashboard routes
app.use("/api/sandbox", sandboxMonitorRoutes);
// Square invoice routes
app.use("/api/square-invoice", squareInvoiceRoutes);
// PayPal send routes
const paypalSendRoutes = require("./routes/paypalSendRoutes");
app.use("/api/paypal", paypalSendRoutes);
// Venmo send routes
const venmoSendRoutes = require("./routes/venmoSendRoutes");
app.use("/api/venmo", venmoSendRoutes);
// Venmo payment method routes
const venmoPaymentMethodRoutes = require("./routes/venmoPaymentMethodRoutes");
app.use("/api/venmo", venmoPaymentMethodRoutes);
// Wise send routes
const wiseSendRoutes = require("./routes/wiseSendRoutes");
app.use("/api/wise", wiseSendRoutes);

// Root route (must be before QR display routes)
app.get("/", async (req, res) => {
  try {
    await prisma.$connect(); // Ensure database connection
    res.send("Qosyne Backend is Running 🚀");
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// QR code display routes (after specific routes)
app.use("/", qrDisplayRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    console.log(`✅ Qosyne Database Connected`);
  } catch (error) {
    console.error("❌ Database Connection Failed:", error);
  }
  console.log(`🚀 Server running on port ${PORT}`);
});
