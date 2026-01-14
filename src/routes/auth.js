const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRequest } = require('../middleware/validation');
const { body, query } = require('express-validator');
const { User } = require('../models');

// One-time setup endpoint - DELETE AFTER USE
router.get('/setup-admin', async (req, res) => {
  try {
    const [count] = await User.update(
      { isAdmin: true },
      { where: { email: 'furkansenoglu98@gmail.com' } }
    );
    if (count > 0) {
      res.json({ success: true, message: 'Admin rights granted to furkansenoglu98@gmail.com' });
    } else {
      res.json({ success: false, message: 'User not found. Please register first.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Register - Create new user
router.post('/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('callbackUrl').optional().isURL().withMessage('Invalid callback URL')
  ],
  validateRequest,
  authController.register
);

// Login - Send OTP to email
router.post('/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('callbackUrl').optional().isURL().withMessage('Invalid callback URL')
  ],
  validateRequest,
  authController.login
);

// Verify OTP and create session
router.post('/verify',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('code').isLength({ min: 4, max: 8 }).withMessage('OTP code is required'),
    body('callbackUrl').optional().isURL().withMessage('Invalid callback URL')
  ],
  validateRequest,
  authController.verifyOTP
);

// Resend OTP
router.post('/resend',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
  ],
  validateRequest,
  authController.resendOTP
);

// Validate token (for external apps)
router.get('/validate',
  [
    query('token').notEmpty().withMessage('Token is required')
  ],
  validateRequest,
  authController.validateToken
);

// Validate token via POST (for external apps)
router.post('/validate',
  [
    body('token').notEmpty().withMessage('Token is required')
  ],
  validateRequest,
  authController.validateToken
);

// Logout - Revoke session
router.post('/logout',
  [
    body('token').notEmpty().withMessage('Token is required')
  ],
  validateRequest,
  authController.logout
);

// Get user info from token
router.get('/me',
  authController.getMe
);

module.exports = router;



