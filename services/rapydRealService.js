const crypto = require("crypto");
const axios = require("axios");

class RapydRealService {
  constructor() {
    this.accessKey = "rak_35151028166B9A9DDEFE";
    this.secretKey = "rsk_f3f229c6e4d428d54b673e504e21cb6a6bbc4e22ac9149e7905c136ee1c66645435c025511f575ff";
    this.baseUrl = "https://sandboxapi.rapyd.net";

    this.adminWalletId = "ewallet_admin_qosyne";
    this.adminFeeAmount = "0.75";
  }

  /**
   * Generate Rapyd signature using working implementation format
   * Based on successful community implementations
   */
  generateSignature(method, urlPath, bodyString = "") {
    const timestamp = Math.floor(Date.now() / 1000);
    const salt = crypto.randomBytes(12).toString("hex");

    // Format 1 - Standard Rapyd format with newlines (without secret key)
    const stringToSign = [
      method.toLowerCase(),
      urlPath,
      salt,
      timestamp.toString(),
      this.accessKey,
      bodyString
    ].join('\n');

    console.log("🔑 String to sign (Format 1 - standard):", stringToSign.replace(/\n/g, '\\n'));
    console.log("📦 Body string:", bodyString);
    console.log("📏 Body string length:", bodyString.length);
    console.log("🔐 Salt:", salt);
    console.log("⏰ Timestamp:", timestamp);
    console.log("🔑 Access Key:", this.accessKey);

    // Generate HMAC-SHA256 signature using secret key
    const signature = crypto
      .createHmac("sha256", this.secretKey)
      .update(stringToSign, 'utf8')
      .digest("base64");

    console.log("✍️ Generated signature:", signature);

    return { signature, salt, timestamp };
  }

  /**
   * Make authenticated Rapyd request
   */
  async makeRapydRequest(method, endpoint, data = null) {
    const urlPath = `/v1${endpoint}`;

    // ✅ Build body string ONCE (Rapyd API strict formatting)
    let bodyString = "";
    if (data && Object.keys(data).length > 0) {
      // Step 1: Ensure all numeric values are strings (Rapyd requirement)
      const processValue = (value) => {
        if (typeof value === 'number') {
          // Convert to string and ensure proper decimal formatting for Rapyd
          const numStr = value.toString();
          if (numStr.includes('.')) {
            // Remove trailing zeros but keep valid decimals
            const formatted = parseFloat(numStr).toString();
            // Ensure we don't have scientific notation
            return formatted.includes('e') ? numStr : formatted;
          }
          return numStr;
        } else if (typeof value === 'string') {
          return value.trim();
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Recursively process nested objects
          const processed = {};
          for (const [k, v] of Object.entries(value)) {
            processed[k] = processValue(v);
          }
          return processed;
        } else if (Array.isArray(value)) {
          // Process arrays
          return value.map(processValue);
        }
        return value;
      };

      const cleanData = {};
      for (const [key, value] of Object.entries(data)) {
        cleanData[key] = processValue(value);
      }
      
      // Step 2: Generate ultra-compact JSON for Rapyd API
      bodyString = JSON.stringify(cleanData);
      
      // Ultra-strict whitespace removal for Rapyd API
      bodyString = bodyString
        .replace(/\s+/g, '')  // Remove all whitespace
        .replace(/\s*([{}\[\]:,])\s*/g, '$1')  // Remove spaces around JSON syntax
        .replace(/\s*"/g, '"')  // Remove spaces before quotes
        .replace(/"\s*/g, '"')  // Remove spaces after quotes
        .trim();
    }

    const { signature, timestamp, salt } = this.generateSignature(method, urlPath, bodyString);

    const headers = {
      "Content-Type": "application/json",
      access_key: this.accessKey,
      signature,
      salt,
      timestamp,
      idempotency: crypto.randomUUID(),
    };

    try {
      const requestConfig = {
        method,
        url: `${this.baseUrl}${urlPath}`,
        headers,
      };

      if (bodyString) {
        // ✅ Send exactly the same body string used for signing
        requestConfig.data = JSON.parse(bodyString);
      }

      const response = await axios(requestConfig);

      if (response.data.status.status === "SUCCESS") {
        return response.data.data;
      } else {
        throw new Error(`Rapyd API Error: ${JSON.stringify(response.data.status)}`);
      }
    } catch (error) {
      console.error("❌ Rapyd API Error:", error.response?.data || error.message);

      if (
        error.response?.status === 403 &&
        typeof error.response?.data === "string" &&
        error.response.data.includes("Access denied") &&
        error.response.data.includes("Cloudflare")
      ) {
        throw new Error("Rapyd API blocked due to geographical restrictions. Please use VPN.");
      }

      throw error;
    }
  }

  // --- Wallet helpers (unchanged) ---
  async getOrCreateAdminWallet() {
    try {
      return await this.makeRapydRequest("GET", `/user/${this.adminWalletId}`);
    } catch {
      const adminWalletData = {
        first_name: "Qosyne",
        last_name: "Admin",
        ewallet_reference_id: this.adminWalletId,
        type: "person",
        metadata: { purpose: "admin_fee_collection" },
        contact: {
          phone_number: "+1234567890",
          email: "admin@qosyne.com",
          first_name: "Qosyne",
          last_name: "Admin",
          country: "US",
        },
      };
      return await this.makeRapydRequest("POST", "/user", adminWalletData);
    }
  }

  async transferMoney(fromWalletId, toWalletId, amount, currency = "USD", description = "") {
    const transferData = {
      source_ewallet: fromWalletId,
      destination_ewallet: toWalletId,
      amount: amount.toString(), // ✅ Always string
      currency,
      metadata: { description },
    };

    return await this.makeRapydRequest("POST", "/account/transfer", transferData);
  }

  async collectAdminFee(fromWalletId, transactionId, currency = "USD") {
    const adminWallet = await this.getOrCreateAdminWallet();
    return await this.transferMoney(
      fromWalletId,
      adminWallet.id,
      this.adminFeeAmount,
      currency,
      `Admin fee for transaction ${transactionId}`
    );
  }

  async processTransactionWithFee(fromWalletId, toWalletId, amount, currency = "USD", description = "") {
    const totalAmount = parseFloat(amount);
    const userAmount = (totalAmount - parseFloat(this.adminFeeAmount)).toString();

    const mainTransfer = await this.transferMoney(fromWalletId, toWalletId, userAmount, currency, description);
    const feeTransfer = await this.collectAdminFee(fromWalletId, mainTransfer.id, currency);

    return {
      success: true,
      mainTransfer,
      adminFee: feeTransfer,
      totalProcessed: totalAmount.toString(),
      userReceived: userAmount,
      adminFeeCollected: this.adminFeeAmount,
    };
  }

  async getWalletBalance(walletId) {
    const wallet = await this.makeRapydRequest("GET", `/user/${walletId}`);
    return {
      walletId: wallet.id,
      balance: wallet.accounts?.[0]?.balance || 0,
      currency: wallet.accounts?.[0]?.currency || "USD",
    };
  }

  async createUserWallet(userId, email, fullName) {
    const [firstName, lastName] = fullName.split(" ");
    const walletData = {
      first_name: firstName || "User",
      last_name: lastName || `${userId}`,
      email,
      ewallet_reference_id: `user_${userId}_${Date.now()}`,
      type: "person",
      metadata: { user_id: userId },
    };
    return await this.makeRapydRequest("POST", "/user", walletData);
  }

  async getExistingWallets() {
    return await this.makeRapydRequest("GET", "/user");
  }

  async processRealTransactionWithFee(fromWalletId, toWalletId, amount, currency = "USD", description = "") {
    return await this.processTransactionWithFee(fromWalletId, toWalletId, amount, currency, description);
  }
}

module.exports = new RapydRealService();
