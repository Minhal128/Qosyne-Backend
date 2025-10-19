// Enhanced Braintree Client Token Generator with better error handling
const braintree = require('braintree');

class BraintreeClientTokenGenerator {
  constructor() {
    this.gateway = null;
    this.initializeGateway();
  }

  initializeGateway() {
    try {
      console.log('🔧 Initializing Braintree Gateway...');
      console.log('Environment Variables Check:');
      console.log('BT_MERCHANT_ID:', process.env.BT_MERCHANT_ID ? '✅ Set' : '❌ Missing');
      console.log('BT_PUBLIC_KEY:', process.env.BT_PUBLIC_KEY ? '✅ Set' : '❌ Missing');
      console.log('BT_PRIVATE_KEY:', process.env.BT_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
      console.log('BT_ENVIRONMENT:', process.env.BT_ENVIRONMENT || 'sandbox');

      if (!process.env.BT_MERCHANT_ID || !process.env.BT_PUBLIC_KEY || !process.env.BT_PRIVATE_KEY) {
        throw new Error('Missing required Braintree environment variables');
      }

      this.gateway = new braintree.BraintreeGateway({
        environment: process.env.BT_ENVIRONMENT === 'production' 
          ? braintree.Environment.Production 
          : braintree.Environment.Sandbox,
        merchantId: process.env.BT_MERCHANT_ID,
        publicKey: process.env.BT_PUBLIC_KEY,
        privateKey: process.env.BT_PRIVATE_KEY,
      });

      console.log('✅ Braintree Gateway initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Braintree Gateway:', error);
      throw error;
    }
  }

  async generateClientToken(options = {}) {
    try {
      if (!this.gateway) {
        throw new Error('Braintree gateway not initialized');
      }

      console.log('🎫 Generating Braintree client token...');
      console.log('Options:', options);

      const result = await this.gateway.clientToken.generate(options);
      
      if (!result.success) {
        throw new Error('Failed to generate client token: ' + JSON.stringify(result));
      }

      console.log('✅ Client token generated successfully');
      return result.clientToken;
    } catch (error) {
      console.error('❌ Error generating client token:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      console.log('🧪 Testing Braintree connection...');
      const clientToken = await this.generateClientToken();
      
      if (clientToken) {
        console.log('✅ Braintree connection test successful');
        console.log('Token preview:', clientToken.substring(0, 50) + '...');
        return true;
      } else {
        throw new Error('No client token returned');
      }
    } catch (error) {
      console.error('❌ Braintree connection test failed:', error);
      return false;
    }
  }
}

module.exports = { BraintreeClientTokenGenerator };