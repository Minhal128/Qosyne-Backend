// interfaces/orderBasedPayment.js

class OrderBasedPayment {
  constructor() {
    if (this.constructor === OrderBasedPayment) {
      throw new Error(
        'OrderBasedPayment is an abstract class and cannot be instantiated.',
      );
    }
  }

  async createOrder(_params) {
    throw new Error('Method not implemented: createOrder');
  }

  async authorizePayment(_params) {
    throw new Error('Method not implemented: authorizePayment');
  }

  async paymentCapture(_params) {
    throw new Error('Method not implemented: paymentCapture');
  }

  // Additional methods if needed: cancelOrder, requestPayout, etc.
}

module.exports = { OrderBasedPayment };
