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
    let locationId = req.body.locationId;

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
      // Note: Location ID will be fetched automatically from Square API if not provided
    }

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: "Please connect your Square account first or provide accessToken",
      });
    }

    try {
      const axios = require('axios');
      const baseURL = 'https://connect.squareupsandbox.com/v2';
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-11-20',
        'Content-Type': 'application/json'
      };

      // ALWAYS fetch the correct location ID from the merchant's account
      // This ensures we use a location that the access token is authorized for
      if (!locationId) {
        console.log('🔍 Fetching authorized locations for this access token...');
        const locationsResponse = await axios.get(`${baseURL}/locations`, { headers });
        console.log('📍 Locations response:', JSON.stringify(locationsResponse.data, null, 2));
        
        if (locationsResponse.data.locations && locationsResponse.data.locations.length > 0) {
          // Use the first active location
          const activeLocation = locationsResponse.data.locations.find(loc => loc.status === 'ACTIVE') 
            || locationsResponse.data.locations[0];
          locationId = activeLocation.id;
          console.log('✅ Using location ID:', locationId, '- Name:', activeLocation.name);
        } else {
          return res.status(400).json({
            success: false,
            message: "No Square locations found for this access token. Please ensure your Square account has at least one location.",
          });
        }
      } else {
        console.log('📍 Using provided location ID:', locationId);
      }

      const amountInCents = Math.round(amount * 100);
      const idempotencyKey = `invoice_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Step 1: Create or get customer
      let customerId;
      const searchResponse = await axios.post(`${baseURL}/customers/search`, {
        query: {
          filter: {
            email_address: {
              exact: recipientEmail,
            },
          },
        },
      }, { headers });

      if (searchResponse.data.customers && searchResponse.data.customers.length > 0) {
        customerId = searchResponse.data.customers[0].id;
      } else {
        const customerResponse = await axios.post(`${baseURL}/customers`, {
          email_address: recipientEmail,
          idempotency_key: `customer_${idempotencyKey}`,
        }, { headers });
        customerId = customerResponse.data.customer.id;
      }

      // Step 2: Create order
      const orderBody = {
        idempotency_key: `order_${idempotencyKey}`,
        order: {
          location_id: locationId,
          customer_id: customerId,
          line_items: [
            {
              name: note || "Payment Request",
              quantity: "1",
              base_price_money: {
                amount: amountInCents,
                currency,
              },
            },
          ],
        },
      };

      const orderResponse = await axios.post(`${baseURL}/orders`, orderBody, { headers });
      const orderId = orderResponse.data.order.id;

      // Step 3: Create invoice
      const invoiceBody = {
        invoice: {
          location_id: locationId,
          order_id: orderId,
          primary_recipient: {
            customer_id: customerId,
          },
          payment_requests: [
            {
              request_type: "BALANCE",
              due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              automatic_payment_source: "NONE",
            },
          ],
          delivery_method: "EMAIL",
          invoice_number: `INV-${Date.now()}`,
          title: "Payment Request",
          description: note,
          accepted_payment_methods: {
            card: true,
            square_gift_card: false,
            bank_account: false,
          },
        },
        idempotency_key: idempotencyKey,
      };

      const invoiceResponse = await axios.post(`${baseURL}/invoices`, invoiceBody, { headers });
      const invoice = invoiceResponse.data.invoice;

      // Step 4: Publish invoice
      const publishBody = {
        version: invoice.version,
        idempotency_key: `publish_${idempotencyKey}`,
      };

      const publishResponse = await axios.post(`${baseURL}/invoices/${invoice.id}/publish`, publishBody, { headers });
      const publishedInvoice = publishResponse.data.invoice;

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
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);
      console.error("❌ Error message:", error.message);
      
      let errorMessage = "Failed to send Square invoice. Please check your inputs and connection.";
      let statusCode = 500;
      
      if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.map(e => e.detail || e.message).join(", ");
        statusCode = error.response.status || 400;
      } else if (error.response?.status === 401) {
        errorMessage = "Square access token is invalid or expired. Please update your credentials.";
        statusCode = 401;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return res.status(statusCode).json({
        success: false,
        message: errorMessage,
        details: {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        },
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

    const axios = require('axios');
    const response = await axios.get(`https://connect.squareupsandbox.com/v2/invoices/${invoiceId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-11-20',
        'Content-Type': 'application/json'
      }
    });

    const invoice = response.data.invoice;
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

      // Fetch the merchant's locations to get the correct location ID
      console.log('🔍 Fetching merchant locations...');
      const locationsResponse = await axios.get(
        'https://connect.squareupsandbox.com/v2/locations',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Square-Version': '2024-11-20',
            'Content-Type': 'application/json'
          }
        }
      );

      let merchantLocationId = locationId; // Use provided locationId if available
      let merchantLocationName = null;

      if (locationsResponse.data.locations && locationsResponse.data.locations.length > 0) {
        const activeLocation = locationsResponse.data.locations.find(loc => loc.status === 'ACTIVE') 
          || locationsResponse.data.locations[0];
        merchantLocationId = activeLocation.id;
        merchantLocationName = activeLocation.name;
        console.log('✅ Found location:', merchantLocationName, '- ID:', merchantLocationId);
      }

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
            username: squareEmail,
            accessToken: token,
            currency: "USD",
            isActive: true,
            updatedAt: new Date(),
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
          locationId: merchantLocationId,
          locationName: merchantLocationName,
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
