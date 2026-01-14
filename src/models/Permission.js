const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define('Permission', {
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
    resource: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'URL pattern or resource identifier (e.g., "matomo-analytics", "kiosk-backend")'
    },
    canAccess: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    grantedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Optional expiration date for temporary access'
    }
  }, {
    tableName: 'permissions',
    timestamps: true,
    indexes: [
      {
        fields: ['userId', 'resource'],
        unique: true
      },
      {
        fields: ['userId']
      },
      {
        fields: ['resource']
      }
    ]
  });

  return Permission;
};

