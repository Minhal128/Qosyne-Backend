const jwt = require('jsonwebtoken');

// Auth middleware - extract token from header (Bearer), or fall back to body/query
const authMiddleware = (req, res, next) => {
  try {
    // Support common header casing and fallback locations
    const header = req.headers['authorization'] || req.headers['Authorization'] || null;

    let token = null;

    if (header) {
      // Header can be "Bearer <token>" or just the token
      token = header.startsWith('Bearer ') ? header.slice(7).trim() : header.trim();
    }

    // Fallback: token in body (some clients may POST token) or query string
    if (!token && req.body && req.body.token) token = req.body.token;
    if (!token && req.query && req.query.token) token = req.query.token;

    if (!token) {
      console.log('🔒 Auth failed - no token provided. Headers:', { hasAuthHeader: !!header });
      return res.status(401).json({ error: 'Access denied: no token provided' });
    }

    console.log('🔐 Verifying JWT token (first 12 chars):', token.substring(0, 12));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user payload
    req.user = decoded;
    return next();
  } catch (err) {
    // Provide actionable logs for debugging; in production avoid sending stack trace
    console.error('🔒 JWT verification failed:', err && err.message);
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(401).json({ error: 'Invalid token', details: err && err.message });
  }
};

module.exports = authMiddleware;
