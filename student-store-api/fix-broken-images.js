const API_BASE_URL = 'http://localhost:3000'

const img = (seed) => `https://picsum.photos/seed/${seed}/600/600`

const fixes = [
  { id: 1,  image_url: img('apparel-hoodie-1'),    note: 'Test Hoodie (example.com/hoodie.jpg)' },
  { id: 2,  image_url: img('sticker-pack-1'),       note: 'Codepath Sticker Pack' },
  { id: 3,  image_url: img('tshirt-college-1'),     note: 'College T-Shirt' },
  { id: 4,  image_url: img('crewneck-college-1'),   note: 'Crewneck Sweatshirt' },
  { id: 5,  image_url: img('shorts-athletic-1'),    note: 'Athletic Shorts' },
  { id: 7,  image_url: img('tote-canvas-1'),        note: 'Canvas Tote Bag' },
  { id: 8,  image_url: img('lanyard-1'),            note: 'Lanyard Keychain' },
  { id: 9,  image_url: img('book-cs-1'),            note: 'Intro to Computer Science' },
  { id: 11, image_url: img('book-lit-1'),           note: 'Modern American Literature' },
  { id: 12, image_url: img('book-calc-1'),          note: 'Calculus, 9th Edition' },
  { id: 16, image_url: img('trail-mix-1'),          note: 'Trail Mix' },
  { id: 19, image_url: img('cable-usbc-1'),         note: 'USB-C Charging Cable' },
  { id: 20, image_url: img('sticky-notes-1'),       note: 'Sticky Notes' },
]

;(async () => {
  let updated = 0
  let failed = 0
  for (const fix of fixes) {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${fix.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: fix.image_url }),
      })
      const data = await res.json()
      if (!res.ok) {
        console.error(`✗ id=${fix.id}  ${fix.note} — ${data.error || res.statusText}`)
        failed++
        continue
      }
      console.log(`✓ id=${fix.id.toString().padStart(3)}  ${fix.note}`)
      updated++
    } catch (err) {
      console.error(`✗ id=${fix.id}  ${fix.note} — ${err.message}`)
      failed++
    }
  }
  console.log(`\nDone: ${updated} updated, ${failed} failed.`)
})()
