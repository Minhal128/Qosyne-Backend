const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class QRService {
  constructor() {
    this.qrTypes = {
      BANK_DEPOSIT: 'BANK_DEPOSIT',
      WALLET_CONNECT: 'WALLET_CONNECT',
      PAYMENT_REQUEST: 'PAYMENT_REQUEST'
    };

    this.bankProviders = {
      chase: {
        name: 'Chase Bank',
        deepLinkPrefix: 'chase://',
        supportedApps: ['Chase Mobile', 'Chase Business']
      },
      wellsfargo: {
        name: 'Wells Fargo',
        deepLinkPrefix: 'wellsfargo://',
        supportedApps: ['Wells Fargo Mobile']
      },
      bankofamerica: {
        name: 'Bank of America',
        deepLinkPrefix: 'bofa://',
        supportedApps: ['Bank of America Mobile']
      },
      citibank: {
        name: 'Citibank',
        deepLinkPrefix: 'citi://',
        supportedApps: ['Citi Mobile']
      },
      generic: {
        name: 'Generic Bank',
        deepLinkPrefix: 'banking://',
        supportedApps: ['Any Banking App']
      }
    };
  }

  async generateQRData(qrData) {
    try {
      const { type, userId, amount, currency, description, expiresIn = 3600 } = qrData;
      
      const qrId = uuidv4();
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      let payload, instructions;

      switch (type) {
        case this.qrTypes.BANK_DEPOSIT:
          ({ payload, instructions } = await this.generateBankDepositPayload(qrData, qrId));
          break;
        case this.qrTypes.WALLET_CONNECT:
          ({ payload, instructions } = await this.generateWalletConnectPayload(qrData, qrId));
          break;
        case this.qrTypes.PAYMENT_REQUEST:
          ({ payload, instructions } = await this.generatePaymentRequestPayload(qrData, qrId));
          break;
        default:
          throw new Error(`Unsupported QR type: ${type}`);
      }

      // Store QR code in database
      const qrRecord = await prisma.qrCodes.create({
        data: {
          userId,
          qrId,
          type,
          payload,
          amount: amount ? parseFloat(amount) : null,
          currency,
          description,
          status: 'ACTIVE',
          scanCount: 0,
          expiresAt
        }
      });

      console.log('QR code generated:', { qrId, type, userId });

      return {
        id: qrId,
        type,
        payload,
        expiresAt,
        instructions
      };
    } catch (error) {
      console.error('Failed to generate QR data:', { qrData, error: error.message });
      throw error;
    }
  }

  async generateBankDepositPayload(qrData, qrId) {
    const { bankDetails, amount, currency, description } = qrData;
    
    const payload = JSON.stringify({
      version: '1.0',
      type: 'bank_deposit',
      qrId,
      amount,
      currency,
      description,
      bankDetails: {
        accountNumber: bankDetails?.accountNumber,
        routingNumber: bankDetails?.routingNumber,
        iban: bankDetails?.iban,
        swiftCode: bankDetails?.swiftCode
      },
      timestamp: new Date().toISOString()
    });

    const instructions = [
      '1. Open your banking app',
      '2. Scan this QR code',
      '3. Verify the deposit details',
      '4. Complete the transfer'
    ];

    return { payload, instructions };
  }

  async generateWalletConnectPayload(qrData, qrId) {
    const { walletProvider, amount, currency, description } = qrData;
    
    const payload = JSON.stringify({
      version: '1.0',
      type: 'wallet_connect',
      qrId,
      walletProvider,
      amount,
      currency,
      description,
      callbackUrl: `${process.env.BASE_URL}/api/qr/scan/${qrId}`,
      timestamp: new Date().toISOString()
    });

    const instructions = [
      `1. Open your ${walletProvider} app`,
      '2. Scan this QR code',
      '3. Authorize the connection',
      '4. Complete the setup'
    ];

    return { payload, instructions };
  }

  async generatePaymentRequestPayload(qrData, qrId) {
    const { amount, currency, description } = qrData;
    
    const payload = JSON.stringify({
      version: '1.0',
      type: 'payment_request',
      qrId,
      amount,
      currency,
      description,
      paymentUrl: `${process.env.BASE_URL}/api/qr/scan/${qrId}`,
      timestamp: new Date().toISOString()
    });

    const instructions = [
      '1. Scan with any payment app',
      '2. Review payment details',
      '3. Select payment method',
      '4. Complete payment'
    ];

    return { payload, instructions };
  }

  async generateBankDepositQR(bankData) {
    try {
      const { bankProvider, userId, amount, currency, accountDetails, description } = bankData;
      
      const qrId = uuidv4();
      const provider = this.bankProviders[bankProvider] || this.bankProviders.generic;
      
      const payload = JSON.stringify({
        version: '1.0',
        type: 'bank_deposit',
        qrId,
        bankProvider,
        amount,
        currency,
        accountDetails,
        description,
        deepLink: `${provider.deepLinkPrefix}deposit?qr=${qrId}`,
        timestamp: new Date().toISOString()
      });

      const instructions = [
        `1. Open ${provider.name} mobile app`,
        '2. Navigate to "Scan to Pay" or "QR Deposit"',
        '3. Scan this QR code',
        '4. Verify deposit details and confirm'
      ];

      // Store in database
      await prisma.qrCodes.create({
        data: {
          userId,
          qrId,
          type: this.qrTypes.BANK_DEPOSIT,
          payload,
          amount: parseFloat(amount),
          currency,
          description,
          status: 'ACTIVE',
          scanCount: 0,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });

      return {
        id: qrId,
        payload,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        instructions,
        supportedApps: provider.supportedApps
      };
    } catch (error) {
      console.error('Failed to generate bank deposit QR:', { bankData, error: error.message });
      throw error;
    }
  }

  async generateWalletConnectQR(walletData) {
    try {
      const { walletProvider, userId, connectionType, amount, currency, callbackUrl } = walletData;
      
      const qrId = uuidv4();
      const sessionToken = crypto.randomBytes(32).toString('hex');
      
      const deepLinks = {
        PAYPAL: `paypal://connect?session=${sessionToken}`,
        GOOGLEPAY: `googlepay://connect?session=${sessionToken}`,
        VENMO: `venmo://connect?session=${sessionToken}`,
        WISE: `wise://connect?session=${sessionToken}`,
        SQUARE: `square://connect?session=${sessionToken}`
      };

      const payload = JSON.stringify({
        version: '1.0',
        type: 'wallet_connect',
        qrId,
        walletProvider,
        connectionType,
        sessionToken,
        amount,
        currency,
        callbackUrl: callbackUrl || `${process.env.BASE_URL}/api/qr/scan/${qrId}`,
        timestamp: new Date().toISOString()
      });

      const instructions = [
        `1. Open your ${walletProvider} app`,
        '2. Look for "Scan QR" or "Connect" option',
        '3. Scan this QR code',
        '4. Follow the in-app instructions'
      ];

      // Store in database
      await prisma.qrCodes.create({
        data: {
          userId,
          qrId,
          type: this.qrTypes.WALLET_CONNECT,
          payload,
          amount: amount ? parseFloat(amount) : null,
          currency,
          description: `Connect ${walletProvider} wallet`,
          status: 'ACTIVE',
          scanCount: 0,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        }
      });

      return {
        id: qrId,
        payload,
        deepLink: deepLinks[walletProvider],
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        instructions
      };
    } catch (error) {
      console.error('Failed to generate wallet connect QR:', { walletData, error: error.message });
      throw error;
    }
  }

  async getQRStatus(userId, qrId) {
    try {
      const qrCode = await prisma.qrCodes.findFirst({
        where: { qrId, userId }
      });

      if (!qrCode) {
        throw new Error('QR code not found');
      }

      return {
        id: qrCode.qrId,
        userId: qrCode.userId,
        type: qrCode.type,
        status: qrCode.status,
        scanCount: qrCode.scanCount,
        lastScanned: qrCode.lastScanned,
        expiresAt: qrCode.expiresAt,
        isExpired: qrCode.expiresAt < new Date()
      };
    } catch (error) {
      console.error('Failed to get QR status:', { userId, qrId, error: error.message });
      throw error;
    }
  }

  async processQRScan(qrId, scanInfo) {
    try {
      const { scannerInfo, ip, userAgent } = scanInfo;
      
      const qrCode = await prisma.qrCodes.findFirst({
        where: { qrId }
      });

      if (!qrCode) {
        throw new Error('QR code not found');
      }

      if (qrCode.status !== 'ACTIVE') {
        throw new Error('QR code is not active');
      }

      if (qrCode.expiresAt < new Date()) {
        await prisma.qrCodes.update({
          where: { id: qrCode.id },
          data: { status: 'EXPIRED' }
        });
        throw new Error('QR code has expired');
      }

      // Update scan count and last scanned time
      await prisma.qrCodes.update({
        where: { id: qrCode.id },
        data: {
          scanCount: qrCode.scanCount + 1,
          lastScanned: new Date()
        }
      });

      console.log('QR code scanned:', {
        qrId,
        scannerInfo: scannerInfo?.appName || 'unknown',
        ip
      });

      // Determine next steps based on QR type
      let nextSteps, redirectUrl;

      switch (qrCode.type) {
        case this.qrTypes.BANK_DEPOSIT:
          nextSteps = 'Complete the deposit in your banking app';
          redirectUrl = null;
          break;
        case this.qrTypes.WALLET_CONNECT:
          nextSteps = 'Authorize the connection in your wallet app';
          redirectUrl = `${process.env.BASE_URL}/connect/callback?qr=${qrId}`;
          break;
        case this.qrTypes.PAYMENT_REQUEST:
          nextSteps = 'Complete payment in your preferred app';
          redirectUrl = `${process.env.BASE_URL}/payment/process?qr=${qrId}`;
          break;
      }

      return {
        scanId: uuidv4(),
        qrId,
        status: 'scanned',
        nextSteps,
        redirectUrl
      };
    } catch (error) {
      console.error('Failed to process QR scan:', { qrId, scanInfo, error: error.message });
      throw error;
    }
  }

  async getQRData(qrId) {
    try {
      const qrCode = await prisma.qrCodes.findFirst({
        where: { qrId }
      });

      if (!qrCode) {
        throw new Error('QR code not found');
      }

      return {
        id: qrCode.qrId,
        type: qrCode.type,
        status: qrCode.status,
        payload: qrCode.payload,
        amount: qrCode.amount,
        currency: qrCode.currency,
        description: qrCode.description
      };
    } catch (error) {
      console.error('Failed to get QR data:', { qrId, error: error.message });
      throw error;
    }
  }

  async deactivateQR(userId, qrId) {
    try {
      const qrCode = await prisma.qrCodes.findFirst({
        where: { qrId, userId }
      });

      if (!qrCode) {
        throw new Error('QR code not found');
      }

      await prisma.qrCodes.update({
        where: { id: qrCode.id },
        data: { status: 'DEACTIVATED' }
      });

      console.log('QR code deactivated:', { userId, qrId });
      return true;
    } catch (error) {
      console.error('Failed to deactivate QR:', { userId, qrId, error: error.message });
      throw error;
    }
  }

  async getUserQRCodes(userId, filters = {}) {
    try {
      const { page = 1, limit = 20, type, status } = filters;
      const skip = (page - 1) * limit;
      
      const where = { userId };
      if (type) where.type = type;
      if (status) where.status = status;

      const [qrCodes, total] = await Promise.all([
        prisma.qrCodes.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.qrCodes.count({ where })
      ]);

      return {
        data: qrCodes.map(qr => ({
          id: qr.qrId,
          type: qr.type,
          status: qr.status,
          amount: qr.amount,
          currency: qr.currency,
          description: qr.description,
          scanCount: qr.scanCount,
          createdAt: qr.createdAt,
          expiresAt: qr.expiresAt,
          isExpired: qr.expiresAt < new Date()
        })),
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Failed to get user QR codes:', { userId, error: error.message });
      throw error;
    }
  }
}

module.exports = new QRService();
