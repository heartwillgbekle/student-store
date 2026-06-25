const API_BASE_URL = 'http://localhost:3000'

const products = [
  // Apparel
  {
    name: 'College T-Shirt',
    description: 'Soft cotton tee with the college logo. Available in classic navy.',
    price: 19.99,
    image_url: 'https://tinyurl.com/college-tshirt',
    category: 'Apparel',
  },
  {
    name: 'Crewneck Sweatshirt',
    description: 'Heavyweight crewneck for cold lecture halls and late-night study sessions.',
    price: 39.99,
    image_url: 'https://tinyurl.com/college-crewneck',
    category: 'Apparel',
  },
  {
    name: 'Athletic Shorts',
    description: 'Lightweight performance shorts with the school crest.',
    price: 24.99,
    image_url: 'https://tinyurl.com/college-shorts',
    category: 'Apparel',
  },

  // Accessories
  {
    name: 'College Beanie',
    description: 'Warm knit beanie with embroidered college logo.',
    price: 14.99,
    image_url: 'https://tinyurl.com/college-beanie',
    category: 'Accessories',
  },
  {
    name: 'Canvas Tote Bag',
    description: 'Sturdy canvas tote for books, groceries, or laundry day.',
    price: 12.99,
    image_url: 'https://tinyurl.com/college-tote',
    category: 'Accessories',
  },
  {
    name: 'Lanyard Keychain',
    description: 'Branded lanyard with detachable keyring for student IDs.',
    price: 6.99,
    image_url: 'https://tinyurl.com/college-lanyard',
    category: 'Accessories',
  },

  // Books
  {
    name: 'Intro to Computer Science',
    description: 'Comprehensive introduction to algorithms, data structures, and computation.',
    price: 79.99,
    image_url: 'https://tinyurl.com/cs-textbook',
    category: 'Books',
  },
  {
    name: 'Linear Algebra Workbook',
    description: 'Hundreds of practice problems with step-by-step solutions.',
    price: 34.99,
    image_url: 'https://tinyurl.com/algebra-book',
    category: 'Books',
  },
  {
    name: 'Modern American Literature',
    description: 'Anthology spanning 20th-century American novels, short stories, and essays.',
    price: 49.99,
    image_url: 'https://tinyurl.com/lit-anthology',
    category: 'Books',
  },
  {
    name: 'Calculus, 9th Edition',
    description: 'The standard reference for single and multivariable calculus.',
    price: 89.99,
    image_url: 'https://tinyurl.com/calc-textbook',
    category: 'Books',
  },

  // Snacks
  {
    name: 'Energy Drink',
    description: '16oz sugar-free energy drink for finals week.',
    price: 2.99,
    image_url: 'https://tinyurl.com/cp-energy-drink',
    category: 'Snacks',
  },
  {
    name: 'Chocolate Bar',
    description: 'Premium dark chocolate, 70% cacao.',
    price: 1.99,
    image_url: 'https://tinyurl.com/cp-chocolate-bar',
    category: 'Snacks',
  },
  {
    name: 'Granola Bar',
    description: 'Oats, honey, and dark chocolate chips. Box of 6.',
    price: 4.99,
    image_url: 'https://tinyurl.com/cp-granola-bar',
    category: 'Snacks',
  },
  {
    name: 'Trail Mix',
    description: 'Mixed nuts, dried fruit, and dark chocolate.',
    price: 5.99,
    image_url: 'https://tinyurl.com/trail-mix',
    category: 'Snacks',
  },

  // Supplies
  {
    name: 'Spiral Notebook',
    description: 'College-ruled, 200 pages, three-subject.',
    price: 3.99,
    image_url: 'https://tinyurl.com/college-notebook',
    category: 'Supplies',
  },
  {
    name: 'Gel Pen Pack',
    description: 'Pack of 12 smooth-flow gel pens in assorted colors.',
    price: 8.99,
    image_url: 'https://tinyurl.com/college-pen',
    category: 'Supplies',
  },
  {
    name: 'USB-C Charging Cable',
    description: '6-foot braided USB-C to USB-C cable, fast charging compatible.',
    price: 12.99,
    image_url: 'https://tinyurl.com/usbc-cable',
    category: 'Supplies',
  },
  {
    name: 'Sticky Notes',
    description: 'Pack of 8 colorful sticky note pads, 100 sheets each.',
    price: 4.49,
    image_url: 'https://tinyurl.com/sticky-notes',
    category: 'Supplies',
  },
]

;(async () => {
  let created = 0
  let failed = 0
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
      console.log(`✓ ${data.product.id.toString().padStart(3)} [${product.category.padEnd(11)}] ${product.name}`)
      created++
    } catch (err) {
      console.error(`✗ [${product.category.padEnd(11)}] ${product.name} — ${err.message}`)
      failed++
    }
  }
  console.log(`\nDone: ${created} created, ${failed} failed.`)
})()
