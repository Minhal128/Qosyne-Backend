const braintree = require('braintree');
const { MethodBasedPayment } = require('../interfaces/methodBasedPayment');
const { v4: uuidv4 } = require('uuid');

class BraintreeGateway extends MethodBasedPayment {
  constructor() {
    super();
    
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Initialize Braintree gateway (use BraintreeGateway constructor)
    this.gateway = new braintree.BraintreeGateway({
      environment: this.isProduction ? braintree.Environment.Production : braintree.Environment.Sandbox,
      merchantId: process.env.BT_MERCHANT_ID,
      publicKey: process.env.BT_PUBLIC_KEY,
      privateKey: process.env.BT_PRIVATE_KEY
    });
  }

  async attachBankAccount({ userId, paymentMethodId, bankAccount }) {
    try {
      console.log('Attaching Braintree payment method:', { 
        paymentMethodId,
        customerEmail: bankAccount?.email 
      });

      // Create or get customer
      let customer;
      if (bankAccount?.email) {
        const searchResult = await this.gateway.customer.search((search) => {
          search.email().is(bankAccount.email);
        });
        
        if (searchResult.length > 0) {
          customer = searchResult[0];
        } else {
          const createPayload = {
            email: bankAccount.email,
            firstName: bankAccount?.firstName || bankAccount?.name?.split(' ')[0] || 'Braintree',
            lastName: bankAccount?.lastName || bankAccount?.name?.split(' ').slice(1).join(' ') || 'User',
          };
          if (userId !== undefined && userId !== null) {
            createPayload.customFields = { userId: String(userId) };
          }
          const createResult = await this.gateway.customer.create(createPayload);
          
          if (!createResult.success) {
            throw new Error(`Failed to create customer: ${createResult.message}`);
          }
          
          customer = createResult.customer;
        }
      } else {
        const createPayload = {
          firstName: bankAccount?.firstName || bankAccount?.name?.split(' ')[0] || 'Braintree',
          lastName: bankAccount?.lastName || bankAccount?.name?.split(' ').slice(1).join(' ') || 'User',
        };
        if (userId !== undefined && userId !== null) {
          createPayload.customFields = { userId: String(userId) };
        }
        const createResult = await this.gateway.customer.create(createPayload);
        
        if (!createResult.success) {
          throw new Error(`Failed to create customer: ${createResult.message}`);
        }
        
        customer = createResult.customer;
      }

      // Attach payment method to customer
      const paymentMethodResult = await this.gateway.paymentMethod.create({
        customerId: customer.id,
        paymentMethodNonce: paymentMethodId,
        options: {
          makeDefault: true
        }
      });

      if (!paymentMethodResult.success) {
        throw new Error(`Failed to attach payment method: ${paymentMethodResult.message}`);
      }

      return {
        attachedPaymentMethodId: paymentMethodResult.paymentMethod.token,
        connectedWalletId: customer.id,
        customerDetails: {
          name: `${customer.firstName} ${customer.lastName}`,
          currency: bankAccount?.currency || 'USD',
          email: customer.email,
          braintreeCustomerId: customer.id
        }
      };
    } catch (error) {
      console.error('Error attaching Braintree payment method:', error);
      throw new Error(`Failed to attach Braintree payment method: ${error.message}`);
    }
  }

  async authorizePayment(paymentData) {
    try {
      const {
        amount,
        currency = 'USD',
        paymentToken,
        connectedWalletId,
        recipient,
        walletDeposit = false,
        useQosyneBalance = false
      } = paymentData;

      // Validate that walletDeposit and useQosyneBalance are mutually exclusive
      if (walletDeposit && useQosyneBalance) {
        throw new Error('walletDeposit and useQosyneBalance cannot both be true');
      }

      console.log('Processing Braintree payment:', {
        amount,
        currency,
        walletDeposit,
        useQosyneBalance
      });

      if (useQosyneBalance) {
        // Handle Qosyne balance case
        console.log('Using Qosyne balance for Braintree payment');
        
        if (recipient?.email) {
          // For Braintree, we would typically use their marketplace features
          // or create a separate transaction to the recipient
          const transactionResult = await this.gateway.transaction.sale({
            amount: amount,
            paymentMethodToken: paymentToken,
            customerId: connectedWalletId,
            options: {
              submitForSettlement: true
            },
            customFields: {
              source: 'QOSYNE_BALANCE',
              recipientEmail: recipient.email,
              transactionType: 'TRANSFER'
            }
          });

          if (!transactionResult.success) {
            throw new Error(`Transaction failed: ${transactionResult.message}`);
          }

          return {
            paymentId: transactionResult.transaction.id,
            payedAmount: parseFloat(amount),
            response: {
              ...transactionResult.transaction,
              source: 'QOSYNE_BALANCE',
              destination: 'RECIPIENT'
            }
          };
        } else {
          throw new Error('Recipient details required for Qosyne balance transfer');
        }
      } else if (walletDeposit) {
        // Handle wallet deposit
        const transactionResult = await this.gateway.transaction.sale({
          amount: amount,
          paymentMethodToken: paymentToken,
          customerId: connectedWalletId,
          options: {
            submitForSettlement: true
          },
          customFields: {
            transactionType: 'WALLET_DEPOSIT',
            userId: paymentData.userId?.toString()
          }
        });

        if (!transactionResult.success) {
          throw new Error(`Transaction failed: ${transactionResult.message}`);
        }

        return {
          paymentId: transactionResult.transaction.id,
          payedAmount: parseFloat(amount),
          response: transactionResult.transaction
        };
      } else {
        // Handle regular payment to recipient
        if (recipient?.email) {
          const transactionResult = await this.gateway.transaction.sale({
            amount: amount,
            paymentMethodToken: paymentToken,
            customerId: connectedWalletId,
            options: {
              submitForSettlement: true
            },
            customFields: {
              recipientEmail: recipient.email,
              recipientName: recipient.name,
              transactionType: 'PAYMENT'
            }
          });

          if (!transactionResult.success) {
            throw new Error(`Transaction failed: ${transactionResult.message}`);
          }

          return {
            paymentId: transactionResult.transaction.id,
            payedAmount: parseFloat(amount),
            response: transactionResult.transaction
          };
        } else {
          // Regular payment without specific recipient
          const transactionResult = await this.gateway.transaction.sale({
            amount: amount,
            paymentMethodToken: paymentToken,
            customerId: connectedWalletId,
            options: {
              submitForSettlement: true
            },
            customFields: {
              userId: paymentData.userId?.toString(),
              transactionType: 'PAYMENT'
            }
          });

          if (!transactionResult.success) {
            throw new Error(`Transaction failed: ${transactionResult.message}`);
          }

          return {
            paymentId: transactionResult.transaction.id,
            payedAmount: parseFloat(amount),
            response: transactionResult.transaction
          };
        }
      }
    } catch (error) {
      console.error('Braintree payment error:', error);
      throw new Error(`Braintree payment failed: ${error.message}`);
    }
  }

  async createPaymentToken(paymentMethodData) {
    try {
      // Generate client token for frontend
      const clientTokenResult = await this.gateway.clientToken.generate({
        customerId: paymentMethodData.customerId
      });

      if (!clientTokenResult.success) {
        throw new Error(`Failed to generate client token: ${clientTokenResult.message}`);
      }

      return {
        clientToken: clientTokenResult.clientToken
      };
    } catch (error) {
      console.error('Error creating Braintree payment token:', error);
      throw new Error(`Failed to create payment token: ${error.message}`);
    }
  }

  async createOrder({ userId, price, currency = 'USD', state }) {
    try {
      // Generate client token for the order
      const clientTokenResult = await this.gateway.clientToken.generate({});

      if (!clientTokenResult.success) {
        throw new Error(`Failed to generate client token: ${clientTokenResult.message}`);
      }

      return {
        orderID: `braintree_order_${Date.now()}`,
        clientToken: clientTokenResult.clientToken,
        links: [
          {
            href: `${process.env.CLIENT}/payment/braintree?client_token=${clientTokenResult.clientToken}&state=${state}`,
            rel: 'approve'
          }
        ]
      };
    } catch (error) {
      console.error('Error creating Braintree order:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  async getCustomerPaymentMethods(customerId) {
    try {
      const customer = await this.gateway.customer.find(customerId);
      
      return customer.paymentMethods.map(pm => ({
        token: pm.token,
        type: pm.cardType || pm.paymentInstrumentType,
        card: pm.cardType ? {
          brand: pm.cardType,
          last4: pm.last4,
          expMonth: pm.expirationMonth,
          expYear: pm.expirationYear
        } : null,
        isDefault: pm.default
      }));
    } catch (error) {
      console.error('Error fetching customer payment methods:', error);
      throw new Error(`Failed to fetch payment methods: ${error.message}`);
    }
  }

  async generateClientToken(customerId = null) {
    try {
      const params = customerId ? { customerId } : {};
      const result = await this.gateway.clientToken.generate(params);
      
      if (!result.success) {
        throw new Error(`Failed to generate client token: ${result.message}`);
      }
      
      return result.clientToken;
    } catch (error) {
      console.error('Error generating client token:', error);
      throw new Error(`Failed to generate client token: ${error.message}`);
    }
  }
}

module.exports = BraintreeGateway;
