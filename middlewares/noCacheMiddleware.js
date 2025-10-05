/**
 * Middleware to prevent caching of user-specific data
 * This ensures fresh data is always fetched when users switch accounts
 */

const noCacheMiddleware = (req, res, next) => {
  // Set headers to prevent caching
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Last-Modified': new Date().toUTCString(),
    'ETag': `"${Date.now()}-${Math.random()}"`, // Unique ETag for each request
    'Vary': 'Authorization' // Vary by authorization header
  });

  // Add timestamp to help with debugging
  res.locals.requestTimestamp = new Date().toISOString();
  
  next();
};

module.exports = noCacheMiddleware;
