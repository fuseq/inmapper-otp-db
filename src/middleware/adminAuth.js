const tokenService = require('../services/tokenService');
const { User } = require('../models');

const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const validation = await tokenService.validateSession(token);

    if (!validation.valid) {
      return res.status(401).json({ error: validation.error });
    }

    // Check if user is admin
    const user = await User.findByPk(validation.user.id);
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = adminAuth;

