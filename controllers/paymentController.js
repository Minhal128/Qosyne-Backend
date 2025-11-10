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
const feeCollectionService = require('../services/feeCollectionService');
const { BraintreeClientTokenGenerator } = require('../utils/braintreeClientTokenGenerator');
const { MockBraintreeClientToken } = require('../utils/mockBraintreeClientToken');

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

  const transaction = await prisma.transactions.create({
    data: {
      userId: userId,
      walletId: wallet.id,
      amount: parseFloat(amount),
      currency,
      provider: 'QOSYNE',
      type: 'DEPOSIT',
      status: 'COMPLETED',
    },
  });

  // Collect admin fee asynchronously
  setImmediate(async () => {
    try {
      await feeCollectionService.collectAdminFee(transaction);
    } catch (error) {
      console.error(`Fee collection failed for Stripe transaction ${transaction.id}:`, error);
    }
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

  // Debug: log masked client id and which PayPal environment we are targeting
  try {
    const maskedClientId = PAYPAL_CLIENT_ID ? ('' + PAYPAL_CLIENT_ID).slice(0, Math.max(0, ('' + PAYPAL_CLIENT_ID).length - 4)) + '****' : 'MISSING_CLIENT_ID';
    const paypalEnv = process.env.NODE_ENV === 'production' ? 'live' : 'sandbox';
    console.log(`PayPal Auth URL requested by user ${userId} — client=${maskedClientId}, env=${paypalEnv}`);
  } catch (e) {
    // ignore logging failures
  }

  // Build the scope and redirect URI with URL encoding
  // Note: Use space-separated scopes for PayPal OpenID Connect
  const scope = encodeURIComponent(
    'openid profile email',
  );

  // Build the auth URL — force response_mode=query and URL-encode redirect URI so PayPal returns code via GET
  const redirect = encodeURIComponent(PAYPAL_REDIRECT_URI);
  const authUrl = `${PAYPAL_AUTH_URL}?client_id=${PAYPAL_CLIENT_ID}&response_type=code&response_mode=query&scope=${scope}&redirect_uri=${redirect}&state=${userId}`;
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

// Create a small HTML page that posts a message to the opener window and closes the popup.
const createPopupPostMessageResponse = (type, payload = {}, fallbackUrl) => {
  const safePayload = JSON.stringify(payload).replace(/</g, '\\u003c');
  const origin = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>PayPal Connect</title>
    </head>
    <body>
      <script>
        (function(){
          try {
            var payload = ${safePayload};
            // Attempt to postMessage to opener
            if (window.opener && !window.opener.closed) {
              // Use wildcard origin so messages reach the opener in dev and prod environments
              window.opener.postMessage({ type: '${type}', payload: payload }, '*');
              // small delay to ensure message is sent
              setTimeout(function(){ window.close(); }, 300);
            } else {
              // If no opener, redirect to fallback URL
              window.location = '${fallbackUrl || origin + '/paypal/callback?success=false'}';
            }
          } catch (e) {
            console.error('Popup messenger error', e);
            window.location = '${fallbackUrl || origin + '/paypal/callback?success=false'}';
          }
        })();
      </script>
    </body>
  </html>`;
};

exports.payPalCallback = async (req, res) => {
  try {
    // CRITICAL: Log everything in the request query for debugging
    console.log("PayPal Callback Received. Full Query:", req.query);
    console.log("PayPal Callback Received. Full URL:", req.url);
    console.log("PayPal Callback Received. Method:", req.method);
    
    const { code, state, paymentMethod, error, error_description } = req.query;
    
    // Check if PayPal sent an error instead of a code
    if (error) {
      console.error("PayPal returned an error:", error, error_description);
      return res.status(400).send(createPopupPostMessageResponse('PAYPAL_OAUTH_ERROR', { error: 'PayPal returned an error', reason: error_description || error }, `${process.env.FRONTEND_URL}/paypal/callback?success=false`));
    }
    
    if (!code) {
      console.error("Error: Authorization code not found in callback query.");
      console.log("Available query parameters:", Object.keys(req.query));
      return res.status(400).send(createPopupPostMessageResponse('PAYPAL_OAUTH_ERROR', { error: 'Authorization code missing', received_params: Object.keys(req.query) }, `${process.env.FRONTEND_URL}/paypal/callback?success=false`));
    }
    
    console.log("Authorization Code received:", code);

    const paymentGateway = paymentFactory('paypal');

    // Exchange the authorization code for a user-specific access token
    let tokenResponse;
    try {
      tokenResponse = await paymentGateway.exchangeAuthorizationCodeForToken(code, PAYPAL_REDIRECT_URI);
      console.log('🔁 PayPal token exchange response:', tokenResponse);
    } catch (err) {
      // Capture PayPal error body if present (safe to log); avoid logging client secret
      const paypalError = err.response?.data || err.message || err;
      // Mask client id for logs (do not log secrets)
      const maskedClientId = PAYPAL_CLIENT_ID ? ('' + PAYPAL_CLIENT_ID).slice(0, Math.max(0, ('' + PAYPAL_CLIENT_ID).length - 4)) + '****' : 'MISSING_CLIENT_ID';
      console.error('❌ PayPal token exchange failed for client:', maskedClientId);
      console.error('❌ PayPal token exchange error body:', JSON.stringify(paypalError));

      // Try to extract a helpful message for the frontend
      let reason = 'Token exchange failed';
      if (paypalError && typeof paypalError === 'object') {
        if (paypalError.error_description) reason = paypalError.error_description;
        else if (paypalError.error) reason = paypalError.error;
      } else if (typeof paypalError === 'string') {
        reason = paypalError;
      }

      // More actionable guidance for the user
      const guidance = 'Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET (use Sandbox creds if testing), and ensure the redirect URI configured in PayPal Developer matches PAYPAL_REDIRECT_URI.';

      // Respond with a small HTML page that posts the error to the opener then closes
      const errorPayload = { error: 'Token exchange failed', reason, guidance };
      return res.send(createPopupPostMessageResponse('PAYPAL_OAUTH_ERROR', errorPayload, `${process.env.FRONTEND_URL}/paypal/callback?success=false&error=${encodeURIComponent('Token exchange failed')}&reason=${encodeURIComponent(reason)}`));
    }

    const userAccessToken = tokenResponse.access_token;
    const idToken = tokenResponse.id_token;
    
    if (!userAccessToken && !idToken) {
      console.error('❌ No tokens received from PayPal token exchange', tokenResponse);
      return res.send(createPopupPostMessageResponse('PAYPAL_OAUTH_ERROR', { error: 'No tokens returned' }, `${process.env.FRONTEND_URL}/paypal/callback?success=false&error=${encodeURIComponent('No tokens returned')}`));
    }

    // Decode the id_token to get user info (it's a JWT with user data)
    let userInfo;
    try {
      if (idToken) {
        // Decode the JWT id_token (it contains user info)
        console.log('🔓 Decoding PayPal id_token JWT...');
        const base64Payload = idToken.split('.')[1];
        const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
        console.log('✅ Decoded id_token payload:', payload);
        
        // Extract user info from id_token
        userInfo = {
          user_id: payload.sub?.split('/').pop(), // Extract user ID from sub URL
          payer_id: payload.payer_id,
          email: payload.email || `${payload.payer_id}@paypal.user`, // Fallback email if not provided
          name: payload.name || payload.given_name || 'PayPal User',
          email_verified: payload.email_verified || false,
        };
        console.log('✅ Extracted user info from id_token:', userInfo);
      } else {
        // Fallback to userinfo endpoint if no id_token
        console.log('⚠️ No id_token, falling back to userinfo endpoint');
        userInfo = await paymentGateway.getUserInfo(userAccessToken);
      }
    } catch (err) {
      console.error('❌ Failed to decode id_token or fetch user info:', err);
      return res.send(createPopupPostMessageResponse('PAYPAL_OAUTH_ERROR', { 
        error: 'Failed to get user info',
        details: err.message
      }, `${process.env.FRONTEND_URL}/paypal/callback?success=false&error=${encodeURIComponent('Failed to get user info')}`));
    }

    const userId = parseInt(state, 10);
    // PayPal returns either payer_id or user_id depending on the schema
    const paypalId = userInfo.payer_id || userInfo.user_id || userInfo.sub;
    
    if (!paypalId) {
      console.error('❌ No PayPal ID found in user info:', userInfo);
      return res.send(createPopupPostMessageResponse('PAYPAL_OAUTH_ERROR', { 
        error: 'No PayPal user ID found',
        receivedData: Object.keys(userInfo)
      }, `${process.env.FRONTEND_URL}/paypal/callback?success=false&error=${encodeURIComponent('No PayPal ID found')}`));
    }
    
    console.log('✅ PayPal ID extracted:', paypalId);
    
    const existingWallet = await prisma.connectedWallets.findUnique({
      where: { walletId: paypalId },
    });

    if (existingWallet) {
      // If the wallet is already linked to the same user who just completed OAuth,
      // update the token and treat this as a success (idempotent)
      const requestingUserId = Number(state);
      if (existingWallet.userId === requestingUserId) {
        // Update the access token and refresh token
        const updatedWallet = await prisma.connectedWallets.update({
          where: { id: existingWallet.id },
          data: {
            accessToken: userAccessToken,
            refreshToken: tokenResponse.refresh_token || null,
            isActive: true,
            updatedAt: new Date(),
          },
        });
        const successPayload = { name: userInfo.name, email: userInfo.email, paypalId: paypalId, wallet: updatedWallet };
        return res.send(createPopupPostMessageResponse('PAYPAL_OAUTH_SUCCESS', successPayload, `${process.env.FRONTEND_URL}/paypal/callback?success=true&name=${encodeURIComponent(userInfo.name)}&email=${encodeURIComponent(userInfo.email)}&paypalId=${encodeURIComponent(paypalId)}`));
      }

      // Otherwise the PayPal account is linked to a different user — keep existing error behavior
      return res.send(createPopupPostMessageResponse('PAYPAL_OAUTH_ERROR', { error: 'Account already linked' }, `${process.env.FRONTEND_URL}/paypal/callback?success=false&error=This%20PayPal%20account%20is%20already%20linked`));
    }

    //  Save to DB (with safe currency fallback)
    try {
      const currencyFallback = 'USD';
      let currencyValue = currencyFallback;
      if (userInfo) {
        if (userInfo.address && userInfo.address.country) {
          // Use country as-is only if it's a 3-letter code (some responses use 3-letter currency)
          currencyValue = userInfo.address.country && userInfo.address.country.length === 3 ? userInfo.address.country : currencyFallback;
        } else if (userInfo.locale && typeof userInfo.locale === 'string') {
          // locale like en_US — we avoid mapping and default to USD
          currencyValue = currencyFallback;
        }
      }

      const linkedWallet = await prisma.connectedWallets.create({
        data: {
          userId: Number(state),
          provider: 'PAYPAL',
          walletId: paypalId,
          accountEmail: userInfo.email || `${paypalId}@paypal.user`,
          fullName: userInfo.name || 'PayPal User',
          username: userInfo.email || paypalId,
          currency: currencyValue,
          accessToken: userAccessToken,
          refreshToken: tokenResponse.refresh_token || null,
          isActive: true,
          updatedAt: new Date(),
        },
      });

      // For success case — include the created DB record in the popup payload so the frontend can update immediately
      const successPayload = { name: userInfo.name, email: userInfo.email, paypalId: paypalId, wallet: linkedWallet };
      return res.send(createPopupPostMessageResponse('PAYPAL_OAUTH_SUCCESS', successPayload, `${process.env.FRONTEND_URL}/paypal/callback?success=true&name=${encodeURIComponent(userInfo.name)}&email=${encodeURIComponent(userInfo.email)}&paypalId=${encodeURIComponent(paypalId)}`));
    } catch (dbErr) {
      console.error('❌ Failed to create connectedWallets record:', dbErr.stack || dbErr);
      return res.send(createPopupPostMessageResponse('PAYPAL_OAUTH_ERROR', { error: 'DB create failed', reason: dbErr.message || String(dbErr) }, `${process.env.FRONTEND_URL}/paypal/callback?success=false&error=${encodeURIComponent('DB create failed')}`));
    }
  } catch (err) {
    // Top-level error handler: log and return a popup-friendly error so users see a message instead of an empty 500 page
    console.error('❌ Unexpected error in payPalCallback:', err.stack || err);
    const message = (err && err.message) ? err.message : 'Internal server error during PayPal callback';
    return res.status(500).send(createPopupPostMessageResponse('PAYPAL_OAUTH_ERROR', { error: 'Internal server error', reason: message }, `${process.env.FRONTEND_URL}/paypal/callback?success=false&error=${encodeURIComponent(message)}`));
  }
};

exports.payPalCallbackAuthorize = async (req, res) => {
  try {
    // CRITICAL: Log everything in the request query for debugging
    console.log("PayPal Callback Authorize Received. Full Query:", req.query);
    console.log("PayPal Callback Authorize Received. Full URL:", req.url);
    console.log("PayPal Callback Authorize Received. Method:", req.method);
    
    const { code, state, error, error_description } = req.query;
    
    // Check if PayPal sent an error instead of a code
    if (error) {
      console.error("PayPal returned an error in authorize callback:", error, error_description);
      return res.status(400).json({
        error: `PayPal error: ${error}`,
        description: error_description,
        status_code: 400,
      });
    }

    if (!state) {
      console.error("Error: State parameter missing in authorize callback.");
      console.log("Available query parameters:", Object.keys(req.query));
      return res.status(400).json({
        error: 'State parameter missing',
        status_code: 400,
        received_params: Object.keys(req.query)
      });
    }
    
    console.log("Authorization Code received in authorize callback:", code);

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

    // Return PayPal authorization response
    return res.status(201).json({
      message: 'PayPal authorization processed',
      data: response,
      status_code: 201,
    });
  } catch (err) {
    console.error('PayPal authorize callback error:', err);
    return res.status(500).json({
      error: 'Payment authorization failed',
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
      paymentMethodNonce, // Changed from paymentToken
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
        paymentMethodNonce, // Changed from paymentToken
        customerId: userId,
        connectedWalletId,
        useQosyneBalance,
        // Pass the recipient data so each gateway can handle it properly
      });
    // console.log('response', response);

    // Record a COMPLETED transaction
    console.log('🔍 Creating transaction for userId:', userId);
    console.log('🔍 Transaction data:', { userId, amount: payedAmount, connectedWalletId });
    
    // VALIDATE: Ensure the connected wallet belongs to this user
    if (connectedWalletId) {
      const walletOwner = await prisma.connectedWallets.findFirst({
        where: { 
          id: parseInt(connectedWalletId),
          userId: userId  // Must belong to the same user
        }
      });
      
      if (!walletOwner) {
        console.error('❌ SECURITY VIOLATION: User', userId, 'trying to use wallet', connectedWalletId, 'that does not belong to them');
        return res.status(403).json({
          error: 'Unauthorized wallet access',
          status_code: 403
        });
      }
    }
    
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
      },
    });

    // Collect admin fee asynchronously
    setImmediate(async () => {
      try {
        await feeCollectionService.collectAdminFee(newTransaction);
      } catch (error) {
        console.error(`Fee collection failed for transaction ${newTransaction.id}:`, error);
      }
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
        userId: userId, // Direct field assignment
        provider: paymentMethod.toUpperCase(),
        customerId: customerId ?? null,
        walletId: attachedPaymentMethodId,
        accountEmail: customerDetails?.email ?? 'dummy@gmail.com',
        fullName: customerDetails?.name,
        isActive: true,
        currency: customerDetails?.currency ?? 'USD',
        updatedAt: new Date(),
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
    console.log('🔍 paymentController.getTransactions called for userId:', userId);

    // Fetch all columns, plus related wallet/connectedWallet/sender - STRICT USER FILTERING
  const transactions = await prisma.transactions.findMany({
      where: { 
        userId: {
          equals: userId  // Explicit equals for strict matching
        }
      },
      include: {
        Wallet: true,
        connectedWallets: true,
        users: true, // basic user info
      },
    });

    console.log(`🔍 paymentController found ${transactions.length} transactions for userId ${userId}`);
    console.log('🔍 Transaction userIds:', transactions.map(t => t.userId));

    // Set cache-control headers to prevent caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-User-ID': userId,
      'X-Timestamp': new Date().toISOString()
    });

    // Format provider names in transactions
    const formattedTransactions = transactions.map(transaction => {
      // Format the direct provider name if present
      const formattedTransaction = {
        ...transaction,
        provider: transaction.provider ? formatProviderName(transaction.provider) : undefined
      };

      // Format provider in connectedWallet if present
      if (formattedTransaction.connectedWallets && formattedTransaction.connectedWallets.provider) {
        formattedTransaction.connectedWallets = {
          ...formattedTransaction.connectedWallets,
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
      const completedTransaction = await prisma.transactions.update({
        where: { paymentId: event.resource.id },
        data: { 
          status: 'COMPLETED'
        },
      });
      
      // Collect admin fee asynchronously
      setImmediate(async () => {
        try {
          await feeCollectionService.collectAdminFee(completedTransaction);
        } catch (error) {
          console.error(`Fee collection failed for PayPal webhook transaction ${completedTransaction.id}:`, error);
        }
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
    console.log('📝 Client token request received');
    console.log('Query params:', req.query);
    console.log('User:', req.user ? `User ID: ${req.user.userId}` : 'No user in request');

    const { customerId } = req.query;
    let clientToken = null;
    let tokenSource = 'real';

    try {
      // First, try to use real Braintree credentials
      const tokenGenerator = new BraintreeClientTokenGenerator();
      
      // Build the options
      const options = {};
      if (customerId) {
        options.customerId = customerId;
        console.log('🆔 Using custom customer ID:', customerId);
      }

      // Generate the client token
      clientToken = await tokenGenerator.generateClientToken(options);
      console.log('✅ Generated REAL Braintree client token successfully');

    } catch (braintreeError) {
      console.log('⚠️ Real Braintree authentication failed, using mock token for development');
      console.log('Braintree error:', braintreeError.message);
      
      // Fallback to mock token for development/testing
      clientToken = MockBraintreeClientToken.generate();
      tokenSource = 'mock';
      console.log('✅ Generated MOCK Braintree client token for development');
    }

    console.log('Token length:', clientToken.length);
    console.log('Token source:', tokenSource);
    
    res.json({ 
      clientToken,
      success: true,
      environment: process.env.BT_ENVIRONMENT || 'sandbox',
      merchantId: process.env.BT_MERCHANT_ID,
      tokenSource: tokenSource,
      message: tokenSource === 'mock' ? 'Using mock token for development - enable real Braintree credentials for production' : 'Using real Braintree credentials'
    });
  } catch (error) {
    console.error('❌ Error generating any client token:', error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({ 
      error: 'Failed to generate client token',
      details: error.message,
      environment: process.env.BT_ENVIRONMENT || 'sandbox'
    });
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

// Get Wise Profiles
exports.getWiseProfiles = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log(`Fetching Wise profiles for user: ${userId}`);

    const wiseGateway = new WiseGateway();
    const profilesResult = await wiseGateway.getProfiles();

    return res.status(200).json({
      message: profilesResult.summary,
      data: {
        profiles: profilesResult.data,
        count: profilesResult.count
      },
      status_code: 200,
    });
  } catch (error) {
    console.error('Error fetching Wise profiles:', error);
    return res.status(500).json({ 
      error: error.message,
      status_code: 500 
    });
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

    // Calculate average amount
    const averageAmount = totalTransactions > 0 ? (totalAmountResult._sum.amount || 0) / totalTransactions : 0;

    // Transform data to match frontend expectations
    const byStatus = statusStats.map(stat => ({
      status: stat.status,
      count: stat._count.id,
      totalAmount: 0 // We don't have amount by status in current query
    }));

    const byProvider = providerStats.map(stat => ({
      provider: stat.provider,
      count: stat._count.id,
      totalAmount: 0 // We don't have amount by provider in current query
    }));

    const byType = typeStats.map(stat => ({
      type: stat.type,
      count: stat._count.id,
      totalAmount: 0 // We don't have amount by type in current query
    }));

    res.status(200).json({
      message: 'Transaction statistics fetched successfully',
      data: {
        total: {
          count: totalTransactions,
          totalAmount: totalAmountResult._sum.amount || 0,
          averageAmount: averageAmount
        },
        recentTransactions: recentTransactionsCount,
        totalFees: totalFeesResult._sum.fees || 0,
        byStatus: byStatus,
        byProvider: byProvider,
        byType: byType,
        // Legacy fields for backward compatibility
        totalTransactions,
        totalAmount: totalAmountResult._sum.amount || 0,
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