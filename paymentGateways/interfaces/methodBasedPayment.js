// interfaces/methodBasedPayment.js

class MethodBasedPayment {
  constructor() {
    if (this.constructor === MethodBasedPayment) {
      throw new Error(
        'MethodBasedPayment is an abstract class and cannot be instantiated.',
      );
    }
  }

  // Typically these revolve around “payment methods” (e.g. in Stripe or Payoneer)
  async createPaymentMethod(_params) {
    throw new Error('Method not implemented: createPaymentMethod');
  }

  async authorizePayment(_params) {
    throw new Error('Method not implemented: authorizePayment');
  }

  async paymentCapture(_params) {
    throw new Error('Method not implemented: paymentCapture');
  }

  // Additional methods if needed (attachPaymentMethod, requestPayout, etc.)
}

module.exports = { MethodBasedPayment };
