const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const OTP = sequelize.define('OTP', {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    code: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('login', 'verify'),
      defaultValue: 'login'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    tableName: 'otps',
    timestamps: true,
    hooks: {
      beforeCreate: async (otp) => {
        // Hash the OTP code before storing
        otp.code = await bcrypt.hash(otp.code, 10);
      }
    }
  });

  // Instance method to verify OTP
  OTP.prototype.verifyCode = async function(plainCode) {
    return bcrypt.compare(plainCode, this.code);
  };

  // Instance method to check if expired
  OTP.prototype.isExpired = function() {
    return new Date() > new Date(this.expiresAt);
  };

  // Instance method to check if max attempts reached
  OTP.prototype.maxAttemptsReached = function() {
    return this.attempts >= 5;
  };

  return OTP;
};



