const axios = require("axios");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
// Lazy require for Braintree token generation (do not crash if env not configured)
let BraintreeClientTokenGenerator;
try {
  // Require lazily so environments without braintree libs won't fail on service load
  BraintreeClientTokenGenerator = require('../utils/braintreeClientTokenGenerator').BraintreeClientTokenGenerator;
} catch (e) {
  // It's ok if this isn't available in some environments (tests/dev without credentials)
  BraintreeClientTokenGenerator = null;
}

class WalletService {
  constructor() {
    this.providers = {
      PAYPAL: {
        baseUrl: process.env.PAYPAL_BASE_URL || "https://api.paypal.com",
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        capabilities: ["send", "receive", "balance_check"],
      },
      GOOGLEPAY: {
        baseUrl: "https://pay.google.com/gp/p",
        oauthUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        apiUrl: "https://www.googleapis.com/wallet/objects/v1",
        clientId:
          process.env.GOOGLE_PAY_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
        clientSecret:
          process.env.GOOGLE_PAY_CLIENT_SECRET ||
          process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_PAY_REDIRECT_URI,
        scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
        capabilities: ["send", "receive", "bank_account"],
      },
      WISE: {
        baseUrl:
          process.env.WISE_ENVIRONMENT === "sandbox"
            ? "https://api.sandbox.transferwise.tech"
            : "https://api.wise.com",
        apiToken: process.env.WISE_API_TOKEN,
        profileId: process.env.WISE_PROFILE_ID,
        walletAccountId: process.env.WISE_WALLET_ACCOUNT_ID,
        environment: process.env.WISE_ENVIRONMENT || "sandbox",
        capabilities: ["send", "receive", "balance_check", "multi_currency"],
      },
      SQUARE: {
        baseUrl:
          process.env.SQUARE_ENVIRONMENT === "production"
            ? "https://connect.squareup.com"
            : "https://connect.squareupsandbox.com",
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
        applicationId: process.env.SQUARE_APPLICATION_ID,
        locationId: process.env.SQUARE_LOCATION_ID,
        environment: process.env.SQUARE_ENVIRONMENT || "sandbox",
        capabilities: ["send", "receive", "balance_check"],
      },
      VENMO: {
        baseUrl:
          process.env.PAYPAL_TOKEN_URL?.replace("/v1/oauth2/token", "/v1") ||
          "https://api-m.sandbox.paypal.com/v1",
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        capabilities: ["send", "receive"],
      },
      APPLEPAY: {
        oauthUrl: "https://appleid.apple.com/auth/authorize",
        tokenUrl: "https://appleid.apple.com/auth/token",
        clientId: process.env.APPLE_CLIENT_ID || "com.qosyne.service",
        teamId: process.env.APPLE_TEAM_ID || "V5TSZ86H9M",
        keyId: process.env.APPLE_KEY_ID || "L872V54RSB",
        privateKey:
          process.env.APPLE_PRIVATE_KEY ||
          process.env.APPLE_PRIVATE_KEY_P8 ||
          null,
        redirectUri:
          process.env.APPLE_REDIRECT_URI ||
          "https://qosyncefrontend.vercel.app/apple-pay/callback",
        scopes: ["name", "email"],
        merchantId: process.env.APPLE_PAY_MERCHANT_ID,
        merchantDomain: process.env.APPLE_PAY_MERCHANT_DOMAIN,
        certificatePath: process.env.APPLE_PAY_CERTIFICATE_PATH,
        keyPath: process.env.APPLE_PAY_KEY_PATH,
        environment: process.env.APPLE_PAY_ENVIRONMENT || "sandbox",
        capabilities: ["send", "receive", "contactless"],
      },
    };
  }

  async getUserWallets(userId) {
    try {
      const wallets = await prisma.connectedWallets.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: "desc" },
      });
      // Providers for which a Braintree client token may be useful on the client
      const needClientToken = new Set(["VENMO", "PAYPAL", "GOOGLEPAY", "APPLEPAY","WISE","SQUARE"]);

      // Initialize token generator lazily and safely
      let tokenGenerator = null;
      if (BraintreeClientTokenGenerator) {
        try {
          tokenGenerator = new BraintreeClientTokenGenerator();
        } catch (initErr) {
          console.warn('Braintree client token generator initialization failed:', initErr.message);
          tokenGenerator = null;
        }
      }

      // Attach clientToken only to wallets where it makes sense. Failures shouldn't block the response.
      const result = await Promise.all(
        wallets.map(async (wallet) => {
          let clientToken = null;
          if (tokenGenerator && wallet && needClientToken.has((wallet.provider || '').toUpperCase())) {
            try {
              const options = {};
              // Prefer passing a customerId or payment method token if available to scope the token
              if (wallet.customerId) options.customerId = wallet.customerId;
              if (wallet.paymentMethodToken) options.paymentMethodToken = wallet.paymentMethodToken;
              clientToken = await tokenGenerator.generateClientToken(options);
            } catch (tokenErr) {
              console.warn(`Failed to generate client token for wallet ${wallet.id}:`, tokenErr.message || tokenErr);
              clientToken = null;
            }
          }

          return {
            id: wallet.id,
            provider: wallet.provider,
            walletId: wallet.walletId,
            accountEmail: wallet.accountEmail,
            fullName: wallet.fullName,
            username: wallet.username,
            balance: wallet.balance,
            currency: wallet.currency,
            isActive: wallet.isActive,
            lastSync: wallet.lastSync,
            capabilities: wallet.capabilities ? JSON.parse(wallet.capabilities) : [],
            createdAt: wallet.createdAt,
            // Include clientToken when available (null otherwise)
            clientToken,
          };
        })
      );

      // Deduplicate wallets by provider: keep the most-recent (query ordered desc)
      const byProvider = {};
      for (const w of result) {
        const prov = (w.provider || '').toUpperCase();
        if (!byProvider[prov]) byProvider[prov] = [];
        byProvider[prov].push(w);
      }

      const deduped = [];
      for (const prov of Object.keys(byProvider)) {
        const list = byProvider[prov];
        if (!list || list.length === 0) continue;
        // list is already ordered by createdAt desc because original query used that order
        const primary = list[0];
        if (list.length > 1) {
          // expose duplicateCount on primary so frontend can prompt user to disconnect others
          primary.duplicateCount = list.length;
        } else {
          primary.duplicateCount = 0;
        }
        deduped.push(primary);
      }

      // Preserve original ordering by createdAt desc across providers
      deduped.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return deduped;
    } catch (error) {
      console.error("Error fetching user wallets:", error);
      throw error;
    }
  }

  /**
   * Connect a wallet for a user.
   *
   * Enforced invariant:
   * - A user may have only one active connection per provider at a time.
   *
   * Behavior:
   * - If the same external walletId is reconnected, update the existing record.
   * - If a different external walletId for the same provider is attempted,
   *   the method throws an Error with message containing 'already connected'
   *   and sets err.code = 'WALLET_ALREADY_CONNECTED' and attaches err.existing
   *   (summary of the currently connected wallet). The controller is expected
   *   to surface this to the user as "Already connected" and offer a disconnect action.
   */
  async connectWallet(userId, walletData) {
    try {
      const { authCode, accessToken, connectionType, identifier, bankDetails } =
        walletData;
      // Normalize and validate inputs
      const numericUserId = Number(userId);
      if (!numericUserId || Number.isNaN(numericUserId)) {
        throw new Error("Invalid authenticated user id");
      }

      // Ensure user exists to satisfy FK constraint on connectedWallets.userId
      const userExists = await prisma.users.findUnique({
        where: { id: numericUserId },
      });
      if (!userExists) {
        const notFoundError = new Error("User not found");
        notFoundError.code = "USER_NOT_FOUND";
        throw notFoundError;
      }

      const provider = (walletData.provider || "").toUpperCase();

      if (!this.providers[provider]) {
        throw new Error(`Unsupported wallet provider: ${provider}`);
      }

      // Check if user already has an active wallet for this provider
      const existingWalletForUser = await prisma.connectedWallets.findFirst({
        where: { userId: numericUserId, provider: provider, isActive: true },
      });

      // Perform the provider-specific connect logic to get connectionResult
      let connectionResult;
      switch (provider) {
        case "PAYPAL":
          connectionResult = await this.connectPayPal(
            userId,
            JSON.stringify(walletData),
          );
          break;
        case "GOOGLEPAY":
          connectionResult = await this.connectGooglePay(
            userId,
            authCode,
            walletData,
          );
          break;
        case "WISE":
          connectionResult = await this.connectWise(userId, authCode);
          break;
        case "SQUARE":
          connectionResult = await this.connectSquare(userId, authCode);
          break;
        case "VENMO":
          connectionResult = await this.connectVenmo(userId, authCode);
          break;
        case "APPLEPAY":
          connectionResult = authCode
            ? await this.connectApplePay(userId, authCode)
            : await this.connectApplePay(
                userId,
                JSON.stringify({ identifier, bankDetails }),
              );
          break;
        default:
          throw new Error(`Connection method not implemented for ${provider}`);
      }

      // Validate connectionResult contains walletId
      if (!connectionResult || !connectionResult.walletId) {
        throw new Error("Connection failed: missing wallet identifier");
      }

      // Enforce single active wallet per provider:
      // - If an active wallet exists for this user/provider:
      //   - If it's the same external walletId => update the record (refresh tokens/fields)
      //   - If it's a different external walletId => throw 'WALLET_ALREADY_CONNECTED' and include existing wallet info
      if (existingWalletForUser) {
        // If it's the same external walletId, update fields and return
        if (existingWalletForUser.walletId === connectionResult.walletId) {
          const updatedWallet = await prisma.connectedWallets.update({
            where: { id: existingWalletForUser.id },
            data: {
              customerId: connectionResult.customerId,
              accountEmail: connectionResult.accountEmail,
              fullName: connectionResult.fullName,
              username: connectionResult.username,
              accessToken: connectionResult.accessToken,
              refreshToken: connectionResult.refreshToken,
              paymentMethodToken: connectionResult.paymentMethodToken,
              capabilities: JSON.stringify(
                this.providers[provider].capabilities,
              ),
              currency: connectionResult.currency || "USD",
              lastSync: new Date(),
              isActive: true,
              updatedAt: new Date(),
            },
          });

          return { ...updatedWallet, id: updatedWallet.id, connectedWalletId: updatedWallet.id };
        }

        // Different external walletId -> prevent automatic replacement. Signal to client.
        const err = new Error(
          "already connected: a different account for this provider is already active",
        );
        err.code = "WALLET_ALREADY_CONNECTED";
        // Attach minimal existing wallet info so frontend can show "Already connected" and offer disconnect
        err.existing = {
          id: existingWalletForUser.id,
          provider: existingWalletForUser.provider,
          walletId: existingWalletForUser.walletId,
          accountEmail: existingWalletForUser.accountEmail,
          fullName: existingWalletForUser.fullName,
          createdAt: existingWalletForUser.createdAt,
        };
        throw err;
      }

      // No existing wallet for user/provider: create a new record
      const wallet = await prisma.connectedWallets.create({
        data: {
          userId: numericUserId,
          provider,
          walletId: connectionResult.walletId,
          customerId: connectionResult.customerId,
          accountEmail: connectionResult.accountEmail,
          fullName: connectionResult.fullName,
          username: connectionResult.username,
          accessToken: connectionResult.accessToken,
          refreshToken: connectionResult.refreshToken,
          paymentMethodToken: connectionResult.paymentMethodToken,
          capabilities: JSON.stringify(this.providers[provider].capabilities),
          currency: connectionResult.currency || "USD",
          lastSync: new Date(),
          updatedAt: new Date(),
          isActive: true,
        },
      });

      console.log("Wallet connected successfully", {
        userId: numericUserId,
        provider,
        walletId: wallet.id,
      });
      return { ...wallet, id: wallet.id, connectedWalletId: wallet.id };
    } catch (error) {
      console.error("Error connecting wallet:", error);
      if (
        (error && error.code === "USER_NOT_FOUND") ||
        (error.message || "").includes("Foreign key") ||
        (error.message || "").includes('No "users" record')
      ) {
        const friendly = new Error(
          "Authenticated user not found in this environment",
        );
        friendly.code = "USER_NOT_FOUND";
        throw friendly;
      }
      throw error;
    }
  }

  async connectPayPal(userId, credentials) {
    try {
      console.log("💙 Connecting PayPal wallet for user:", userId);
      console.log("💙 Credentials received type:", typeof credentials);

      // Parse credentials - can be OAuth code OR Braintree payment nonce
      let connectionData;
      try {
        connectionData = JSON.parse(credentials);
      } catch (e) {
        // If not JSON, treat as OAuth authorization code
        connectionData = { authCode: credentials };
      }

      console.log("💙 Connection data:", connectionData);

      // Check if this is a Braintree PayPal connection (has paymentMethodNonce)
      if (
        connectionData.paymentMethodNonce &&
        connectionData.connectionType === "BRAINTREE"
      ) {
        console.log("💙 Using Braintree PayPal integration");
        return await this.connectPayPalBraintree(userId, connectionData);
      }

      // Otherwise, use PayPal OAuth flow
      console.log("💙 Using PayPal OAuth flow");
      const authCode = connectionData.authCode;

      // Check if we have valid PayPal credentials
      if (
        !this.providers.PAYPAL.clientId ||
        !this.providers.PAYPAL.clientSecret
      ) {
        throw new Error("PayPal API credentials not configured");
      }

      // Exchange auth code for access token
      const tokenResponse = await axios.post(
        process.env.PAYPAL_TOKEN_URL,
        "grant_type=authorization_code&code=" + authCode,
        {
          headers: {
            Accept: "application/json",
            "Accept-Language": "en_US",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          auth: {
            username: this.providers.PAYPAL.clientId,
            password: this.providers.PAYPAL.clientSecret,
          },
        },
      );

      const { access_token, refresh_token } = tokenResponse.data;

      // Get user profile information
      const profileResponse = await axios.get(
        `${this.providers.PAYPAL.baseUrl}/v1/identity/oauth2/userinfo?schema=paypalv1.1`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const profile = profileResponse.data;

      return {
        walletId: `paypal_${profile.user_id || userId}_${Date.now()}`,
        accountEmail: profile.email || `user${userId}@paypal.com`,
        fullName:
          profile.name ||
          `${profile.given_name || "PayPal"} ${profile.family_name || "User"}`,
        username: profile.email,
        accessToken: access_token,
        refreshToken: refresh_token,
        currency: "USD",
      };
    } catch (error) {
      console.error(
        "💙 PayPal connection error:",
        error.response?.data || error.message,
      );

      // Fallback to demo mode if OAuth fails
      if (error.response?.status === 400) {
        console.log("💙 Falling back to PayPal demo mode");
        return {
          walletId: `paypal_demo_${userId}_${Date.now()}`,
          accountEmail: `demo${userId}@paypal.com`,
          fullName: `PayPal Demo User ${userId}`,
          accessToken: `demo_access_token_${Date.now()}`,
          refreshToken: `demo_refresh_token_${Date.now()}`,
          currency: "USD",
        };
      }

      throw new Error(`PayPal connection failed: ${error.message}`);
    }
  }

  async connectPayPalBraintree(userId, connectionData) {
    try {
      console.log("💙 Connecting PayPal via Braintree for user:", userId);

      const { paymentMethodNonce, paypalDetails } = connectionData;

      if (!paymentMethodNonce) {
        throw new Error("PayPal payment method nonce is required");
      }

      if (
        !process.env.BT_MERCHANT_ID ||
        !process.env.BT_PUBLIC_KEY ||
        !process.env.BT_PRIVATE_KEY
      ) {
        throw new Error(
          "Braintree credentials are required for PayPal integration",
        );
      }

      const braintree = require("braintree");
      const gateway = new braintree.BraintreeGateway({
        environment: braintree.Environment.Sandbox,
        merchantId: process.env.BT_MERCHANT_ID,
        publicKey: process.env.BT_PUBLIC_KEY,
        privateKey: process.env.BT_PRIVATE_KEY,
      });

      let customer;
      const customerData = {
        firstName: paypalDetails?.firstName || "PayPal",
        lastName: paypalDetails?.lastName || "User",
        email: paypalDetails?.email || `user${userId}@paypal.com`,
      };

      try {
        const createResult = await gateway.customer.create(customerData);
        if (!createResult.success) {
          throw new Error(
            `Failed to create Braintree customer: ${createResult.message}`,
          );
        }
        customer = createResult.customer;
        console.log("✅ Braintree customer created:", customer.id);
      } catch (err) {
        throw new Error(`Braintree customer creation failed: ${err.message}`);
      }

      try {
        const paymentMethodResult = await gateway.paymentMethod.create({
          customerId: customer.id,
          paymentMethodNonce: paymentMethodNonce,
          options: {
            makeDefault: true,
            verifyCard: false,
          },
        });

        if (!paymentMethodResult.success) {
          throw new Error(
            `Failed to create payment method: ${paymentMethodResult.message}`,
          );
        }

        const paymentMethod = paymentMethodResult.paymentMethod;
        console.log("✅ PayPal payment method created:", paymentMethod.token);

        return {
          walletId: `paypal_bt_${customer.id}`,
          accountEmail: paypalDetails?.email || customer.email,
          fullName: `${customer.firstName} ${customer.lastName}`,
          username: paypalDetails?.email || customer.email,
          accessToken: customer.id,
          paymentMethodToken: paymentMethod.token,
          refreshToken: paypalDetails?.billingAgreementId || null,
          currency: "USD",
          braintreeCustomerId: customer.id,
          payerId: paypalDetails?.payerId,
        };
      } catch (err) {
        throw new Error(`Payment method creation failed: ${err.message}`);
      }
    } catch (error) {
      console.error("❌ Braintree PayPal error:", error);
      throw new Error(`Braintree PayPal connection failed: ${error.message}`);
    }
  }

  async connectGooglePay(userId, credentials, walletData = null) {
    try {
      console.log("Connecting Google Pay via OAuth + Braintree integration");
      console.log(
        "📧 Received credentials:",
        typeof credentials === "string"
          ? credentials.substring(0, 50) + "..."
          : credentials,
      );

      let userEmail, firstName, lastName, fullName, googleAccessToken;

      if (
        typeof credentials === "string" &&
        credentials.length > 20 &&
        !credentials.startsWith("{")
      ) {
        console.log("✅ OAuth flow detected - exchanging code for tokens");

        const tokenResponse = await axios.post(
          this.providers.GOOGLEPAY.tokenUrl,
          null,
          {
            params: {
              code: credentials,
              client_id: this.providers.GOOGLEPAY.clientId,
              client_secret: this.providers.GOOGLEPAY.clientSecret,
              redirect_uri: this.providers.GOOGLEPAY.redirectUri,
              grant_type: "authorization_code",
            },
          },
        );

        googleAccessToken = tokenResponse.data.access_token;
        console.log("✅ Got Google access token");

        const userInfoResponse = await axios.get(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: {
              Authorization: `Bearer ${googleAccessToken}`,
            },
          },
        );

        const userInfo = userInfoResponse.data;
        console.log("✅ Got Google user info:", userInfo.email);

        userEmail = userInfo.email;
        firstName = userInfo.given_name || "Google";
        lastName = userInfo.family_name || "Pay";
        fullName = userInfo.name || `${firstName} ${lastName}`;
      } else {
        const isManualConnection =
          walletData?.connectionType === "MANUAL" && walletData?.identifier;

        if (isManualConnection) {
          userEmail = walletData.identifier;
          fullName =
            walletData.bankDetails?.accountHolderName || "Google Pay User";

          const nameParts = fullName.trim().split(/\s+/);
          firstName = nameParts[0] || "Google";
          lastName = nameParts.slice(1).join(" ") || "Pay";

          console.log(
            "ℹ️ Manual connection - using provided email:",
            userEmail,
          );
        } else {
          let connectionData;
          try {
            connectionData = JSON.parse(credentials);
          } catch (e) {
            connectionData = { paymentMethodNonce: credentials };
          }

          const { customerInfo } = connectionData;
          userEmail =
            customerInfo?.email || `user${userId}@googlepay.example.com`;
          firstName = customerInfo?.firstName || "GooglePay";
          lastName = customerInfo?.lastName || "User";
          fullName = `${firstName} ${lastName}`;
        }
      }

      if (
        !process.env.BT_MERCHANT_ID ||
        !process.env.BT_PUBLIC_KEY ||
        !process.env.BT_PRIVATE_KEY
      ) {
        throw new Error(
          "Braintree sandbox credentials are required for Google Pay integration. Please configure BT_MERCHANT_ID, BT_PUBLIC_KEY, and BT_PRIVATE_KEY in your environment variables.",
        );
      }

      const braintree = require("braintree");
      const gateway = new braintree.BraintreeGateway({
        environment: braintree.Environment.Sandbox,
        merchantId: process.env.BT_MERCHANT_ID,
        publicKey: process.env.BT_PUBLIC_KEY,
        privateKey: process.env.BT_PRIVATE_KEY,
      });

      const customerData = {
        firstName: firstName,
        lastName: lastName,
        email: userEmail,
      };

      console.log(
        "📝 Creating Braintree customer with real Google data:",
        customerData,
      );

      let customer;
      try {
        const createResult = await gateway.customer.create(customerData);
        if (!createResult.success) {
          throw new Error(
            `Failed to create Braintree customer: ${createResult.message}`,
          );
        }
        customer = createResult.customer;
        console.log(
          "✅ Braintree customer created:",
          customer.id,
          "-",
          customer.email,
        );
      } catch (error) {
        console.error("Braintree customer creation failed:", error);
        throw new Error(`Google Pay connection failed: ${error.message}`);
      }

      return {
        walletId: `googlepay_${userId}_${Date.now()}`,
        accountEmail: customer.email,
        fullName: `${customer.firstName} ${customer.lastName}`.trim(),
        username: customer.email,
        accessToken: googleAccessToken || customer.id,
        refreshToken: null,
        currency: "USD",
        balance: 0,
        braintreeCustomerId: customer.id,
        paymentMethodToken: null,
      };
    } catch (error) {
      console.error("Google Pay connection error:", error);
      throw new Error(`Google Pay connection failed: ${error.message}`);
    }
  }

  async connectWise(userId, credentials) {
    try {
      let connectionData;
      try {
        connectionData = JSON.parse(credentials);
      } catch (e) {
        throw new Error(
          "Invalid credentials format. Expected JSON with connection data",
        );
      }

      const { swift_number, country } = connectionData;
      if (!swift_number) {
        throw new Error("Swift number is required");
      }

      if (!this.providers.WISE.apiToken || !this.providers.WISE.profileId) {
        throw new Error("Wise API credentials not configured.");
      }

      try {
        const profileResponse = await axios.get(
          `${this.providers.WISE.baseUrl}/v1/profiles/${this.providers.WISE.profileId}`,
          {
            headers: {
              Authorization: `Bearer ${this.providers.WISE.apiToken}`,
              "Content-Type": "application/json",
            },
          },
        );

        const profile = profileResponse.data;

        const balancesResponse = await axios.get(
          `${this.providers.WISE.baseUrl}/v1/profiles/${this.providers.WISE.profileId}/balances`,
          {
            headers: {
              Authorization: `Bearer ${this.providers.WISE.apiToken}`,
              "Content-Type": "application/json",
            },
          },
        );

        const balances = balancesResponse.data;
        const primaryBalance =
          balances.find(
            (b) =>
              b.currency ===
              (country === "GB" ? "GBP" : country === "EU" ? "EUR" : "USD"),
          ) || balances[0];

        return {
          walletId: `wise_${userId}_${profile.id}`,
          accountEmail: profile.details?.email || `${swift_number}@wise.com`,
          fullName: `${profile.details?.firstName || "Wise"} ${profile.details?.lastName || "User"}`,
          username: swift_number,
          accessToken: this.providers.WISE.apiToken,
          clientToken: this.providers.WISE.apiToken, // For Flutter integration
          refreshToken: null,
          currency: primaryBalance?.currency || "USD",
          balance: primaryBalance?.amount?.value || 0,
          profileId: profile.id,
        };
      } catch (apiError) {
        const wiseUser = {
          id: this.providers.WISE.profileId,
          email: `${swift_number}@wise.com`,
          firstName: swift_number,
          lastName: "User",
        };

        return {
          walletId: `wise_${userId}_${wiseUser.id}`,
          accountEmail: wiseUser.email,
          fullName: `${wiseUser.firstName} ${wiseUser.lastName}`,
          username: swift_number,
          accessToken: this.providers.WISE.apiToken,
          clientToken: this.providers.WISE.apiToken, // For Flutter integration
          refreshToken: null,
          currency: country === "GB" ? "GBP" : country === "EU" ? "EUR" : "USD",
          balance: 0,
          profileId: wiseUser.id,
        };
      }
    } catch (error) {
      throw new Error(`Wise connection failed: ${error.message}`);
    }
  }

  async connectSquare(userId, credentials) {
    try {
      if (
        !this.providers.SQUARE.accessToken ||
        !this.providers.SQUARE.applicationId
      ) {
        throw new Error("Square API credentials not configured.");
      }

      let connectionData;
      try {
        connectionData = JSON.parse(credentials);
      } catch (e) {
        connectionData = { identifier: credentials };
      }

      const { name, swift } = connectionData;
      if (!name || !swift) {
        throw new Error("Square name and swift are required");
      }

      try {
        const merchantResponse = await axios.get(
          `${this.providers.SQUARE.baseUrl}/v2/merchants`,
          {
            headers: {
              Authorization: `Bearer ${this.providers.SQUARE.accessToken}`,
              "Content-Type": "application/json",
              "Square-Version": "2023-10-18",
            },
          },
        );

        const merchant = merchantResponse.data.merchant[0];

        const locationResponse = await axios.get(
          `${this.providers.SQUARE.baseUrl}/v2/locations/${this.providers.SQUARE.locationId}`,
          {
            headers: {
              Authorization: `Bearer ${this.providers.SQUARE.accessToken}`,
              "Content-Type": "application/json",
              "Square-Version": "2023-10-18",
            },
          },
        );

        const location = locationResponse.data.location;

        return {
          walletId: `square_${merchant.id}`,
          accountEmail: `${swift.toLowerCase()}@square.com`,
          fullName: name,
          username: name,
          accessToken: this.providers.SQUARE.accessToken,
          refreshToken: null,
          currency: location.currency || "USD",
          locationId: this.providers.SQUARE.locationId,
        };
      } catch (apiError) {
        const merchantId = this.providers.SQUARE.applicationId.replace(
          "sq0idp-",
          "",
        );

        return {
          walletId: `square_${merchantId}`,
          accountEmail: `${swift.toLowerCase()}@square.com`,
          fullName: name,
          username: name,
          accessToken: this.providers.SQUARE.accessToken,
          refreshToken: null,
          currency: "USD",
          locationId: this.providers.SQUARE.locationId,
        };
      }
    } catch (error) {
      throw new Error(`Square connection failed: ${error.message}`);
    }
  }

  async connectApplePay(userId, credentials) {
    try {
      console.log("🍎 Connecting Apple Pay wallet for user:", userId);
      console.log("🍎 Credentials received (raw):", credentials);

      let connectionData = {};
      if (!credentials) connectionData = {};

      if (typeof credentials === "string") {
        try {
          connectionData = JSON.parse(credentials);
        } catch (e) {
          connectionData = { authCode: credentials };
        }
      } else if (typeof credentials === "object") {
        connectionData = credentials || {};
      }

      const authCodeValue =
        connectionData.authCode ||
        connectionData.code ||
        connectionData.id_token ||
        null;

      if (authCodeValue) {
        console.log(
          "🍎 Using OAuth flow for Apple Sign-In (authCode/id_token present)",
        );
        return await this.connectApplePayOAuth(userId, authCodeValue);
      }

      const { identifier, deviceId, bankDetails } = connectionData;
      if (!identifier) {
        throw new Error("Apple Pay identifier is required");
      }

      const identifierStr = String(identifier);
      console.log("🍎 Connection data:", {
        identifier: identifierStr,
        deviceId,
        bankDetails,
      });

      const applePayUser = {
        id: `applepay_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        email: identifierStr.includes("@")
          ? identifierStr
          : `${identifierStr}@icloud.com`,
        firstName:
          bankDetails?.accountHolderName?.split(" ")[0] ||
          identifierStr.split("@")[0] ||
          "Apple",
        lastName:
          bankDetails?.accountHolderName?.split(" ").slice(1).join(" ") ||
          "Pay User",
      };

      const walletData = {
        walletId: `applepay_${applePayUser.id}`,
        accountEmail: applePayUser.email,
        fullName: `${applePayUser.firstName} ${applePayUser.lastName}`,
        username: identifierStr,
        accessToken: `applepay_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        refreshToken: null,
        currency: "USD",
        deviceId: deviceId || `device_${Date.now()}`,
      };

      console.log("✅ Apple Pay wallet connection created:", walletData);
      return walletData;
    } catch (error) {
      console.error("❌ Apple Pay connection error:", error);
      throw new Error(`Apple Pay connection failed: ${error.message}`);
    }
  }

  async connectApplePayOAuth(userId, authCode) {
    try {
      console.log("🍎 Processing Apple Sign-In OAuth for user:", userId);

      let userInfo;

      if (authCode.includes(".")) {
        console.log("🍎 Received ID token, attempting to decode...");
        try {
          const parts = authCode.split(".");
          const payloadRaw = parts[1] || "";
          let b64 = payloadRaw.replace(/-/g, "+").replace(/_/g, "/");
          while (b64.length % 4) b64 += "=";
          const decoded = Buffer.from(b64, "base64").toString();
          const payload = JSON.parse(decoded);
          userInfo = {
            sub: payload.sub,
            email: payload.email,
            email_verified: payload.email_verified,
            is_private_email: payload.is_private_email,
          };
        } catch (err) {
          console.warn(
            "🍎 Could not decode ID token, falling back to auth-code handling:",
            err.message,
          );
        }
      }

      if (!userInfo) {
        console.log(
          "🍎 Received authorization code or undecodable token — using mock user (exchange not implemented)",
        );
        userInfo = {
          sub: `apple_user_${Date.now()}`,
          email: `apple_user_${Math.random().toString(36).substring(7)}@icloud.com`,
          email_verified: true,
          is_private_email: false,
        };
      }

      console.log("🍎 Apple user info:", userInfo);

      const walletData = {
        walletId: `applepay_${userInfo.sub}`,
        accountEmail: userInfo.email,
        fullName: userInfo.email.split("@")[0],
        username: userInfo.email,
        accessToken: `applepay_oauth_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        refreshToken: null,
        currency: "USD",
        isPrivateEmail: userInfo.is_private_email || false,
      };

      console.log("✅ Apple Pay OAuth wallet connection created:", walletData);
      return walletData;
    } catch (error) {
      console.error("❌ Apple Pay OAuth error:", error);
      throw new Error(`Apple Pay OAuth failed: ${error.message}`);
    }
  }

  async connectVenmo(userId, credentials) {
    try {
      console.log("Connecting Venmo via Braintree integration");

      let connectionData;
      try {
        connectionData = JSON.parse(credentials);
      } catch (e) {
        connectionData = { paymentMethodNonce: credentials };
      }

      const { paymentMethodNonce, customerInfo } = connectionData;

      if (
        !process.env.BT_MERCHANT_ID ||
        !process.env.BT_PUBLIC_KEY ||
        !process.env.BT_PRIVATE_KEY
      ) {
        throw new Error(
          "Braintree sandbox credentials are required for Venmo integration. Please configure BT_MERCHANT_ID, BT_PUBLIC_KEY, and BT_PRIVATE_KEY in your environment variables.",
        );
      }

      const braintree = require("braintree");
      const gateway = new braintree.BraintreeGateway({
        environment: braintree.Environment.Sandbox,
        merchantId: process.env.BT_MERCHANT_ID,
        publicKey: process.env.BT_PUBLIC_KEY,
        privateKey: process.env.BT_PRIVATE_KEY,
      });

      let customer;
      const customerData = {
        firstName: customerInfo?.firstName || "Venmo",
        lastName: customerInfo?.lastName || "User",
        email: customerInfo?.email || `user${userId}@venmo.example.com`,
      };

      try {
        const createResult = await gateway.customer.create(customerData);
        if (!createResult.success) {
          throw new Error(
            `Failed to create Braintree customer: ${createResult.message}`,
          );
        }
        customer = createResult.customer;
      } catch (error) {
        console.error("Braintree customer creation failed:", error);
        throw new Error(`Venmo connection failed: ${error.message}`);
      }

      let paymentMethod = null;
      if (paymentMethodNonce) {
        try {
          const paymentMethodResult = await gateway.paymentMethod.create({
            customerId: customer.id,
            paymentMethodNonce: paymentMethodNonce,
            options: {
              makeDefault: true,
              verifyCard: false,
            },
          });

          if (paymentMethodResult.success) {
            paymentMethod = paymentMethodResult.paymentMethod;
          }
        } catch (error) {
          console.warn(
            "Payment method creation failed, but customer created:",
            error.message,
          );
        }
      }

      // Generate Braintree client token for Flutter integration
      let clientToken = null;
      try {
        const clientTokenResponse = await gateway.clientToken.generate({
          customerId: customer.id
        });
        clientToken = clientTokenResponse.clientToken;
        console.log('✅ Generated Braintree client token for Venmo customer');
      } catch (error) {
        console.warn('⚠️ Failed to generate client token:', error.message);
      }

      return {
        walletId: `venmo_${userId}_${customer.id}`,
        accountEmail: customer.email,
        fullName: `${customer.firstName} ${customer.lastName}`,
        username: customerInfo?.username || customer.email,
        accessToken: clientToken, // Store client token as access token for send API
        refreshToken: null,
        currency: "USD",
        balance: 0,
        customerId: customer.id, // Store Braintree customer ID
        paymentMethodToken: paymentMethod?.token || null,
      };
    } catch (error) {
      console.error("Venmo connection error:", error);
      throw new Error(`Venmo connection failed: ${error.message}`);
    }
  }

  async disconnectWallet(userId, walletId) {
    try {
      console.log("🔍 Disconnecting wallet - Input:", {
        userId,
        walletId,
        walletIdType: typeof walletId,
      });

      let wallet;
      if (!isNaN(walletId)) {
        const numericId = parseInt(walletId);
        console.log("🔍 Searching by database ID:", numericId);

        wallet = await prisma.connectedWallets.findFirst({
          where: {
            id: numericId,
            userId: parseInt(userId),
            isActive: true,
          },
        });

        console.log(
          "🔍 Search by DB ID result:",
          wallet ? "Found" : "Not found",
        );
      }

      if (!wallet) {
        console.log("🔍 Searching by external walletId:", walletId);

        wallet = await prisma.connectedWallets.findFirst({
          where: {
            userId: parseInt(userId),
            walletId: String(walletId),
            isActive: true,
          },
        });

        console.log(
          "🔍 Search by walletId result:",
          wallet ? "Found" : "Not found",
        );
      }

      if (!wallet) {
        console.error("❌ Wallet not found with params:", { userId, walletId });

        const allUserWallets = await prisma.connectedWallets.findMany({
          where: { userId: parseInt(userId) },
        });
        console.error("❌ All wallets for user:", allUserWallets);

        throw new Error("Wallet not found or already disconnected");
      }

      console.log("✅ Found wallet to disconnect:", wallet);

      await prisma.connectedWallets.update({
        where: { id: wallet.id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      console.log("✅ Wallet disconnected successfully:", { userId, walletId });
      return true;
    } catch (error) {
      console.error("❌ Error disconnecting wallet:", error);
      throw error;
    }
  }

  async getWalletBalance(userId, walletId) {
    try {
      const wallet = await prisma.connectedWallets.findFirst({
        where: { userId, walletId, isActive: true },
      });

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      switch (wallet.provider) {
        case "PAYPAL":
          return await this.getPayPalBalance(wallet);
        case "WISE":
          return await this.getWiseBalance(wallet);
        case "SQUARE":
          return await this.getSquareBalance(wallet);
        default:
          return {
            amount: wallet.balance,
            currency: wallet.currency,
            lastUpdated: wallet.lastSync,
          };
      }
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
      throw error;
    }
  }

  async getPayPalBalance(wallet) {
    try {
      const response = await axios.get(
        `${this.providers.PAYPAL.baseUrl}/v1/wallet/balance`,
        {
          headers: { Authorization: `Bearer ${wallet.accessToken}` },
        },
      );

      const balance = response.data.balances[0];
      return {
        amount: parseFloat(balance.available_balance.value),
        currency: balance.available_balance.currency_code,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("PayPal balance fetch failed:", error);
      return {
        amount: 0,
        currency: "USD",
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  async getWiseBalance(wallet) {
    try {
      const response = await axios.get(
        `${this.providers.WISE.baseUrl}/v1/profiles/${wallet.walletId}/balances`,
        {
          headers: { Authorization: `Bearer ${wallet.accessToken}` },
        },
      );

      const balance = response.data[0];
      return {
        amount: parseFloat(balance.amount.value),
        currency: balance.amount.currency,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Wise balance fetch failed:", error);
      return {
        amount: 0,
        currency: "USD",
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  async getSquareBalance(wallet) {
    try {
      const response = await axios.get(
        `${this.providers.SQUARE.baseUrl}/v2/locations/${wallet.walletId}/transactions`,
        {
          headers: { Authorization: `Bearer ${wallet.accessToken}` },
        },
      );

      return {
        amount: 0,
        currency: "USD",
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Square balance fetch failed:", error);
      return {
        amount: 0,
        currency: "USD",
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  async refreshWalletConnection(userId, walletId) {
    try {
      const wallet = await prisma.connectedWallets.findFirst({
        where: { userId, walletId, isActive: true },
      });

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      let refreshedTokens = null;
      let connectionStatus = "connected";
      let currentBalance = wallet.balance;

      try {
        switch (wallet.provider) {
          case "PAYPAL":
            refreshedTokens = await this.refreshPayPalToken(
              wallet.refreshToken,
            );
            if (refreshedTokens) {
              const balance = await this.getPayPalBalance({
                ...wallet,
                accessToken: refreshedTokens.access_token,
              });
              currentBalance = balance.amount;
            }
            break;

          case "WISE":
            const wiseBalance = await this.getWiseBalance(wallet);
            currentBalance = wiseBalance.amount;
            break;

          case "SQUARE":
            const squareBalance = await this.getSquareBalance(wallet);
            currentBalance = squareBalance.amount;
            break;

          case "VENMO":
            connectionStatus = (await this.checkBraintreeConnection(wallet))
              ? "connected"
              : "disconnected";
            break;

          default:
            console.log(`No refresh logic implemented for ${wallet.provider}`);
        }
      } catch (refreshError) {
        console.warn(
          `Token refresh failed for ${wallet.provider}:`,
          refreshError.message,
        );
        connectionStatus = "needs_reauth";
      }

      const updateData = {
        lastSync: new Date(),
        updatedAt: new Date(),
        balance: currentBalance,
        isActive: connectionStatus === "connected",
      };

      if (refreshedTokens) {
        updateData.accessToken = refreshedTokens.access_token;
        if (refreshedTokens.refresh_token) {
          updateData.refreshToken = refreshedTokens.refresh_token;
        }
      }

      const updatedWallet = await prisma.connectedWallets.update({
        where: { id: wallet.id },
        data: updateData,
      });

      return {
        id: updatedWallet.id,
        status: connectionStatus,
        lastSync: updatedWallet.lastSync,
        balance: updatedWallet.balance,
        tokensRefreshed: !!refreshedTokens,
      };
    } catch (error) {
      console.error("Error refreshing wallet connection:", error);
      throw error;
    }
  }

  async refreshPayPalToken(refreshToken) {
    try {
      if (!refreshToken || refreshToken.includes("demo")) {
        return null;
      }

      const response = await axios.post(
        process.env.PAYPAL_TOKEN_URL,
        "grant_type=refresh_token&refresh_token=" + refreshToken,
        {
          headers: {
            Accept: "application/json",
            "Accept-Language": "en_US",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          auth: {
            username: this.providers.PAYPAL.clientId,
            password: this.providers.PAYPAL.clientSecret,
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error(
        "PayPal token refresh failed:",
        error.response?.data || error.message,
      );
      throw new Error("PayPal token refresh failed");
    }
  }

  async checkBraintreeConnection(wallet) {
    try {
      if (wallet.walletId && wallet.walletId.includes("venmo_")) {
        return !!wallet.accessToken;
      }
      return true;
    } catch (error) {
      console.error("Braintree connection check failed:", error);
      return false;
    }
  }

  async getOAuthUrl(provider, redirectUri, userId) {
    const state = crypto.randomBytes(16).toString("hex");

    try {
      await prisma.oauthStates.create({
        data: {
          state,
          provider,
          userId: Number(userId),
          redirectUri,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
    } catch (err) {
      console.log(
        "OAuth state storage skipped (table may not exist):",
        err.message,
      );
    }

    switch (provider) {
      case "PAYPAL":
        return `${this.providers.PAYPAL.baseUrl}/connect/?flowEntry=static&client_id=${this.providers.PAYPAL.clientId}&response_type=code&scope=openid profile email&redirect_uri=${redirectUri}&state=${state}`;

      case "GOOGLEPAY": {
        const googleOAuthUrl = this.providers.GOOGLEPAY.oauthUrl;
        const clientId = this.providers.GOOGLEPAY.clientId;
        const scopes = ["openid", "email", "profile"].join(" ");

        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: scopes,
          state: state,
          access_type: "offline",
          prompt: "consent",
        });

        return `${googleOAuthUrl}?${params.toString()}`;
      }

      case "WISE": {
        const base = this.providers.WISE.baseUrl.replace(/\/$/, "");
        const scopes = (
          this.providers.WISE.scopes || ["transfers", "balances", "profiles"]
        ).join(" ");
        const params = new URLSearchParams({
          response_type: "code",
          client_id: this.providers.WISE.clientId,
          redirect_uri: redirectUri,
          scope: scopes,
          state,
        });
        const url = `${base}/oauth/authorize?${params.toString()}`;
        console.log("🔔 Wise OAuth URL:", url);
        return url;
      }

      case "SQUARE": {
        const base = this.providers.SQUARE.baseUrl.replace(/\/$/, "");
        const params = new URLSearchParams({
          client_id: this.providers.SQUARE.applicationId,
          response_type: "code",
          scope: "MERCHANT_PROFILE_READ PAYMENTS_WRITE",
          redirect_uri: redirectUri,
          state: state,
        });
        return `${base}/oauth2/authorize?${params.toString()}`;
      }

      case "APPLEPAY": {
        const appleOAuthUrl = this.providers.APPLEPAY.oauthUrl;
        const clientId = this.providers.APPLEPAY.clientId;
        const scopes = this.providers.APPLEPAY.scopes.join(" ");

        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: "code id_token",
          response_mode: "form_post",
          scope: scopes,
          state: state,
        });
        const fullUrl = `${appleOAuthUrl}?${params.toString()}`;
        console.log("🔔 Apple OAuth URL:", {
          redirect_uri: redirectUri,
          response_mode: "form_post",
          url: fullUrl,
        });
        return fullUrl;
      }

      default:
        throw new Error(`OAuth not supported for ${provider}`);
    }
  }

  async handleOAuthCallback(provider, code, state, userId) {
    try {
      return await this.connectWallet(userId, { provider, authCode: code });
    } catch (error) {
      console.error("OAuth callback error:", error);
      throw error;
    }
  }
}

module.exports = new WalletService();
