const { MethodBasedPayment } = require('../interfaces/methodBasedPayment');

class MockSquareGateway extends MethodBasedPayment {
  constructor() {
    super();
    console.log('🧪 Using Mock Square Gateway for testing');
  }

  async createOrGetCustomer(email, name) {
    console.log('🧪 Mock: Creating/Getting Square customer');
    return {
      id: 'mock_customer_' + Date.now(),
      email,
      name
    };
  }

  async attachBankAccount(customerId, bankToken, email, name) {
    console.log('🧪 Mock: Attaching bank account to Square customer');
    return {
      success: true,
      customerId,
      paymentMethodId: 'mock_payment_method_' + Date.now(),
      walletId: 'mock_wallet_' + Date.now()
    };
  }

  async processPayment(paymentData) {
    console.log('🧪 Mock: Processing Square payment');
    return {
      success: true,
      transactionId: 'mock_transaction_' + Date.now(),
      amount: paymentData.amount,
      currency: paymentData.currency || 'USD',
      status: 'COMPLETED'
    };
  }

  async createPayment(paymentData) {
    console.log('🧪 Mock: Creating Square payment');
    return {
      id: 'mock_payment_' + Date.now(),
      status: 'COMPLETED',
      amount: paymentData.amount,
      currency: paymentData.currency || 'USD'
    };
  }
}

module.exports = MockSquareGateway;
