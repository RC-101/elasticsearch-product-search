const SearchService = require('../services/searchService');
const indexName = process.env.ELASTICSEARCH_INDEX || 'products';
const searchService = new SearchService(indexName);

exports.search = async (req, res) => {
  try {
    const results = await searchService.search(req.query);
    
    res.json({
      success: true,
      data: results,
      query: req.query
    });
  } catch (error) {
    console.error('Search controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
};

exports.autocomplete = async (req, res) => {
  try {
    const { q, size } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    const suggestions = await searchService.autocomplete(q, size);
    
    res.json({
      success: true,
      query: q,
      count: suggestions.length,
      suggestions
    });
  } catch (error) {
    console.error('Autocomplete controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Autocomplete failed',
      message: error.message
    });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await searchService.getById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get product',
      message: error.message
    });
  }
};

exports.getSimilar = async (req, res) => {
  try {
    const { id } = req.params;
    const { size } = req.query;
    
    const similar = await searchService.getSimilar(id, size);
    
    res.json({
      success: true,
      product_id: id,
      count: similar.length,
      similar_products: similar
    });
  } catch (error) {
    console.error('Similar products controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get similar products',
      message: error.message
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await searchService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Stats controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats',
      message: error.message
    });
  }
};