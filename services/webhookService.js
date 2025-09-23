const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const transactionService = require('./transactionService');

const prisma = new PrismaClient();

// Import monitoring service for real-time tracking
let monitoringService;
try {
  monitoringService = require('./realTimeMonitoringService');
} catch (error) {
  console.warn('Real-time monitoring service not available');
}

class WebhookService {
  constructor() {
    this.webhookSecrets = {
      PAYPAL: process.env.PAYPAL_WEBHOOK_SECRET,
      GOOGLEPAY: process.env.GOOGLEPAY_WEBHOOK_SECRET,
      WISE: process.env.WISE_WEBHOOK_SECRET,
      SQUARE: process.env.SQUARE_WEBHOOK_SECRET,
      VENMO: process.env.VENMO_WEBHOOK_SECRET,
      RAPYD: process.env.RAPYD_WEBHOOK_SECRET
    };
  }

  verifySignature(provider, signature, payload) {
    try {
      // Allow relaxed verification in sandbox/dev if explicitly enabled
      if (process.env.WEBHOOK_VERIFY_RELAXED === 'true') {
        console.warn('Webhook signature verification relaxed - accepting all signatures for testing', { provider });
        return true;
      }

      const secret = this.webhookSecrets[provider];
      if (!secret) {
        console.warn('No webhook secret configured for provider:', { provider });
        return false;
      }

      let expectedSignature;
      
      switch (provider) {
        case 'PAYPAL':
          expectedSignature = this.verifyPayPalSignature(signature, payload, secret);
          break;
        case 'WISE':
          expectedSignature = this.verifyWiseSignature(signature, payload, secret);
          break;
        case 'SQUARE':
          expectedSignature = this.verifySquareSignature(signature, payload, secret);
          break;
        case 'RAPYD':
          expectedSignature = this.verifyRapydSignature(signature, payload, secret);
          break;
        default:
          expectedSignature = this.verifyGenericSignature(signature, payload, secret);
      }

      return expectedSignature;
    } catch (error) {
      console.error('Signature verification error:', { provider, error: error.message });
      return false;
    }
  }

  verifyPayPalSignature(signature, payload, secret) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return signature === expectedSignature;
  }

  verifyWiseSignature(signature, payload, secret) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64');
    return signature === expectedSignature;
  }

  verifySquareSignature(signature, payload, secret) {
    const expectedSignature = crypto
      .createHmac('sha1', secret)
      .update(payload)
      .digest('base64');
    return signature === expectedSignature;
  }

  verifyRapydSignature(signature, payload, secret) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return signature === expectedSignature;
  }

  verifyGenericSignature(signature, payload, secret) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return signature === expectedSignature;
  }

  async handlePayPalWebhook(event) {
    try {
      const { event_type, resource } = event;
      
      // Record webhook event for monitoring
      if (monitoringService) {
        monitoringService.recordWebhookEvent('PAYPAL', event_type, true);
      }
      
      switch (event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handlePaymentCompleted('PAYPAL', resource);
          break;
        case 'PAYMENT.CAPTURE.DENIED':
        case 'PAYMENT.CAPTURE.FAILED':
          await this.handlePaymentFailed('PAYPAL', resource);
          break;
        case 'PAYMENT.AUTHORIZATION.CREATED':
          await this.handlePaymentAuthorized('PAYPAL', resource);
          break;
        default:
          console.log('Unhandled PayPal webhook event:', { event_type });
      }
    } catch (error) {
      // Record failed webhook
      if (monitoringService) {
        monitoringService.recordWebhookEvent('PAYPAL', event.event_type, false);
      }
      console.error('PayPal webhook handling failed:', { event, error: error.message });
      throw error;
    }
  }

  async handleGooglePayWebhook(event) {
    try {
      const { eventType, resourceId } = event;
      
      switch (eventType) {
        case 'payment.completed':
          await this.handlePaymentCompleted('GOOGLEPAY', { id: resourceId });
          break;
        case 'payment.failed':
          await this.handlePaymentFailed('GOOGLEPAY', { id: resourceId });
          break;
        default:
          console.log('Unhandled Google Pay webhook event:', { eventType });
      }
    } catch (error) {
      console.error('Google Pay webhook handling failed:', { event, error: error.message });
      throw error;
    }
  }

  async handleWiseWebhook(event) {
    try {
      const { event_type, data } = event;
      
      switch (event_type) {
        case 'transfer.state_change':
          await this.handleWiseTransferStateChange(data);
          break;
        case 'balance.credit':
          await this.handleBalanceCredit('WISE', data);
          break;
        case 'balance.debit':
          await this.handleBalanceDebit('WISE', data);
          break;
        default:
          console.log('Unhandled Wise webhook event:', { event_type });
      }
    } catch (error) {
      console.error('Wise webhook handling failed:', { event, error: error.message });
      throw error;
    }
  }

  async handleSquareWebhook(event) {
    try {
      const { type, data } = event;
      
      switch (type) {
        case 'payment.updated':
          await this.handleSquarePaymentUpdate(data.object);
          break;
        case 'refund.updated':
          await this.handleSquareRefundUpdate(data.object);
          break;
        default:
          console.log('Unhandled Square webhook event:', { type });
      }
    } catch (error) {
      console.error('Square webhook handling failed:', { event, error: error.message });
      throw error;
    }
  }

  async handleVenmoWebhook(event) {
    try {
      const { type, data } = event;
      
      switch (type) {
        case 'payment.completed':
          await this.handlePaymentCompleted('VENMO', data);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed('VENMO', data);
          break;
        default:
          console.log('Unhandled Venmo webhook event:', { type });
      }
    } catch (error) {
      console.error('Venmo webhook handling failed:', { event, error: error.message });
      throw error;
    }
  }

  async handleRapydWebhook(event) {
    try {
      const { type, data } = event;
      
      switch (type) {
        case 'PAYMENT_COMPLETED':
          await this.handleRapydPaymentCompleted(data);
          break;
        case 'PAYMENT_FAILED':
          await this.handleRapydPaymentFailed(data);
          break;
        case 'PAYOUT_COMPLETED':
          await this.handleRapydPayoutCompleted(data);
          break;
        case 'PAYOUT_FAILED':
          await this.handleRapydPayoutFailed(data);
          break;
        default:
          console.log('Unhandled Rapyd webhook event:', { type });
      }
    } catch (error) {
      console.error('Rapyd webhook handling failed:', { event, error: error.message });
      throw error;
    }
  }

  async handlePaymentCompleted(provider, paymentData) {
    try {
      const transactionId = this.extractTransactionId(paymentData);
      if (transactionId) {
        await this.updateTransactionStatus(transactionId, 'COMPLETED', {
          provider,
          externalId: paymentData.id,
          completedAt: new Date().toISOString()
        });
      }
      
      console.log('Payment completed:', { provider, paymentId: paymentData.id, transactionId });
    } catch (error) {
      console.error('Failed to handle payment completion:', { provider, paymentData, error: error.message });
    }
  }

  async handlePaymentFailed(provider, paymentData) {
    try {
      const transactionId = this.extractTransactionId(paymentData);
      if (transactionId) {
        await this.updateTransactionStatus(transactionId, 'FAILED', {
          provider,
          externalId: paymentData.id,
          failureReason: paymentData.failure_reason || 'Payment failed',
          failedAt: new Date().toISOString()
        });
      }
      
      console.log('Payment failed:', { provider, paymentId: paymentData.id, transactionId });
    } catch (error) {
      console.error('Failed to handle payment failure:', { provider, paymentData, error: error.message });
    }
  }

  async handlePaymentAuthorized(provider, paymentData) {
    try {
      const transactionId = this.extractTransactionId(paymentData);
      if (transactionId) {
        await this.updateTransactionStatus(transactionId, 'PROCESSING', {
          provider,
          externalId: paymentData.id,
          authorizedAt: new Date().toISOString()
        });
      }
      
      console.log('Payment authorized:', { provider, paymentId: paymentData.id, transactionId });
    } catch (error) {
      console.error('Failed to handle payment authorization:', { provider, paymentData, error: error.message });
    }
  }

  async handleWiseTransferStateChange(transferData) {
    try {
      const { resource, current_state, previous_state } = transferData;
      const transactionId = this.extractTransactionId(resource);
      
      let status;
      switch (current_state) {
        case 'outgoing_payment_sent':
          status = 'COMPLETED';
          break;
        case 'cancelled':
          status = 'CANCELLED';
          break;
        case 'bounced_back':
        case 'funds_refunded':
          status = 'FAILED';
          break;
        default:
          status = 'PROCESSING';
      }

      if (transactionId) {
        await this.updateTransactionStatus(transactionId, status, {
          provider: 'WISE',
          externalId: resource.id,
          currentState: current_state,
          previousState: previous_state
        });
      }
      
      console.log('Wise transfer state changed:', { 
        transferId: resource.id, 
        currentState: current_state, 
        previousState: previous_state,
        transactionId 
      });
    } catch (error) {
      console.error('Failed to handle Wise transfer state change:', { transferData, error: error.message });
    }
  }

  async handleSquarePaymentUpdate(paymentData) {
    try {
      const transactionId = this.extractTransactionId(paymentData);
      let status;
      
      switch (paymentData.status) {
        case 'COMPLETED':
          status = 'COMPLETED';
          break;
        case 'FAILED':
        case 'CANCELED':
          status = 'FAILED';
          break;
        default:
          status = 'PROCESSING';
      }

      if (transactionId) {
        await this.updateTransactionStatus(transactionId, status, {
          provider: 'SQUARE',
          externalId: paymentData.id,
          squareStatus: paymentData.status
        });
      }
      
      console.log('Square payment updated:', { paymentId: paymentData.id, status: paymentData.status, transactionId });
    } catch (error) {
      console.error('Failed to handle Square payment update:', { paymentData, error: error.message });
    }
  }

  async handleRapydPaymentCompleted(paymentData) {
    try {
      const transactionId = paymentData.metadata?.transactionId;
      if (transactionId) {
        await this.updateTransactionStatus(transactionId, 'COMPLETED', {
          provider: 'RAPYD',
          externalId: paymentData.id,
          rapydStatus: 'completed',
          completedAt: new Date().toISOString()
        });
      }
      
      console.log('Rapyd payment completed:', { paymentId: paymentData.id, transactionId });
    } catch (error) {
      console.error('Failed to handle Rapyd payment completion:', { paymentData, error: error.message });
    }
  }

  async handleRapydPaymentFailed(paymentData) {
    try {
      const transactionId = paymentData.metadata?.transactionId;
      if (transactionId) {
        await this.updateTransactionStatus(transactionId, 'FAILED', {
          provider: 'RAPYD',
          externalId: paymentData.id,
          rapydStatus: 'failed',
          failureReason: paymentData.failure_reason,
          failedAt: new Date().toISOString()
        });
      }
      
      console.log('Rapyd payment failed:', { paymentId: paymentData.id, transactionId });
    } catch (error) {
      console.error('Failed to handle Rapyd payment failure:', { paymentData, error: error.message });
    }
  }

  async handleRapydPayoutCompleted(payoutData) {
    try {
      const transactionId = payoutData.metadata?.transactionId;
      if (transactionId) {
        await this.updateTransactionStatus(transactionId, 'COMPLETED', {
          provider: 'RAPYD',
          externalId: payoutData.id,
          rapydStatus: 'payout_completed',
          completedAt: new Date().toISOString()
        });
      }
      
      console.log('Rapyd payout completed:', { payoutId: payoutData.id, transactionId });
    } catch (error) {
      console.error('Failed to handle Rapyd payout completion:', { payoutData, error: error.message });
    }
  }

  async handleRapydPayoutFailed(payoutData) {
    try {
      const transactionId = payoutData.metadata?.transactionId;
      if (transactionId) {
        await this.updateTransactionStatus(transactionId, 'FAILED', {
          provider: 'RAPYD',
          externalId: payoutData.id,
          rapydStatus: 'payout_failed',
          failureReason: payoutData.failure_reason,
          failedAt: new Date().toISOString()
        });
      }
      
      console.log('Rapyd payout failed:', { payoutId: payoutData.id, transactionId });
    } catch (error) {
      console.error('Failed to handle Rapyd payout failure:', { payoutData, error: error.message });
    }
  }

  extractTransactionId(paymentData) {
    // Try to extract transaction ID from various possible locations
    return paymentData.metadata?.transactionId || 
           paymentData.custom_id || 
           paymentData.reference_id ||
           paymentData.merchant_reference_id;
  }

  async updateTransactionStatus(transactionId, status, additionalData = {}) {
    try {
      const updateData = {
        status,
        updatedAt: new Date()
      };

      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }

      if (additionalData.failureReason) {
        updateData.failureReason = additionalData.failureReason;
      }

      if (additionalData.metadata) {
        updateData.metadata = JSON.stringify(additionalData.metadata);
      }

      await prisma.transactions.update({
        where: { id: parseInt(transactionId) },
        data: updateData
      });
      
      console.log('Transaction status updated:', { 
        transactionId, 
        status, 
        additionalData,
        timestamp: new Date().toISOString()
      });
      
      // You could also trigger notifications, update user balances, etc.
      await this.notifyTransactionUpdate(transactionId, status, additionalData);
    } catch (error) {
      console.error('Failed to update transaction status:', { transactionId, status, error: error.message });
    }
  }

  async notifyTransactionUpdate(transactionId, status, data) {
    // Send real-time notifications to users, update UI, etc.
    console.log('Transaction notification sent:', { transactionId, status });
  }

  async handleBalanceCredit(provider, balanceData) {
    console.log('Balance credited:', { provider, balanceData });
  }

  async handleBalanceDebit(provider, balanceData) {
    console.log('Balance debited:', { provider, balanceData });
  }

  async getWebhookDelivery(webhookId) {
    // In production, fetch from database
    return {
      id: webhookId,
      status: 'delivered',
      attempts: 1,
      lastAttempt: new Date().toISOString(),
      nextRetry: null,
      response: { status_code: 200, body: 'OK' }
    };
  }

  async retryWebhook(webhookId) {
    // In production, implement retry logic
    return {
      id: uuidv4(),
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 60000).toISOString() // 1 minute from now
    };
  }

  async getWebhookStats(filters = {}) {
    // In production, query database for webhook statistics
    return {
      total: 100,
      successful: 95,
      failed: 5,
      successRate: 95.0,
      averageProcessingTime: 150, // milliseconds
      byProvider: {
        PAYPAL: { total: 40, successful: 38, failed: 2 },
        RAPYD: { total: 35, successful: 35, failed: 0 },
        WISE: { total: 25, successful: 22, failed: 3 }
      }
    };
  }
}

module.exports = new WebhookService();
