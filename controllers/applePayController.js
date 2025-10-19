
const https = require('https');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- Apple Pay Configuration ---
// IMPORTANT: Replace these with the actual paths to your certificate and key files.
// These files should be stored securely on your server.
const APPLE_PAY_CERTIFICATE_PATH = path.join(__dirname, '..', '..', '..', 'apple_pay.csr');
const APPLE_PAY_PRIVATE_KEY_PATH = path.join(__dirname, '..', '..', '..', 'apple_pay.key');
const APPLE_PAY_MERCHANT_ID = process.env.APPLE_PAY_MERCHANT_ID; // Merchant.com.qosyne
const APPLE_PAY_MERCHANT_DOMAIN = process.env.APPLE_PAY_MERCHANT_DOMAIN || 'qosyncefrontend.vercel.app';

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

        // Check if the certificate and key files exist
        if (!fs.existsSync(APPLE_PAY_CERTIFICATE_PATH)) {
            console.error(`Apple Pay certificate not found at: ${APPLE_PAY_CERTIFICATE_PATH}`);
            return res.status(500).json({ error: 'Apple Pay certificate not found. Please ensure the certificate file is uploaded to the server.' });
        }
        if (!fs.existsSync(APPLE_PAY_PRIVATE_KEY_PATH)) {
            console.error(`Apple Pay private key not found at: ${APPLE_PAY_PRIVATE_KEY_PATH}`);
            return res.status(500).json({ error: 'Apple Pay private key not found. Please ensure the key file is uploaded to the server.' });
        }

        const requestData = {
            merchantIdentifier: APPLE_PAY_MERCHANT_ID,
            displayName: 'Qosyne',
            initiative: 'web',
            initiativeContext: APPLE_PAY_MERCHANT_DOMAIN,
        };

        console.log('Apple Pay validation request data:', requestData);

        const cert = fs.readFileSync(APPLE_PAY_CERTIFICATE_PATH);
        const key = fs.readFileSync(APPLE_PAY_PRIVATE_KEY_PATH);

        const response = await axios.post(validationUrl, requestData, {
            httpsAgent: new https.Agent({
                cert,
                key,
                rejectUnauthorized: false, // For testing purposes - remove in production
            }),
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
        // This is a placeholder for the actual payment processing logic.
        // You would typically use a payment processor's SDK (like Stripe)
        // to handle the payment token and complete the transaction.
        console.log('Processing Apple Pay payment:', payment);

        // For the purpose of this example, we'll just record the transaction.
        const amount = payment.amount; // This should be determined from your application's logic
        const currency = payment.currency; // This should be determined from your application's logic

        const transaction = await prisma.transaction.create({
            data: {
                userId,
                amount,
                currency,
                provider: 'APPLE_PAY',
                status: 'COMPLETED', // Assuming the payment is completed successfully
                // Add any other relevant transaction details here
            },
        });

        res.status(200).json({ success: true, transaction });
    } catch (error) {
        console.error('Apple Pay payment processing error:', error);
        res.status(500).json({ error: 'Failed to process Apple Pay payment' });
    }
};
