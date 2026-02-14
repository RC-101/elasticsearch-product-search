const categories = [
  'Electronics', 'Clothing', 'Home & Kitchen', 'Books',
  'Sports & Outdoors', 'Toys & Games', 'Beauty & Personal Care',
  'Automotive', 'Health & Wellness', 'Grocery & Gourmet Food'
];

const brands = {
  'Electronics': ['Apple', 'Samsung', 'Sony', 'LG', 'Dell', 'HP', 'Lenovo', 'Asus'],
  'Clothing': ['Nike', 'Adidas', 'Zara', 'H&M', 'Levis', 'Gap', 'Puma', 'Uniqlo'],
  'Home & Kitchen': ['KitchenAid', 'Cuisinart', 'Bosch', 'Philips', 'Tefal', 'Prestige'],
  'Books': ['Penguin', 'HarperCollins', 'Random House', 'Simon & Schuster', 'Macmillan'],
  'Sports & Outdoors': ['Nike', 'Adidas', 'Reebok', 'Decathlon', 'Columbia', 'North Face'],
  'Toys & Games': ['LEGO', 'Hasbro', 'Mattel', 'Fisher-Price', 'Nerf', 'Hot Wheels'],
  'Beauty & Personal Care': ['Loreal', 'Maybelline', 'Nivea', 'Dove', 'Garnier', 'Olay'],
  'Automotive': ['Bosch', 'Michelin', '3M', 'Castrol', 'Mobil', 'Shell'],
  'Health & Wellness': ['Abbott', 'Johnson & Johnson', 'Pfizer', 'Himalaya', 'Dabur'],
  'Grocery & Gourmet Food': ['Nestle', 'Cadbury', 'Amul', 'Britannia', 'Parle', 'ITC']
};

const productNames = {
  'Electronics': [
    'Wireless Bluetooth Headphones', 'Smart LED TV', 'Gaming Laptop',
    'Smartphone', 'Tablet', 'Smartwatch', 'Wireless Mouse', 'Mechanical Keyboard',
    'Portable Speaker', 'Power Bank', 'USB-C Hub', 'Webcam HD', 'External SSD'
  ],
  'Clothing': [
    'Running Shoes', 'Cotton T-Shirt', 'Denim Jeans', 'Hoodie',
    'Track Pants', 'Sports Shorts', 'Casual Shirt', 'Winter Jacket',
    'Sneakers', 'Formal Trousers', 'Polo Shirt', 'Sweatshirt'
  ],
  'Home & Kitchen': [
    'Stainless Steel Cookware Set', 'Electric Kettle', 'Blender',
    'Toaster', 'Coffee Maker', 'Air Fryer', 'Microwave Oven',
    'Pressure Cooker', 'Mixer Grinder', 'Vacuum Cleaner', 'Iron Box'
  ],
  'Books': [
    'The Psychology of Money', 'Atomic Habits', 'Think and Grow Rich',
    'Rich Dad Poor Dad', 'The Lean Startup', 'Zero to One',
    'The Alchemist', 'Sapiens', 'Educated', 'Becoming'
  ],
  'Sports & Outdoors': [
    'Yoga Mat', 'Dumbbells Set', 'Resistance Bands', 'Treadmill',
    'Cycling Gloves', 'Sports Water Bottle', 'Gym Bag', 'Camping Tent',
    'Hiking Backpack', 'Football', 'Cricket Bat', 'Badminton Racket'
  ],
  'Toys & Games': [
    'Building Blocks Set', 'Remote Control Car', 'Board Game',
    'Puzzle Set', 'Action Figure', 'Stuffed Animal', 'Educational Toy',
    'Art & Craft Kit', 'LEGO Set', 'Nerf Gun', 'Video Game Console'
  ],
  'Beauty & Personal Care': [
    'Face Serum', 'Hair Oil', 'Body Lotion', 'Shampoo & Conditioner',
    'Sunscreen SPF 50', 'Face Wash', 'Perfume', 'Lipstick Set',
    'Eye Shadow Palette', 'Nail Polish', 'Hair Dryer', 'Electric Trimmer'
  ],
  'Automotive': [
    'Engine Oil', 'Car Vacuum Cleaner', 'Tire Inflator', 'Dash Cam',
    'Car Cover', 'Jump Starter', 'Air Freshener', 'Seat Covers',
    'Steering Wheel Cover', 'Car Polish', 'Windshield Wiper'
  ],
  'Health & Wellness': [
    'Multivitamin Tablets', 'Protein Powder', 'Omega-3 Capsules',
    'Vitamin D3', 'Immunity Booster', 'Herbal Tea', 'Fitness Tracker',
    'Blood Pressure Monitor', 'Thermometer Digital', 'First Aid Kit'
  ],
  'Grocery & Gourmet Food': [
    'Organic Honey', 'Dark Chocolate', 'Green Tea', 'Coffee Beans',
    'Pasta', 'Olive Oil', 'Peanut Butter', 'Protein Bar',
    'Instant Noodles', 'Breakfast Cereal', 'Cookies Pack', 'Dry Fruits Mix'
  ]
};

const tags = [
  'bestseller', 'new-arrival', 'sale', 'trending', 'featured',
  'top-rated', 'eco-friendly', 'limited-edition', 'premium', 'budget-friendly'
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomElements(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateProduct(id) {
  const category = getRandomElement(categories);
  const brand = getRandomElement(brands[category]);
  const productName = getRandomElement(productNames[category]);
  
  const price = parseFloat((Math.random() * 10000 + 100).toFixed(2));
  const rating = parseFloat((Math.random() * 2 + 3).toFixed(1)); // 3.0 to 5.0
  const reviewsCount = Math.floor(Math.random() * 5000);
  const inStock = Math.random() > 0.1; // 90% in stock
  const stockQuantity = inStock ? Math.floor(Math.random() * 500 + 1) : 0;
  
  const selectedTags = getRandomElements(tags, Math.floor(Math.random() * 3 + 1));
  
  const descriptions = [
    `Premium ${productName.toLowerCase()} from ${brand}. High-quality construction with modern design.`,
    `Experience the best with this ${productName.toLowerCase()}. Trusted by thousands of customers worldwide.`,
    `${brand}'s flagship ${productName.toLowerCase()} featuring cutting-edge technology and superior performance.`,
    `Top-rated ${productName.toLowerCase()} with excellent reviews. Perfect for everyday use.`,
    `Discover the ultimate ${productName.toLowerCase()} that combines style, quality, and affordability.`
  ];

  return {
    id: `PROD-${id.toString().padStart(6, '0')}`,
    name: `${brand} ${productName}`,
    description: getRandomElement(descriptions),
    category,
    brand,
    price,
    rating,
    reviews_count: reviewsCount,
    in_stock: inStock,
    stock_quantity: stockQuantity,
    tags: selectedTags,
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  };
}

function generateProducts(count = 1000) {
  const products = [];
  for (let i = 1; i <= count; i++) {
    products.push(generateProduct(i));
  }
  return products;
}

module.exports = { generateProducts };