
const https = require('https');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const braintree = require('braintree');

// --- Apple Pay Configuration ---
// IMPORTANT: Never commit your Apple private key into the repository. You can provide it
// either as a path to the key file (APPLE_PAY_PRIVATE_KEY_PATH) or as the raw PEM string
// in the APPLE_PAY_PRIVATE_KEY environment variable. The certificate path may point to
// your Apple Pay merchant certificate (.cer/.pem) that Apple issued.
const APPLE_PAY_CERTIFICATE_PATH = process.env.APPLE_PAY_CERTIFICATE_PATH || path.join(__dirname, '..', '..', '..', 'apple_pay.csr');
const APPLE_PAY_PRIVATE_KEY_PATH = process.env.APPLE_PAY_PRIVATE_KEY_PATH || path.join(__dirname, '..', '..', '..', 'apple_pay.key');
const APPLE_PAY_PRIVATE_KEY_ENV = process.env.APPLE_PAY_PRIVATE_KEY || null; // PEM string
const APPLE_PAY_MERCHANT_ID = process.env.APPLE_PAY_MERCHANT_ID; // e.g. Merchant.com.qosyne
const APPLE_PAY_MERCHANT_DOMAIN = process.env.APPLE_PAY_MERCHANT_DOMAIN || 'qosyncefrontend.vercel.app';

// Braintree configuration (optional)
const BRAINTREE_ENVIRONMENT = process.env.BRAINTREE_ENVIRONMENT || 'Sandbox';
const BRAINTREE_MERCHANT_ID = process.env.BRAINTREE_MERCHANT_ID;
const BRAINTREE_PUBLIC_KEY = process.env.BRAINTREE_PUBLIC_KEY;
const BRAINTREE_PRIVATE_KEY = process.env.BRAINTREE_PRIVATE_KEY;

let braintreeGateway = null;
if (BRAINTREE_MERCHANT_ID && BRAINTREE_PUBLIC_KEY && BRAINTREE_PRIVATE_KEY) {
    braintreeGateway = new braintree.BraintreeGateway({
        environment: braintree.Environment[BRAINTREE_ENVIRONMENT] || braintree.Environment.Sandbox,
        merchantId: BRAINTREE_MERCHANT_ID,
        publicKey: BRAINTREE_PUBLIC_KEY,
        privateKey: BRAINTREE_PRIVATE_KEY,
    });
}

exports.validateMerchant = async (req, res) => {
    const { validationUrl, merchantIdentifier } = req.body;

    try {
        console.log('Apple Pay validation request:', { validationUrl, merchantIdentifier: APPLE_PAY_MERCHANT_ID });

        // Validate required environment variables
        if (!APPLE_PAY_MERCHANT_ID) {
            console.error('APPLE_PAY_MERCHANT_ID is not set in environment variables');
            return res.status(500).json({ error: 'Apple Pay merchant ID not configured.' });
        }

        if (!APPLE_PAY_MERCHANT_DOMAIN) {
            console.error('APPLE_PAY_MERCHANT_DOMAIN is not set in environment variables');
            return res.status(500).json({ error: 'Apple Pay merchant domain not configured.' });
        }

        // Prepare request data
        const requestData = {
            merchantIdentifier: APPLE_PAY_MERCHANT_ID,
            displayName: 'Qosyne',
            initiative: 'web',
            initiativeContext: APPLE_PAY_MERCHANT_DOMAIN,
        };

        console.log('Apple Pay validation request data:', requestData);

        // Load certificate
        if (!fs.existsSync(APPLE_PAY_CERTIFICATE_PATH)) {
            console.error(`Apple Pay certificate not found at: ${APPLE_PAY_CERTIFICATE_PATH}`);
            return res.status(500).json({ error: 'Apple Pay certificate not found. Please ensure the certificate file is uploaded to the server.' });
        }
        const cert = fs.readFileSync(APPLE_PAY_CERTIFICATE_PATH);

        // Load private key either from env or file
        let key = null;
        if (APPLE_PAY_PRIVATE_KEY_ENV) {
            // If the PEM was stored in an env var with escaped newlines ("\n"), convert them to real newlines
            key = APPLE_PAY_PRIVATE_KEY_ENV;
            if (typeof key === 'string' && key.indexOf('\\n') !== -1) {
                key = key.replace(/\\n/g, '\n');
            }
        } else if (fs.existsSync(APPLE_PAY_PRIVATE_KEY_PATH)) {
            key = fs.readFileSync(APPLE_PAY_PRIVATE_KEY_PATH);
        } else {
            console.error('Apple Pay private key not provided in env or file path');
            return res.status(500).json({ error: 'Apple Pay private key not configured. Provide APPLE_PAY_PRIVATE_KEY or APPLE_PAY_PRIVATE_KEY_PATH.' });
        }

        // Create HTTPS agent for mutual TLS to Apple's validation URL
        const httpsAgent = new https.Agent({
            cert,
            key,
            // In production, you should leave rejectUnauthorized true to validate Apple's certificate chain.
            rejectUnauthorized: process.env.NODE_ENV === 'production',
        });

        const response = await axios.post(validationUrl, requestData, {
            httpsAgent,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Apple Pay validation successful');
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Apple Pay merchant validation error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            config: {
                url: validationUrl,
                method: 'POST',
                data: {
                    merchantIdentifier: APPLE_PAY_MERCHANT_ID,
                    displayName: 'Qosyne',
                    initiative: 'web',
                    initiativeContext: APPLE_PAY_MERCHANT_DOMAIN,
                }
            }
        });
        
        const errorMessage = error.response?.data?.message || error.message || 'Failed to validate Apple Pay merchant';
        res.status(error.response?.status || 500).json({ 
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

exports.processPayment = async (req, res) => {
    const { payment, userId } = req.body;

    try {
        console.log('Processing Apple Pay payment:', { payment: !!payment, userId });

        // Determine amount & currency - prefer server-side calculation in real apps
        const amount = (payment && payment.total && payment.total.amount) || '1.00';
        const currency = (payment && payment.total && payment.total.currency) || 'USD';

        // If client sent a Braintree paymentMethodNonce, attempt to create a transaction
        const paymentMethodNonce = payment && payment.token && payment.token.paymentData && payment.token.paymentData && payment.token.paymentData.nonce;

        if (paymentMethodNonce && braintreeGateway) {
            // Create sale transaction with Braintree
            const saleRequest = {
                amount: amount,
                paymentMethodNonce: paymentMethodNonce,
                options: {
                    submitForSettlement: true,
                },
            };

            const result = await braintreeGateway.transaction.sale(saleRequest);
            if (result && result.success) {
                const btTransaction = result.transaction;
                const transaction = await prisma.transaction.create({
                    data: {
                        userId,
                        amount: Number(amount),
                        currency,
                        provider: 'BRAINTREE_APPLE_PAY',
                        status: 'COMPLETED',
                        metadata: {
                            braintreeId: btTransaction.id,
                            processorResponse: btTransaction.processorResponseText,
                        }
                    },
                });
                return res.status(200).json({ success: true, transaction, braintree: btTransaction });
            }

            console.error('Braintree transaction failed', result);
            return res.status(500).json({ error: 'Braintree transaction failed', details: result });
        }

        // Fallback: just record the transaction (for testing/demo purposes only)
        const tx = await prisma.transaction.create({
            data: {
                userId,
                amount: Number(amount),
                currency,
                provider: 'APPLE_PAY',
                status: 'PENDING',
            },
        });

        res.status(200).json({ success: true, transaction: tx });
    } catch (error) {
        console.error('Apple Pay payment processing error:', error);
        res.status(500).json({ error: 'Failed to process Apple Pay payment' });
    }
};
