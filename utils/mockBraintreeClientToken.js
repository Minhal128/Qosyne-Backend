// Mock Braintree Client Token for Development/Testing
// This generates a valid-looking test token that can be used for frontend development

class MockBraintreeClientToken {
  static generate() {
    // Generate a base64 encoded mock token that looks realistic
    const mockData = {
      version: 1,
      environment: "sandbox",
      authUrl: "https://api.sandbox.braintreegateway.com:443/merchants/j54z5ccv9gndbfh9/client_api",
      analytics: {
        url: "https://client-analytics.sandbox.braintreegateway.com/j54z5ccv9gndbfh9"
      },
      merchantId: "j54z5ccv9gndbfh9",
      assetsUrl: "https://assets.braintreegateway.com",
      clientApiUrl: "https://api.sandbox.braintreegateway.com:443/merchants/j54z5ccv9gndbfh9/client_api",
      googlePay: {
        enabled: true,
        googleMerchantId: "310396319894225534",
        environment: "TEST"
      },
      applePay: {
        enabled: true,
        merchantIdentifier: "Merchant.com.qosyne"
      }
    };

    // Convert to base64 (this mimics how real Braintree tokens work)
    const jsonString = JSON.stringify(mockData);
    const base64Token = Buffer.from(jsonString).toString('base64');
    
    return `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.${base64Token}.mock_signature_for_testing`;
  }

  static isValidFormat(token) {
    if (!token || typeof token !== 'string') return false;
    
    // Basic JWT format check
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    try {
      // Try to decode the payload
      const payload = Buffer.from(parts[1], 'base64').toString('utf8');
      const data = JSON.parse(payload);
      return data.merchantId && data.environment;
    } catch {
      return false;
    }
  }
}

module.exports = { MockBraintreeClientToken };