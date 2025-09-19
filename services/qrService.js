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
      const { type, userId, amount, currency, description, expiresIn = 3600, destinationWalletId } = qrData;
      
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
          expiresAt,
          destinationWalletId
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
    const { amount, currency, description, destinationWalletId, userId, metadata } = qrData;

    if (!destinationWalletId) {
      throw new Error('destinationWalletId is required for PAYMENT_REQUEST QR codes');
    }

    const wallet = await prisma.connectedWallets.findFirst({
      where: {
        walletId: destinationWalletId,
        userId: userId,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!wallet) {
      throw new Error('Destination wallet not found or does not belong to the user.');
    }

    // Enhanced payload with wallet-specific information
    const payload = JSON.stringify({
      version: '1.2',
      type: 'payment_request',
      qrId,
      amount: parseFloat(amount),
      currency,
      description,
      destinationWalletId,
      walletInfo: {
        provider: wallet.provider,
        displayName: wallet.fullName || wallet.username,
        username: wallet.username,
        accountEmail: wallet.accountEmail
      },
      recipientInfo: {
        name: wallet.user.name,
        email: wallet.user.email
      },
      paymentUrl: `${process.env.BASE_URL || 'https://qosyncebackend.vercel.app'}/api/wallet-integration/qr/scan/${qrId}`,
      deepLinks: this.generateDeepLinks(wallet.provider, qrId, amount, description),
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    });

    const providerName = this.getProviderDisplayName(wallet.provider);
    const instructions = [
      `1. Open ${providerName} app or scan with camera`,
      '2. Review payment details',
      `3. Send $${amount} to ${wallet.fullName || wallet.username}`,
      '4. Complete the payment'
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

  // Helper method to generate deep links for different wallet providers
  generateDeepLinks(provider, qrId, amount, description) {
    const encodedDescription = encodeURIComponent(description || '');
    const baseUrl = process.env.BASE_URL || 'https://qosyncebackend.vercel.app';
    
    const deepLinks = {
      VENMO: {
        app: `venmo://paycharge?txn=pay&amount=${amount}&note=${encodedDescription}&qr=${qrId}`,
        web: `https://venmo.com/pay?amount=${amount}&note=${encodedDescription}`,
        fallback: `${baseUrl}/payment/venmo?qr=${qrId}`
      },
      PAYPAL: {
        app: `paypal://send?amount=${amount}&note=${encodedDescription}&qr=${qrId}`,
        web: `https://paypal.me/pay?amount=${amount}`,
        fallback: `${baseUrl}/payment/paypal?qr=${qrId}`
      },
      GOOGLEPAY: {
        app: `googlepay://pay?amount=${amount}&note=${encodedDescription}&qr=${qrId}`,
        web: `https://pay.google.com/send?amount=${amount}`,
        fallback: `${baseUrl}/payment/googlepay?qr=${qrId}`
      },
      WISE: {
        app: `wise://send?amount=${amount}&note=${encodedDescription}&qr=${qrId}`,
        web: `https://wise.com/send?amount=${amount}`,
        fallback: `${baseUrl}/payment/wise?qr=${qrId}`
      },
      SQUARE: {
        app: `square://pay?amount=${amount}&note=${encodedDescription}&qr=${qrId}`,
        web: `https://squareup.com/pay?amount=${amount}`,
        fallback: `${baseUrl}/payment/square?qr=${qrId}`
      }
    };

    return deepLinks[provider] || {
      app: `${baseUrl}/payment/generic?qr=${qrId}`,
      web: `${baseUrl}/payment/generic?qr=${qrId}`,
      fallback: `${baseUrl}/payment/generic?qr=${qrId}`
    };
  }

  // Helper method to get display names for providers
  getProviderDisplayName(provider) {
    const displayNames = {
      VENMO: 'Venmo',
      PAYPAL: 'PayPal',
      GOOGLEPAY: 'Google Pay',
      WISE: 'Wise',
      SQUARE: 'Square',
      APPLEPAY: 'Apple Pay'
    };

    return displayNames[provider] || provider;
  }

  // Universal method to generate payment QR for any wallet provider
  async generateUniversalPaymentQR(walletData) {
    try {
      const { userId, walletId, amount, currency = 'USD', description, expiresIn = 3600 } = walletData;

      // Verify the wallet belongs to the user and is active
      const wallet = await prisma.connectedWallets.findFirst({
        where: {
          walletId,
          userId,
          isActive: true
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      if (!wallet) {
        throw new Error('Wallet not found or not accessible');
      }

      const qrId = uuidv4();
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      const providerName = this.getProviderDisplayName(wallet.provider);

      // Create provider-specific payload
      const payload = JSON.stringify({
        version: '1.3',
        type: 'universal_payment_request',
        qrId,
        amount: parseFloat(amount),
        currency,
        description,
        provider: wallet.provider,
        walletInfo: {
          provider: wallet.provider,
          username: wallet.username,
          displayName: wallet.fullName,
          accountEmail: wallet.accountEmail,
          walletId: wallet.walletId
        },
        recipientInfo: {
          name: wallet.user.name,
          email: wallet.user.email
        },
        deepLinks: this.generateProviderSpecificDeepLinks(wallet.provider, wallet, amount, description),
        paymentUrl: `${process.env.BASE_URL || 'https://qosyncebackend.vercel.app'}/api/wallet-integration/qr/scan/${qrId}`,
        shareUrl: `${process.env.BASE_URL || 'https://qosyncebackend.vercel.app'}/pay/${qrId}`,
        timestamp: new Date().toISOString()
      });

      // Store in database
      const qrRecord = await prisma.qrCodes.create({
        data: {
          userId,
          qrId,
          type: 'PAYMENT_REQUEST',
          payload,
          amount: parseFloat(amount),
          currency,
          description: description || `Payment request from ${wallet.fullName || wallet.username}`,
          status: 'ACTIVE',
          scanCount: 0,
          expiresAt,
          destinationWalletId: walletId
        }
      });

      const instructions = this.generateProviderInstructions(wallet.provider, wallet, amount);

      console.log(`${providerName} payment QR generated:`, { 
        qrId, 
        amount, 
        provider: wallet.provider,
        username: wallet.username 
      });

      return {
        id: qrId,
        type: 'universal_payment_request',
        provider: wallet.provider,
        payload,
        expiresAt,
        instructions,
        walletInfo: {
          provider: wallet.provider,
          username: wallet.username,
          displayName: wallet.fullName,
          providerDisplayName: providerName
        },
        amount: parseFloat(amount),
        currency,
        description,
        shareableUrl: `${process.env.BASE_URL || 'https://qosyncebackend.vercel.app'}/pay/${qrId}`
      };

    } catch (error) {
      console.error('Failed to generate universal payment QR:', { walletData, error: error.message });
      throw error;
    }
  }

  // Generate provider-specific deep links
  generateProviderSpecificDeepLinks(provider, wallet, amount, description) {
    const encodedDescription = encodeURIComponent(description || '');
    const baseUrl = process.env.BASE_URL || 'https://qosyncebackend.vercel.app';
    
    switch (provider) {
      case 'VENMO':
        return {
          primary: `venmo://paycharge?txn=pay&recipients=${wallet.username}&amount=${amount}&note=${encodedDescription}&audience=private`,
          secondary: `venmo://pay?user=${wallet.username}&amount=${amount}&note=${encodedDescription}`,
          web: `https://venmo.com/${wallet.username}`,
          fallback: `${baseUrl}/payment/venmo?wallet=${wallet.walletId}&amount=${amount}`
        };
        
      case 'WISE':
        return {
          primary: `wise://send?recipient=${wallet.accountEmail}&amount=${amount}&note=${encodedDescription}`,
          secondary: `wise://pay?email=${wallet.accountEmail}&amount=${amount}`,
          web: `https://wise.com/send?amount=${amount}`,
          fallback: `${baseUrl}/payment/wise?wallet=${wallet.walletId}&amount=${amount}`
        };
        
      case 'GOOGLEPAY':
        return {
          primary: `googlepay://pay?pa=${wallet.accountEmail}&am=${amount}&tn=${encodedDescription}`,
          secondary: `upi://pay?pa=${wallet.accountEmail}&am=${amount}&tn=${encodedDescription}`,
          web: `https://pay.google.com/send?amount=${amount}`,
          fallback: `${baseUrl}/payment/googlepay?wallet=${wallet.walletId}&amount=${amount}`
        };
        
      case 'SQUARE':
        return {
          primary: `square://pay?merchant=${wallet.username}&amount=${amount}&note=${encodedDescription}`,
          secondary: `squareup://pay?amount=${amount}&note=${encodedDescription}`,
          web: `https://squareup.com/pay?amount=${amount}`,
          fallback: `${baseUrl}/payment/square?wallet=${wallet.walletId}&amount=${amount}`
        };
        
      case 'PAYPAL':
        return {
          primary: `paypal://send?recipient=${wallet.accountEmail}&amount=${amount}&note=${encodedDescription}`,
          secondary: `https://paypal.me/${wallet.username}/${amount}`,
          web: `https://paypal.com/send?amount=${amount}`,
          fallback: `${baseUrl}/payment/paypal?wallet=${wallet.walletId}&amount=${amount}`
        };
        
      default:
        return {
          primary: `${baseUrl}/payment/generic?wallet=${wallet.walletId}&amount=${amount}`,
          secondary: `${baseUrl}/payment/generic?wallet=${wallet.walletId}&amount=${amount}`,
          web: `${baseUrl}/payment/generic?wallet=${wallet.walletId}&amount=${amount}`,
          fallback: `${baseUrl}/payment/generic?wallet=${wallet.walletId}&amount=${amount}`
        };
    }
  }

  // Generate provider-specific instructions
  generateProviderInstructions(provider, wallet, amount) {
    const providerName = this.getProviderDisplayName(provider);
    const displayName = wallet.fullName || wallet.username || wallet.accountEmail;
    
    switch (provider) {
      case 'VENMO':
        return [
          '1. Open Venmo app or scan with camera',
          '2. Tap "Pay" in Venmo app',
          `3. Send $${amount} to @${wallet.username}`,
          '4. Add a note and complete payment'
        ];
        
      case 'WISE':
        return [
          '1. Open Wise app or scan with camera',
          '2. Select "Send money"',
          `3. Send $${amount} to ${displayName}`,
          '4. Review details and confirm transfer'
        ];
        
      case 'GOOGLEPAY':
        return [
          '1. Open Google Pay app or scan with camera',
          '2. Tap "Pay" or "Send"',
          `3. Send $${amount} to ${displayName}`,
          '4. Add note and complete payment'
        ];
        
      case 'SQUARE':
        return [
          '1. Open Square app or scan with camera',
          '2. Select "Pay" option',
          `3. Send $${amount} to ${displayName}`,
          '4. Confirm payment details'
        ];
        
      case 'PAYPAL':
        return [
          '1. Open PayPal app or scan with camera',
          '2. Tap "Send" money',
          `3. Send $${amount} to ${displayName}`,
          '4. Add note and send payment'
        ];
        
      default:
        return [
          `1. Open ${providerName} app or scan with camera`,
          '2. Follow payment prompts',
          `3. Send $${amount} to ${displayName}`,
          '4. Complete the payment'
        ];
    }
  }

  // Legacy method for backward compatibility
  async generateVenmoPaymentQR(venmoData) {
    return await this.generateUniversalPaymentQR(venmoData);
  }
}

module.exports = new QRService();
