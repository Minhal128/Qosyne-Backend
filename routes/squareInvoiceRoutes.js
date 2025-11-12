const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const tryCatch = require("../middlewares/tryCatch");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Initialize Square client (v42.3.0 structure)
const { SquareClient, SquareEnvironment } = require('square');

const getSquareClient = (accessToken = null) => {
  return new SquareClient({
    accessToken: accessToken || process.env.SQUARE_ACCESS_TOKEN,
    environment: SquareEnvironment.Sandbox
  });
};

// @route   POST /api/square-invoice/send
// @desc    Send invoice request via Square
// @access  Private
router.post(
  "/send",
  authMiddleware,
  tryCatch(async (req, res) => {
    const { recipientEmail, amount, currency = "USD", note = "Payment request" } = req.body;
    const userId = req.user.userId;

    // Validate inputs
    if (!recipientEmail || !amount) {
      return res.status(400).json({
        success: false,
        message: "Recipient email and amount are required",
      });
    }

    // Get Square access token (from user's wallet or env)
    let accessToken = req.body.accessToken || process.env.SQUARE_ACCESS_TOKEN;
    let locationId = req.body.locationId || process.env.SQUARE_LOCATION_ID;

    // Try to get user's Square wallet
    const squareWallet = await prisma.connectedWallets.findFirst({
      where: {
        userId: parseInt(userId),
        provider: "SQUARE",
        isActive: true,
      },
    });

    if (squareWallet && squareWallet.accessToken) {
      accessToken = squareWallet.accessToken;
    }

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: "Please connect your Square account first or provide accessToken",
      });
    }

    try {
      const client = getSquareClient(accessToken);

      // Get location ID if not provided
      if (!locationId) {
        const { result: locationsResult } = await client.locations.list();
        if (locationsResult.locations && locationsResult.locations.length > 0) {
          locationId = locationsResult.locations[0].id;
        } else {
          return res.status(400).json({
            success: false,
            message: "No Square locations found",
          });
        }
      }

      const amountInCents = Math.round(amount * 100);
      const idempotencyKey = `invoice_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Step 1: Create or get customer
      let customerId;
      const { result: searchResult } = await client.customers.search({
        query: {
          filter: {
            emailAddress: {
              exact: recipientEmail,
            },
          },
        },
      });

      if (searchResult.customers && searchResult.customers.length > 0) {
        customerId = searchResult.customers[0].id;
      } else {
        const { result: customerResult } = await client.customers.create({
          emailAddress: recipientEmail,
          idempotencyKey: `customer_${idempotencyKey}`,
        });
        customerId = customerResult.customer.id;
      }

      // Step 2: Create order
      const orderBody = {
        idempotencyKey: `order_${idempotencyKey}`,
        order: {
          locationId: locationId,
          customerId: customerId,
          lineItems: [
            {
              name: note || "Payment Request",
              quantity: "1",
              basePriceMoney: {
                amount: BigInt(amountInCents),
                currency,
              },
            },
          ],
        },
      };

      const { result: orderResult } = await client.orders.create(orderBody);
      const orderId = orderResult.order.id;

      // Step 3: Create invoice
      const invoiceBody = {
        invoice: {
          locationId: locationId,
          orderId: orderId,
          primaryRecipient: {
            customerId: customerId,
          },
          paymentRequests: [
            {
              requestType: "BALANCE",
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              automaticPaymentSource: "NONE",
            },
          ],
          deliveryMethod: "EMAIL",
          invoiceNumber: `INV-${Date.now()}`,
          title: "Payment Request",
          description: note,
          acceptedPaymentMethods: {
            card: true,
            squareGiftCard: false,
            bankAccount: false,
          },
        },
        idempotencyKey,
      };

      const { result: invoiceResult } = await client.invoices.create(invoiceBody);
      const invoice = invoiceResult.invoice;

      // Step 4: Publish invoice
      const publishBody = {
        version: invoice.version,
        idempotencyKey: `publish_${idempotencyKey}`,
      };

      const { result: publishResult } = await client.invoices.publish(
        invoice.id,
        publishBody
      );
      const publishedInvoice = publishResult.invoice;

      // Save to database as transaction
      const transaction = await prisma.transactions.create({
        data: {
          userId: parseInt(userId),
          provider: "SQUARE",
          type: "EXTERNAL_TRANSFER",
          amount: parseFloat(amount),
          currency,
          paymentId: publishedInvoice.id,
          status: "PENDING",
        },
      });

      // Save recipient details separately
      await prisma.transactionRecipients.create({
        data: {
          transactionId: transaction.id,
          recipientEmail,
        },
      });

      res.json({
        success: true,
        message: "Invoice sent successfully via Square",
        data: {
          transactionId: transaction.id,
          squareInvoiceId: publishedInvoice.id,
          invoiceNumber: publishedInvoice.invoiceNumber,
          status: "PENDING",
          recipientEmail,
          amount,
          currency,
          publicUrl: publishedInvoice.publicUrl,
          note: "Invoice sent to recipient email. Payment will be completed when recipient pays the invoice.",
          createdAt: transaction.createdAt,
        },
      });
    } catch (error) {
      console.error("❌ Square API error during send:", error);
      const errorMessage =
        error.errors && error.errors.length > 0
          ? error.errors.map((e) => e.detail).join(", ")
          : "Failed to send Square invoice. Please check your inputs and connection.";
      return res.status(400).json({
        success: false,
        message: errorMessage,
        details: error.result,
      });
    }
  })
);

// @route   GET /api/square-invoice/status/:invoiceId
// @desc    Check Square invoice status
// @access  Private
router.get(
  "/status/:invoiceId",
  authMiddleware,
  tryCatch(async (req, res) => {
    const { invoiceId } = req.params;
    const userId = req.user.userId;

    // Find transaction
    const transaction = await prisma.transactions.findFirst({
      where: {
        paymentId: invoiceId,
        provider: "SQUARE",
        userId: parseInt(userId),
      },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Get Square token
    let accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const squareWallet = await prisma.connectedWallets.findFirst({
      where: {
        userId: parseInt(userId),
        provider: "SQUARE",
        isActive: true,
      },
    });

    if (squareWallet && squareWallet.accessToken) {
      accessToken = squareWallet.accessToken;
    }

    const client = getSquareClient(accessToken);
    const { result } = await client.invoices.get(invoiceId);

    const invoice = result.invoice;
    const invoiceStatus = invoice.status;

    // Update transaction status
    let newStatus = "PENDING";

    if (invoiceStatus === "PAID" || invoiceStatus === "PAYMENT_PENDING") {
      newStatus = "COMPLETED";
    } else if (invoiceStatus === "CANCELED" || invoiceStatus === "FAILED") {
      newStatus = "FAILED";
    }

    await prisma.transactions.update({
      where: { id: transaction.id },
      data: {
        status: newStatus,
      },
    });

    // Get recipient details
    const recipient = await prisma.transactionRecipients.findUnique({
      where: { transactionId: transaction.id },
    });

    res.json({
      success: true,
      message: "Invoice status updated",
      data: {
        transactionId: transaction.id,
        status: newStatus,
        squareInvoiceId: invoiceId,
        invoiceStatus: invoiceStatus,
        invoiceNumber: invoice.invoiceNumber,
        amount: transaction.amount,
        recipientEmail: recipient?.recipientEmail,
        publicUrl: invoice.publicUrl,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
      },
    });
  })
);

// @route   POST /api/square-invoice/connect
// @desc    Connect Square account
// @access  Private
router.post(
  "/connect",
  authMiddleware,
  tryCatch(async (req, res) => {
    console.log('🔄 Square connect request received');
    console.log('Request body:', req.body);
    console.log('User ID:', req.user?.userId);

    const { squareEmail, accessToken, locationId } = req.body;
    const userId = req.user.userId;

    if (!squareEmail) {
      return res.status(400).json({
        success: false,
        message: "Square email is required",
      });
    }

    const token = accessToken || process.env.SQUARE_ACCESS_TOKEN;
    console.log('Using access token:', token ? 'Present' : 'Missing');
    
    try {
      // Verify credentials using direct API call instead of SDK
      console.log('🔍 Attempting to verify Square credentials...');
      console.log('🔍 Access token preview:', token ? token.substring(0, 10) + '...' : 'None');
      
      const axios = require('axios');
      const response = await axios.get(
        'https://connect.squareupsandbox.com/v2/merchants/me',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Square-Version': '2024-11-20',
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Square API call successful');
      console.log('✅ Merchant result:', response.data.merchant ? 'Present' : 'Missing');
      
      const merchantId = response.data.merchant.id;
      console.log('✅ Merchant ID:', merchantId);

      // Check if wallet already exists
      const existingWallet = await prisma.connectedWallets.findFirst({
        where: {
          userId: parseInt(userId),
          provider: "SQUARE",
          isActive: true,
        },
      });

      if (existingWallet) {
        // Update existing
        await prisma.connectedWallets.update({
          where: { id: existingWallet.id },
          data: {
            accountEmail: squareEmail,
            accessToken: token,
            walletId: merchantId,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new
        await prisma.connectedWallets.create({
          data: {
            userId: parseInt(userId),
            provider: "SQUARE",
            walletId: merchantId,
            accountEmail: squareEmail,
            fullName: squareEmail,
            username: squareEmail,
            accessToken: token,
            currency: "USD",
            isActive: true,
          },
        });
      }

      res.json({
        success: true,
        message: "Square account connected successfully",
        data: {
          squareEmail,
          squareConnected: true,
          merchantId,
        },
      });
    } catch (error) {
      console.error("❌ Square API error during connect:", error);
      console.error("❌ Error type:", error.constructor.name);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error status:", error.statusCode || error.status);
      console.error("❌ Error body:", error.body || error.result);
      
      let errorMessage = "Failed to verify Square credentials. Please check your access token.";
      let statusCode = 400;
      
      // Handle different types of Square API errors
      if (error.errors && error.errors.length > 0) {
        errorMessage = error.errors.map((e) => e.detail || e.message).join(", ");
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Handle authentication errors specifically
      if (error.statusCode === 401 || error.status === 401) {
        errorMessage = "Invalid Square access token. Please check your credentials.";
        statusCode = 401;
      }
      
      return res.status(statusCode).json({
        success: false,
        message: errorMessage,
        details: {
          statusCode: error.statusCode || error.status,
          body: error.body || error.result,
          type: error.constructor.name
        },
      });
    }
  })
);

module.exports = router;
