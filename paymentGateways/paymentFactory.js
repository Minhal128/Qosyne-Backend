// paymentFactory.js
const PayPalGateway = require('./gateways/PayPalGateway');
const GooglePayGateway = require('./gateways/GooglePayGateway');
const VenmoGateway = require('./gateways/VenmoGateway');
const ApplePayGateway = require('./gateways/ApplePayGateway');
const WiseGateway = require('./gateways/WiseGateway');
const SquareGateway = require('./gateways/SquareGateway');
const StripeGateway = require('./gateways/StripeGateway');
const BraintreeGateway = require('./gateways/BraintreeGateway');

/**
 * Returns an instance of the corresponding payment gateway class.
 * @param {string} gatewayName - e.g. "paypal", "stripe", "payoneer", ...
 */
function paymentFactory(gatewayName) {
  console.log('gatewayName', gatewayName);
  switch (gatewayName.toLowerCase()) {
    case 'paypal':
      return new PayPalGateway();
    case 'wise':
      return new WiseGateway();
    case 'googlepay':
      return new GooglePayGateway();
    case 'venmo':
      return new VenmoGateway();
    case 'applepay':
      return new ApplePayGateway();
    case 'square':
      return new SquareGateway();
    case 'stripe':
      return new StripeGateway();
    case 'braintree':
      return new BraintreeGateway();
    default:
      throw new Error(`Unsupported payment gateway: ${gatewayName}`);
  }
}

module.exports = { paymentFactory };
