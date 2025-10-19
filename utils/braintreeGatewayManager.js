/**
 * Braintree Gateway with Auto-Fallback
 * This will try real credentials first, then provide a working demo mode
 */
require('dotenv').config();
const braintree = require('braintree');

class BraintreeGatewayManager {
  constructor() {
    this.gateway = null;
    this.mode = 'unknown';
    this.initialize();
  }

  initialize() {
    try {
      this.gateway = new braintree.BraintreeGateway({
        environment: process.env.BT_ENVIRONMENT === 'production' 
          ? braintree.Environment.Production 
          : braintree.Environment.Sandbox,
        merchantId: process.env.BT_MERCHANT_ID,
        publicKey: process.env.BT_PUBLIC_KEY,
        privateKey: process.env.BT_PRIVATE_KEY
      });
      console.log('✅ Braintree Gateway initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Braintree Gateway:', error.message);
    }
  }

  async generateClientToken(options = {}) {
    if (!this.gateway) {
      throw new Error('Braintree Gateway not initialized');
    }

    try {
      console.log('🔄 Attempting to generate real Braintree client token...');
      const response = await this.gateway.clientToken.generate(options);
      this.mode = 'real';
      console.log('✅ Real Braintree client token generated successfully');
      return {
        token: response.clientToken,
        mode: 'real',
        environment: process.env.BT_ENVIRONMENT
      };
    } catch (error) {
      console.error('❌ Real token generation failed:', error.message);
      
      // Log the specific error for debugging
      if (error.type === 'authorizationError') {
        console.log('⚠️  Authorization Error - Check if:');
        console.log('   1. Your Braintree account is fully activated');
        console.log('   2. You have API permissions enabled');
        console.log('   3. Your account has been approved by Braintree');
      }
      
      throw error; // Let the controller handle the fallback
    }
  }

  getMode() {
    return this.mode;
  }
}

module.exports = new BraintreeGatewayManager();