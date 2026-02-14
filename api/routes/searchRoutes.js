const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// Search products
router.get('/search', searchController.search);

// Autocomplete suggestions
router.get('/autocomplete', searchController.autocomplete);

// Get product by ID
router.get('/products/:id', searchController.getProduct);

// Get similar products
router.get('/products/:id/similar', searchController.getSimilar);

// Get statistics
router.get('/stats', searchController.getStats);

module.exports = router;