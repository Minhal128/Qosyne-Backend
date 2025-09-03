const axios = require('axios');
const crypto = require('crypto');
const { MethodBasedPayment } = require('../interfaces/methodBasedPayment');
const { v4: uuidv4 } = require('uuid');

class WiseGateway extends MethodBasedPayment {
  constructor() {
    super();
    this.apiBaseUrl =
      process.env.WISE_ENVIRONMENT === 'production'
        ? 'https://api.transferwise.com'
        : 'https://api.sandbox.transferwise.tech';
    this.apiToken = process.env.WISE_API_TOKEN;
    this.profileId = process.env.WISE_PROFILE_ID;
    this.walletAccountId = process.env.WISE_WALLET_ACCOUNT_ID;
  }

  // 🟢 Fetch All Bank Accounts Linked to Wise Profile
  async fetchBankAccounts() {
    const response = await axios.get(
      `${this.apiBaseUrl}/v1/accounts?profile=${this.profileId}`,
      { headers: this._getHeaders() },
    );

    return response.data.map((account) => ({
      accountId: account.id,
      accountHolderName: account.accountHolderName,
      iban: account.details?.iban,
      currency: account.currency,
      country: account.country,
    }));
  }

  // Attach a bank account - generate a token instead of storing full details
  async attachBankAccount({ userId, bankAccount }) {
    try {
      console.log('Attaching Wise bank account:', { 
        accountHolder: bankAccount.account_holder_name,
        country: bankAccount.country
      });
      
      // In production, we would:
      // 1. Create a recipient account in Wise API
      // 2. Store the recipient ID as the token
      // 3. Not store the full bank details in our database
      
      // For now, we'll simulate token creation
      const accountToken = `wise_account_${crypto.randomUUID().substring(0, 8)}`;
      
      return {
        attachedPaymentMethodId: accountToken,
        customerDetails: {
          name: bankAccount.account_holder_name,
          currency: bankAccount.currency || 'EUR',
          country: bankAccount.country,
          // We're not storing the actual IBAN/BIC, just a reference
          lastDigits: bankAccount.iban.slice(-4)
        }
      };
    } catch (error) {
      console.error('Error attaching Wise account:', error);
      throw new Error(`Failed to attach Wise account: ${error.message}`);
    }
  }

  // Create a recipient token when user enters recipient details
  async createRecipientToken(recipientDetails) {
    try {
      // 1. Create actual recipient in Wise API
      const recipientId = await this.createRecipientAccount({
        iban: recipientDetails.iban,
        accountHolderName: recipientDetails.name || 
          `${recipientDetails.address?.firstName || ''} ${recipientDetails.address?.lastName || ''}`.trim(),
        currency: recipientDetails.currency || 'EUR',
        legalType: 'PRIVATE',
        details: {
          country: recipientDetails.address?.country || 'DE',
          ...this._formatAddress(recipientDetails.address || {}),
        },
      });
      
      // 2. Generate a token to represent this recipient
      const recipientToken = `wise_recipient_${crypto.randomUUID().substring(0, 8)}`;
      
      // 3. Store the mapping in your database
      /*
      await prisma.wiseRecipients.create({
        data: {
          token: recipientToken,
          wiseRecipientId: recipientId.toString(),
          lastDigits: recipientDetails.iban.slice(-4),
          name: recipientDetails.name,
          createdAt: new Date()
        }
      });
      */
      
      // 4. Return only the token to the frontend
      return {
        recipientToken,
        lastDigits: recipientDetails.iban.slice(-4)
      };
    } catch (error) {
      console.error('Error creating recipient token:', error);
      throw new Error(`Failed to create recipient token: ${this._parseError(error)}`);
    }
  }

  // 🟢 Create Recipient Account (Fixed for BUSINESS type)
  async createRecipientAccount({
    iban,
    accountHolderName,
    currency,
    legalType = 'BUSINESS',
    details,
  }) {
    try {
      const recipientRequest = {
        currency,
        type: 'iban',
        profile: parseInt(this.profileId),
        accountHolderName,
        details: {
          legalType,
          iban,
          ...(legalType === 'BUSINESS'
            ? {
                country: details.country,
              }
            : {
                address: this._formatAddress(details),
                country: details.country,
              }),
        },
      };

      const response = await axios.post(
        `${this.apiBaseUrl}/v1/accounts`,
        recipientRequest,
        { headers: this._getHeaders() },
      );

      return response.data.id;
    } catch (error) {
      console.error('Create Recipient Error:', error.response?.data || error);
      throw new Error(`Failed to create recipient: ${this._parseError(error)}`);
    }
  }

  async authorizePayment(paymentData) {
    try {
      const { 
        amount, 
        currency, 
        paymentToken, 
        recipient, 
        recipientToken,
        walletDeposit = false,
        useQosyneBalance = false,
        connectedWalletId
      } = paymentData;
      
      // Validate that walletDeposit and useQosyneBalance are mutually exclusive
      if (walletDeposit && useQosyneBalance) {
        throw new Error('walletDeposit and useQosyneBalance cannot both be true');
      }
      
      console.log('Processing Wise transfer:', { 
        amount, 
        currency,
        walletDeposit,
        useQosyneBalance
      });

      // Generate transaction ID for idempotence
      const transferId = crypto.randomUUID();

      if (useQosyneBalance) {
        // SPECIAL CASE: Using Qosyne Balance as payment source
        console.log('Using Qosyne balance for Wise payment');
        
        // Get the business profile ID (source of funds)
        const sourceProfileId = process.env.WISE_BUSINESS_PROFILE_ID;
        if (!sourceProfileId) {
          throw new Error('Missing Wise business profile configuration for Qosyne balance');
        }
        
        let targetAccountId;
        
        // Determine the recipient based on whether it's a recipient transfer or not
        if (recipient && recipient.iban) {
          // Create recipient account for the transfer
          targetAccountId = await this.createRecipientAccount({
            iban: recipient.iban,
            accountHolderName: recipient.name || 
              `${recipient.address?.firstName || ''} ${recipient.address?.lastName || ''}`.trim(),
            currency,
            legalType: 'PRIVATE',
            details: {
              country: recipient.address?.country || 'DE',
              ...this._formatAddress(recipient.address || {}),
            },
          });
        } else if (recipientToken) {
          // Use existing recipient
          const recipientId = await this._getRecipientIdFromToken(recipientToken);
          if (!recipientId) {
            throw new Error('Invalid recipient token');
          }
          targetAccountId = recipientId;
        } else {
          throw new Error('Either recipient details or recipient token required for Qosyne balance transfer');
        }
        
        // Create quote for the transfer using business profile
        const quote = await this.createQuote({
          amount,
          sourceCurrency: currency,
          targetCurrency: currency,
        });
        
        // Execute transfer from business account to recipient
        const transfer = await this._createTransfer({
          targetAccount: targetAccountId,
          quoteUuid: quote,
          reference: recipient?.reference || `QosyneTransfer-${transferId.substring(0, 8)}`,
          purpose: 'BILL_PAYMENT',
          sourceAccountId: sourceProfileId  // Explicitly set business account as source
        });
        
        // Format response with Qosyne balance flag
        return this._formatPaymentResponse(transfer, true);
      } 
      else if (walletDeposit) {
        // EXISTING CASE: Wallet deposit
        // Keep the existing wallet deposit implementation as is
        const businessAccountId = process.env.WISE_BUSINESS_ACCOUNT_ID;
        if (!businessAccountId) {
          throw new Error('Missing Wise business account configuration');
        }

        const quote = await this.createQuote({
          amount,
          sourceCurrency: currency,
          targetCurrency: currency,
        });

        const transfer = await this._createTransfer({
          targetAccount: businessAccountId,
          quoteUuid: quote,
          reference: `Deposit-${transferId.substring(0, 8)}`,
          purpose: 'DEPOSIT',
        });
        
        return this._formatPaymentResponse(transfer, false);
      } 
      else {
        // EXISTING CASE: Regular payment from user's bank account
        // Keep the existing regular payment implementation as is
        let targetAccountId;
        
        if (recipientToken && recipientToken.startsWith('wise_recipient_')) {
          const recipientId = await this._getRecipientIdFromToken(recipientToken);
          if (!recipientId) {
            throw new Error('Invalid recipient token');
          }
          targetAccountId = recipientId;
        } 
        else if (recipient && recipient.iban) {
          targetAccountId = await this.createRecipientAccount({
            iban: recipient.iban,
            accountHolderName: recipient.name || 
              `${recipient.address?.firstName || ''} ${recipient.address?.lastName || ''}`.trim(),
            currency,
            legalType: 'PRIVATE',
            details: {
              country: recipient.address?.country || 'DE',
              ...this._formatAddress(recipient.address || {}),
            },
          });
        } else {
          throw new Error('Either recipientToken or recipient details with IBAN are required');
        }

        const quote = await this.createQuote({
          amount,
          sourceCurrency: currency,
          targetCurrency: currency,
        });

        // 4. Execute the transfer
        const transfer = await this._createTransfer({
          targetAccount: targetAccountId,
          quoteUuid: quote,
          reference: recipient?.reference || `Transfer-${transferId.substring(0, 8)}`,
          purpose: 'BILL_PAYMENT',
        });
        
        return this._formatPaymentResponse(transfer);
      }
    } catch (error) {
      // Keep existing error handling
      console.error('Wise payment error:', error);
      
      if (error.response) {
        const statusCode = error.response.status;
        
        if (statusCode === 400) {
          throw new Error(`Invalid transfer request: ${this._parseError(error)}`);
        } else if (statusCode === 401 || statusCode === 403) {
          throw new Error('Authentication or authorization failed with Wise');
        } else if (statusCode === 422) {
          throw new Error(`Validation failed: ${this._parseError(error)}`);
        } else if (statusCode >= 500) {
          throw new Error('Wise service is currently unavailable');
        }
      }
      
      throw new Error(`Wise transfer failed: ${error.message}`);
    }
  }

  // Helper method to retrieve a real recipient ID from your token
  async _getRecipientIdFromToken(token) {
    try {
      // In production, you would:
      // 1. Look up the tokenized recipient in your database
      // 2. Return the actual Wise recipient ID
      
      // This is just a placeholder implementation
      // You should implement a secure way to map tokens to real IDs
      
      // Example with a database lookup:
      /*
      const recipientMapping = await prisma.wiseRecipients.findUnique({
        where: { token: token },
        select: { wiseRecipientId: true }
      });
      
      if (!recipientMapping) {
        throw new Error('Recipient token not found');
      }
      
      return recipientMapping.wiseRecipientId;
      */
      
      // For now, we'll simulate finding the ID
      // In reality, you'd never do this - it's just for illustration
      if (token.startsWith('wise_recipient_')) {
        // Simulate a database lookup by returning a fake ID
        return `recipient-${token.split('_')[2]}`;
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving recipient ID:', error);
      throw new Error('Failed to retrieve recipient information');
    }
  }

  // 🟢 Create Quote
  async createQuote({ amount, sourceCurrency, targetCurrency }) {
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/v3/profiles/${this.profileId}/quotes`,
        {
          sourceCurrency,
          targetCurrency,
          sourceAmount: amount,
          targetAmount: null,
          payOut: 'BANK_TRANSFER',
        },
        { headers: this._getHeaders() },
      );
      return response.data.id;
    } catch (error) {
      console.error('Quote Error:', error.response?.data || error);
      throw new Error(`Quote failed: ${this._parseError(error)}`);
    }
  }

  // ==================== HELPER METHODS ====================
  _getHeaders() {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  async _createTransfer({ targetAccount, quoteUuid, reference, purpose, sourceAccountId }) {
    const requestBody = {
      targetAccount: parseInt(targetAccount),
      quoteUuid,
      customerTransactionId: crypto.randomUUID(),
      details: {
        reference,
        transferPurpose: purpose,
        sourceOfFunds: 'SAVINGS',
      },
    };
    
    // Add sourceAccountId if provided
    if (sourceAccountId) {
      requestBody.sourceAccountId = parseInt(sourceAccountId);
    }
    
    const response = await axios.post(
      `${this.apiBaseUrl}/v1/transfers`,
      requestBody,
      { headers: this._getHeaders() },
    );
    return response.data;
  }

  _formatPaymentResponse(transfer, useQosyneBalance = false) {
    console.log('Transfer:', transfer);
    const response = {
      paymentId: JSON.stringify(transfer.id),
      payedAmount: parseFloat(transfer.sourceValue || transfer.sourceAmount),
      response: {
        ...transfer,
        source: useQosyneBalance ? 'QOSYNE_BALANCE' : 'USER_PAYMENT_METHOD',
      },
    };
    return response;
  }

  // Update _formatAddress to handle different address structures:
  _formatAddress(address) {
    return {
      firstLine: address.firstLine || address.addressLine1 || '',
      city: address.city || address.town || '',
      postCode: address.postCode || address.postalCode || '',
      ...(address.state && { state: address.state }),
      country: address.country,
    };
  }

  _parseError(error) {
    if (error.response?.data?.errors) {
      return error.response.data.errors
        .map((e) => `${e.path?.join('.') || 'field'}: ${e.message}`)
        .join(', ');
    }
    return error.message;
  }
}

module.exports = WiseGateway;
