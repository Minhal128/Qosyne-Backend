const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const squareTestController = require('../controllers/squareTestController');

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test basic response
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    };

    res.json({
      success: true,
      data: healthData,
      message: 'Server is healthy'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Health check failed'
    });
  }
});

// Database connection test endpoint
router.get('/health/database', async (req, res) => {
  const prisma = new PrismaClient();
  
  try {
    const startTime = Date.now();
    
    // Test database connection
    await prisma.$connect();
    const connectionTime = Date.now() - startTime;
    
    // Test a simple query
    const queryStart = Date.now();
    const userCount = await prisma.users.count();
    const queryTime = Date.now() - queryStart;
    
    // Test connectedWallets table
    const walletCount = await prisma.connectedWallets.count();
    
    const dbUrl = process.env.DATABASE_URL;
    const maskedUrl = dbUrl ? dbUrl.replace(/:[^:@]*@/, ':****@') : 'Not set';
    
    res.json({
      success: true,
      data: {
        status: 'connected',
        connectionTime: `${connectionTime}ms`,
        queryTime: `${queryTime}ms`,
        userCount,
        walletCount,
        databaseUrl: maskedUrl,
        timestamp: new Date().toISOString()
      },
      message: 'Database connection successful'
    });

  } catch (error) {
    console.error('Database health check failed:', error);
    
    const dbUrl = process.env.DATABASE_URL;
    const maskedUrl = dbUrl ? dbUrl.replace(/:[^:@]*@/, ':****@') : 'Not set';
    
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        databaseUrl: maskedUrl,
        timestamp: new Date().toISOString()
      },
      message: 'Database connection failed'
    });
    
  } finally {
    await prisma.$disconnect();
  }
});

// Environment variables check (without sensitive data)
router.get('/health/env', async (req, res) => {
  try {
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      PORT: process.env.PORT || 'not set',
      DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set',
      JWT_SECRET: process.env.JWT_SECRET ? 'set' : 'not set',
      BASE_URL: process.env.BASE_URL || 'not set',
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: envCheck,
      message: 'Environment variables check complete'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Environment check failed'
    });
  }
});

// Square API test endpoints
router.get('/health/square', squareTestController.testSquareCredentials);
router.get('/health/square/info', squareTestController.getSquareInfo);
router.post('/health/square/customer', squareTestController.testCustomerCreation);

module.exports = router;
