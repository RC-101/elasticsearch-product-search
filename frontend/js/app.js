const API_BASE_URL = "http://localhost:3000/api";

let currentFilters = {
  query: "",
  page: 1,
  size: 20,
};

let autocompleteTimeout = null;

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
  attachEventListeners();
});

async function initializeApp() {
  await loadStatistics();
  await performSearch();
}

function attachEventListeners() {
  // Search
  document.getElementById("searchBtn").addEventListener("click", () => {
    currentFilters.query = document.getElementById("searchInput").value;
    currentFilters.page = 1;
    performSearch();
  });

  document.getElementById("searchInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      currentFilters.query = e.target.value;
      currentFilters.page = 1;
      performSearch();
    }
  });

  // Autocomplete
  document.getElementById("searchInput").addEventListener("input", (e) => {
    clearTimeout(autocompleteTimeout);
    const query = e.target.value.trim();

    if (query.length >= 2) {
      autocompleteTimeout = setTimeout(() => {
        fetchAutocomplete(query);
      }, 300);
    } else {
      hideAutocomplete();
    }
  });

  // Clear button
  document.getElementById("clearBtn").addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    resetFilters();
  });

  // Apply filters
  document.getElementById("applyFilters").addEventListener("click", () => {
    applyFilters();
  });

  // Reset filters
  document.getElementById("resetFilters").addEventListener("click", () => {
    resetFilters();
  });

  // Sort change
  document.getElementById("sortBy").addEventListener("change", () => {
    currentFilters.sortBy = document.getElementById("sortBy").value;
    currentFilters.page = 1;
    performSearch();
  });

  // Close modal
  document.querySelector(".close-modal").addEventListener("click", () => {
    closeModal();
  });

  document.getElementById("productModal").addEventListener("click", (e) => {
    if (e.target.id === "productModal") {
      closeModal();
    }
  });

  // Close autocomplete when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-section")) {
      hideAutocomplete();
    }
  });

  document.getElementById("clearAllFilters").addEventListener("click", () => {
    resetFilters();
  });
}

async function loadStatistics() {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`);
    const result = await response.json();

    if (result.success) {
      const stats = result.data;
      document.getElementById("totalProducts").textContent =
        stats.total_products.toLocaleString();
      document.getElementById("totalCategories").textContent =
        stats.categories_count;
      document.getElementById("totalBrands").textContent = stats.brands_count;
      document.getElementById("avgPrice").textContent =
        `₹${stats.price_stats.avg.toFixed(0)}`;
      document.getElementById("avgRating").textContent =
        `⭐ ${stats.avg_rating.toFixed(1)}`;
    }
  } catch (error) {
    console.error("Failed to load statistics:", error);
  }
}

async function performSearch() {
  showLoading();

  const startTime = performance.now();

  try {
    const params = new URLSearchParams();

    Object.keys(currentFilters).forEach((key) => {
      if (currentFilters[key] !== null && currentFilters[key] !== "") {
        params.append(key, currentFilters[key]);
      }
    });

    const response = await fetch(`${API_BASE_URL}/search?${params}`);
    const result = await response.json();

    const endTime = performance.now();
    const searchTime = ((endTime - startTime) / 1000).toFixed(3);

    if (result.success) {
      displayResults(result.data, searchTime);
      updateAggregations(result.data.aggregations);
      updateActiveFiltersBar(); // Add this line
    } else {
      showError("Search failed");
    }
  } catch (error) {
    console.error("Search error:", error);
    showError("Failed to perform search");
  } finally {
    hideLoading();
  }
}

function displayResults(data, searchTime) {
  const { total, products, page, total_pages } = data;

  // Update results info
  document.getElementById("resultsCount").textContent =
    `Found ${total.toLocaleString()} products`;
  document.getElementById("searchTime").textContent =
    `Search took ${searchTime}s`;

  // Display products
  const grid = document.getElementById("productsGrid");

  if (products.length === 0) {
    grid.innerHTML =
      '<div style="text-align:center; padding:40px; color:#6b7280;">No products found</div>';
    return;
  }

  grid.innerHTML = products
    .map((product) => createProductCard(product))
    .join("");

  // Attach click handlers
  grid.querySelectorAll(".product-card").forEach((card, index) => {
    card.addEventListener("click", () => {
      showProductDetail(products[index].id);
    });
  });

  // Update pagination
  updatePagination(page, total_pages);
}

function createProductCard(product) {
  const stars = "⭐".repeat(Math.round(product.rating));
  const stockBadge = product.in_stock
    ? '<span class="stock-badge in-stock">In Stock</span>'
    : '<span class="stock-badge out-of-stock">Out of Stock</span>';

  const tags = product.tags
    .map((tag) => `<span class="product-tag">${tag}</span>`)
    .join("");

  return `
        <div class="product-card" data-id="${product.id}">
            ${product.score ? `<div class="product-score">Score: ${product.score.toFixed(2)}</div>` : ""}
            ${stockBadge}
            <div class="product-name">${product.name}</div>
            <div class="product-meta">
                <span class="product-brand">${product.brand}</span> • 
                <span>${product.category}</span>
            </div>
            <div class="product-price">₹${product.price.toLocaleString()}</div>
            <div class="product-rating">
                <span class="rating-stars">${stars}</span>
                <span class="rating-value">${product.rating}</span>
                <span class="reviews-count">(${product.reviews_count.toLocaleString()})</span>
            </div>
            ${tags ? `<div class="product-tags">${tags}</div>` : ""}
        </div>
    `;
}

function updateAggregations(aggs) {
  // Store currently selected values before updating
  const selectedCategory = currentFilters.category;
  const selectedBrand = currentFilters.brand;
  const selectedTags = currentFilters.tags || [];

  // Categories
  const categoryFilters = document.getElementById("categoryFilters");
  categoryFilters.innerHTML = aggs.categories
    .slice(0, 10)
    .map(
      (cat) => `
        <label class="checkbox-item">
            <input type="checkbox" value="${cat.key}" class="category-filter" ${selectedCategory === cat.key ? "checked" : ""}>
            ${cat.key}
            <span class="filter-count">(${cat.doc_count})</span>
        </label>
    `,
    )
    .join("");

  // Brands
  const brandFilters = document.getElementById("brandFilters");
  brandFilters.innerHTML = aggs.brands
    .slice(0, 10)
    .map(
      (brand) => `
        <label class="checkbox-item">
            <input type="checkbox" value="${brand.key}" class="brand-filter" ${selectedBrand === brand.key ? "checked" : ""}>
            ${brand.key}
            <span class="filter-count">(${brand.doc_count})</span>
        </label>
    `,
    )
    .join("");

  // Price Ranges
  const priceRangeFilters = document.getElementById("priceRangeFilters");
  priceRangeFilters.innerHTML = aggs.price_ranges
    .map(
      (range) => `
        <div class="info-item">
            <span>${range.key}</span>
            <span>${range.doc_count}</span>
        </div>
    `,
    )
    .join("");

  // Tags
  const tagFilters = document.getElementById("tagFilters");
  tagFilters.innerHTML = aggs.tags
    .map(
      (tag) => `
        <span class="tag-item ${selectedTags.includes(tag.key) ? "active" : ""}" data-tag="${tag.key}">${tag.key} (${tag.doc_count})</span>
    `,
    )
    .join("");

  // Attach tag click handlers
  tagFilters.querySelectorAll(".tag-item").forEach((item) => {
    item.addEventListener("click", () => {
      item.classList.toggle("active");
    });
  });
}

function updatePagination(currentPage, totalPages) {
  const pagination = document.getElementById("pagination");

  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  pagination.innerHTML = `
        <button ${currentPage === 1 ? "disabled" : ""} onclick="goToPage(${currentPage - 1})">Previous</button>
        <span class="page-info">Page ${currentPage} of ${totalPages}</span>
        <button ${currentPage === totalPages ? "disabled" : ""} onclick="goToPage(${currentPage + 1})">Next</button>
    `;
}

function goToPage(page) {
  currentFilters.page = page;
  performSearch();

  // Scroll to results section smoothly
  const resultsSection = document.querySelector(".results-section");
  if (resultsSection) {
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function applyFilters() {
  currentFilters.page = 1;
  currentFilters.sortBy = document.getElementById("sortBy").value;
  currentFilters.minPrice = document.getElementById("minPrice").value;
  currentFilters.maxPrice = document.getElementById("maxPrice").value;
  currentFilters.minRating = document.getElementById("minRating").value;
  currentFilters.inStock = document.getElementById("inStock").checked;

  // Get selected categories
  const selectedCategories = Array.from(
    document.querySelectorAll(".category-filter:checked"),
  ).map((cb) => cb.value);
  if (selectedCategories.length > 0) {
    currentFilters.category = selectedCategories[0];
  } else {
    delete currentFilters.category;
  }

  // Get selected brands
  const selectedBrands = Array.from(
    document.querySelectorAll(".brand-filter:checked"),
  ).map((cb) => cb.value);
  if (selectedBrands.length > 0) {
    currentFilters.brand = selectedBrands[0];
  } else {
    delete currentFilters.brand;
  }

  // Get selected tags
  const selectedTags = Array.from(
    document.querySelectorAll(".tag-item.active"),
  ).map((tag) => tag.dataset.tag);
  if (selectedTags.length > 0) {
    currentFilters.tags = selectedTags;
  } else {
    delete currentFilters.tags;
  }

  performSearch();
}

function resetFilters() {
  currentFilters = {
    query: "",
    page: 1,
    size: 20,
  };

  document.getElementById("searchInput").value = "";
  document.getElementById("sortBy").value = "relevance";
  document.getElementById("minPrice").value = "";
  document.getElementById("maxPrice").value = "";
  document.getElementById("minRating").value = "";
  document.getElementById("inStock").checked = false;

  document
    .querySelectorAll(".category-filter")
    .forEach((cb) => (cb.checked = false));
  document
    .querySelectorAll(".brand-filter")
    .forEach((cb) => (cb.checked = false));
  document
    .querySelectorAll(".tag-item")
    .forEach((tag) => tag.classList.remove("active"));

  performSearch();
}

async function fetchAutocomplete(query) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/autocomplete?q=${encodeURIComponent(query)}&size=8`,
    );
    const result = await response.json();

    if (result.success && result.suggestions.length > 0) {
      displayAutocomplete(result.suggestions);
    } else {
      hideAutocomplete();
    }
  } catch (error) {
    console.error("Autocomplete error:", error);
  }
}

function displayAutocomplete(suggestions) {
  const container = document.getElementById("autocompleteResults");

  container.innerHTML = suggestions
    .map(
      (item) => `
        <div class="autocomplete-item" data-id="${item.id}" data-name="${item.name}">
            <div class="autocomplete-name">${item.name}</div>
            <div class="autocomplete-meta">
                ${item.brand} • ${item.category} • 
                <span class="autocomplete-price">₹${item.price.toLocaleString()}</span> • 
                ⭐ ${item.rating}
            </div>
        </div>
    `,
    )
    .join("");

  container.classList.add("show");

  // Attach click handlers
  container.querySelectorAll(".autocomplete-item").forEach((item) => {
    item.addEventListener("click", () => {
      document.getElementById("searchInput").value = item.dataset.name;
      hideAutocomplete();
      currentFilters.query = item.dataset.name;
      currentFilters.page = 1;
      performSearch();
    });
  });
}

function hideAutocomplete() {
  document.getElementById("autocompleteResults").classList.remove("show");
}

async function showProductDetail(productId) {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${productId}`);
    const result = await response.json();

    if (result.success) {
      const product = result.data;

      // Fetch similar products
      const similarResponse = await fetch(
        `${API_BASE_URL}/products/${productId}/similar?size=6`,
      );
      const similarResult = await similarResponse.json();

      const modalBody = document.getElementById("modalBody");
      modalBody.innerHTML = createProductDetail(
        product,
        similarResult.similar_products || [],
      );

      document.getElementById("productModal").classList.add("show");
    }
  } catch (error) {
    console.error("Failed to load product details:", error);
  }
}

function createProductDetail(product, similarProducts) {
  const stars = "⭐".repeat(Math.round(product.rating));
  const stockStatus = product.in_stock
    ? `<span style="color:#10b981">✓ In Stock (${product.stock_quantity} available)</span>`
    : '<span style="color:#ef4444">✗ Out of Stock</span>';

  const similarHtml =
    similarProducts.length > 0
      ? `
        <div class="similar-products">
            <h3>Similar Products</h3>
            <div class="similar-grid">
                ${similarProducts
                  .map(
                    (p) => `
                    <div class="product-card" onclick="showProductDetail('${p.id}')">
                        <div class="product-name">${p.name}</div>
                        <div class="product-meta">${p.brand} • ${p.category}</div>
                        <div class="product-price">₹${p.price.toLocaleString()}</div>
                        <div class="product-rating">⭐ ${p.rating}</div>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </div>
    `
      : "";

  return `
        <div class="product-detail">
            <div class="product-detail-header">
                <div class="product-detail-name">${product.name}</div>
                <div class="product-detail-meta">
                    <span><strong>Brand:</strong> ${product.brand}</span>
                    <span><strong>Category:</strong> ${product.category}</span>
                    <span>${stockStatus}</span>
                </div>
                <div class="product-detail-price">₹${product.price.toLocaleString()}</div>
                <div class="product-rating">
                    <span class="rating-stars">${stars}</span>
                    <span class="rating-value">${product.rating}</span>
                    <span class="reviews-count">(${product.reviews_count.toLocaleString()} reviews)</span>
                </div>
            </div>
            
            <div class="product-detail-description">
                ${product.description}
            </div>
            
            <div class="product-detail-info">
                <div class="info-row">
                    <span class="info-label">Product ID:</span>
                    <span>${product.id}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Stock Quantity:</span>
                    <span>${product.stock_quantity}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Created:</span>
                    <span>${new Date(product.created_at).toLocaleDateString()}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Last Updated:</span>
                    <span>${new Date(product.updated_at).toLocaleDateString()}</span>
                </div>
            </div>
            
            ${
              product.tags.length > 0
                ? `
                <div class="product-tags">
                    ${product.tags.map((tag) => `<span class="product-tag">${tag}</span>`).join("")}
                </div>
            `
                : ""
            }
            
            ${similarHtml}
        </div>
    `;
}

function closeModal() {
  document.getElementById("productModal").classList.remove("show");
}

function showLoading() {
  document.getElementById("loadingSpinner").style.display = "block";
  document.getElementById("productsGrid").style.display = "none";
}

function hideLoading() {
  document.getElementById("loadingSpinner").style.display = "none";
  document.getElementById("productsGrid").style.display = "grid";
}

function showError(message) {
  document.getElementById("productsGrid").innerHTML = `
        <div style="text-align:center; padding:40px; color:#ef4444;">
            <h3>Error</h3>
            <p>${message}</p>
        </div>
    `;
}

function updateActiveFiltersBar() {
  const activeFiltersBar = document.getElementById("activeFiltersBar");
  const activeFiltersList = document.getElementById("activeFiltersList");

  const activeFilters = [];

  if (currentFilters.query) {
    activeFilters.push({
      type: "query",
      label: `Search: "${currentFilters.query}"`,
      value: currentFilters.query,
    });
  }
  if (currentFilters.category) {
    activeFilters.push({
      type: "category",
      label: `Category: ${currentFilters.category}`,
      value: currentFilters.category,
    });
  }
  if (currentFilters.brand) {
    activeFilters.push({
      type: "brand",
      label: `Brand: ${currentFilters.brand}`,
      value: currentFilters.brand,
    });
  }
  if (currentFilters.minPrice || currentFilters.maxPrice) {
    const priceLabel = `Price: ${currentFilters.minPrice || "0"} - ${currentFilters.maxPrice || "∞"}`;
    activeFilters.push({ type: "price", label: priceLabel });
  }
  if (currentFilters.minRating) {
    activeFilters.push({
      type: "minRating",
      label: `Rating: ${currentFilters.minRating}+`,
    });
  }
  if (currentFilters.inStock) {
    activeFilters.push({ type: "inStock", label: "In Stock Only" });
  }
  if (currentFilters.tags && currentFilters.tags.length > 0) {
    currentFilters.tags.forEach((tag) => {
      activeFilters.push({ type: "tag", label: `Tag: ${tag}`, value: tag });
    });
  }
  if (currentFilters.sortBy && currentFilters.sortBy !== "relevance") {
    const sortLabels = {
      price_asc: "Sort: Price Low-High",
      price_desc: "Sort: Price High-Low",
      rating: "Sort: Top Rated",
      popular: "Sort: Most Popular",
      newest: "Sort: Newest",
    };
    activeFilters.push({
      type: "sort",
      label: sortLabels[currentFilters.sortBy] || currentFilters.sortBy,
    });
  }

  if (activeFilters.length === 0) {
    activeFiltersBar.style.display = "none";
    return;
  }

  activeFiltersBar.style.display = "flex";
  activeFiltersList.innerHTML = activeFilters
    .map(
      (filter) => `
        <div class="active-filter-tag">
            ${filter.label}
            <span class="remove-filter" onclick="removeFilter('${filter.type}', '${filter.value || ""}')">✕</span>
        </div>
    `,
    )
    .join("");
}

function removeFilter(type, value) {
  switch (type) {
    case "query":
      currentFilters.query = "";
      document.getElementById("searchInput").value = "";
      break;
    case "category":
      delete currentFilters.category;
      document.querySelectorAll(".category-filter").forEach((cb) => {
        if (cb.value === value) cb.checked = false;
      });
      break;
    case "brand":
      delete currentFilters.brand;
      document.querySelectorAll(".brand-filter").forEach((cb) => {
        if (cb.value === value) cb.checked = false;
      });
      break;
    case "price":
      delete currentFilters.minPrice;
      delete currentFilters.maxPrice;
      document.getElementById("minPrice").value = "";
      document.getElementById("maxPrice").value = "";
      break;
    case "minRating":
      delete currentFilters.minRating;
      document.getElementById("minRating").value = "";
      break;
    case "inStock":
      delete currentFilters.inStock;
      document.getElementById("inStock").checked = false;
      break;
    case "tag":
      if (currentFilters.tags) {
        currentFilters.tags = currentFilters.tags.filter((t) => t !== value);
        if (currentFilters.tags.length === 0) {
          delete currentFilters.tags;
        }
        document.querySelectorAll(".tag-item").forEach((tag) => {
          if (tag.dataset.tag === value) tag.classList.remove("active");
        });
      }
      break;
    case "sort":
      currentFilters.sortBy = "relevance";
      document.getElementById("sortBy").value = "relevance";
      break;
  }

  currentFilters.page = 1;
  performSearch();
}
