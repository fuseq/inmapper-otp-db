const { User, Permission, Session } = require('../models');
const { Op } = require('sequelize');

const adminController = {
  // Get all users with their permissions
  async getUsers(req, res) {
    try {
      const users = await User.findAll({
        attributes: ['id', 'email', 'name', 'isActive', 'isVerified', 'isAdmin', 'createdAt', 'lastLoginAt'],
        include: [{
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'resource', 'canAccess', 'expiresAt', 'createdAt']
        }],
        order: [['createdAt', 'DESC']]
      });

      res.json({ users });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  },

  // Get single user with permissions
  async getUser(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId, {
        attributes: ['id', 'email', 'name', 'isActive', 'isVerified', 'isAdmin', 'createdAt', 'lastLoginAt'],
        include: [{
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'resource', 'canAccess', 'expiresAt', 'createdAt']
        }]
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  },

  // Update user (admin status, active status)
  async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const { isAdmin, isActive } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (typeof isAdmin === 'boolean') user.isAdmin = isAdmin;
      if (typeof isActive === 'boolean') user.isActive = isActive;

      await user.save();

      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          isActive: user.isActive
        }
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  },

  // Get all available resources (pages/apps)
  async getResources(req, res) {
    try {
      // These can be configured in env or database
      const resources = [
        { 
          id: 'matomo-analytics', 
          name: 'Analytics Dashboard', 
          url: 'https://matomo-analytics-frontend.isohtel.com.tr',
          description: 'Kullanım ve rota istatistikleri'
        },
        { 
          id: 'kiosk-backend', 
          name: 'Kiosk Manager', 
          url: 'https://inmapper-kiosk-backend.isohtel.com.tr',
          description: 'Kiosk cihaz yönetimi'
        },
        { 
          id: 'inmapper-tools', 
          name: 'inMapper Tools', 
          url: 'https://inmapper-tools.netlify.app',
          description: 'Harita ve QR araçları'
        }
      ];

      res.json({ resources });
    } catch (error) {
      console.error('Get resources error:', error);
      res.status(500).json({ error: 'Failed to get resources' });
    }
  },

  // Grant permission to user
  async grantPermission(req, res) {
    try {
      const { userId, resource, expiresAt } = req.body;
      const grantedBy = req.adminUser.id;

      // Check if user exists
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Upsert permission
      const [permission, created] = await Permission.findOrCreate({
        where: { userId, resource },
        defaults: {
          canAccess: true,
          grantedBy,
          expiresAt: expiresAt || null
        }
      });

      if (!created) {
        permission.canAccess = true;
        permission.grantedBy = grantedBy;
        permission.expiresAt = expiresAt || null;
        await permission.save();
      }

      res.json({ 
        success: true, 
        permission: {
          id: permission.id,
          userId,
          resource,
          canAccess: permission.canAccess,
          expiresAt: permission.expiresAt
        }
      });
    } catch (error) {
      console.error('Grant permission error:', error);
      res.status(500).json({ error: 'Failed to grant permission' });
    }
  },

  // Revoke permission from user
  async revokePermission(req, res) {
    try {
      const { userId, resource } = req.body;

      const permission = await Permission.findOne({
        where: { userId, resource }
      });

      if (!permission) {
        return res.status(404).json({ error: 'Permission not found' });
      }

      permission.canAccess = false;
      await permission.save();

      res.json({ success: true, message: 'Permission revoked' });
    } catch (error) {
      console.error('Revoke permission error:', error);
      res.status(500).json({ error: 'Failed to revoke permission' });
    }
  },

  // Delete permission
  async deletePermission(req, res) {
    try {
      const { permissionId } = req.params;

      const deleted = await Permission.destroy({
        where: { id: permissionId }
      });

      if (!deleted) {
        return res.status(404).json({ error: 'Permission not found' });
      }

      res.json({ success: true, message: 'Permission deleted' });
    } catch (error) {
      console.error('Delete permission error:', error);
      res.status(500).json({ error: 'Failed to delete permission' });
    }
  },

  // Bulk update permissions for a user
  async setUserPermissions(req, res) {
    try {
      const { userId } = req.params;
      const { permissions } = req.body; // Array of { resource, canAccess }
      const grantedBy = req.adminUser.id;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update each permission
      const results = await Promise.all(permissions.map(async (perm) => {
        const [permission, created] = await Permission.findOrCreate({
          where: { userId, resource: perm.resource },
          defaults: {
            canAccess: perm.canAccess,
            grantedBy
          }
        });

        if (!created) {
          permission.canAccess = perm.canAccess;
          permission.grantedBy = grantedBy;
          await permission.save();
        }

        return {
          resource: perm.resource,
          canAccess: permission.canAccess
        };
      }));

      res.json({ success: true, permissions: results });
    } catch (error) {
      console.error('Set permissions error:', error);
      res.status(500).json({ error: 'Failed to set permissions' });
    }
  },

  // Check if user has permission for resource
  async checkPermission(req, res) {
    try {
      const { userId, resource } = req.query;

      // Admins have access to everything
      const user = await User.findByPk(userId);
      if (!user) {
        return res.json({ hasAccess: false, reason: 'User not found' });
      }

      if (!user.isActive) {
        return res.json({ hasAccess: false, reason: 'User is deactivated' });
      }

      if (user.isAdmin) {
        return res.json({ hasAccess: true, reason: 'Admin access' });
      }

      // Check specific permission
      const permission = await Permission.findOne({
        where: { 
          userId, 
          resource,
          canAccess: true
        }
      });

      if (!permission) {
        return res.json({ hasAccess: false, reason: 'No permission granted' });
      }

      // Check expiration
      if (permission.expiresAt && new Date() > new Date(permission.expiresAt)) {
        return res.json({ hasAccess: false, reason: 'Permission expired' });
      }

      res.json({ hasAccess: true });
    } catch (error) {
      console.error('Check permission error:', error);
      res.status(500).json({ hasAccess: false, error: 'Failed to check permission' });
    }
  }
};

module.exports = adminController;

