const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader) return res.status(401).json({ error: 'Access denied' });
  
  // Extract token from "Bearer TOKEN" format
  const token = authHeader.replace('Bearer ', '');
  console.log('token', token);

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
    );

    console.log('decoded', decoded);
    req.user = decoded; // Attaching user info to request
    next();
  } catch (error) {
    console.log('error', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
