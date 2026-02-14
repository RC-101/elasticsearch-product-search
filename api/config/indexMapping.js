const productsMapping = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      analyzer: {
        autocomplete_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'autocomplete_filter']
        },
        autocomplete_search_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase']
        }
      },
      filter: {
        autocomplete_filter: {
          type: 'edge_ngram',
          min_gram: 2,
          max_gram: 20
        }
      }
    }
  },
  mappings: {
    properties: {
      name: {
        type: 'text',
        analyzer: 'autocomplete_analyzer',
        search_analyzer: 'autocomplete_search_analyzer',
        fields: {
          keyword: { type: 'keyword' },
          standard: { type: 'text', analyzer: 'standard' }
        }
      },
      description: {
        type: 'text',
        analyzer: 'standard'
      },
      category: {
        type: 'keyword'
      },
      brand: {
        type: 'keyword'
      },
      price: {
        type: 'float'
      },
      rating: {
        type: 'float'
      },
      reviews_count: {
        type: 'integer'
      },
      in_stock: {
        type: 'boolean'
      },
      stock_quantity: {
        type: 'integer'
      },
      tags: {
        type: 'keyword'
      },
      created_at: {
        type: 'date'
      },
      updated_at: {
        type: 'date'
      }
    }
  }
};

module.exports = { productsMapping };