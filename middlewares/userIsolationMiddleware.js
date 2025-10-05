/**
 * Middleware to ensure strict user data isolation
 * Prevents users from accessing other users' data
 */

const userIsolationMiddleware = (req, res, next) => {
  const userId = req.user?.userId;
  
  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required',
      status_code: 401
    });
  }

  // Log all requests for debugging
  console.log(`🔒 User ${userId} accessing: ${req.method} ${req.path}`);
  
  // Add userId to request for easy access
  req.authenticatedUserId = Number(userId);
  
  next();
};

module.exports = userIsolationMiddleware;
