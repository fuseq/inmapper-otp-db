const { User } = require('../models');
const otpService = require('../services/otpService');
const tokenService = require('../services/tokenService');

// Helper to get client metadata
const getClientMetadata = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress,
  userAgent: req.get('User-Agent')
});

// Helper to validate callback URL
const isValidCallbackUrl = (url) => {
  if (!url) return true;
  const allowedUrls = (process.env.ALLOWED_CALLBACK_URLS || '').split(',').filter(Boolean);
  try {
    const parsedUrl = new URL(url);
    return allowedUrls.some(allowed => {
      const allowedParsed = new URL(allowed.trim());
      return parsedUrl.origin === allowedParsed.origin;
    });
  } catch {
    return false;
  }
};

const authController = {
  // Register new user
  async register(req, res) {
    try {
      const { email, name, callbackUrl } = req.body;

      // Check if callback URL is allowed
      if (callbackUrl && !isValidCallbackUrl(callbackUrl)) {
        return res.status(400).json({ error: 'Callback URL not allowed' });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ 
          error: 'User already exists',
          message: 'An account with this email already exists. Please login instead.'
        });
      }

      // Create new user
      const user = await User.create({
        email,
        name,
        isVerified: false
      });

      // Send verification OTP
      const otpResult = await otpService.createAndSendOTP(
        user.id,
        user.email,
        user.name,
        'verify',
        getClientMetadata(req)
      );

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        otpExpiresAt: otpResult.expiresAt,
        callbackUrl
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  },

  // Login - Send OTP
  async login(req, res) {
    try {
      const { email, callbackUrl } = req.body;

      // Check if callback URL is allowed
      if (callbackUrl && !isValidCallbackUrl(callbackUrl)) {
        return res.status(400).json({ error: 'Callback URL not allowed' });
      }

      // Find user
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(404).json({ 
          error: 'User not found',
          message: 'No account found with this email. Please register first.'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      // Send login OTP
      const otpResult = await otpService.createAndSendOTP(
        user.id,
        user.email,
        user.name,
        'login',
        getClientMetadata(req)
      );

      res.json({
        success: true,
        message: 'OTP sent to your email',
        otpExpiresAt: otpResult.expiresAt,
        expiresInMinutes: otpResult.expiresInMinutes
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  },

  // Verify OTP and create session
  async verifyOTP(req, res) {
    try {
      const { email, code, callbackUrl } = req.body;

      // Find user
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Determine OTP type (verify for unverified users, login for verified)
      const otpType = user.isVerified ? 'login' : 'verify';

      // Verify OTP
      const verification = await otpService.verifyOTP(user.id, code, otpType);
      if (!verification.success) {
        return res.status(400).json({ error: verification.error });
      }

      // If this was a verification OTP, mark user as verified
      if (otpType === 'verify') {
        await user.update({ isVerified: true });
      }

      // Create session
      const sessionResult = await tokenService.createSession(
        user.id,
        callbackUrl,
        getClientMetadata(req)
      );

      res.json({
        success: true,
        message: 'Authentication successful',
        token: sessionResult.token,
        expiresAt: sessionResult.expiresAt,
        user: sessionResult.user,
        callbackUrl: callbackUrl || null
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  },

  // Resend OTP
  async resendOTP(req, res) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      const otpType = user.isVerified ? 'login' : 'verify';

      const otpResult = await otpService.createAndSendOTP(
        user.id,
        user.email,
        user.name,
        otpType,
        getClientMetadata(req)
      );

      res.json({
        success: true,
        message: 'OTP resent successfully',
        otpExpiresAt: otpResult.expiresAt,
        expiresInMinutes: otpResult.expiresInMinutes
      });
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ error: 'Failed to resend OTP' });
    }
  },

  // Validate token (for external apps)
  async validateToken(req, res) {
    try {
      const token = req.query.token || req.body.token;

      const validation = await tokenService.validateSession(token);
      
      if (!validation.valid) {
        return res.status(401).json({ 
          valid: false, 
          error: validation.error 
        });
      }

      res.json({
        valid: true,
        user: validation.user,
        session: validation.session
      });
    } catch (error) {
      console.error('Validate token error:', error);
      res.status(500).json({ valid: false, error: 'Validation failed' });
    }
  },

  // Logout
  async logout(req, res) {
    try {
      const { token } = req.body;

      const revoked = await tokenService.revokeSession(token);
      
      res.json({
        success: true,
        message: revoked ? 'Logged out successfully' : 'Session not found'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  },

  // Get current user info
  async getMe(req, res) {
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

      res.json({
        user: validation.user
      });
    } catch (error) {
      console.error('Get me error:', error);
      res.status(500).json({ error: 'Failed to get user info' });
    }
  }
};

module.exports = authController;



