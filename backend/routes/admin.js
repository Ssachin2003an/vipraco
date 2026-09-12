const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { getOverview, getSuperOverview } = require('../controllers/adminController');

router.get('/overview', authMiddleware, requireAdmin, getOverview);
router.get('/super-overview', authMiddleware, requireSuperAdmin, getSuperOverview);

module.exports = router;