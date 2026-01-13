const { OTP, User } = require('../models');
const emailService = require('./emailService');
const { Op } = require('sequelize');

class OTPService {
  generateCode(length = 6) {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
  }

  async createAndSendOTP(userId, email, name, type = 'login', metadata = {}) {
    // Invalidate any existing unused OTPs for this user
    await OTP.update(
      { isUsed: true },
      { 
        where: { 
          userId,
          isUsed: false,
          type
        }
      }
    );

    // Generate new OTP
    const otpLength = parseInt(process.env.OTP_LENGTH) || 6;
    const plainCode = this.generateCode(otpLength);
    
    // Calculate expiry
    const expiresMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES) || 5;
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    // Create OTP record (code will be hashed by model hook)
    const otp = await OTP.create({
      userId,
      code: plainCode,
      type,
      expiresAt,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    });

    // Send email with plain code
    await emailService.sendOTP(email, name, plainCode, type);

    return {
      otpId: otp.id,
      expiresAt,
      expiresInMinutes: expiresMinutes
    };
  }

  async verifyOTP(userId, plainCode, type = 'login') {
    // Find the most recent unused OTP for this user
    const otp = await OTP.findOne({
      where: {
        userId,
        type,
        isUsed: false
      },
      order: [['createdAt', 'DESC']]
    });

    if (!otp) {
      return { success: false, error: 'OTP not found or already used' };
    }

    // Check if expired
    if (otp.isExpired()) {
      return { success: false, error: 'OTP has expired' };
    }

    // Check max attempts
    if (otp.maxAttemptsReached()) {
      return { success: false, error: 'Maximum verification attempts reached' };
    }

    // Increment attempts
    otp.attempts += 1;
    await otp.save();

    // Verify the code
    const isValid = await otp.verifyCode(plainCode);

    if (!isValid) {
      const remainingAttempts = 5 - otp.attempts;
      return { 
        success: false, 
        error: `Invalid OTP code. ${remainingAttempts} attempts remaining.`
      };
    }

    // Mark as used
    otp.isUsed = true;
    await otp.save();

    return { success: true, otp };
  }

  async cleanupExpiredOTPs() {
    const deleted = await OTP.destroy({
      where: {
        [Op.or]: [
          { expiresAt: { [Op.lt]: new Date() } },
          { isUsed: true, createdAt: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
        ]
      }
    });
    console.log(`🧹 Cleaned up ${deleted} expired/used OTPs`);
    return deleted;
  }
}

module.exports = new OTPService();

