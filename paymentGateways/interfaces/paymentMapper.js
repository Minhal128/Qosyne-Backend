// paymentMapper.ts
// import { MethodBasedPayment } from './methodBasePayment';
// const { OrderBasedPayment } = require('./orderBasePayment');
// import { Payment } from './payment';

function getMethodBasedPayment(payment) {
  if (payment.type === 'methodBased') {
    return payment;
  } else {
    throw new Error('Invalid payment type for MethodBasedPayment');
  }
}
function getOrderBasedPayment(payment) {
  if (payment.type === 'orderBased') {
    return payment;
  } else {
    throw new Error('Invalid payment type for OrderBasedPayment');
  }
}

module.exports = { getOrderBasedPayment, getMethodBasedPayment };
