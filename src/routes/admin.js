const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');

// All routes require admin authentication
router.use(adminAuth);

// Users
router.get('/users', adminController.getUsers);
router.get('/users/:userId', adminController.getUser);
router.patch('/users/:userId', adminController.updateUser);
router.put('/users/:userId/permissions', adminController.setUserPermissions);

// Resources
router.get('/resources', adminController.getResources);

// Permissions
router.post('/permissions/grant', adminController.grantPermission);
router.post('/permissions/revoke', adminController.revokePermission);
router.delete('/permissions/:permissionId', adminController.deletePermission);

// Check permission (can be used without full admin auth for validation)
router.get('/permissions/check', adminController.checkPermission);

module.exports = router;

