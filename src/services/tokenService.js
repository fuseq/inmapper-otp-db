const jwt = require('jsonwebtoken');
const { Session, User } = require('../models');

class TokenService {
  generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  async createSession(userId, callbackUrl = null, metadata = {}) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create JWT token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name
    };
    const token = this.generateToken(tokenPayload);

    // Calculate expiry from JWT
    const decoded = this.decodeToken(token);
    const expiresAt = new Date(decoded.exp * 1000);

    // Create session record
    const session = await Session.create({
      userId,
      token,
      expiresAt,
      callbackUrl,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    });

    // Update user's last login
    await user.update({ lastLoginAt: new Date() });

    return {
      token,
      expiresAt,
      session: {
        id: session.id,
        callbackUrl: session.callbackUrl
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified
      }
    };
  }

  async validateSession(token) {
    // Verify JWT
    const decoded = this.verifyToken(token);
    if (!decoded) {
      return { valid: false, error: 'Invalid or expired token' };
    }

    // Check session in database
    const session = await Session.findOne({
      where: { token },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'name', 'isActive', 'isVerified']
      }]
    });

    if (!session) {
      return { valid: false, error: 'Session not found' };
    }

    if (!session.isValid()) {
      return { valid: false, error: 'Session expired or revoked' };
    }

    if (!session.user.isActive) {
      return { valid: false, error: 'User account is deactivated' };
    }

    return {
      valid: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        isVerified: session.user.isVerified
      },
      session: {
        id: session.id,
        callbackUrl: session.callbackUrl,
        expiresAt: session.expiresAt
      }
    };
  }

  async revokeSession(token) {
    const session = await Session.findOne({ where: { token } });
    if (session) {
      session.isRevoked = true;
      await session.save();
      return true;
    }
    return false;
  }

  async revokeAllUserSessions(userId) {
    const result = await Session.update(
      { isRevoked: true },
      { where: { userId, isRevoked: false } }
    );
    return result[0]; // Number of affected rows
  }
}

module.exports = new TokenService();

