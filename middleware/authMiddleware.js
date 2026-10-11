const jwt = require('jsonwebtoken');
const User = require('../models/User');

/* ---------------------------------------------------------
   protect — verifies JWT from httpOnly cookie or Bearer header
   --------------------------------------------------------- */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res
        .status(401)
        .json({ success: false, message: 'User not found or inactive' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: 'Invalid or expired token' });
  }
};

/* ---------------------------------------------------------
   adminOnly — requires req.user.role === 'admin'
   --------------------------------------------------------- */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res
      .status(403)
      .json({ success: false, message: 'Admin access required' });
  }
  return next();
};

module.exports = { protect, adminOnly };