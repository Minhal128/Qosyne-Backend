/**
 * Transaction Routing Engine
 * Automatically routes transactions to the correct connector based on wallet compatibility
 * 
 * Transfer Rules:
 * ✅ PayPal ↔ Venmo (bidirectional via Braintree)
 * ✅ Square ↔ Square (internal transfers)
 * ✅ Wise → Bank Accounts (outbound only)
 */

const PayPalConnector = require('../connectors/PayPalConnector');
const WiseConnector = require('../connectors/WiseConnector');
const SquareConnector = require('../connectors/SquareConnector');
const ledgerService = require('./ledgerService');

class RoutingEngine {
  constructor() {
    // Initialize connectors
    this.connectors = {
      PAYPAL: new PayPalConnector(),
      VENMO: new PayPalConnector(), // Venmo uses same connector as PayPal
      WISE: new WiseConnector(),
      SQUARE: new SquareConnector(),
    };

    // Define transfer rules
    this.transferRules = {
      // PayPal ↔ Venmo (bidirectional)
      'PAYPAL-VENMO': true,
      'VENMO-PAYPAL': true,
      'PAYPAL-PAYPAL': true,
      'VENMO-VENMO': true,

      // Square ↔ Square (internal only)
      'SQUARE-SQUARE': true,

      // Wise → Bank (outbound only)
      'WISE-BANK': true,
      'WISE-WISE': true,
    };
  }

  /**
   * Route transaction to appropriate connector
   */
  async routeTransaction(params) {
    try {
      const { 
        fromUserId, 
        toUserId, 
        amount, 
        currency = 'USD',
        fromProvider, 
        toProvider,
        metadata = {} 
      } = params;

      console.log(`🔀 Routing transaction: ${fromProvider} → ${toProvider}`);

      // Check if transfer is allowed
      const routeKey = `${fromProvider}-${toProvider}`;
      if (!this.transferRules[routeKey]) {
        throw new Error(`Transfer not supported: ${fromProvider} → ${toProvider}`);
      }

      // Get appropriate connector
      const connector = this.getConnector(fromProvider, toProvider);
      
      if (!connector) {
        throw new Error(`No connector available for ${fromProvider} → ${toProvider}`);
      }

      // Get sender and receiver wallet details
      const senderWallet = await ledgerService.getConnectedWalletByProvider(fromUserId, fromProvider);
      const receiverWallet = await ledgerService.getConnectedWalletByProvider(toUserId, toProvider);

      if (!senderWallet) {
        throw new Error(`Sender ${fromProvider} wallet not found or not connected`);
      }

      // Execute transaction based on route type
      let result;
      
      if (this._isInternalTransfer(fromProvider, toProvider)) {
        // Internal ledger transfer
        result = await this._executeInternalTransfer({
          fromUserId,
          toUserId,
          amount,
          currency,
          fromProvider,
          toProvider,
          senderWallet,
          receiverWallet,
          metadata,
        });
      } else if (fromProvider === 'WISE') {
        // Wise to bank transfer
        result = await this._executeWiseTransfer({
          fromUserId,
          amount,
          currency,
          senderWallet,
          metadata,
          connector,
        });
      } else if (fromProvider === 'SQUARE' && toProvider === 'SQUARE') {
        // Square to Square
        result = await this._executeSquareTransfer({
          fromUserId,
          toUserId,
          amount,
          currency,
          senderWallet,
          receiverWallet,
          metadata,
          connector,
        });
      } else if ((fromProvider === 'PAYPAL' || fromProvider === 'VENMO') && 
                 (toProvider === 'PAYPAL' || toProvider === 'VENMO')) {
        // PayPal/Venmo transfer
        result = await this._executePayPalVenmoTransfer({
          fromUserId,
          toUserId,
          amount,
          currency,
          senderWallet,
          receiverWallet,
          metadata,
          connector,
        });
      } else {
        throw new Error('Unsupported transfer route');
      }

      return result;
    } catch (error) {
      console.error('Routing error:', error);
      throw error;
    }
  }

  /**
   * Get connector for provider pair
   */
  getConnector(fromProvider, toProvider) {
    // PayPal and Venmo use the same connector
    if ((fromProvider === 'PAYPAL' || fromProvider === 'VENMO') &&
        (toProvider === 'PAYPAL' || toProvider === 'VENMO')) {
      return this.connectors.PAYPAL;
    }

    // Square transfers
    if (fromProvider === 'SQUARE' && toProvider === 'SQUARE') {
      return this.connectors.SQUARE;
    }

    // Wise transfers
    if (fromProvider === 'WISE') {
      return this.connectors.WISE;
    }

    return null;
  }

  /**
   * Check if transfer should be internal (ledger-only)
   */
  _isInternalTransfer(fromProvider, toProvider) {
    // For now, all same-provider transfers can be internal
    return fromProvider === toProvider;
  }

  /**
   * Execute internal ledger transfer
   */
  async _executeInternalTransfer(params) {
    const { 
      fromUserId, 
      toUserId, 
      amount, 
      currency, 
      fromProvider,
      metadata 
    } = params;

    try {
      // Transfer in internal ledger
      const result = await ledgerService.transfer(fromUserId, toUserId, amount, {
        provider: fromProvider,
        currency,
        paymentId: `INT-${Date.now()}`,
      });

      return {
        success: true,
        type: 'INTERNAL',
        transactionId: `INT-${Date.now()}`,
        amount,
        currency,
        fromProvider,
        status: 'COMPLETED',
        ...result,
      };
    } catch (error) {
      console.error('Internal transfer error:', error);
      throw error;
    }
  }

  /**
   * Execute Wise to bank transfer
   */
  async _executeWiseTransfer(params) {
    const { fromUserId, amount, currency, senderWallet, metadata, connector } = params;

    try {
      // Create or use existing recipient
      let recipientId = metadata.recipientId;
      
      if (!recipientId && metadata.recipientDetails) {
        const recipient = await connector.createRecipient({
          currency: currency,
          type: metadata.accountType || 'iban',
          accountHolderName: metadata.recipientName,
          legalType: 'PRIVATE',
          details: metadata.recipientDetails,
        });
        recipientId = recipient.recipientId;
      }

      if (!recipientId) {
        throw new Error('Recipient details required for Wise transfer');
      }

      // Send money via Wise
      const result = await connector.sendMoney({
        amount,
        currency,
        recipientId,
        reference: metadata.reference || 'Payment via Qosyne',
      });

      if (result.success) {
        // Debit sender's internal ledger
        await ledgerService.debit(fromUserId, amount, {
          provider: 'WISE',
          currency,
          paymentId: result.transactionId,
          recipientInfo: {
            name: metadata.recipientName,
            account: recipientId,
          },
        });
      }

      return {
        ...result,
        type: 'EXTERNAL',
        fromProvider: 'WISE',
        toProvider: 'BANK',
      };
    } catch (error) {
      console.error('Wise transfer error:', error);
      throw error;
    }
  }

  /**
   * Execute Square to Square transfer
   */
  async _executeSquareTransfer(params) {
    const { 
      fromUserId, 
      toUserId, 
      amount, 
      currency, 
      senderWallet, 
      receiverWallet,
      metadata, 
      connector 
    } = params;

    try {
      // For Square, we process a payment
      const result = await connector.sendMoney({
        amount,
        currency,
        sourceId: senderWallet.paymentMethodToken,
        customerId: receiverWallet?.customerId,
        note: metadata.note || 'Transfer via Qosyne',
      });

      if (result.success) {
        // Update internal ledger
        await ledgerService.transfer(fromUserId, toUserId, amount, {
          provider: 'SQUARE',
          currency,
          paymentId: result.transactionId,
        });
      }

      return {
        ...result,
        type: 'EXTERNAL',
        fromProvider: 'SQUARE',
        toProvider: 'SQUARE',
      };
    } catch (error) {
      console.error('Square transfer error:', error);
      throw error;
    }
  }

  /**
   * Execute PayPal/Venmo transfer
   */
  async _executePayPalVenmoTransfer(params) {
    const { 
      fromUserId, 
      toUserId, 
      amount, 
      currency, 
      senderWallet,
      receiverWallet, 
      metadata, 
      connector 
    } = params;

    try {
      // Send money via Braintree
      const result = await connector.sendMoney({
        amount,
        currency,
        recipientEmail: receiverWallet?.accountEmail || metadata.recipientEmail,
        paymentMethodToken: senderWallet.paymentMethodToken,
        description: metadata.description || 'Transfer via Qosyne',
      });

      if (result.success) {
        // Update internal ledger
        await ledgerService.transfer(fromUserId, toUserId, amount, {
          provider: params.fromProvider,
          currency,
          paymentId: result.transactionId,
        });
      }

      return {
        ...result,
        type: 'EXTERNAL',
        fromProvider: params.fromProvider,
        toProvider: params.toProvider,
      };
    } catch (error) {
      console.error('PayPal/Venmo transfer error:', error);
      throw error;
    }
  }

  /**
   * Get all supported routes
   */
  getSupportedRoutes() {
    return Object.keys(this.transferRules)
      .filter(key => this.transferRules[key])
      .map(key => {
        const [from, to] = key.split('-');
        return { from, to };
      });
  }

  /**
   * Check if route is supported
   */
  isRouteSupported(fromProvider, toProvider) {
    const routeKey = `${fromProvider}-${toProvider}`;
    return !!this.transferRules[routeKey];
  }

  /**
   * Get connector instance for provider
   */
  getConnectorInstance(provider) {
    return this.connectors[provider.toUpperCase()] || null;
  }
}

module.exports = new RoutingEngine();
