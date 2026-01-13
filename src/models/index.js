const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./User')(sequelize, Sequelize);
db.OTP = require('./OTP')(sequelize, Sequelize);
db.Session = require('./Session')(sequelize, Sequelize);

// Associations
db.User.hasMany(db.OTP, { foreignKey: 'userId', as: 'otps' });
db.OTP.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

db.User.hasMany(db.Session, { foreignKey: 'userId', as: 'sessions' });
db.Session.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

module.exports = db;

