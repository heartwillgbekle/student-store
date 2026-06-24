const API_BASE_URL = 'http://localhost:3000'

const img = (seed) => `https://picsum.photos/seed/${seed}/600/600`

const products = [
  // ─────────── Accessories (+10) ───────────
  { name: 'Insulated Water Bottle', description: '24oz double-wall stainless steel water bottle. Keeps cold for 24 hours, hot for 12.', price: 22.99, image_url: img('accessory-waterbottle'), category: 'Accessories' },
  { name: 'Stainless Steel Travel Mug', description: '16oz spill-proof travel mug with vacuum insulation. Fits standard cup holders.', price: 18.99, image_url: img('accessory-travelmug'), category: 'Accessories' },
  { name: 'Wireless Earbuds', description: 'Bluetooth 5.3 earbuds with active noise cancellation and a 30-hour charging case.', price: 49.99, image_url: img('accessory-earbuds'), category: 'Accessories' },
  { name: 'Phone Wallet Case', description: 'Slim case with built-in cardholder. Fits up to three cards plus ID. iPhone and Android compatible.', price: 16.99, image_url: img('accessory-phonecase'), category: 'Accessories' },
  { name: 'Compact Travel Umbrella', description: 'Wind-resistant auto-open umbrella that folds to 11 inches. Includes carrying sleeve.', price: 14.99, image_url: img('accessory-umbrella'), category: 'Accessories' },
  { name: 'Crossbody Sling Bag', description: 'Lightweight sling with a padded laptop sleeve and quick-access front pocket.', price: 32.99, image_url: img('accessory-slingbag'), category: 'Accessories' },
  { name: 'College Logo Backpack', description: 'Heavy-duty 25L backpack with padded straps, USB charging port, and embroidered college logo.', price: 54.99, image_url: img('accessory-backpack'), category: 'Accessories' },
  { name: 'Polarized Sunglasses', description: 'UV400 polarized lenses with a lightweight metal frame. Includes microfiber pouch.', price: 19.99, image_url: img('accessory-sunglasses'), category: 'Accessories' },
  { name: 'Bluetooth Speaker', description: 'Portable speaker with 12-hour battery life and IPX5 water resistance.', price: 39.99, image_url: img('accessory-speaker'), category: 'Accessories' },
  { name: 'Power Bank 10,000mAh', description: 'Slim power bank with dual USB outputs. Charges most phones two full times.', price: 24.99, image_url: img('accessory-powerbank'), category: 'Accessories' },

  // ─────────── Apparel (+4) ───────────
  { name: 'Wool Scarf', description: 'Soft wool-blend scarf in school colors. Lightweight enough for fall, warm enough for winter.', price: 24.99, image_url: img('apparel-scarf'), category: 'Apparel' },
  { name: 'Touchscreen Gloves', description: 'Knit gloves with conductive fingertips so you can text without taking them off.', price: 12.99, image_url: img('apparel-gloves'), category: 'Apparel' },
  { name: 'Puffer Vest', description: 'Lightweight quilted vest with a stand-up collar and zippered hand pockets. Packs into its own pocket.', price: 44.99, image_url: img('apparel-vest'), category: 'Apparel' },
  { name: 'Flannel Button-Down', description: 'Soft brushed flannel shirt in a classic plaid. Roomy fit, button-front, chest pocket.', price: 36.99, image_url: img('apparel-flannel'), category: 'Apparel' },

  // ─────────── Books (+12) ───────────
  { name: 'General Chemistry, 11th Ed.', description: 'Comprehensive intro chemistry textbook covering atomic theory through thermodynamics.', price: 94.99, image_url: img('book-chemistry'), category: 'Books' },
  { name: 'Organic Chemistry Study Guide', description: 'Companion workbook with hundreds of practice reactions and worked solutions.', price: 38.99, image_url: img('book-orgchem'), category: 'Books' },
  { name: 'Principles of Biology', description: 'Full-color undergraduate biology textbook. Cell biology, genetics, ecology, evolution.', price: 89.99, image_url: img('book-biology'), category: 'Books' },
  { name: 'World History: The Modern Era', description: 'Survey of world history from 1500 to the present. Maps, primary sources, timelines.', price: 64.99, image_url: img('book-worldhistory'), category: 'Books' },
  { name: 'Introduction to Psychology', description: 'Foundational text covering perception, learning, memory, personality, and social psychology.', price: 72.99, image_url: img('book-psychology'), category: 'Books' },
  { name: 'Principles of Microeconomics', description: 'Introductory microeconomics textbook with case studies and end-of-chapter problem sets.', price: 79.99, image_url: img('book-microecon'), category: 'Books' },
  { name: 'Statistics for Engineers', description: 'Applied statistics with engineering examples. Probability, hypothesis testing, regression.', price: 84.99, image_url: img('book-statistics'), category: 'Books' },
  { name: 'Python Programming Basics', description: 'Beginner-friendly intro to Python. Covers syntax through OOP, files, and basic web scraping.', price: 39.99, image_url: img('book-python'), category: 'Books' },
  { name: 'JavaScript: The Good Parts', description: 'Distilled guide to the elegant subset of JavaScript. A classic for any web developer.', price: 29.99, image_url: img('book-javascript'), category: 'Books' },
  { name: 'Spanish 101 Workbook', description: 'Intro Spanish workbook with vocabulary lists, grammar drills, and conversation practice.', price: 24.99, image_url: img('book-spanish'), category: 'Books' },
  { name: 'Philosophy: A Brief Introduction', description: 'A survey of Western philosophy from the pre-Socratics to contemporary thinkers.', price: 32.99, image_url: img('book-philosophy'), category: 'Books' },
  { name: 'The Great Gatsby', description: 'F. Scott Fitzgerald\'s classic novel of the Jazz Age. Penguin Classics edition.', price: 12.99, image_url: img('book-gatsby'), category: 'Books' },

  // ─────────── Snacks (+12) ───────────
  { name: 'Cold Brew Coffee', description: '11oz can of unsweetened cold brew. Smooth, low-acid, ready to drink.', price: 3.49, image_url: img('snack-coldbrew'), category: 'Snacks' },
  { name: 'Iced Green Tea', description: '16.9oz bottled green tea, lightly sweetened with honey.', price: 2.49, image_url: img('snack-greentea'), category: 'Snacks' },
  { name: 'Bottled Water 6-Pack', description: 'Six 16.9oz bottles of natural spring water.', price: 4.99, image_url: img('snack-water'), category: 'Snacks' },
  { name: 'Protein Bar (Chocolate PB)', description: '20g protein bar with chocolate and peanut butter. Gluten-free.', price: 2.79, image_url: img('snack-proteinbar'), category: 'Snacks' },
  { name: 'Sandwich Cookies (12-pack)', description: 'Chocolate sandwich cookies with vanilla cream filling. School lunch classic.', price: 3.99, image_url: img('snack-cookies'), category: 'Snacks' },
  { name: 'Salt & Vinegar Chips', description: 'Kettle-cooked potato chips with a sharp salt-and-vinegar finish. 5oz bag.', price: 2.99, image_url: img('snack-chips'), category: 'Snacks' },
  { name: 'Microwave Popcorn (3-pack)', description: 'Movie-theater butter popcorn. Three single-serving microwaveable bags.', price: 4.49, image_url: img('snack-popcorn'), category: 'Snacks' },
  { name: 'Sour Gummy Worms', description: '5oz bag of sour-coated gummy worms. The classic study-snack candy.', price: 2.99, image_url: img('snack-gummies'), category: 'Snacks' },
  { name: 'Instant Ramen Cup', description: 'Microwaveable noodle cup with seasoning packet. Ready in 3 minutes.', price: 1.99, image_url: img('snack-ramen'), category: 'Snacks' },
  { name: 'Sourdough Pretzels', description: 'Hard sourdough pretzels with a deep, tangy flavor. 8oz bag.', price: 3.49, image_url: img('snack-pretzels'), category: 'Snacks' },
  { name: 'Cheese Crackers (Box)', description: 'Bite-sized cheddar crackers in a school-lunch-sized box. Each box ~50 crackers.', price: 3.79, image_url: img('snack-crackers'), category: 'Snacks' },
  { name: 'Fruit Strips Variety Pack', description: 'Twelve real-fruit strips in assorted flavors. No artificial colors or flavors.', price: 5.49, image_url: img('snack-fruitstrips'), category: 'Snacks' },

  // ─────────── Supplies (+12) ───────────
  { name: 'Mechanical Pencil 6-Pack', description: 'Refillable 0.7mm mechanical pencils with comfort grips. Lead and erasers included.', price: 6.99, image_url: img('supply-mechpencil'), category: 'Supplies' },
  { name: 'Yellow Highlighter Set', description: 'Set of 6 chisel-tip highlighters in classic yellow. Smear-resistant ink.', price: 4.99, image_url: img('supply-highlighters'), category: 'Supplies' },
  { name: 'Permanent Marker Pack', description: 'Pack of 4 permanent markers — fine, medium, broad, and chisel tips.', price: 7.99, image_url: img('supply-markers'), category: 'Supplies' },
  { name: 'Three-Ring Binder (2-inch)', description: 'Heavy-duty 2-inch binder with interior pockets and a clear-view front cover.', price: 8.99, image_url: img('supply-binder'), category: 'Supplies' },
  { name: 'Index Card Pack (500ct)', description: '500 ruled 3x5 index cards in assorted colors. Great for flashcards.', price: 5.99, image_url: img('supply-indexcards'), category: 'Supplies' },
  { name: 'Scientific Calculator', description: 'Two-line scientific calculator with 200+ functions. Approved for the SAT, ACT, AP exams.', price: 16.99, image_url: img('supply-calculator'), category: 'Supplies' },
  { name: 'Eraser Pack (10ct)', description: 'Ten white vinyl erasers. Cleaner lift, no smudging.', price: 3.49, image_url: img('supply-erasers'), category: 'Supplies' },
  { name: 'Loose-Leaf Paper (200ct)', description: '200 sheets of college-ruled, three-hole-punched filler paper.', price: 4.49, image_url: img('supply-paper'), category: 'Supplies' },
  { name: 'Mini Stapler', description: 'Compact stapler with built-in staple remover. Includes 1000 staples.', price: 6.49, image_url: img('supply-stapler'), category: 'Supplies' },
  { name: 'Clear Tape Dispenser', description: 'Weighted desk tape dispenser with two refill rolls of clear tape.', price: 5.99, image_url: img('supply-tape'), category: 'Supplies' },
  { name: 'Sticky Tabs Variety Pack', description: 'Reusable sticky page-marker tabs in 5 colors. 480 tabs total.', price: 7.99, image_url: img('supply-stickytabs'), category: 'Supplies' },
  { name: 'Desk Organizer Caddy', description: 'Mesh metal desk caddy with five compartments for pens, scissors, sticky notes, and more.', price: 12.99, image_url: img('supply-caddy'), category: 'Supplies' },
]

;(async () => {
  let created = 0
  let failed = 0
  const byCategory = {}
  for (const product of products) {
    try {
      const res = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      })
      const data = await res.json()
      if (!res.ok) {
        console.error(`✗ [${product.category.padEnd(11)}] ${product.name} — ${data.error || res.statusText}`)
        failed++
        continue
      }
      console.log(`✓ ${data.product.id.toString().padStart(3)}  [${product.category.padEnd(11)}]  ${product.name}`)
      byCategory[product.category] = (byCategory[product.category] || 0) + 1
      created++
    } catch (err) {
      console.error(`✗ [${product.category.padEnd(11)}] ${product.name} — ${err.message}`)
      failed++
    }
  }
  console.log(`\nDone: ${created} created, ${failed} failed.`)
  if (created > 0) {
    console.log('Breakdown by category:')
    for (const [cat, n] of Object.entries(byCategory).sort()) {
      console.log(`  ${cat.padEnd(11)}  +${n}`)
    }
  }
})()
