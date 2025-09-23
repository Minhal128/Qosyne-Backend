// paymentGateways/VenmoGateway.js - Updated with payment method token fixes - FORCE PERMANENT URL UPDATE
const braintree = require('braintree');
const { MethodBasedPayment } = require('../interfaces/methodBasedPayment');

class VenmoGateway extends MethodBasedPayment {
  constructor() {
    super();
    // Use your real Braintree sandbox or production credentials here
    this.gateway = new braintree.BraintreeGateway({
      environment: braintree.Environment.Sandbox, // or Production
      merchantId: process.env.BT_MERCHANT_ID || 'test_merchant_id',
      publicKey: process.env.BT_PUBLIC_KEY || 'test_public_key',
      privateKey: process.env.BT_PRIVATE_KEY || 'test_private_key',
    });
  }

  /**
   * ATTACH PAYMENT METHOD
   * Pretends to "attach" a Venmo account to the user by creating or updating
   * a Braintree Customer with a Venmo PaymentMethod. Usually, you'd do this
   * after the client obtains a Venmo nonce. Here, `paymentMethodId` is that nonce.
   */
  async attachBankAccount({ customerId, paymentMethodId, bankAccount }) {
    try {
      if (!paymentMethodId) {
        throw new Error('Missing Venmo payment method nonce');
      }

      // Create or find a customer in Braintree
      let customer;
      if (customerId) {
        // Check if customer exists
        try {
          customer = await this.gateway.customer.find(customerId);
        } catch (error) {
          if (error.type === 'notFoundError') {
            // Create a new customer if not found
            const createResult = await this.gateway.customer.create({
              firstName: bankAccount?.name?.split(' ')[0] || 'Venmo',
              lastName: bankAccount?.name?.split(' ')[1] || 'User',
              email: bankAccount?.email || 'venmo@example.com',
            });
            
            if (!createResult.success) {
              throw new Error(`Failed to create customer: ${createResult.message}`);
            }
            
            customer = createResult.customer;
          } else {
            throw error;
          }
        }
      } else {
        // Create a new customer
        const createResult = await this.gateway.customer.create({
          firstName: bankAccount?.name?.split(' ')[0] || 'Venmo',
          lastName: bankAccount?.name?.split(' ')[1] || 'User',
          email: bankAccount?.email || 'venmo@example.com',
        });
        
        if (!createResult.success) {
          throw new Error(`Failed to create customer: ${createResult.message}`);
        }
        
        customer = createResult.customer;
      }

      // Add the payment method to the customer
      const paymentMethodResult = await this.gateway.paymentMethod.create({
        customerId: customer.id,
        paymentMethodNonce: paymentMethodId,
        options: {
          makeDefault: true,
          verifyCard: false,
        },
      });

      if (!paymentMethodResult.success) {
        throw new Error(`Failed to add payment method: ${paymentMethodResult.message}`);
      }

      console.log('✅ Successfully attached Venmo payment method');
      return {
        attachedPaymentMethodId: paymentMethodResult.paymentMethod.token,
        braintreePaymentMethodToken: paymentMethodResult.paymentMethod.token, // This is the token we need for transactions
        customerId: customer.id,
        customerDetails: {
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email,
        },
      };
    } catch (error) {
      console.error('❌ Braintree Venmo Error (attachBankAccount):', error);
      throw new Error(`Failed to attach Venmo account: ${error.message}`);
    }
  }

  /**
   * AUTHORIZE PAYMENT
   * Processes a payment using the Venmo payment method that was attached earlier.
   * Handles both wallet deposits and recipient transfers based on the walletDeposit flag.
   */
  async authorizePayment(paymentData) {
    try {
      const { 
        amount, 
        currency,
        paymentMethodId, 
        recipient,
        walletDeposit = false,
        customerId,
        useQosyneBalance = false,
        connectedWalletId
      } = paymentData;

      // Check for cross-platform transfer first
      if (connectedWalletId && !walletDeposit && !useQosyneBalance) {
        // Cross-platform transfer (Venmo → Other Wallet)
        console.log('Processing cross-platform transfer from Venmo to connected wallet:', connectedWalletId);
        
        const crypto = require('crypto');
        const transferId = crypto.randomUUID();
        return {
          paymentId: `venmo_cross_platform_${transferId.substring(0, 8)}`,
          payedAmount: parseFloat(amount),
          response: {
            id: `cross_platform_${transferId}`,
            status: 'cross_platform_pending',
            sourceValue: amount,
            sourceCurrency: currency || 'USD',
            targetValue: amount,
            targetCurrency: currency || 'USD',
            source: 'VENMO_CROSS_PLATFORM',
            connectedWalletId: connectedWalletId,
            transferType: 'CROSS_PLATFORM'
          }
        };
      }

      // Validate that walletDeposit and useQosyneBalance are mutually exclusive
      if (walletDeposit && useQosyneBalance) {
        throw new Error('walletDeposit and useQosyneBalance cannot both be true');
      }
      
      console.log('Processing Venmo payment:', { 
        amount, 
        walletDeposit, 
        useQosyneBalance 
      });

      if (useQosyneBalance) {
        // SPECIAL CASE: Using Qosyne Balance as payment source
        console.log('Using Qosyne balance for Venmo payment');
        
        // Use Braintree business account credentials from environment variables
        const businessPaymentMethodId = process.env.BRAINTREE_BUSINESS_PAYMENT_METHOD_ID;
        const businessCustomerId = process.env.BRAINTREE_BUSINESS_CUSTOMER_ID;
        
        if (!businessPaymentMethodId || !businessCustomerId) {
          throw new Error('Missing Braintree business account configuration');
        }
        
        // Create transaction request with business account as source
        const transactionRequest = {
          amount,
          paymentMethodToken: businessPaymentMethodId,
          options: {
            submitForSettlement: true,
          },
          customer: {
            id: businessCustomerId
          }
        };
        
        // Add recipient information if not a wallet deposit
        if (recipient) {
          transactionRequest.customFields = {
            recipient_name: recipient.name || '',
            recipient_email: recipient.email || '',
            recipient_phone: recipient.phone || '',
          };
          
          transactionRequest.orderId = `qosyne-to-recipient-${Date.now()}`;
          transactionRequest.descriptor = {
            name: 'Qosyne Transfer',
          };
        }
        
        // Execute transaction using Braintree
        const result = await this.gateway.transaction.sale(transactionRequest);
        
        if (!result.success) {
          throw new Error(result.message || 'Venmo transaction failed');
        }
        
        const transaction = result.transaction;
        console.log(`✅ Successfully processed recipient transfer with Venmo using Qosyne balance`);
        
        return {
          paymentId: transaction.id,
          payedAmount: parseFloat(amount),
          response: {
            id: transaction.id,
            status: transaction.status,
            amount: transaction.amount,
            currency: transaction.currencyIsoCode,
            source: 'QOSYNE_BALANCE',
            destination: 'RECIPIENT',
            recipientDetails: {
              name: recipient?.name,
              email: recipient?.email,
              phone: recipient?.phone
            }
          }
        };
      } else {
        // Regular Venmo payment flow using customer's payment method
        
        // Validate payment method ID - this should be the wallet ID, we'll look up the Braintree token
        if (!paymentMethodId) {
          throw new Error('Missing payment method ID');
        }
        
        // Look up the Braintree payment method token from the connected wallet
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        const connectedWallet = await prisma.connectedWallets.findFirst({
          where: {
            walletId: paymentMethodId,
            provider: 'VENMO',
            isActive: true
          }
        });
        
        if (!connectedWallet) {
          throw new Error(`Venmo wallet not found: ${paymentMethodId}`);
        }
        
        if (!connectedWallet.paymentMethodToken) {
          throw new Error(`Venmo wallet ${paymentMethodId} missing Braintree payment method token. Please reconnect your Venmo account through the app to generate a real Braintree sandbox payment method. Mock tokens have been removed for production-ready integration.`);
        }
        
        // Use the Braintree payment method token instead of wallet ID
        const braintreePaymentMethodToken = connectedWallet.paymentMethodToken;
        const braintreeCustomerId = connectedWallet.customerId || connectedWallet.accessToken; // accessToken stores customer ID for Venmo
        console.log(`✅ VenmoGateway Database Lookup Success:`);
        console.log(`   Wallet: ${paymentMethodId}`);
        console.log(`   Payment Method Token: ${braintreePaymentMethodToken}`);
        console.log(`   Customer ID: ${braintreeCustomerId}`);
        
        await prisma.$disconnect();
        
        // Validate customer ID (use the one from connected wallet)
        if (!braintreeCustomerId) {
          throw new Error(`Missing Braintree customer ID for Venmo wallet ${paymentMethodId}`);
        }
        
        // For non-wallet deposits, we need recipient information
        // However, if we have a connectedWalletId, we can use that for wallet-to-wallet transfers
        console.log('🔍 Validating recipient information:', {
          walletDeposit,
          hasRecipientName: !!(recipient?.name && recipient.name.trim() !== ''),
          connectedWalletId
        });
        
        if (!walletDeposit && !connectedWalletId && (!recipient || !recipient.name || recipient.name.trim() === '')) {
          throw new Error('Recipient information is required for transfers. Please provide recipient name or use wallet deposit.');
        }
        
        // If we have connectedWalletId, this is a wallet-to-wallet transfer with admin fee
        if (connectedWalletId) {
          console.log(`🔄 Processing wallet-to-wallet transfer with admin fee to wallet ${connectedWalletId}`);
        }

        const transactionRequest = {
          amount,
          paymentMethodToken: braintreePaymentMethodToken,
          options: {
            submitForSettlement: true,
          }
          // Don't include customer object - payment method token already has customer association
        };

        // Add additional data based on payment type
        if (walletDeposit) {
          // For wallet deposits, send to merchant account
          transactionRequest.merchantAccountId = process.env.BT_MERCHANT_ACCOUNT_ID;
          transactionRequest.orderId = `wallet-deposit-${Date.now()}`;
          transactionRequest.descriptor = {
            name: 'Wallet Deposit',
          };
        } else {
          // For recipient transfers, include recipient information
          if (recipient && recipient.name) {
            transactionRequest.shipping = {
              firstName: recipient.name.split(' ')[0] || '',
              lastName: recipient.name.split(' ').slice(1).join(' ') || '',
              countryCodeAlpha2: 'US', // Default to US
            };
            
            if (recipient.email) {
              transactionRequest.customer.email = recipient.email;
            }
            
            if (recipient.phone) {
              transactionRequest.customer.phone = recipient.phone;
            }
          } else if (connectedWalletId) {
            // For wallet-to-wallet transfers, use a generic recipient
            transactionRequest.shipping = {
              firstName: 'Wallet',
              lastName: 'Transfer',
              countryCodeAlpha2: 'US',
            };
            transactionRequest.orderId = `wallet-transfer-${connectedWalletId}-${Date.now()}`;
          }

          // In a real implementation, you might use a different merchant account
          // for different recipient types, or use Braintree's disbursement feature
          transactionRequest.orderId = `recipient-transfer-${Date.now()}`;
          transactionRequest.descriptor = {
            name: 'Transfer Payment',
          };
        }

        // REAL Braintree transaction
        console.log('💳 Processing REAL Braintree Venmo transaction');
        console.log('🔑 Using payment method token:', braintreePaymentMethodToken);
        console.log('👤 Customer ID:', braintreeCustomerId);
        
        const result = await this.gateway.transaction.sale(transactionRequest);

        if (!result.success) {
          console.log('❌ Braintree transaction failed:', result);
          throw new Error(`Braintree Venmo transaction failed: ${result.message || 'Unknown error'} - Check payment method token validity`);
        }
        
        console.log('✅ REAL Braintree transaction successful:', result.transaction.id);

        const transaction = result.transaction;
        console.log(`✅ Successfully processed ${walletDeposit ? 'wallet deposit' : 'recipient transfer'} with Venmo`);
        
        return {
          payedAmount: parseFloat(amount),
          paymentId: transaction.id,
          status: transaction.status,
          response: {
            transactionId: transaction.id,
            status: transaction.status,
            amount: transaction.amount,
            currency: transaction.currencyIsoCode,
            destination: walletDeposit ? 'BUSINESS_ACCOUNT' : 'RECIPIENT',
            recipientDetails: walletDeposit ? null : {
              name: recipient?.name,
              email: recipient?.email || null
            }
          }
        };
      }
    } catch (error) {
      console.error('❌ Braintree Venmo Error (authorizePayment):', error);
      throw new Error(`Failed to authorize Venmo payment: ${error.message}`);
    }
  }
}

module.exports = VenmoGateway;
