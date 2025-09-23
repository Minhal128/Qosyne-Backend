const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');
const {
  getPayPalOAuthToken,
  calculateUserBalance,
} = require('../utils/walletUtils');
const { default: axios } = require('axios');
const { paymentFactory } = require('../paymentGateways/paymentFactory');
const {
  getOrderBasedPayment,
} = require('../paymentGateways/interfaces/paymentMapper');
const VenmoGateway = require('../paymentGateways/gateways/VenmoGateway');
const prisma = new PrismaClient();
const GooglePayGateway = require('../paymentGateways/gateways/GooglePayGateway');
const WiseGateway = require('../paymentGateways/gateways/WiseGateway');

//  Process Payment via Stripe (Now Uses JWT userId)
exports.processStripePayment = async (req, res) => {
  const userId = req.user.userId;
  const { amount, currency, stripeToken } = req.body;

  if (!amount || !currency || !stripeToken)
    return res.status(400).json({ error: 'All fields are required' });

  const charge = await stripe.charges.create({
    amount: amount * 100,
    currency,
    source: stripeToken,
    description: 'Qosyne Wallet Deposit',
  });

  const wallet = await prisma.wallet.upsert({
    where: { userId },
    update: { balance: { increment: parseFloat(amount) } },
    create: { userId, balance: parseFloat(amount) },
  });

  await prisma.transactions.create({
    data: {
      senderId: userId,
      receiverId: userId,
      walletId: wallet.id,
      amount: parseFloat(amount),
      currency,
      type: 'DEPOSIT',
      status: 'COMPLETED',
    },
  });

  res.json({ message: 'Payment successful', balance: wallet.balance });
};

exports.addPaymentMethod = async (req, res) => {
  const userId = req.user.userId;
  const { provider, paymentMethodId } = req.body; // PaymentMethodId is returned by PayPal/Stripe

  if (!provider || !paymentMethodId)
    return res
      .status(400)
      .json({ error: 'Provider and paymentMethodId are required' });

  const paymentMethod = await prisma.paymentMethods.create({
    data: {
      userId,
      provider,
      paymentMethodId, //  Securely storing the real payment method ID
    },
  });

  res.json({ message: 'Payment method linked successfully', paymentMethod });
};

exports.getPayPalToken = async (req, res) => {
  const token = await getPayPalOAuthToken();
  res.json({ accessToken: token });
};

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_REDIRECT_URI = process.env.PAYPAL_REDIRECT_URI;
const PAYPAL_AUTH_URL = process.env.PAYPAL_AUTH_URL;
const PAYPAL_TOKEN_URL = process.env.PAYPAL_TOKEN_URL;

//  Step 1: Generate PayPal OAuth URL
exports.getPayPalAuthUrl = async (req, res) => {
  const userId = req.user.userId; // Extract user ID from token
  // const userId = 2;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  // Build the scope and redirect URI with URL encoding
  const scope = encodeURIComponent(
    'openid profile email https://uri.paypal.com/services/paypalattributes',
  );

  // Build the auth URL (note: we're not using flowEntry=static here)
  const authUrl = `${PAYPAL_AUTH_URL}?client_id=${PAYPAL_CLIENT_ID}&response_type=code&scope=${scope}&redirect_uri=${PAYPAL_REDIRECT_URI}&state=${userId}`;
  res.status(200).json({
    data: authUrl,
    message: 'PayPal Auth URL generated',
    status_code: 200,
  });
};

// Utility function to create HTML alert response
const createHtmlAlertResponse = (message, isSuccess = false) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          .alert-box {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          .alert-message {
            color: #333;
            margin-bottom: 20px;
          }
          .close-btn {
            background: #007AFF;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
          }
          .overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
          }
          .status-icon {
            font-size: 48px;
            margin-bottom: 15px;
          }
        </style>
      </head>
      <body>
        <div class="overlay">
          <div class="alert-box">
            <div class="status-icon">
              ${isSuccess ? '✅' : '⚠️'}
            </div>
            <p class="alert-message">${message}</p>
            <button class="close-btn" onclick="handleClose()">OK</button>
          </div>
        </div>
        <script>
          function handleClose() {
            // Navigate to success/failure URL before closing
            const redirectUrl = ${isSuccess} 
              ? '/api/payment/paypal/success'
              : '/api/payment/paypal/failure';
            
            fetch(redirectUrl)
              .then(response => response.json())
              .then(data => {
                console.log('Redirect URL hit:', data);
                window.close();
              })
              .catch(error => {
                console.error('Error hitting redirect URL:', error);
                window.close();
              });
          }
        </script>
      </body>
    </html>
  `;
  return htmlContent;
};

exports.payPalCallback = async (req, res) => {
  const { code, state, paymentMethod } = req.query;
  if (!code) {
    return res.status(400).json({
      error: 'Authorization code missing',
      status_code: 400,
    });
  }

  const paymentGateway = paymentFactory('paypal');

  //  Get the access token from PayPal
  const accessToken = await paymentGateway.getAppToken();

  //  Fetch user info from PayPal
  const userInfo = await paymentGateway.getUserInfo(accessToken);

  const userId = parseInt(state, 10);
  const existingWallet = await prisma.connectedWallets.findUnique({
    where: { walletId: userInfo.payer_id },
  });

  if (existingWallet) {
    res.setHeader('Content-Type', 'text/html');
    return res
      .status(400)
      .send(
        createHtmlAlertResponse('This PayPal account is already linked', false),
      );
  }

  //  Save to DB
  const linkedWallet = await prisma.connectedWallets.create({
    data: {
      userId: Number(state),
      provider: 'PAYPAL',
      walletId: userInfo.payer_id,
      accountEmail: userInfo.email,
      fullName: userInfo.name,
      username: userInfo.email,
      currency: userInfo.address.country,
      isActive: true,
    },
  });

  // For success case
  res.setHeader('Content-Type', 'text/html');
  return res
    .status(201)
    .send(createHtmlAlertResponse('PayPal linked successfully', true));
};

exports.payPalCallbackAuthorize = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!state) {
      return res.status(400).json({
        error: 'State parameter missing',
        status_code: 400,
      });
    }

    // Decode the state
    const decodedState = JSON.parse(decodeURIComponent(state));

    const { email, name, walletDeposit, userId } = decodedState;

    // Fetch transaction where userId and status is pending
    const transaction = await prisma.transactions.findFirst({
      where: {
        userId,
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!transaction) {
      return res.status(400).json({
        error: 'No pending transaction found',
        status_code: 400,
      });
    }

    // Dynamic recipient info
    const recipient = {
      email,
      note: `Payment for ${walletDeposit ? 'wallet deposit' : 'services'}`,
      sender_item_id: `txn_${transaction.id}`,
    };

    // Use the decoded parameters
    const paymentGateway = paymentFactory('paypal');
    const response = await paymentGateway.authorizePayment({
      orderID: transaction.paymentId,
      amount: transaction.amount,
      currency: transaction.currency || 'USD',
      recipient,
      walletDeposit,
    });

    // Handle response
    res.status(201).json({
      message: 'PayPal callback response',
      data: response,
      status_code: 201,
    });
  } catch (err) {
    console.error('PayPal callback error:', err);
    res.status(500).json({
      error: 'Payment processing failed',
      status_code: 500,
    });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const {
      price,
      currency,
      connectedWalletId,
      walletDeposit,
      recipient,
      useQosyneBalance,
    } = req.body;
    const { paymentMethod } = req.params;
    const userId = req.user.userId;

    // Basic validation
    if (!price) {
      return res.status(400).json({ error: 'Missing required field: price' });
    }
    if (!paymentMethod) {
      return res.status(400).json({ error: 'Missing payment method' });
    }

    if (useQosyneBalance) {
      // (a) Check user's Qosyne balance
      const userBalance = await calculateUserBalance(userId);
      // You can adapt your existing "getBalance" logic or
      // do an internal function call with prisma.
      console.log('userBalance', userBalance);
      if (parseFloat(userBalance) < parseFloat(price)) {
        return res.status(400).json({
          error: 'Insufficient Qosyne balance',
          status_code: 400,
        });
      }
    }
    // Construct state with user details
    const stateData = {
      email: recipient?.email,
      name: recipient?.name,
      walletDeposit: walletDeposit || false,
      userId: userId,
      useQosyneBalance: useQosyneBalance || false,
    };
    const encodedState = encodeURIComponent(JSON.stringify(stateData));

    // Instantiate the correct payment gateway
    const paymentGateway = paymentFactory(paymentMethod);

    // Create an order (or PaymentIntent, Payout batch, etc.) with the chosen gateway
    const { orderID, links } = await paymentGateway.createOrder({
      userId,
      price,
      currency: currency || 'USD',
      state: encodedState, // Include the encoded state
    });

    // Some gateways (e.g., PayPal) provide approval links
    const approveLinkObj = links?.find((link) => link.rel === 'approve');
    const approveLink = approveLinkObj ? approveLinkObj.href : null;

    // Insert a PENDING transaction
    await prisma.transactions.create({
      data: {
        userId: userId,
        amount: price,
        currency: currency || 'USD',
        type: walletDeposit
          ? 'DEPOSIT'
          : useQosyneBalance
          ? 'EXTERNAL_TRANSFER'
          : 'TRANSFER',
        status: 'PENDING',
        paymentId: orderID,
        connectedWalletId: connectedWalletId,
        provider: paymentMethod.toUpperCase(),
        updatedAt: new Date(),
      },
    });

    // Return the newly created order details
    return res.status(201).json({
      message: 'Payment authorized successfully',
      data: {
        orderID,
        approveLink,
      },
      status_code: 201,
    });
  } catch (err) {
    console.error('createOrder error:', err);
    return res.status(500).json({ error: 'Failed to create order' });
  }
};

exports.authorizePayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('userId', userId);
    const {
      orderID,
      connectedWalletId,
      amount,
      currency,
      customerId,
      paymentMethodId,
      recipient,
      bankTokenId,
      walletDeposit = false,
      paymentToken,
      useQosyneBalance = false, // <--- new flag
    } = req.body;
    console.log('req.body', req.body);
    const { paymentMethod } = req.params;

    if (useQosyneBalance) {
      // (a) Check user's Qosyne balance
      const userBalance = await calculateUserBalance(userId);
      // You can adapt your existing "getBalance" logic or
      // do an internal function call with prisma.
      console.log('userBalance', userBalance);
      if (parseFloat(userBalance) < parseFloat(amount)) {
        return res.status(400).json({
          error: 'Insufficient Qosyne balance',
          status_code: 400,
        });
      }
    }
    // Validate payment method
    if (
      paymentMethod !== 'paypal' &&
      paymentMethod !== 'stripe' &&
      paymentMethod !== 'wise' &&
      paymentMethod !== 'googlepay' &&
      paymentMethod !== 'venmo' &&
      paymentMethod !== 'square'
    ) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Gateway-specific validations (if needed)
    if (paymentMethod === 'paypal' && !orderID) {
      return res.status(400).json({ error: 'Missing required field: orderID' });
    }
    if (paymentMethod === 'stripe' && (!customerId || !paymentMethodId)) {
      return res.status(400).json({
        error: 'Missing required fields: customerId, paymentMethodId',
      });
    }

    // Instantiate the gateway
    const paymentGateway = paymentFactory(paymentMethod);

    // Authorize / finalize the payment
    // const { response, paymentId, payedAmount } =
    //   await paymentGateway.authorizePayment({
    //     orderID,
    //     amount,
    //     currency: currency || 'USD',
    //     customerId,
    //     paymentMethodId,
    //     recipient,
    //     walletDeposit,
    //     // Pass the recipient data so each gateway can handle it properly
    //   });
    const { payedAmount, paymentId, response } =
      await paymentGateway.authorizePayment({
        req,
        orderID,
        amount,
        currency: currency || 'USD',
        customerId,
        paymentMethodId,
        recipient,
        bankTokenId,
        walletDeposit,
        paymentToken,
        customerId: userId,
        connectedWalletId,
        useQosyneBalance,
        // Pass the recipient data so each gateway can handle it properly
      });
    // console.log('response', response);

    // Record a COMPLETED transaction
    const newTransaction = await prisma.transactions.create({
      data: {
        userId: userId,
        amount: payedAmount,
        currency: currency || 'USD',
        type: walletDeposit
          ? 'DEPOSIT'
          : useQosyneBalance
          ? 'EXTERNAL_TRANSFER'
          : 'TRANSFER',
        status: 'COMPLETED',
        connectedWalletId: parseInt(connectedWalletId),
        provider: paymentMethod.toUpperCase(),
        paymentId,
        updatedAt: new Date(),
      },
    });

    await prisma.transactionRecipients.create({
      data: {
        transactionId: newTransaction.id,
        recipientEmail: recipient?.email || null,
        recipientName: recipient?.name || null,
      },
    });

    return res.status(201).json({
      message: 'Payment authorized successfully',
      data: {
        paymentId,
        payedAmount,
        responseData: response,
      },
      status_code: 201,
    });
  } catch (err) {
    console.error('authorizePayment error:', err);
    return res.status(500).send(err);
  }
};

/**
 * POST /api/paypal/capture-payment
 * Body: { paymentId: string }
 *
 * Captures a previously authorized payment.
 * Returns { responseData } if successful.
 */
exports.paymentCapture = async (req, res) => {
  const { paymentId, connectedWalletId, amount, currency } = req.body;
  const { paymentMethod } = req.params;
  const userId = req.user.userId;

  if (!paymentId) {
    return res.status(400).json({ error: 'Missing required field: paymentId' });
  }
  const paymentGateway = paymentFactory(paymentMethod);
  // const orderBasedPaymentGateway = getOrderBasedPayment(paymentGateway);

  const { response: captureResponse, amount: capturedAmount } = await paymentGateway.paymentCapture({
    paymentId,
  });

  // Find the original transaction to get details if needed
  const originalTransaction = await prisma.transactions.findFirst({
    where: { paymentId },
  });

  await prisma.transactions.create({
    data: {
      userId: userId,
      amount: capturedAmount || amount || originalTransaction?.amount || 0,
      currency: currency || originalTransaction?.currency || 'USD',
      type: 'DEPOSIT',
      status: 'CAPTURED',
      connectedWalletId: parseInt(connectedWalletId),
      provider: paymentMethod.toUpperCase(),
      paymentId,
      updatedAt: new Date(),
    },
  });
  // captureResponse contains PayPal's details about the capture.
  // e.g. { id, status, purchase_units, etc. }

  // At this point, the funds should be moved into your PayPal business account.
  // You can update your DB to reflect that the user has paid,
  // and "credit" the user in your own system as appropriate.

  return res.status(201).json({
    message: 'Payment captured successfully',
    data: captureResponse,
    status_code: 201,
  });
};

// paymentController.js

exports.attachPaymentMethod = async (req, res) => {
  const { customerId, paymentMethodId, item, bankAccount } = req.body;
  const { paymentMethod } = req.params;
  const userId = req.user.userId;
  console.log('userId', userId);

  try {
    const existingWallet = await prisma.connectedWallets.findFirst({
      where: {
        userId: userId,
        provider: paymentMethod.toUpperCase(),
        // walletId: attachedPaymentMethodId,
      },
    });
    console.log('existingWallet', existingWallet);
    if (existingWallet) {
      return res.status(400).json({
        error: 'This payment gateway is already linked to your profile',
        status_code: 400,
      });
    }
    const paymentGateway = paymentFactory(paymentMethod);
    console.log('paymentGateway', paymentGateway);
    // 🟢 Attach Bank Account if Provided
    let attachedPaymentMethodId, customerDetails;

    const result = await paymentGateway.attachBankAccount({
      customerId,
      paymentMethodId,
      item,
      bankAccount,
    });

    console.log('result', result);
    attachedPaymentMethodId = result.attachedPaymentMethodId;
    customerDetails = result.customerDetails;

    // 🟢 Insert to connectedWallets table
    const wallet = await prisma.connectedWallets.create({
      data: {
        provider: paymentMethod.toUpperCase(),
        customerId: customerId ?? null,
        walletId: attachedPaymentMethodId,
        accountEmail: customerDetails?.email ?? 'dummy@gmail.com',
        fullName: customerDetails?.name,
        isActive: true,
        user: {
          connect: {
            id: userId,
          },
        },
        currency: customerDetails?.currency ?? 'USD',
      },
    });

    return res.status(201).json({
      message: 'Payment method attached successfully',
      data: {
        attachedPaymentMethodId,
        connectedWalletId: wallet.id,
      },
      status_code: 201,
    });
  } catch (error) {
    console.error('Error attaching payment method:', error);
    return res.status(500).json({
      error: error.message,
      status_code: 500,
    });
  }
};

exports.getTransactions = async (req, res) => {
    // userId is provided by auth middleware (e.g., JWT)
    const userId = req.user.userId;

    // Fetch all columns, plus related wallet/connectedWallet/sender
    const transactions = await prisma.transactions.findMany({
      where: { userId },
      include: {
        wallet: true,
        connectedWallet: true,
        sender: true, // If you also want basic user info
      },
    });

    // Format provider names in transactions
    const formattedTransactions = transactions.map(transaction => {
      // Format the direct provider name if present
      const formattedTransaction = {
        ...transaction,
        provider: transaction.provider ? formatProviderName(transaction.provider) : undefined
      };

      // Format provider in connectedWallet if present
      if (formattedTransaction.connectedWallet && formattedTransaction.connectedWallet.provider) {
        formattedTransaction.connectedWallet = {
          ...formattedTransaction.connectedWallet,
          provider: formatProviderName(formattedTransaction.connectedWallet.provider)
        };
      }

      return formattedTransaction;
    });

    return res.status(200).json({
      message: 'Transactions fetched successfully',
      data: {
        transactions: formattedTransactions,
      },
      status_code: 200,
    });

};

exports.getRecipients = async (req, res) => {
  try {
    const userId = req.user.userId; // The ID of the current user from auth

    // 1) Query all transactionRecipients where transaction.userId == userId
    const recipients = await prisma.transactionRecipients.findMany({
      where: {
        transaction: {
          userId: userId,
        },
      },
      orderBy: {
        transaction: {
          createdAt: 'desc',
        },
      },
      include: {
        transaction: true,
      },
    });

    // Format the provider names in each transaction
    const formattedRecipients = recipients.map(recipient => ({
      ...recipient,
      transaction: {
        ...recipient.transaction,
        provider: formatProviderName(recipient.transaction.provider)
      }
    }));

    // 2) Return them in the response
    return res.status(200).json({
      message: 'Recipients fetched successfully',
      data: { recipients: formattedRecipients },
      status_code: 200,
    });
  } catch (err) {
    console.error('getRecipients error:', err);
    return res.status(500).json({ error: 'Failed to fetch recipients' });
  }
};

// Add the formatProviderName function definition (if not already defined)
const formatProviderName = (provider) => {
  if (!provider) return '';
  
  switch (provider.toUpperCase()) {
    case 'QOSYNE':
      return 'Qosyne Wallet';
    case 'PAYPAL':
      return 'PayPal';
    case 'GOOGLEPAY':
      return 'Google Pay';
    case 'SQUARE':
      return 'Square';
    case 'WISE':
      return 'Wise';
    case 'VENMO':
      return 'Venmo';
    case 'APPLEPAY':
      return 'Apple Pay';
    default:
      // If we don't have a specific mapping, capitalize first letter of each word
      return provider
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
  }
};

// Fetch attached bank accounts for a customer
exports.getBankAccounts = async (req, res) => {
  try {
    const { customerId } = req.params;
    if (!customerId) {
      return res.status(400).json({ error: 'Missing customerId' });
    }

    // For non-US bank accounts (e.g., SEPA Debit)
    const sepaAccounts = await stripe.customers.listPaymentMethods(customerId, {
      type: 'sepa_debit',
    });

    // For US bank accounts attached as sources
    const usAccounts = await stripe.customers.listSources(customerId, {
      object: 'bank_account',
    });

    return res.json({
      message: 'Bank accounts fetched successfully',
      data: {
        sepaAccounts: sepaAccounts.data,
        usAccounts: usAccounts.data,
      },
    });
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
};

// Backend: /paypal/webhook
exports.payPalWebhook = async (req, res) => {
  const event = req.body;

  // Verify webhook signature (for security)
  const isValid = await verifyWebhookSignature(req);
  if (!isValid) return res.status(400).send('Invalid signature');

  switch (event.event_type) {
    case 'PAYMENT.CAPTURE.COMPLETED':
      await prisma.transactions.update({
        where: { paymentId: event.resource.id },
        data: { status: 'COMPLETED' },
      });
      break;
    case 'PAYMENT.CAPTURE.DENIED':
      await prisma.transactions.update({
        where: { paymentId: event.resource.id },
        data: { status: 'FAILED' },
      });
      break;
    case 'PAYMENT.CAPTURE.REFUNDED':
      await prisma.transactions.update({
        where: { paymentId: event.resource.id },
        data: { status: 'REFUNDED' },
      });
      break;
  }

  res.sendStatus(200);
};

const verifyWebhookSignature = async (req) => {
  const transmissionId = req.headers['paypal-transmission-id'];
  const timestamp = req.headers['paypal-transmission-time'];
  const certUrl = req.headers['paypal-cert-url'];
  const signature = req.headers['paypal-transmission-sig'];

  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  const body = JSON.stringify(req.body);

  const response = await axios.post(
    `${process.env.PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`,
    {
      transmission_id: transmissionId,
      transmission_time: timestamp,
      cert_url: certUrl,
      auth_algo: 'SHA256withRSA',
      transmission_sig: signature,
      webhook_id: webhookId,
      webhook_event: body,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getAppToken()}`,
      },
    },
  );

  return response.data.verification_status === 'SUCCESS';
};

// example route: GET /braintree/generateClientToken
exports.generateClientToken = async (req, res) => {
  try {
    const { customerId } = req.query;

    // 1) Instantiate the VenmoGateway
    const venmoGateway = new VenmoGateway();

    // 2) Build the options, e.g. { customerId: '...' }
    const options = {};
    if (customerId) options.customerId = customerId;

    // 3) Call clientToken.generate on the instance's gateway
    const { clientToken } = await venmoGateway.gateway.clientToken.generate(
      options,
    );

    console.log('Generated Braintree client token for Venmo');
    res.json({ clientToken });
  } catch (error) {
    console.error('Error generating Braintree client token:', error);
    res.status(500).json({ error: 'Failed to generate client token' });
  }
};

// Create a recipient token for Wise
exports.createRecipientToken = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { recipient } = req.body;

    if (!recipient || !recipient.iban) {
      return res
        .status(400)
        .json({ error: 'Recipient details with IBAN are required' });
    }

    const wiseGateway = new WiseGateway();
    const tokenResult = await wiseGateway.createRecipientToken(recipient);

    return res.status(200).json({
      message: 'Recipient token created successfully',
      data: tokenResult,
      status_code: 200,
    });
  } catch (error) {
    console.error('Error creating recipient token:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await prisma.transactions.findMany({
      select: {
        id: true,
        userId: true,
        amount: true,
        currency: true,
        provider: true,
        type: true,
        status: true,
        createdAt: true,
        paymentId: true,
        users: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: skip,
      take: parseInt(limit),
    });

    const totalTransactions = await prisma.transactions.count();

    res.status(200).json({
      message: 'All transactions fetched successfully',
      data: { 
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalTransactions / parseInt(limit)),
          totalTransactions,
          limit: parseInt(limit)
        }
      },
      status_code: 200,
    });
  } catch (err) {
    console.error('getAllTransactions failed:', err);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message,
      status_code: 500 
    });
  }
};

exports.changeTransactionStatus = async (req, res) => {
  const transactionId = parseInt(req.params.id);
  const { status } = req.body;

  if (!['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status', status_code: 400 });
  }

  try {
    const updatedTransaction = await prisma.transactions.update({
      where: { id: transactionId },
      data: { status },
    });

    return res.status(200).json({
      message: `Status updated to ${status}`,
      data: updatedTransaction,
      status_code: 200,
    });
  } catch (err) {
    console.error('Status update failed:', err);
    return res.status(500).json({ message: 'Server error', status_code: 500 });
  }
};

exports.getTransactionStats = async (req, res) => {
  try {
    // Get transaction counts by status
    const statusStats = await prisma.transactions.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    // Get transaction counts by provider
    const providerStats = await prisma.transactions.groupBy({
      by: ['provider'],
      _count: {
        id: true,
      },
    });

    // Get transaction counts by type
    const typeStats = await prisma.transactions.groupBy({
      by: ['type'],
      _count: {
        id: true,
      },
    });

    // Get total transaction amount
    const totalAmountResult = await prisma.transactions.aggregate({
      _sum: {
        amount: true,
      },
    });

    // Skip fees since column doesn't exist in current database
    const totalFeesResult = { _sum: { fees: 0 } };

    // Get recent transactions count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTransactionsCount = await prisma.transactions.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Get total transaction count
    const totalTransactions = await prisma.transactions.count();

    res.status(200).json({
      message: 'Transaction statistics fetched successfully',
      data: {
        totalTransactions,
        recentTransactions: recentTransactionsCount,
        totalAmount: totalAmountResult._sum.amount || 0,
        totalFees: totalFeesResult._sum.fees || 0,
        statusBreakdown: statusStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        }, {}),
        providerBreakdown: providerStats.reduce((acc, stat) => {
          acc[stat.provider] = stat._count.id;
          return acc;
        }, {}),
        typeBreakdown: typeStats.reduce((acc, stat) => {
          acc[stat.type] = stat._count.id;
          return acc;
        }, {}),
      },
      status_code: 200,
    });
  } catch (err) {
    console.error('getTransactionStats failed:', err);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message,
      status_code: 500 
    });
  }
};