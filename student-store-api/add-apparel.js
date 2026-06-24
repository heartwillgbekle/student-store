const API_BASE_URL = 'http://localhost:3000'

const img = (seed) => `https://picsum.photos/seed/${seed}/600/600`

const apparel = [
  {
    name: 'Heritage Pullover Hoodie',
    description: 'Heavyweight fleece hoodie with kangaroo pocket and embroidered college crest. Pre-shrunk cotton blend.',
    price: 44.99,
    image_url: img('hoodie-heritage'),
    category: 'Apparel',
  },
  {
    name: 'Classic Cotton T-Shirt',
    description: '100% combed ringspun cotton tee. Soft, durable, and machine-washable.',
    price: 18.99,
    image_url: img('tshirt-classic'),
    category: 'Apparel',
  },
  {
    name: 'Embroidered Polo Shirt',
    description: 'Pique-knit polo with embroidered school logo on the chest. Available in navy.',
    price: 32.99,
    image_url: img('polo-embroidered'),
    category: 'Apparel',
  },
  {
    name: 'Fleece-Lined Joggers',
    description: 'Tapered joggers with elastic ankle cuffs and side pockets. Brushed interior for warmth.',
    price: 38.99,
    image_url: img('joggers-fleece'),
    category: 'Apparel',
  },
  {
    name: 'Long-Sleeve Henley',
    description: 'Three-button henley in heathered jersey. A lightweight layer for spring and fall.',
    price: 26.99,
    image_url: img('henley-longsleeve'),
    category: 'Apparel',
  },
  {
    name: 'Quarter-Zip Pullover',
    description: 'Mid-weight quarter-zip with stand-up collar and embroidered logo. Great for game day.',
    price: 49.99,
    image_url: img('quarterzip-pullover'),
    category: 'Apparel',
  },
  {
    name: 'Performance Track Jacket',
    description: 'Lightweight track jacket with full-length zipper and reflective trim. Wind- and water-resistant.',
    price: 59.99,
    image_url: img('jacket-track'),
    category: 'Apparel',
  },
  {
    name: 'Vintage-Wash Crewneck',
    description: 'Garment-dyed crewneck sweatshirt with a lived-in feel. Drop-shoulder fit.',
    price: 42.99,
    image_url: img('crewneck-vintage'),
    category: 'Apparel',
  },
  {
    name: 'Mesh-Back Snapback Cap',
    description: 'Five-panel snapback with structured front and breathable mesh back. One size fits most.',
    price: 22.99,
    image_url: img('cap-snapback'),
    category: 'Apparel',
  },
  {
    name: 'Tapered Chino Pants',
    description: 'Mid-rise chinos with a tapered leg and stretch waistband. Smart enough for class, comfortable enough for the library.',
    price: 48.99,
    image_url: img('chinos-tapered'),
    category: 'Apparel',
  },
  {
    name: 'Athletic Quarter-Length Socks',
    description: 'Pack of 3. Cushioned arch support, moisture-wicking polyester blend.',
    price: 12.99,
    image_url: img('socks-athletic'),
    category: 'Apparel',
  },
  {
    name: 'Reversible Bucket Hat',
    description: 'Reversible cotton twill bucket hat — solid on one side, school colors on the other.',
    price: 19.99,
    image_url: img('hat-bucket'),
    category: 'Apparel',
  },
]

;(async () => {
  let created = 0
  let failed = 0
  for (const product of apparel) {
    try {
      const res = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      })
      const data = await res.json()
      if (!res.ok) {
        console.error(`✗ ${product.name} — ${data.error || res.statusText}`)
        failed++
        continue
      }
      console.log(`✓ ${data.product.id.toString().padStart(3)}  ${product.name.padEnd(36)}  $${product.price}`)
      created++
    } catch (err) {
      console.error(`✗ ${product.name} — ${err.message}`)
      failed++
    }
  }
  console.log(`\nDone: ${created} created, ${failed} failed.`)
})()
