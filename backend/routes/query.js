const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { handleQuery } = require('../controllers/queryController');

router.post('/', authMiddleware, handleQuery);

module.exports = router;
