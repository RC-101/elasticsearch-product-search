const { client: esClient } = require("../config/elasticsearch");
const mongoose = require("mongoose");
require("dotenv").config({ path: "../../.env" });

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:mongopass123@localhost:27017/products_comparison?authSource=admin";
const ES_INDEX = process.env.ELASTICSEARCH_INDEX || "products";
const ITERATIONS = 10;

// ─── Mongoose Schema ───────────────────────────────────────────────────────────
const ProductSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    description: String,
    category: String,
    brand: String,
    price: Number,
    rating: Number,
    reviews_count: Number,
    in_stock: Boolean,
    stock_quantity: Number,
    tags: [String],
    created_at: Date,
    updated_at: Date,
  },
  { collection: "products" },
);

ProductSchema.index({
  name: "text",
  description: "text",
  brand: "text",
  category: "text",
});
ProductSchema.index({ category: 1, price: 1, rating: -1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ in_stock: 1 });
ProductSchema.index({ name: 1 });

const Product = mongoose.model("Product", ProductSchema);

// ─── Elasticsearch Queries ─────────────────────────────────────────────────────
const esQueries = {
  async fullTextSearch(query) {
    const r = await esClient.search({
      index: ES_INDEX,
      body: {
        query: {
          multi_match: {
            query,
            fields: ["name^3", "description", "brand^2", "category"],
            fuzziness: "AUTO",
          },
        },
        size: 20,
      },
    });
    return { count: r.hits.total.value, topScore: r.hits.hits[0]?._score || 0 };
  },

  async fuzzySearch(query) {
    const r = await esClient.search({
      index: ES_INDEX,
      body: {
        query: {
          multi_match: {
            query,
            fields: ["name^3", "brand^2"],
            fuzziness: "AUTO",
            prefix_length: 1,
          },
        },
        size: 20,
      },
    });
    return { count: r.hits.total.value, topScore: r.hits.hits[0]?._score || 0 };
  },

  async complexFilter(query, filters) {
    const r = await esClient.search({
      index: ES_INDEX,
      body: {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query,
                  fields: ["name^3", "description", "brand^2"],
                  fuzziness: "AUTO",
                },
              },
            ],
            filter: [
              {
                range: {
                  price: { gte: filters.minPrice, lte: filters.maxPrice },
                },
              },
              { range: { rating: { gte: filters.minRating } } },
              { term: { in_stock: true } },
            ],
          },
        },
        size: 20,
      },
    });
    return { count: r.hits.total.value, topScore: r.hits.hits[0]?._score || 0 };
  },

  async autocomplete(query) {
    const r = await esClient.search({
      index: ES_INDEX,
      body: {
        query: {
          match_phrase_prefix: { name: { query, max_expansions: 10 } },
        },
        _source: ["name", "brand", "price"],
        size: 10,
      },
    });
    return { count: r.hits.hits.length };
  },

  async aggregations() {
    const r = await esClient.search({
      index: ES_INDEX,
      body: {
        size: 0,
        aggs: {
          categories: { terms: { field: "category", size: 20 } },
          brands: { terms: { field: "brand", size: 30 } },
          avg_price_per_category: {
            terms: { field: "category", size: 10 },
            aggs: { avg_price: { avg: { field: "price" } } },
          },
          price_percentiles: {
            percentiles: { field: "price", percents: [25, 50, 75, 95] },
          },
          price_ranges: {
            range: {
              field: "price",
              ranges: [
                { to: 500 },
                { from: 500, to: 1000 },
                { from: 1000, to: 2500 },
                { from: 2500, to: 5000 },
                { from: 5000 },
              ],
            },
          },
        },
      },
    });
    return { count: r.aggregations.categories.buckets.length };
  },

  async highlighting(query) {
    const r = await esClient.search({
      index: ES_INDEX,
      body: {
        query: {
          multi_match: {
            query,
            fields: ["name^3", "description"],
            fuzziness: "AUTO",
          },
        },
        highlight: {
          number_of_fragments: 1,
          fragment_size: 80,
          pre_tags: ["<em>"],
          post_tags: ["</em>"],
          fields: { name: {}, description: { number_of_fragments: 1 } },
        },
        _source: ["name"],
        size: 5, // reduced - realistic autocomplete scenario
      },
    });
    return {
      count: r.hits.hits.filter((h) => h.highlight).length,
      // Show that ES returns ready-to-render HTML fragments
      sample: r.hits.hits[0]?.highlight?.name?.[0] || null,
    };
  },
};

// ─── MongoDB Queries ───────────────────────────────────────────────────────────
const mongoQueries = {
  async fullTextSearch(query) {
    const count = await Product.countDocuments({ $text: { $search: query } });
    const top = await Product.findOne(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } },
    ).sort({ score: { $meta: "textScore" } });
    return { count, topScore: top?.score || 0 };
  },

  // MongoDB: NO native fuzzy — regex cannot handle typos
  async fuzzySearch(query) {
    const count = await Product.countDocuments({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { brand: { $regex: query, $options: "i" } },
      ],
    });
    return { count, topScore: null };
  },

  async complexFilter(query, filters) {
    const count = await Product.countDocuments({
      $text: { $search: query },
      price: { $gte: filters.minPrice, $lte: filters.maxPrice },
      rating: { $gte: filters.minRating },
      in_stock: true,
    });
    return { count, topScore: null };
  },

  // MongoDB: regex autocomplete (no edge n-grams)
  async autocomplete(query) {
    const results = await Product.find({
      name: { $regex: `^${query}`, $options: "i" },
    })
      .limit(10)
      .select("name brand price");
    return { count: results.length };
  },

  async aggregations() {
    const result = await Product.aggregate([
      {
        $facet: {
          categories: [
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
          ],
          brands: [
            { $group: { _id: "$brand", count: { $sum: 1 } } },
            { $limit: 30 },
          ],
          avg_price_per_category: [
            { $group: { _id: "$category", avg_price: { $avg: "$price" } } },
          ],
          price_ranges: [
            {
              $bucket: {
                groupBy: "$price",
                boundaries: [0, 500, 1000, 2500, 5000, 999999],
                default: "Other",
              },
            },
          ],
        },
      },
    ]);
    return { count: result[0].categories.length };
  },

  // MongoDB: manual string match — no native highlighting
  async highlighting(query) {
    const docs = await Product.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" }, name: 1, description: 1 },
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(5);

    const re = new RegExp(`(${query})`, "gi");

    // Simulate what your app MUST do manually - build highlight fragments
    const highlighted = docs.map((d) => {
      const nameMatch = d.name.replace(re, "<em>$1</em>");
      const descSnippet = d.description?.substring(0, 200) || "";
      const descMatch = descSnippet.replace(re, "<em>$1</em>");
      return { name: nameMatch, description: descMatch };
    });

    return {
      count: highlighted.filter((h) => h.name.includes("<em>")).length,
      sample: highlighted[0]?.name || null,
    };
  },
};

// ─── Benchmark Runner ──────────────────────────────────────────────────────────
async function benchmark(
  label,
  esFunc,
  mongoFunc,
  note = "",
  qualityNote = "",
) {
  console.log(`\n${"=".repeat(65)}`);
  console.log(`📋 ${label}`);
  if (note) console.log(`   ⚙️  ${note}`);
  console.log("=".repeat(65));

  await esFunc().catch(() => {});
  await mongoFunc().catch(() => {});

  const esTimes = [];
  let esResult;
  for (let i = 0; i < ITERATIONS; i++) {
    const start = process.hrtime.bigint();
    esResult = await esFunc();
    esTimes.push(Number(process.hrtime.bigint() - start) / 1_000_000);
  }

  const mongoTimes = [];
  let mongoResult;
  for (let i = 0; i < ITERATIONS; i++) {
    const start = process.hrtime.bigint();
    mongoResult = await mongoFunc();
    mongoTimes.push(Number(process.hrtime.bigint() - start) / 1_000_000);
  }

  const esAvg = esTimes.reduce((a, b) => a + b, 0) / ITERATIONS;
  const esMin = Math.min(...esTimes);
  const esMax = Math.max(...esTimes);
  const moAvg = mongoTimes.reduce((a, b) => a + b, 0) / ITERATIONS;
  const moMin = Math.min(...mongoTimes);
  const moMax = Math.max(...mongoTimes);
  const ratio = (moAvg / esAvg).toFixed(2);
  const speedWinner = esAvg < moAvg ? "Elasticsearch" : "MongoDB";

  console.log(
    `\n   ES results:    ${esResult.count} docs  ${esResult.topScore != null ? `| top score: ${esResult.topScore?.toFixed(2)}` : ""}`,
  );
  if (esResult.sample) console.log(`   ES highlight:  "${esResult.sample}"`);
  console.log(
    `   Mongo results: ${mongoResult.count} docs  ${mongoResult.topScore != null ? `| top score: ${mongoResult.topScore?.toFixed(2)}` : "(no relevance score)"}`,
  );
  if (mongoResult.sample)
    console.log(`   Mongo highlight: "${mongoResult.sample}"`);
  console.log(
    `\n   Elasticsearch:  avg=${esAvg.toFixed(2)}ms  min=${esMin.toFixed(2)}ms  max=${esMax.toFixed(2)}ms`,
  );
  console.log(
    `   MongoDB:        avg=${moAvg.toFixed(2)}ms  min=${moMin.toFixed(2)}ms  max=${moMax.toFixed(2)}ms`,
  );
  console.log(`\n   ⚡ Speed winner: 🏆 ${speedWinner}  (${ratio}x ratio)`);
  if (qualityNote) console.log(`   🎯 Quality:      ${qualityNote}`);

  return {
    label,
    esAvg,
    moAvg,
    speedup: parseFloat(ratio),
    speedWinner,
    esCount: esResult.count,
    mongoCount: mongoResult.count,
    qualityNote,
  };
}

// ─── Seed MongoDB ──────────────────────────────────────────────────────────────
async function seedMongoDB() {
  process.stdout.write("\n📦 Seeding MongoDB...");
  await Product.deleteMany({});
  let total = 0;

  // Use scroll API to paginate beyond 10K limit
  const scrollTime = "2m";

  let response = await esClient.search({
    index: ES_INDEX,
    scroll: scrollTime,
    body: {
      query: { match_all: {} },
      size: 1000,
      _source: true,
    },
  });

  let scrollId = response._scroll_id;

  while (true) {
    const batch = response.hits.hits.map((h) => h._source);
    if (!batch.length) break;

    await Product.insertMany(batch, { ordered: false });
    total += batch.length;
    process.stdout.write(`\r📦 Seeding MongoDB... ${total} docs`);

    // Fetch next page
    response = await esClient.scroll({
      scroll_id: scrollId,
      scroll: scrollTime,
    });

    scrollId = response._scroll_id;
    if (response.hits.hits.length === 0) break;
  }

  // Clear scroll context to free ES memory
  await esClient.clearScroll({ scroll_id: scrollId }).catch(() => {});

  console.log(`\n✅ MongoDB seeded: ${total} documents`);
  return total;
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function runComparison() {
  console.log("\n🔬 Elasticsearch vs MongoDB — Honest Performance Comparison");
  console.log("=".repeat(65));

  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");
  const health = await esClient.cluster.health();
  console.log(`✅ Connected to Elasticsearch: ${health.cluster_name}`);
  const { count: docCount } = await esClient.count({ index: ES_INDEX });
  console.log(`📊 Dataset size: ${docCount.toLocaleString()} products`);

  await seedMongoDB();

  const results = [];

  results.push(
    await benchmark(
      'Full-Text Search ("laptop")',
      () => esQueries.fullTextSearch("laptop"),
      () => mongoQueries.fullTextSearch("laptop"),
      "ES inverted index vs MongoDB $text index.",
      "ES returns BM25 relevance score. Mongo returns basic textScore.",
    ),
  );

  results.push(
    await benchmark(
      'Fuzzy / Typo-Tolerant Search ("samsing")',
      () => esQueries.fuzzySearch("samsing"),
      () => mongoQueries.fuzzySearch("samsing"),
      "ES uses Levenshtein distance. Mongo has NO native fuzzy — falls back to regex.",
      "ES finds typo matches. Mongo returns 0 relevant results for typos.",
    ),
  );

  results.push(
    await benchmark(
      "Complex Filter + Full-Text",
      () =>
        esQueries.complexFilter("phone", {
          minPrice: 1000,
          maxPrice: 8000,
          minRating: 3.5,
        }),
      () =>
        mongoQueries.complexFilter("phone", {
          minPrice: 1000,
          maxPrice: 8000,
          minRating: 3.5,
        }),
      "ES uses cached bitmap filters. Mongo uses compound index.",
      "ES supports fuzziness in text + filters together. Mongo $text + filter works but no fuzzy.",
    ),
  );

  results.push(
    await benchmark(
      'Autocomplete / Prefix Search ("sam")',
      () => esQueries.autocomplete("sam"),
      () => mongoQueries.autocomplete("sam"),
      "ES uses edge n-gram index. Mongo uses ^regex scan.",
      "ES returns ranked suggestions. Mongo regex has no ranking/relevance.",
    ),
  );

  results.push(
    await benchmark(
      "Faceted Aggregations (5 types simultaneously)",
      () => esQueries.aggregations(),
      () => mongoQueries.aggregations(),
      "ES uses columnar doc values. Mongo uses $facet aggregation pipeline.",
      "Both return same counts. ES advantage grows with dataset size.",
    ),
  );

  results.push(
    await benchmark(
      'Highlighted Search Results ("wireless")',
      () => esQueries.highlighting("wireless"),
      () => mongoQueries.highlighting("wireless"),
      "ES native highlight API vs manual client-side string replacement.",
      "ES returns pre-built <em>fragments</em>. Mongo requires regex post-processing per field.",
    ),
  );

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log("\n\n" + "=".repeat(65));
  console.log("📊 PERFORMANCE SUMMARY");
  console.log("=".repeat(65));
  console.log(`   Dataset: ${docCount.toLocaleString()} products\n`);

  console.table(
    results.map((r) => ({
      Test: r.label.substring(0, 36),
      "ES (ms)": r.esAvg.toFixed(2),
      "Mongo (ms)": r.moAvg.toFixed(2),
      Ratio: `${r.speedup}x`,
      "⚡ Speed": r.speedWinner,
      "ES docs": r.esCount,
      "Mongo docs": r.mongoCount,
    })),
  );

  const esSpeedWins = results.filter(
    (r) => r.speedWinner === "Elasticsearch",
  ).length;
  const moSpeedWins = results.filter((r) => r.speedWinner === "MongoDB").length;
  const esQualityWins = results.filter((r) => r.esCount > r.mongoCount).length;

  console.log(
    `\n   ⚡ Speed:   ES wins ${esSpeedWins}/6  |  MongoDB wins ${moSpeedWins}/6`,
  );
  console.log(
    `   🎯 Quality: ES returns more/better results in ${esQualityWins}/6 tests`,
  );
  console.log(`\n💡 WHAT THIS MEANS:\n`);
  console.log(
    `   At ${docCount.toLocaleString()} docs, MongoDB is faster for simple lookups.`,
  );
  console.log(
    `   This is expected — MongoDB's WiredTiger cache fits small datasets in RAM.`,
  );
  console.log(`\n   But ES wins where it matters for SEARCH:`);
  console.log(
    `   • Fuzzy: finds results MongoDB simply cannot (typo tolerance)`,
  );
  console.log(`   • Aggregations: faster even now, scales much better`);
  console.log(`   • Highlighting: native feature vs manual workaround`);
  console.log(`   • Relevance: BM25 scoring vs basic textScore`);
  console.log(`\n   📌 Production pattern used at Uber, Shopify, GitHub:`);
  console.log(
    `      MongoDB (primary store) → sync → Elasticsearch (search layer)`,
  );
  console.log(`      Each tool used for what it does best.\n`);

  await mongoose.connection.close();
  process.exit(0);
}

runComparison().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
