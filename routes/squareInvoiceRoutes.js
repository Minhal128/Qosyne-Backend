const express = require("express");
const router = express.Router();
const { Client, Environment } = require("square");
const authMiddleware = require("../middlewares/authMiddleware");
const tryCatch = require("../middlewares/tryCatch");
const prisma = require("../config/prisma");

// Initialize Square client
const getSquareClient = (accessToken = null) => {
  return new Client({
    accessToken: accessToken || process.env.SQUARE_ACCESS_TOKEN,
    environment: Environment.Sandbox,
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

    const client = getSquareClient(accessToken);

    // Get location ID if not provided
    if (!locationId) {
      const { result: locationsResult } = await client.locationsApi.listLocations();
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
    const { result: searchResult } = await client.customersApi.searchCustomers({
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
      const { result: customerResult } = await client.customersApi.createCustomer({
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

    const { result: orderResult } = await client.ordersApi.createOrder(orderBody);
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

    const { result: invoiceResult } = await client.invoicesApi.createInvoice(invoiceBody);
    const invoice = invoiceResult.invoice;

    // Step 4: Publish invoice
    const publishBody = {
      version: invoice.version,
      idempotencyKey: `publish_${idempotencyKey}`,
    };

    const { result: publishResult } = await client.invoicesApi.publishInvoice(
      invoice.id,
      publishBody
    );
    const publishedInvoice = publishResult.invoice;

    // Save to database as transaction
    const transaction = await prisma.transactions.create({
      data: {
        userId: parseInt(userId),
        provider: "SQUARE",
        type: "SEND",
        amount: parseFloat(amount),
        currency,
        recipientEmail,
        status: "PENDING",
        statusMessage: "Invoice sent to recipient. Waiting for payment.",
        transactionId: publishedInvoice.id,
        batchId: publishedInvoice.invoiceNumber,
        providerResponse: JSON.stringify(publishedInvoice),
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
        transactionId: invoiceId,
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
    const { result } = await client.invoicesApi.getInvoice(invoiceId);

    const invoice = result.invoice;
    const invoiceStatus = invoice.status;

    // Update transaction status
    let newStatus = "PENDING";
    let statusMessage = `Invoice status: ${invoiceStatus}`;

    if (invoiceStatus === "PAID" || invoiceStatus === "PAYMENT_PENDING") {
      newStatus = "SUCCESS";
      statusMessage = "Invoice paid successfully";
    } else if (invoiceStatus === "CANCELED" || invoiceStatus === "FAILED") {
      newStatus = "FAILED";
      statusMessage = `Invoice ${invoiceStatus.toLowerCase()}`;
    }

    await prisma.transactions.update({
      where: { id: transaction.id },
      data: {
        status: newStatus,
        statusMessage,
        providerResponse: JSON.stringify(invoice),
      },
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
        recipientEmail: transaction.recipientEmail,
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
    const { squareEmail, accessToken, locationId } = req.body;
    const userId = req.user.userId;

    if (!squareEmail) {
      return res.status(400).json({
        success: false,
        message: "Square email is required",
      });
    }

    const token = accessToken || process.env.SQUARE_ACCESS_TOKEN;
    const client = getSquareClient(token);

    // Verify credentials
    const { result } = await client.merchantsApi.retrieveMerchant("me");
    const merchantId = result.merchant.id;

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
  })
);

module.exports = router;
