# 🔍 Elasticsearch Product Search Engine

A high-performance, real-time product search engine built with **Elasticsearch**, **Node.js**, and **Express**, featuring full-text search, autocomplete, fuzzy matching, faceted filtering, and aggregations.

![Search](https://img.shields.io/badge/Search-Elasticsearch_8.12-005571?style=for-the-badge&logo=elasticsearch)
![Backend](https://img.shields.io/badge/Backend-Node.js_+_Express-339933?style=for-the-badge&logo=nodedotjs)
![Frontend](https://img.shields.io/badge/Frontend-Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript)
![Docker](https://img.shields.io/badge/Containers-Docker-2496ED?style=for-the-badge&logo=docker)

---

## 🎯 What This Project Demonstrates

Built as a portfolio project to showcase search engineering knowledge that goes beyond basic CRUD:

- Elasticsearch index design with custom analyzers and mappings
- BM25 relevance scoring and ranking strategies
- Edge n-gram tokenization for search-as-you-type
- Faceted search with real-time aggregations
- Honest performance benchmarking (ES vs MongoDB) with documented trade-offs
- Production-grade dual-store architecture pattern

---

## ✨ Features

### Search Capabilities
- **Full-Text Search** — Multi-field search with BM25 relevance scoring and field boosting (`name^3`, `brand^2`)
- **Fuzzy Matching** — Levenshtein distance-based typo tolerance (finds "Samsung" when you type "samsing")
- **Autocomplete** — Edge n-gram indexed, sub-2ms prefix suggestions
- **Faceted Search** — Dynamic filters built from real-time aggregations (categories, brands, price ranges, tags)
- **Advanced Filters** — Price range, minimum rating, stock availability, tags
- **Similar Products** — More Like This (MLT) query for recommendations
- **Result Highlighting** — Native ES highlight API with `<em>` fragments

### User Interface
- Live autocomplete with 300ms debounce
- Active filters bar with individual filter removal
- Product detail modal with similar product suggestions
- Statistics dashboard (total products, categories, brands, avg price, avg rating)
- Pagination with smooth scroll-to-results
- Responsive design (mobile + desktop)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│              Browser (Vanilla JS)                   │
│         Search UI + Filters + Dashboard             │
└────────────────────┬────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼────────────────────────────────┐
│           Express.js API (Node.js)                  │
│   Controllers → Services → ES Client               │
└────────────────────┬────────────────────────────────┘
                     │ @elastic/elasticsearch
┌────────────────────▼────────────────────────────────┐
│           Elasticsearch 8.12                        │
│   Inverted Index · Doc Values · Edge N-grams        │
│   BM25 Scoring · Aggregations · Highlight API       │
└─────────────────────────────────────────────────────┘
              │ Dev Tools / Index Management
┌─────────────▼───────────────────────────────────────┐
│                  Kibana 8.12                        │
└─────────────────────────────────────────────────────┘
```

### Project Structure

```
elasticsearch-product-search/
├── api/
│   ├── config/
│   │   ├── elasticsearch.js        # ES client + connection
│   │   └── indexMapping.js         # Index settings, analyzers, mappings
│   ├── controllers/
│   │   └── searchController.js     # Route handlers
│   ├── services/
│   │   ├── searchService.js        # All ES query logic
│   │   ├── indexService.js         # Index create/delete/info
│   │   └── bulkIndexService.js     # Bulk indexing with error handling
│   ├── routes/
│   │   └── searchRoutes.js
│   ├── scripts/
│   │   ├── seedData.js             # Data generation + bulk indexing
│   │   └── performanceComparison.js # ES vs MongoDB benchmarks
│   ├── utils/
│   │   └── dataGenerator.js        # 10K realistic product generator
│   └── server.js
├── frontend/
│   ├── css/style.css
│   ├── js/app.js
│   └── index.html
├── docker-compose.yml
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker + Docker Compose

### Installation

```bash
# 1. Clone
git clone https://github.com/RC-101/elasticsearch-product-search.git
cd elasticsearch-product-search

# 2. Start containers (Elasticsearch + Kibana + MongoDB)
docker-compose up -d

# Wait ~60s for Elasticsearch to be healthy
docker-compose ps

# 3. Install dependencies
cd api && npm install

# 4. Configure environment
cp .env.example .env
# Default values work out of the box

# 5. Seed data
npm run seed          # 1,000 products
npm run seed:xl       # 10,000 products (recommended)

# 6. Start API
npm run dev
# Server: http://localhost:3000

# 7. Open frontend
# Open frontend/index.html in browser
# Or: cd ../frontend && npx http-server -p 8080
```

---

## 📊 Performance Benchmark: ES vs MongoDB

Benchmarked at **10,000 products**, 10 iterations each, on local Docker.

| Test | ES (ms) | Mongo (ms) | Ratio | Speed Winner | Quality Winner |
|---|---|---|---|---|---|
| Full-Text Search ("laptop") | 5.08 | 1.89 | 0.37x | 🏆 MongoDB | 🏆 ES (BM25 vs basic textScore) |
| Fuzzy Search ("samsing" → Samsung) | 2.60 | 9.30 | **3.58x** | 🏆 ES | 🏆 ES (112 results vs **0**) |
| Complex Filter + Full-Text | 1.76 | 0.74 | 0.42x | 🏆 MongoDB | 🏆 ES (46 results vs **0**) |
| Autocomplete ("sam") | 1.88 | 5.00 | **2.66x** | 🏆 ES | 🏆 ES (ranked vs unranked) |
| Faceted Aggregations (5 types) | 1.68 | 11.92 | **7.09x** | 🏆 ES | Tie |
| Result Highlighting ("wireless") | 20.39 | 1.22 | 0.06x | 🏆 MongoDB | 🏆 ES (native `<em>` fragments) |

**Speed: 3–3 tie. Quality: ES wins where search actually matters.**

### What the Numbers Actually Mean

**MongoDB wins on simple queries at small scale** — WiredTiger fits 10K docs entirely in RAM, so lookups are nearly free. This is expected and honest.

**Elasticsearch wins on search-specific workloads:**

- **Fuzzy search**: ES finds 112 results for "samsing". MongoDB finds **zero** — it has no native fuzzy matching, only regex which can't handle transpositions.
- **Complex filter + full-text**: ES returns 46 results combining fuzzy text + price + rating + stock filters. MongoDB returns **zero** because `$text` doesn't support fuzziness.
- **Autocomplete**: ES edge n-grams are 2.66x faster than MongoDB's `^regex` scan and return ranked results.
- **Aggregations**: ES is **7.09x faster** even at 10K docs due to columnar doc values vs MongoDB's `$facet` pipeline. This gap widens significantly at 100K+ docs.
- **Highlighting**: ES returns ready-to-render `<em>HP <b>Wireless</b> Mouse</em>` fragments natively. MongoDB requires manual post-processing.

### Production Pattern (Uber, Shopify, GitHub)

```
Write → MongoDB (primary store, ACID transactions, relations)
           ↓ sync (change streams / Logstash / custom)
      Elasticsearch (search layer, analytics, autocomplete)
```

Each tool used for what it does best.

---

## 🔗 API Reference

### `GET /api/search`

```
GET /api/search?query=laptop&category=Electronics&minPrice=1000&maxPrice=5000&minRating=4&inStock=true&sortBy=rating&page=1&size=20
```

| Parameter | Type | Description |
|---|---|---|
| `query` | string | Full-text search (fuzzy, multi-field) |
| `category` | string | Exact category filter |
| `brand` | string | Exact brand filter |
| `minPrice` / `maxPrice` | number | Price range |
| `minRating` | number | Minimum rating (1–5) |
| `inStock` | boolean | In-stock products only |
| `tags` | string/array | Tag filter |
| `sortBy` | string | `relevance`, `price_asc`, `price_desc`, `rating`, `popular`, `newest` |
| `page` / `size` | number | Pagination |

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 247,
    "page": 1,
    "size": 20,
    "total_pages": 13,
    "products": [...],
    "aggregations": {
      "categories": [...],
      "brands": [...],
      "price_ranges": [...],
      "tags": [...]
    }
  }
}
```

### `GET /api/autocomplete?q=sam&size=10`
### `GET /api/products/:id`
### `GET /api/products/:id/similar?size=5`
### `GET /api/stats`
### `GET /health`

---

## 💡 Technical Highlights

### Custom Index Mapping

```javascript
// Edge n-gram filter for autocomplete
"autocomplete_filter": {
  "type": "edge_ngram",
  "min_gram": 2,
  "max_gram": 20
}

// Multi-field name mapping
"name": {
  "type": "text",
  "analyzer": "autocomplete_analyzer",    // for autocomplete
  "search_analyzer": "autocomplete_search_analyzer",
  "fields": {
    "keyword": { "type": "keyword" },     // for sorting/aggregations
    "standard": { "type": "text" }        // for standard search
  }
}
```

### Search Query Strategy

```javascript
// Field boosting + fuzzy in one query
{
  "multi_match": {
    "query": "samsing laptop",
    "fields": ["name^3", "description", "brand^2", "category"],
    "fuzziness": "AUTO",     // handles typos via Levenshtein distance
    "operator": "or"
  }
}

// Filters in bool.filter context = cached bitmaps, no scoring cost
{
  "bool": {
    "must": [/* scored text query */],
    "filter": [
      { "range": { "price": { "gte": 1000, "lte": 5000 } } },
      { "term": { "in_stock": true } }
    ]
  }
}
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Search Engine | Elasticsearch 8.12 |
| Backend | Node.js, Express.js |
| Frontend | Vanilla JavaScript, HTML5, CSS3 |
| Dev Tools | Kibana 8.12 |
| Containerization | Docker, Docker Compose |
| Benchmarking | MongoDB 7.0 (comparison only) |

---

## 📈 Scaling to Production

Current setup is single-node for development. For production:

1. **ES Cluster** — 3+ nodes, 1 primary + 1 replica per shard
2. **Caching** — Redis layer for hot aggregation queries
3. **Auth** — JWT + API key authentication
4. **Rate Limiting** — Per-IP token bucket (Redis)
5. **Monitoring** — Elastic APM + Kibana dashboards
6. **Index Lifecycle** — ILM policies for rollover and retention
7. **Sync Pipeline** — MongoDB change streams → Logstash → ES

---

## 🗺️ Future Enhancements

- [ ] Vector/semantic search with dense_vector fields (kNN)
- [ ] Query suggestions based on search analytics
- [ ] A/B testing framework for relevance tuning
- [ ] Real-time inventory sync via MongoDB change streams
- [ ] Multi-language analyzers (Hindi, French, etc.)
- [ ] Search analytics dashboard (trending queries, zero-result tracking)
- [ ] GraphQL API layer

---

*Built to demonstrate search engineering expertise beyond basic CRUD — honest benchmarks, real trade-offs, production patterns.*
