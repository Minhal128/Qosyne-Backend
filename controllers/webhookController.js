const webhookService = require('../services/webhookService');

// PayPal webhook handler
exports.handlePayPalWebhook = async (req, res) => {
  try {
    const event = req.body;
    
    console.log('PayPal webhook received:', {
      eventType: event.event_type,
      resourceId: event.resource?.id,
      timestamp: event.create_time
    });

    await webhookService.handlePayPalWebhook(event);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Google Pay webhook handler
exports.handleGooglePayWebhook = async (req, res) => {
  try {
    const event = req.body;
    
    console.log('Google Pay webhook received:', {
      eventType: event.eventType,
      resourceId: event.resourceId,
      timestamp: event.eventTime
    });

    await webhookService.handleGooglePayWebhook(event);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Google Pay webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Wise webhook handler
exports.handleWiseWebhook = async (req, res) => {
  try {
    const event = req.body;
    
    console.log('Wise webhook received:', {
      eventType: event.event_type,
      resourceId: event.data?.resource?.id,
      timestamp: event.occurred_at
    });

    await webhookService.handleWiseWebhook(event);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Wise webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Square webhook handler
exports.handleSquareWebhook = async (req, res) => {
  try {
    const event = req.body;
    
    console.log('Square webhook received:', {
      eventType: event.type,
      resourceId: event.data?.object?.id,
      timestamp: event.created_at
    });

    await webhookService.handleSquareWebhook(event);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Square webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Venmo webhook handler
exports.handleVenmoWebhook = async (req, res) => {
  try {
    const event = req.body;
    
    console.log('Venmo webhook received:', {
      eventType: event.type,
      resourceId: event.data?.id,
      timestamp: event.created_time
    });

    await webhookService.handleVenmoWebhook(event);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Venmo webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Rapyd webhook handler
exports.handleRapydWebhook = async (req, res) => {
  try {
    const event = req.body;
    
    console.log('Rapyd webhook received:', {
      eventType: event.type,
      resourceId: event.data?.id,
      timestamp: event.created
    });

    await webhookService.handleRapydWebhook(event);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Rapyd webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Generic webhook handler for testing
exports.handleTestWebhook = async (req, res) => {
  try {
    const event = req.body;
    
    console.log('Test webhook received:', {
      event,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Test webhook received',
      receivedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get webhook delivery status
exports.getWebhookDelivery = async (req, res) => {
  try {
    const { webhookId } = req.params;
    
    const delivery = await webhookService.getWebhookDelivery(webhookId);
    
    res.json({
      success: true,
      data: {
        delivery: {
          id: delivery.id,
          status: delivery.status,
          attempts: delivery.attempts,
          lastAttempt: delivery.lastAttempt,
          nextRetry: delivery.nextRetry,
          response: delivery.response
        }
      }
    });
  } catch (error) {
    console.error('Error getting webhook delivery:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Retry failed webhook
exports.retryWebhook = async (req, res) => {
  try {
    const { webhookId } = req.params;
    
    const retryResult = await webhookService.retryWebhook(webhookId);
    
    res.json({
      success: true,
      data: {
        retry: {
          id: retryResult.id,
          status: retryResult.status,
          scheduledAt: retryResult.scheduledAt
        }
      }
    });
  } catch (error) {
    console.error('Error retrying webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get webhook statistics
exports.getWebhookStats = async (req, res) => {
  try {
    const { startDate, endDate, provider } = req.query;
    
    const stats = await webhookService.getWebhookStats({
      startDate,
      endDate,
      provider
    });
    
    res.json({
      success: true,
      data: {
        stats: {
          totalWebhooks: stats.total,
          successfulWebhooks: stats.successful,
          failedWebhooks: stats.failed,
          successRate: stats.successRate,
          averageProcessingTime: stats.averageProcessingTime,
          byProvider: stats.byProvider
        }
      }
    });
  } catch (error) {
    console.error('Error getting webhook stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
