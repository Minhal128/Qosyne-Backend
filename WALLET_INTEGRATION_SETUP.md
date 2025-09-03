# Wallet Integration Setup Guide

This guide explains how to set up the new wallet integration system that supports external wallet providers (PayPal, Google Pay, Wise, Square, Venmo) with Rapyd integration for cross-wallet transfers.

## Environment Variables Required

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL="mysql://username:password@localhost:3306/qosyne_db"

# Server Configuration
PORT=5000
NODE_ENV=development
BASE_URL=http://localhost:5000

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_BASE_URL=https://api.paypal.com
PAYPAL_WEBHOOK_SECRET=your_paypal_webhook_secret

# Google Pay Configuration
GOOGLEPAY_API_KEY=your_googlepay_api_key
GOOGLEPAY_WEBHOOK_SECRET=your_googlepay_webhook_secret

# Wise Configuration
WISE_API_KEY=your_wise_api_key
WISE_CLIENT_ID=your_wise_client_id
WISE_CLIENT_SECRET=your_wise_client_secret
WISE_BASE_URL=https://api.wise.com
WISE_WEBHOOK_SECRET=your_wise_webhook_secret

# Square Configuration
SQUARE_APPLICATION_ID=your_square_application_id
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_CLIENT_SECRET=your_square_client_secret
SQUARE_BASE_URL=https://connect.squareup.com
SQUARE_WEBHOOK_SECRET=your_square_webhook_secret

# Venmo Configuration
VENMO_CLIENT_ID=your_venmo_client_id
VENMO_CLIENT_SECRET=your_venmo_client_secret
VENMO_WEBHOOK_SECRET=your_venmo_webhook_secret

# Rapyd Configuration
RAPYD_ACCESS_KEY=your_rapyd_access_key
RAPYD_SECRET_KEY=your_rapyd_secret_key
RAPYD_BASE_URL=https://sandboxapi.rapyd.net
RAPYD_WEBHOOK_SECRET=your_rapyd_webhook_secret

# Email Configuration (if using nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

## Database Migration

Run the following command to apply the database schema changes:

```bash
npx prisma migrate dev --name wallet_integration_updates
```

## API Endpoints

### Wallet Management
- `GET /api/wallet-integration/wallets` - Get connected wallets
- `POST /api/wallet-integration/wallets/connect` - Connect a new wallet
- `DELETE /api/wallet-integration/wallets/:walletId/disconnect` - Disconnect a wallet
- `GET /api/wallet-integration/wallets/:walletId/balance` - Get wallet balance
- `POST /api/wallet-integration/wallets/:walletId/refresh` - Refresh wallet connection
- `GET /api/wallet-integration/wallets/auth/:provider/url` - Get OAuth authorization URL
- `POST /api/wallet-integration/wallets/auth/:provider/callback` - Handle OAuth callback

### Transactions
- `POST /api/wallet-integration/transactions/transfer` - Initiate peer-to-peer transfer
- `GET /api/wallet-integration/transactions/:transactionId` - Get transaction status
- `GET /api/wallet-integration/transactions` - Get transaction history
- `POST /api/wallet-integration/transactions/:transactionId/cancel` - Cancel pending transaction
- `POST /api/wallet-integration/transactions/:transactionId/retry` - Retry failed transaction
- `POST /api/wallet-integration/transactions/estimate-fees` - Estimate transfer fees
- `GET /api/wallet-integration/transactions/currencies/supported` - Get supported currency pairs

### QR Code Generation
- `POST /api/wallet-integration/qr/generate` - Generate generic QR code
- `GET /api/wallet-integration/qr/:qrId/status` - Get QR code status
- `POST /api/wallet-integration/qr/scan/:qrId` - Process QR code scan
- `POST /api/wallet-integration/qr/bank-deposit` - Generate bank deposit QR
- `POST /api/wallet-integration/qr/wallet-connect` - Generate wallet connection QR
- `DELETE /api/wallet-integration/qr/:qrId` - Deactivate QR code
- `GET /api/wallet-integration/qr` - Get user's QR codes

### Rapyd Integration
- `GET /api/wallet-integration/rapyd/payment-methods/:country` - Get payment methods by country
- `GET /api/wallet-integration/rapyd/exchange-rates` - Get exchange rates
- `GET /api/wallet-integration/rapyd/countries` - Get supported countries
- `GET /api/wallet-integration/rapyd/currencies` - Get supported currencies

### Webhooks
- `POST /api/webhooks/paypal` - PayPal webhook handler
- `POST /api/webhooks/googlepay` - Google Pay webhook handler
- `POST /api/webhooks/wise` - Wise webhook handler
- `POST /api/webhooks/square` - Square webhook handler
- `POST /api/webhooks/venmo` - Venmo webhook handler
- `POST /api/webhooks/rapyd` - Rapyd webhook handler
- `GET /api/webhooks/deliveries/:webhookId` - Get webhook delivery status
- `POST /api/webhooks/deliveries/:webhookId/retry` - Retry failed webhook
- `GET /api/webhooks/stats` - Get webhook statistics

## Features

### Multi-Wallet Support
- Connect and manage PayPal, Google Pay, Wise, Square, and Venmo wallets
- OAuth integration for secure wallet authentication
- Real-time balance checking and wallet status monitoring

### Peer-to-Peer Transfers
- Direct wallet-to-wallet transfers without storing funds
- Cross-wallet transfers via Rapyd for interoperability
- Fee estimation and transaction tracking
- Support for multiple currencies

### QR Code System
- Bank deposit QR codes for major banks
- Wallet connection QR codes for quick linking
- Payment request QR codes for universal payments
- Secure session-based authentication

### Webhook System
- Real-time payment status notifications
- Provider-specific webhook signature verification
- Comprehensive transaction logging
- Webhook delivery monitoring and retry mechanisms

### Rapyd Integration
- Cross-wallet transfer routing
- Payment method discovery by country
- Exchange rate calculations
- Beneficiary management

## Security Features

- JWT authentication for API access
- Webhook signature verification for all providers
- Rate limiting and request validation
- Secure token storage and refresh mechanisms
- Environment-based configuration for secrets

## Transaction Flow

### Same-Provider Transfers
1. User initiates transfer between same wallet provider
2. Direct API call to provider's transfer endpoint
3. Real-time status updates via webhooks
4. Transaction completed within provider's network

### Cross-Provider Transfers
1. User initiates transfer between different providers
2. Rapyd payment created from source wallet
3. Rapyd payout created to destination wallet
4. Settlement handled by Rapyd infrastructure
5. Status updates via Rapyd webhooks

## Adding New Wallet Providers

1. Add provider configuration to `services/walletService.js`
2. Implement OAuth flow methods
3. Add webhook handler in `services/webhookService.js`
4. Update transaction routing logic
5. Add provider-specific error handling
6. Update API documentation

## Testing

```bash
# Run the server
npm run dev

# Test webhook endpoints
curl -X POST http://localhost:5000/api/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

## Health Check

```bash
curl http://localhost:5000/
```

## Notes

- The system is designed to be scalable and easily extensible
- All sensitive data is stored securely with proper encryption
- Webhook signatures are verified for security
- The system supports both sandbox and production environments
- Comprehensive logging is implemented for debugging and monitoring
