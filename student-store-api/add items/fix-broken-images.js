const API_BASE_URL = 'http://localhost:3000'

const img = (seed) => `https://picsum.photos/seed/${seed}/600/600`

const fixes = [
  { id: 22, image_url: img('tshirt-college-1'),     note: 'College T-Shirt' },
  { id: 23, image_url: img('crewneck-college-1'),   note: 'Crewneck Sweatshirt' },
  { id: 24, image_url: img('shorts-athletic-1'),    note: 'Athletic Shorts' },
  { id: 26, image_url: img('tote-canvas-1'),        note: 'Canvas Tote Bag' },
  { id: 27, image_url: img('lanyard-1'),            note: 'Lanyard Keychain' },
  { id: 28, image_url: img('book-cs-1'),            note: 'Intro to Computer Science' },
  { id: 30, image_url: img('book-lit-1'),           note: 'Modern American Literature' },
  { id: 31, image_url: img('book-calc-1'),          note: 'Calculus, 9th Edition' },
  { id: 35, image_url: img('trail-mix-1'),          note: 'Trail Mix' },
  { id: 38, image_url: img('cable-usbc-1'),         note: 'USB-C Charging Cable' },
  { id: 39, image_url: img('sticky-notes-1'),       note: 'Sticky Notes' },
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
