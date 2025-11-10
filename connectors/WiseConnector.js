/**
 * Wise Connector
 * Handles international bank transfers via Wise API
 * Transfer rule: Wise → Bank Accounts (one-way)
 */

const axios = require('axios');

class WiseConnector {
  constructor() {
    this.apiToken = process.env.WISE_API_TOKEN;
    this.profileId = process.env.WISE_PROFILE_ID;
    this.baseUrl = 'https://api.sandbox.transferwise.tech';
    this.providerName = 'WISE';
  }

  /**
   * Create a quote for transfer
   */
  async createQuote(params) {
    try {
      const { sourceCurrency, targetCurrency, sourceAmount, targetAmount } = params;

      const response = await axios.post(
        `${this.baseUrl}/v3/profiles/${this.profileId}/quotes`,
        {
          sourceCurrency: sourceCurrency || 'USD',
          targetCurrency: targetCurrency || 'USD',
          sourceAmount: sourceAmount,
          targetAmount: targetAmount,
          payOut: 'BANK_TRANSFER',
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        quoteId: response.data.id,
        rate: response.data.rate,
        fee: response.data.fee,
        sourceAmount: response.data.sourceAmount,
        targetAmount: response.data.targetAmount,
        expiresAt: response.data.expirationTime,
      };
    } catch (error) {
      console.error('Wise: Error creating quote:', error.response?.data || error.message);
      throw new Error('Failed to create Wise quote');
    }
  }

  /**
   * Create recipient account
   */
  async createRecipient(params) {
    try {
      const {
        currency,
        type, // 'iban', 'aba', 'sort_code', etc.
        accountHolderName,
        legalType, // 'PRIVATE' or 'BUSINESS'
        details,
      } = params;

      const response = await axios.post(
        `${this.baseUrl}/v1/accounts`,
        {
          currency: currency || 'USD',
          type: type,
          profile: this.profileId,
          accountHolderName: accountHolderName,
          legalType: legalType || 'PRIVATE',
          details: details,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        recipientId: response.data.id,
        accountHolderName: response.data.accountHolderName,
        currency: response.data.currency,
        type: response.data.type,
      };
    } catch (error) {
      console.error('Wise: Error creating recipient:', error.response?.data || error.message);
      throw new Error('Failed to create Wise recipient');
    }
  }

  /**
   * Send money to bank account
   */
  async sendMoney(params) {
    try {
      const { amount, currency, recipientId, reference, quoteId } = params;

      // Create quote if not provided
      let quote = quoteId;
      if (!quote) {
        const quoteResult = await this.createQuote({
          sourceCurrency: currency || 'USD',
          targetCurrency: currency || 'USD',
          sourceAmount: amount,
        });
        quote = quoteResult.quoteId;
      }

      // Create transfer
      const transferResponse = await axios.post(
        `${this.baseUrl}/v1/transfers`,
        {
          targetAccount: recipientId,
          quoteUuid: quote,
          customerTransactionId: `qosyne-${Date.now()}`,
          details: {
            reference: reference || 'Payment via Qosyne',
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const transferId = transferResponse.data.id;

      // Fund the transfer (in sandbox, this simulates payment)
      await this._fundTransfer(transferId);

      return {
        success: true,
        transactionId: transferId,
        status: this._mapStatus(transferResponse.data.status),
        amount: transferResponse.data.sourceValue,
        currency: transferResponse.data.sourceCurrency,
        targetAmount: transferResponse.data.targetValue,
        targetCurrency: transferResponse.data.targetCurrency,
        providerResponse: {
          id: transferId,
          status: transferResponse.data.status,
          rate: transferResponse.data.rate,
          createdAt: transferResponse.data.created,
        },
      };
    } catch (error) {
      console.error('Wise: Error sending money:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.message || error.message,
      };
    }
  }

  /**
   * Fund transfer (sandbox simulation)
   */
  async _fundTransfer(transferId) {
    try {
      await axios.post(
        `${this.baseUrl}/v3/profiles/${this.profileId}/transfers/${transferId}/payments`,
        {
          type: 'BALANCE',
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Wise: Error funding transfer:', error.response?.data || error.message);
      // Don't throw error - transfer is created even if funding fails in sandbox
    }
  }

  /**
   * Get transfer details
   */
  async getTransaction(transferId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/transfers/${transferId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
          },
        }
      );

      const transfer = response.data;

      return {
        id: transfer.id,
        amount: transfer.sourceValue,
        status: this._mapStatus(transfer.status),
        currency: transfer.sourceCurrency,
        targetAmount: transfer.targetValue,
        targetCurrency: transfer.targetCurrency,
        createdAt: transfer.created,
        rate: transfer.rate,
        details: {
          reference: transfer.details?.reference,
          recipientId: transfer.targetAccount,
        },
      };
    } catch (error) {
      console.error('Wise: Error getting transaction:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * List transfers
   */
  async searchTransactions(params = {}) {
    try {
      const { limit = 100, offset = 0, status } = params;

      const queryParams = new URLSearchParams({
        profile: this.profileId,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (status) {
        queryParams.append('status', status);
      }

      const response = await axios.get(
        `${this.baseUrl}/v1/transfers?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
          },
        }
      );

      return response.data.map(transfer => ({
        id: transfer.id,
        amount: transfer.sourceValue,
        status: this._mapStatus(transfer.status),
        currency: transfer.sourceCurrency,
        targetAmount: transfer.targetValue,
        targetCurrency: transfer.targetCurrency,
        createdAt: transfer.created,
      }));
    } catch (error) {
      console.error('Wise: Error searching transactions:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get account requirements for a currency
   */
  async getAccountRequirements(currency, type = 'iban') {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/account-requirements?source=${currency}&target=${currency}&sourceAmount=1000`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Wise: Error getting account requirements:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Check if this connector supports a transfer route
   */
  canTransfer(fromProvider, toProvider) {
    // Wise can only send to bank accounts
    return fromProvider.toUpperCase() === 'WISE' && 
           (toProvider.toUpperCase() === 'BANK' || toProvider.toUpperCase() === 'WISE');
  }

  /**
   * Map Wise status to internal status
   */
  _mapStatus(wiseStatus) {
    const statusMap = {
      'incoming_payment_waiting': 'PENDING',
      'processing': 'PROCESSING',
      'funds_converted': 'PROCESSING',
      'outgoing_payment_sent': 'COMPLETED',
      'cancelled': 'CANCELLED',
      'funds_refunded': 'FAILED',
      'bounced_back': 'FAILED',
    };

    return statusMap[wiseStatus.toLowerCase()] || 'PENDING';
  }

  /**
   * Get provider name
   */
  getProviderName() {
    return this.providerName;
  }

  /**
   * Get sandbox URL for viewing transactions
   */
  getSandboxUrl() {
    return `https://sandbox.transferwise.tech/user/account/${this.profileId}`;
  }

  /**
   * Validate bank account details
   */
  async validateBankAccount(params) {
    try {
      const { currency, type, details } = params;

      const response = await axios.post(
        `${this.baseUrl}/v1/validators/account-number`,
        {
          currency: currency,
          type: type,
          details: details,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        valid: response.data.success,
        errors: response.data.errors || [],
      };
    } catch (error) {
      console.error('Wise: Error validating account:', error.response?.data || error.message);
      return {
        valid: false,
        errors: [error.message],
      };
    }
  }
}

module.exports = WiseConnector;
