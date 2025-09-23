const axios = require('axios');
const crypto = require('crypto');

class RapydService {
  constructor() {
    this.baseUrl = process.env.RAPYD_BASE_URL || 'https://sandboxapi.rapyd.net';
    this.accessKey = process.env.RAPYD_ACCESS_KEY;
    this.secretKey = process.env.RAPYD_SECRET_KEY;
  }

  generateSignature(httpMethod, urlPath, salt, timestamp, body = '') {
    // For testing purposes, return a mock signature
    // In production, this would use real Rapyd credentials
    if (!this.secretKey) {
      console.log('Using mock Rapyd signature for testing');
      return 'mock_signature_for_testing';
    }
    
    const bodyString = body ? JSON.stringify(body) : '';
    const toSign = httpMethod + urlPath + salt + timestamp + this.accessKey + this.secretKey + bodyString;
    
    const hash = crypto.createHmac('sha256', this.secretKey);
    hash.update(toSign);
    return Buffer.from(hash.digest('hex')).toString('base64');
  }

  getHeaders(httpMethod, urlPath, body = null) {
    const salt = crypto.randomBytes(12).toString('hex');
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = this.generateSignature(httpMethod, urlPath, salt, timestamp, body);

    return {
      'Content-Type': 'application/json',
      'access_key': this.accessKey,
      'salt': salt,
      'timestamp': timestamp,
      'signature': signature
    };
  }

  async makeRequest(method, endpoint, data = null) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = this.getHeaders(method.toUpperCase(), endpoint, data);

      const config = {
        method,
        url,
        headers,
        ...(data && { data })
      };

      const response = await axios(config);
      
      if (response.data.status?.error_code) {
        throw new Error(`Rapyd API Error: ${response.data.status.message}`);
      }

      return response.data.data;
    } catch (error) {
      console.error('Rapyd API request failed:', {
        method,
        endpoint,
        error: error.message
      });
      throw error;
    }
  }

  async createPayment(paymentData) {
    try {
      const { amount, currency, paymentMethod, description, metadata, userId } = paymentData;

      // Check if we have valid Rapyd credentials for real API calls
      if (!this.secretKey || !this.accessKey || this.secretKey === 'your_rapyd_secret_key' || this.accessKey === 'your_rapyd_access_key') {
        console.log('Creating mock Rapyd payment for testing - missing or placeholder credentials');
        
        const mockPayment = {
          id: `rapyd_payment_${Date.now()}`,
          amount: amount,
          currency: currency,
          status: 'CLO',
          payment_method: paymentMethod || 'card_payment',
          description: description || 'Wallet transfer payment',
          metadata: {
            ...metadata,
            userId,
            source: 'wallet-integration',
            test: true
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('Mock Rapyd payment created:', {
          paymentId: mockPayment.id,
          amount,
          currency,
          userId
        });
        
        return mockPayment;
      }

      const payload = {
        amount,
        currency,
        payment_method: paymentMethod,
        description: description || 'Wallet transfer payment',
        metadata: {
          ...metadata,
          userId,
          source: 'wallet-integration'
        },
        capture: true,
        confirm: true
      };

      const payment = await this.makeRequest('POST', '/v1/payments', payload);
      
      console.log('Rapyd payment created:', {
        paymentId: payment.id,
        amount,
        currency,
        userId
      });

      return payment;
    } catch (error) {
      console.error('Failed to create Rapyd payment:', { paymentData, error: error.message });
      throw error;
    }
  }

  async getPayment(paymentId) {
    try {
      return await this.makeRequest('GET', `/v1/payments/${paymentId}`);
    } catch (error) {
      console.error('Failed to get Rapyd payment:', { paymentId, error: error.message });
      throw error;
    }
  }

  async createPayout(payoutData) {
    try {
      const { amount, currency, beneficiary, description, metadata, userId } = payoutData;

      // Check if we have valid Rapyd credentials for real API calls
      if (!this.secretKey || !this.accessKey || this.secretKey === 'your_rapyd_secret_key' || this.accessKey === 'your_rapyd_access_key') {
        console.log('Creating mock Rapyd payout for testing - missing or placeholder credentials');
        
        const mockPayout = {
          id: `rapyd_payout_${Date.now()}`,
          payout_amount: amount,
          payout_currency: currency,
          status: 'ACT',
          beneficiary_type: beneficiary.type,
          beneficiary: beneficiary.fields,
          description: description || 'Wallet transfer payout',
          metadata: {
            ...metadata,
            userId,
            source: 'wallet-integration',
            test: true
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('Mock Rapyd payout created:', {
          payoutId: mockPayout.id,
          amount,
          currency,
          userId
        });
        
        return mockPayout;
      }

      const payload = {
        beneficiary_type: beneficiary.type,
        beneficiary: beneficiary.fields,
        payout_amount: amount,
        payout_currency: currency,
        sender_amount: amount,
        sender_currency: currency,
        description: description || 'Wallet transfer payout',
        metadata: {
          ...metadata,
          userId,
          source: 'wallet-integration'
        }
      };

      const payout = await this.makeRequest('POST', '/v1/payouts', payload);
      
      console.log('Rapyd payout created:', {
        payoutId: payout.id,
        amount,
        currency,
        userId
      });

      return payout;
    } catch (error) {
      console.error('Failed to create Rapyd payout:', { payoutData, error: error.message });
      throw error;
    }
  }

  async getPayout(payoutId) {
    try {
      return await this.makeRequest('GET', `/v1/payouts/${payoutId}`);
    } catch (error) {
      console.error('Failed to get Rapyd payout:', { payoutId, error: error.message });
      throw error;
    }
  }

  async getPaymentMethods(country, currency = null) {
    try {
      let endpoint = `/v1/payment_methods/countries/${country}`;
      if (currency) {
        endpoint += `?currency=${currency}`;
      }
      
      return await this.makeRequest('GET', endpoint);
    } catch (error) {
      console.error('Failed to get payment methods:', { country, currency, error: error.message });
      throw error;
    }
  }

  async getExchangeRate(fromCurrency, toCurrency, amount = null) {
    try {
      let endpoint = `/v1/rates/daily?base_currency=${fromCurrency}&target_currency=${toCurrency}`;
      if (amount) {
        endpoint += `&amount=${amount}`;
      }

      const rateData = await this.makeRequest('GET', endpoint);
      
      return {
        rate: rateData.rate,
        convertedAmount: amount ? amount * rateData.rate : null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get exchange rate:', { fromCurrency, toCurrency, error: error.message });
      throw error;
    }
  }

  async getSupportedCountries() {
    try {
      return await this.makeRequest('GET', '/v1/data/countries');
    } catch (error) {
      console.error('Failed to get supported countries:', { error: error.message });
      throw error;
    }
  }

  async getSupportedCurrencies() {
    try {
      return await this.makeRequest('GET', '/v1/data/currencies');
    } catch (error) {
      console.error('Failed to get supported currencies:', { error: error.message });
      throw error;
    }
  }

  async createBeneficiary(beneficiaryData) {
    try {
      const { userId, ...data } = beneficiaryData;

      const payload = {
        ...data,
        metadata: {
          userId,
          source: 'wallet-integration'
        }
      };

      const beneficiary = await this.makeRequest('POST', '/v1/payouts/beneficiary', payload);
      
      console.log('Rapyd beneficiary created:', {
        beneficiaryId: beneficiary.id,
        userId
      });

      return beneficiary;
    } catch (error) {
      console.error('Failed to create Rapyd beneficiary:', { beneficiaryData, error: error.message });
      throw error;
    }
  }

  async getUserBeneficiaries(userId) {
    try {
      // In production, you'd filter by userId metadata
      return await this.makeRequest('GET', '/v1/payouts/beneficiary');
    } catch (error) {
      console.error('Failed to get user beneficiaries:', { userId, error: error.message });
      throw error;
    }
  }

  async createWallet(walletData) {
    try {
      const { userId, currency, type = 'person' } = walletData;

      const payload = {
        currency,
        type,
        metadata: {
          userId,
          source: 'wallet-integration'
        }
      };

      const wallet = await this.makeRequest('POST', '/v1/user', payload);
      
      console.log('Rapyd wallet created:', {
        walletId: wallet.id,
        currency,
        userId
      });

      return wallet;
    } catch (error) {
      console.error('Failed to create Rapyd wallet:', { walletData, error: error.message });
      throw error;
    }
  }

  async getWalletBalance(walletId) {
    try {
      return await this.makeRequest('GET', `/v1/user/${walletId}/accounts`);
    } catch (error) {
      console.error('Failed to get wallet balance:', { walletId, error: error.message });
      throw error;
    }
  }

  async transferBetweenWallets(transferData) {
    try {
      const { fromWallet, toWallet, amount, currency, description } = transferData;

      const payload = {
        source_ewallet: fromWallet,
        destination_ewallet: toWallet,
        amount,
        currency,
        description: description || 'Wallet to wallet transfer'
      };

      const transfer = await this.makeRequest('POST', '/v1/account/transfer', payload);
      
      console.log('Rapyd wallet transfer completed:', {
        transferId: transfer.id,
        fromWallet,
        toWallet,
        amount,
        currency
      });

      return transfer;
    } catch (error) {
      console.error('Failed to transfer between wallets:', { transferData, error: error.message });
      throw error;
    }
  }

  async verifyWebhook(signature, body) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(body)
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      console.error('Webhook verification failed:', { error: error.message });
      return false;
    }
  }

  async getPayoutRequiredFields(beneficiaryCountry, beneficiaryEntityType, payoutCurrency) {
    try {
      const endpoint = `/v1/payouts/beneficiary/required_fields?beneficiary_country=${beneficiaryCountry}&beneficiary_entity_type=${beneficiaryEntityType}&payout_currency=${payoutCurrency}`;
      return await this.makeRequest('GET', endpoint);
    } catch (error) {
      console.error('Failed to get payout required fields:', { 
        beneficiaryCountry, 
        beneficiaryEntityType, 
        payoutCurrency, 
        error: error.message 
      });
      throw error;
    }
  }

  // Helper methods for transaction service integration
  getPaymentMethodType(provider) {
    const methodTypes = {
      PAYPAL: 'paypal_wallet',
      GOOGLEPAY: 'google_pay',
      WISE: 'wise_account', 
      SQUARE: 'square_wallet',
      VENMO: 'venmo_wallet'
    };
    return methodTypes[provider] || 'card_payment';
  }

  getPaymentMethodFields(wallet) {
    return {
      walletId: wallet.walletId,
      provider: wallet.provider
    };
  }

  getBeneficiaryType(provider) {
    const beneficiaryTypes = {
      PAYPAL: 'paypal_account',
      GOOGLEPAY: 'google_pay_account', 
      WISE: 'wise_account',
      SQUARE: 'square_account',
      VENMO: 'venmo_account'
    };
    return beneficiaryTypes[provider] || 'bank_account';
  }

  getBeneficiaryFields(wallet) {
    return {
      walletId: wallet.walletId,
      recipientId: wallet.walletId,
      provider: wallet.provider
    };
  }
}

module.exports = new RapydService();
