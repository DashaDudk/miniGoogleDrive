const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const filesRoutes = require('./files');

// Підключаємо роути
router.use('/auth', authRoutes);
router.use('/files', filesRoutes);

module.exports = router;