const stripe = require('stripe');
const { MethodBasedPayment } = require('../interfaces/methodBasedPayment');
const { v4: uuidv4 } = require('uuid');

class StripeGateway extends MethodBasedPayment {
  constructor() {
    super();
    this.stripe = stripe(process.env.STRIPE_SECRET_KEY);
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  async attachBankAccount({ userId, paymentMethodId, bankAccount }) {
    try {
      console.log('Attaching Stripe payment method:', { 
        paymentMethodId,
        customerEmail: bankAccount?.email 
      });

      // Create or get customer
      let customer;
      if (bankAccount?.email) {
        const existingCustomers = await this.stripe.customers.list({
          email: bankAccount.email,
          limit: 1
        });
        
        if (existingCustomers.data.length > 0) {
          customer = existingCustomers.data[0];
        } else {
          customer = await this.stripe.customers.create({
            email: bankAccount.email,
            name: bankAccount?.name || 'Stripe User',
            metadata: {
              userId: userId.toString()
            }
          });
        }
      } else {
        customer = await this.stripe.customers.create({
          name: bankAccount?.name || 'Stripe User',
          metadata: {
            userId: userId.toString()
          }
        });
      }

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id
      });

      // Set as default payment method
      await this.stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      return {
        attachedPaymentMethodId: paymentMethodId,
        connectedWalletId: customer.id,
        customerDetails: {
          name: bankAccount?.name || 'Stripe User',
          currency: bankAccount?.currency || 'USD',
          email: bankAccount?.email,
          stripeCustomerId: customer.id
        }
      };
    } catch (error) {
      console.error('Error attaching Stripe payment method:', error);
      throw new Error(`Failed to attach Stripe payment method: ${error.message}`);
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

      console.log('Processing Stripe payment:', {
        amount,
        currency,
        walletDeposit,
        useQosyneBalance
      });

      if (useQosyneBalance) {
        // Handle Qosyne balance case
        console.log('Using Qosyne balance for Stripe payment');
        
        if (recipient?.email) {
          // Create a transfer to recipient
          const transfer = await this.stripe.transfers.create({
            amount: Math.round(parseFloat(amount) * 100), // Convert to cents
            currency: currency.toLowerCase(),
            destination: recipient.stripeAccountId || recipient.email,
            description: `Transfer from Qosyne to ${recipient.email}`,
            metadata: {
              source: 'QOSYNE_BALANCE',
              recipientEmail: recipient.email
            }
          });

          return {
            paymentId: transfer.id,
            payedAmount: parseFloat(amount),
            response: {
              ...transfer,
              source: 'QOSYNE_BALANCE',
              destination: 'RECIPIENT'
            }
          };
        } else {
          throw new Error('Recipient details required for Qosyne balance transfer');
        }
      } else if (walletDeposit) {
        // Handle wallet deposit
        const paymentIntent = await this.stripe.paymentIntents.create({
          amount: Math.round(parseFloat(amount) * 100), // Convert to cents
          currency: currency.toLowerCase(),
          payment_method: paymentToken,
          customer: connectedWalletId,
          confirm: true,
          description: 'Qosyne Wallet Deposit',
          metadata: {
            type: 'WALLET_DEPOSIT',
            userId: paymentData.userId
          }
        });

        return {
          paymentId: paymentIntent.id,
          payedAmount: parseFloat(amount),
          response: paymentIntent
        };
      } else {
        // Handle regular payment to recipient
        if (recipient?.email) {
          // Create a charge for recipient
          const charge = await this.stripe.charges.create({
            amount: Math.round(parseFloat(amount) * 100), // Convert to cents
            currency: currency.toLowerCase(),
            source: paymentToken,
            customer: connectedWalletId,
            description: `Payment to ${recipient.email}`,
            metadata: {
              recipientEmail: recipient.email,
              recipientName: recipient.name
            }
          });

          return {
            paymentId: charge.id,
            payedAmount: parseFloat(amount),
            response: charge
          };
        } else {
          // Regular payment without specific recipient
          const paymentIntent = await this.stripe.paymentIntents.create({
            amount: Math.round(parseFloat(amount) * 100), // Convert to cents
            currency: currency.toLowerCase(),
            payment_method: paymentToken,
            customer: connectedWalletId,
            confirm: true,
            description: 'Stripe Payment',
            metadata: {
              userId: paymentData.userId
            }
          });

          return {
            paymentId: paymentIntent.id,
            payedAmount: parseFloat(amount),
            response: paymentIntent
          };
        }
      }
    } catch (error) {
      console.error('Stripe payment error:', error);
      throw new Error(`Stripe payment failed: ${error.message}`);
    }
  }

  async createPaymentToken(paymentMethodData) {
    try {
      // This method is typically used on the frontend with Stripe.js
      // For backend, we usually receive the payment method ID from frontend
      throw new Error('Use Stripe.js on frontend to create payment tokens');
    } catch (error) {
      console.error('Error creating Stripe payment token:', error);
      throw new Error(`Failed to create payment token: ${error.message}`);
    }
  }

  async createOrder({ userId, price, currency = 'USD', state }) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(parseFloat(price) * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          userId: userId.toString(),
          state: state
        }
      });

      return {
        orderID: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        links: [
          {
            href: `${process.env.CLIENT}/payment/confirm?payment_intent=${paymentIntent.id}&state=${state}`,
            rel: 'confirm'
          }
        ]
      };
    } catch (error) {
      console.error('Error creating Stripe order:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  async getCustomerPaymentMethods(customerId) {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year
        } : null,
        billingDetails: pm.billing_details
      }));
    } catch (error) {
      console.error('Error fetching customer payment methods:', error);
      throw new Error(`Failed to fetch payment methods: ${error.message}`);
    }
  }

  async createCustomerPortalSession(customerId, returnUrl) {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      });

      return session.url;
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      throw new Error(`Failed to create portal session: ${error.message}`);
    }
  }
}

module.exports = StripeGateway;
