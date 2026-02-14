const { client } = require('../config/elasticsearch');

class SearchService {
  constructor(indexName) {
    this.indexName = indexName;
  }

  /**
   * Full-text search with filters and aggregations
   */
  async search(params) {
    const {
      query = '',
      category,
      brand,
      minPrice,
      maxPrice,
      minRating,
      inStock,
      tags,
      sortBy = 'relevance',
      page = 1,
      size = 20
    } = params;

    const from = (page - 1) * size;

    // Build query
    const must = [];
    const filter = [];

    // Full-text search
    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['name^3', 'description', 'brand^2', 'category'],
          type: 'best_fields',
          fuzziness: 'AUTO',
          operator: 'or'
        }
      });
    } else {
      must.push({ match_all: {} });
    }

    // Filters
    if (category) {
      filter.push({ term: { category } });
    }

    if (brand) {
      filter.push({ term: { brand } });
    }

    if (minPrice || maxPrice) {
      const priceRange = {};
      if (minPrice) priceRange.gte = parseFloat(minPrice);
      if (maxPrice) priceRange.lte = parseFloat(maxPrice);
      filter.push({ range: { price: priceRange } });
    }

    if (minRating) {
      filter.push({ range: { rating: { gte: parseFloat(minRating) } } });
    }

    if (inStock === 'true' || inStock === true) {
      filter.push({ term: { in_stock: true } });
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      filter.push({ terms: { tags: tagArray } });
    }

    // Build sort
    let sort = [];
    switch (sortBy) {
      case 'price_asc':
        sort = [{ price: 'asc' }];
        break;
      case 'price_desc':
        sort = [{ price: 'desc' }];
        break;
      case 'rating':
        sort = [{ rating: 'desc' }, { reviews_count: 'desc' }];
        break;
      case 'newest':
        sort = [{ created_at: 'desc' }];
        break;
      case 'popular':
        sort = [{ reviews_count: 'desc' }];
        break;
      default:
        sort = ['_score', { rating: 'desc' }];
    }

    // Elasticsearch query
    const body = {
      query: {
        bool: { must, filter }
      },
      sort,
      from,
      size,
      aggs: {
        categories: {
          terms: { field: 'category', size: 20 }
        },
        brands: {
          terms: { field: 'brand', size: 30 }
        },
        price_ranges: {
          range: {
            field: 'price',
            ranges: [
              { key: 'Under ₹500', to: 500 },
              { key: '₹500 - ₹1000', from: 500, to: 1000 },
              { key: '₹1000 - ₹2500', from: 1000, to: 2500 },
              { key: '₹2500 - ₹5000', from: 2500, to: 5000 },
              { key: '₹5000+', from: 5000 }
            ]
          }
        },
        avg_price: {
          avg: { field: 'price' }
        },
        tags: {
          terms: { field: 'tags', size: 15 }
        }
      },
      track_total_hits: true
    };

    try {
      const result = await client.search({
        index: this.indexName,
        body
      });

      return {
        total: result.hits.total.value,
        page: parseInt(page),
        size: parseInt(size),
        total_pages: Math.ceil(result.hits.total.value / size),
        products: result.hits.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          ...hit._source
        })),
        aggregations: {
          categories: result.aggregations.categories.buckets,
          brands: result.aggregations.brands.buckets,
          price_ranges: result.aggregations.price_ranges.buckets,
          avg_price: result.aggregations.avg_price.value,
          tags: result.aggregations.tags.buckets
        }
      };
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Autocomplete/suggestions
   */
  async autocomplete(query, size = 10) {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const result = await client.search({
        index: this.indexName,
        body: {
          query: {
            bool: {
              should: [
                {
                  match: {
                    name: {
                      query,
                      fuzziness: 'AUTO',
                      prefix_length: 1
                    }
                  }
                },
                {
                  match_phrase_prefix: {
                    name: {
                      query,
                      max_expansions: 10
                    }
                  }
                }
              ]
            }
          },
          _source: ['name', 'category', 'brand', 'price', 'rating'],
          size
        }
      });

      return result.hits.hits.map(hit => ({
        id: hit._id,
        name: hit._source.name,
        category: hit._source.category,
        brand: hit._source.brand,
        price: hit._source.price,
        rating: hit._source.rating
      }));
    } catch (error) {
      console.error('Autocomplete error:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getById(productId) {
    try {
      const result = await client.get({
        index: this.indexName,
        id: productId
      });

      return {
        id: result._id,
        ...result._source
      };
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        return null;
      }
      console.error('Get by ID error:', error);
      throw error;
    }
  }

  /**
   * Get similar products (More Like This)
   */
  async getSimilar(productId, size = 10) {
    try {
      const result = await client.search({
        index: this.indexName,
        body: {
          query: {
            more_like_this: {
              fields: ['name', 'description', 'category', 'brand'],
              like: [
                {
                  _index: this.indexName,
                  _id: productId
                }
              ],
              min_term_freq: 1,
              min_doc_freq: 1,
              max_query_terms: 12
            }
          },
          _source: ['name', 'category', 'brand', 'price', 'rating', 'in_stock'],
          size
        }
      });

      return result.hits.hits.map(hit => ({
        id: hit._id,
        score: hit._score,
        ...hit._source
      }));
    } catch (error) {
      console.error('Similar products error:', error);
      throw error;
    }
  }

  /**
   * Get search statistics
   */
  async getStats() {
    try {
      const result = await client.search({
        index: this.indexName,
        body: {
          size: 0,
          aggs: {
            total_products: {
              value_count: { field: 'id.keyword' }
            },
            categories_count: {
              cardinality: { field: 'category' }
            },
            brands_count: {
              cardinality: { field: 'brand' }
            },
            price_stats: {
              stats: { field: 'price' }
            },
            avg_rating: {
              avg: { field: 'rating' }
            },
            in_stock_count: {
              filter: { term: { in_stock: true } }
            },
            top_categories: {
              terms: { field: 'category', size: 10 }
            },
            top_brands: {
              terms: { field: 'brand', size: 10 }
            }
          }
        }
      });

      const aggs = result.aggregations;
      return {
        total_products: aggs.total_products.value,
        categories_count: aggs.categories_count.value,
        brands_count: aggs.brands_count.value,
        in_stock_count: aggs.in_stock_count.doc_count,
        price_stats: {
          min: aggs.price_stats.min,
          max: aggs.price_stats.max,
          avg: aggs.price_stats.avg,
          sum: aggs.price_stats.sum
        },
        avg_rating: aggs.avg_rating.value,
        top_categories: aggs.top_categories.buckets,
        top_brands: aggs.top_brands.buckets
      };
    } catch (error) {
      console.error('Stats error:', error);
      throw error;
    }
  }
}

module.exports = SearchService;