const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');

const prisma = new PrismaClient();

// Display QR code payment page
router.get('/pay/:qrId', async (req, res) => {
  try {
    const { qrId } = req.params;
    
    // Get QR code data from database
    const qrCode = await prisma.qrCodes.findFirst({
      where: { qrId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!qrCode) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Code Not Found</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1 class="error">QR Code Not Found</h1>
          <p>The requested QR code does not exist or has been removed.</p>
        </body>
        </html>
      `);
    }

    // Check if expired
    if (qrCode.expiresAt && qrCode.expiresAt < new Date()) {
      return res.status(410).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Code Expired</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1 class="error">QR Code Expired</h1>
          <p>This QR code has expired and is no longer valid.</p>
        </body>
        </html>
      `);
    }

    // Parse the payload to get payment details
    let paymentData;
    try {
      paymentData = JSON.parse(qrCode.payload);
    } catch (error) {
      paymentData = { amount: qrCode.amount, currency: qrCode.currency };
    }

    // Generate QR code image
    const qrCodeDataURL = await QRCode.toDataURL(qrCode.payload, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Create HTML page
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Request - $${qrCode.amount} ${qrCode.currency}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .container {
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 400px;
            width: 100%;
          }
          .header {
            margin-bottom: 20px;
          }
          .amount {
            font-size: 2.5em;
            font-weight: bold;
            color: #2c3e50;
            margin: 10px 0;
          }
          .currency {
            font-size: 1.2em;
            color: #7f8c8d;
            margin-bottom: 20px;
          }
          .qr-code {
            margin: 20px 0;
            border: 2px solid #ecf0f1;
            border-radius: 10px;
            padding: 20px;
            background: #f8f9fa;
          }
          .qr-image {
            max-width: 100%;
            height: auto;
          }
          .description {
            background: #ecf0f1;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            color: #2c3e50;
          }
          .instructions {
            text-align: left;
            background: #e8f5e8;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .instructions h3 {
            margin-top: 0;
            color: #27ae60;
          }
          .instructions ol {
            margin: 10px 0;
            padding-left: 20px;
          }
          .instructions li {
            margin: 8px 0;
            color: #2c3e50;
          }
          .recipient-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #3498db;
          }
          .status {
            padding: 10px;
            border-radius: 5px;
            margin: 15px 0;
            font-weight: bold;
          }
          .status.active {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
          }
          .footer {
            margin-top: 30px;
            font-size: 0.9em;
            color: #7f8c8d;
          }
          .deep-links {
            margin: 20px 0;
          }
          .deep-link-btn {
            display: inline-block;
            background: #3498db;
            color: white;
            padding: 12px 20px;
            text-decoration: none;
            border-radius: 8px;
            margin: 5px;
            font-weight: bold;
            transition: background 0.3s;
          }
          .deep-link-btn:hover {
            background: #2980b9;
          }
          .provider-badge {
            display: inline-block;
            background: #e74c3c;
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 0.8em;
            font-weight: bold;
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💳 Payment Request</h1>
            <div class="amount">$${qrCode.amount}</div>
            <div class="currency">${qrCode.currency}</div>
            ${paymentData.walletInfo ? `<div class="provider-badge">${paymentData.walletInfo.provider}</div>` : ''}
          </div>

          <div class="status active">
            ✅ Active Payment Request
          </div>

          <div class="qr-code">
            <img src="${qrCodeDataURL}" alt="Payment QR Code" class="qr-image">
          </div>

          ${qrCode.description ? `
            <div class="description">
              <strong>Description:</strong> ${qrCode.description}
            </div>
          ` : ''}

          ${paymentData.recipientInfo ? `
            <div class="recipient-info">
              <strong>Pay to:</strong> ${paymentData.recipientInfo.name}<br>
              ${paymentData.walletInfo ? `<strong>Wallet:</strong> ${paymentData.walletInfo.displayName || paymentData.walletInfo.username}` : ''}
            </div>
          ` : ''}

          <div class="instructions">
            <h3>📱 How to Pay:</h3>
            <ol>
              <li>Open your wallet app (Venmo, PayPal, etc.)</li>
              <li>Scan this QR code with your camera</li>
              <li>Verify the payment amount and recipient</li>
              <li>Complete the payment</li>
            </ol>
          </div>

          ${paymentData.deepLinks ? `
            <div class="deep-links">
              <h3>🚀 Quick Pay Links:</h3>
              ${paymentData.deepLinks.primary ? `<a href="${paymentData.deepLinks.primary}" class="deep-link-btn">Open App</a>` : ''}
              ${paymentData.deepLinks.web ? `<a href="${paymentData.deepLinks.web}" class="deep-link-btn">Web Version</a>` : ''}
            </div>
          ` : ''}

          <div class="footer">
            <p>QR Code ID: ${qrId}</p>
            <p>Created: ${new Date(qrCode.createdAt).toLocaleString()}</p>
            ${qrCode.expiresAt ? `<p>Expires: ${new Date(qrCode.expiresAt).toLocaleString()}</p>` : ''}
            <p>Scanned: ${qrCode.scanCount} times</p>
          </div>
        </div>

        <script>
          // Auto-refresh every 30 seconds to check for updates
          setTimeout(() => {
            window.location.reload();
          }, 30000);
        </script>
      </body>
      </html>
    `;

    res.send(html);

  } catch (error) {
    console.error('Error displaying QR code:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1 class="error">Error Loading QR Code</h1>
        <p>There was an error loading the payment request. Please try again later.</p>
      </body>
      </html>
    `);
  }
});

// API endpoint to get QR code data as JSON
router.get('/api/qr/:qrId/data', async (req, res) => {
  try {
    const { qrId } = req.params;
    
    const qrCode = await prisma.qrCodes.findFirst({
      where: { qrId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        error: 'QR code not found'
      });
    }

    // Parse payload
    let paymentData;
    try {
      paymentData = JSON.parse(qrCode.payload);
    } catch (error) {
      paymentData = {};
    }

    res.json({
      success: true,
      data: {
        id: qrCode.qrId,
        type: qrCode.type,
        status: qrCode.status,
        amount: qrCode.amount,
        currency: qrCode.currency,
        description: qrCode.description,
        scanCount: qrCode.scanCount,
        createdAt: qrCode.createdAt,
        expiresAt: qrCode.expiresAt,
        isExpired: qrCode.expiresAt ? qrCode.expiresAt < new Date() : false,
        recipient: qrCode.user.name,
        paymentData
      }
    });

  } catch (error) {
    console.error('Error getting QR data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get QR code data'
    });
  }
});

module.exports = router;
