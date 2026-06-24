const Product = require('../models/productModel')

const REQUIRED_FIELDS = ['name', 'description', 'price', 'image_url', 'category']
const SORTABLE_FIELDS = new Set(['price', 'name', 'createdAt'])

const parseId = (raw) => {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

const parseSort = (raw) => {
  if (raw === undefined) return { ok: true, value: null }
  if (typeof raw !== 'string' || raw === '') {
    return { ok: false, error: `Invalid sort field: ${raw}` }
  }
  const direction = raw.startsWith('-') ? 'desc' : 'asc'
  const field = raw.startsWith('-') ? raw.slice(1) : raw
  if (!SORTABLE_FIELDS.has(field)) {
    return { ok: false, error: `Invalid sort field: ${raw}` }
  }
  return { ok: true, value: { field, direction } }
}

// Outbound: model returns `imageUrl`, JSON exposes `image_url`.
const serializeProduct = (product) => {
  if (!product) return product
  const { imageUrl, ...rest } = product
  return { ...rest, image_url: imageUrl }
}

// Inbound: request body uses `image_url`, model expects `imageUrl`.
const denormalizeProductBody = (body) => {
  if (!body) return body
  const { image_url, ...rest } = body
  return image_url !== undefined ? { ...rest, imageUrl: image_url } : rest
}

const listProducts = async (req, res) => {
  const sort = parseSort(req.query.sort)
  if (!sort.ok) {
    return res.status(400).json({ error: sort.error })
  }
  const category =
    typeof req.query.category === 'string' && req.query.category !== ''
      ? req.query.category
      : undefined

  try {
    const products = await Product.list({ category, sort: sort.value })
    res.json({ products: products.map(serializeProduct) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' })
  }
}

const getProduct = async (req, res) => {
  const id = parseId(req.params.id)
  if (id === null) {
    return res.status(400).json({ error: 'Invalid product id' })
  }
  try {
    const product = await Product.get(id)
    if (!product) {
      return res.status(404).json({ error: `Product ${id} not found` })
    }
    res.json({ product: serializeProduct(product) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' })
  }
}

const createProduct = async (req, res) => {
  const body = req.body || {}
  for (const field of REQUIRED_FIELDS) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return res.status(400).json({ error: `Missing required field: ${field}` })
    }
  }
  try {
    const product = await Product.create(denormalizeProductBody(body))
    res.status(201).json({ product: serializeProduct(product) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' })
  }
}

const updateProduct = async (req, res) => {
  const id = parseId(req.params.id)
  if (id === null) {
    return res.status(400).json({ error: 'Invalid product id' })
  }
  const body = req.body || {}
  const allowed = Object.fromEntries(
    REQUIRED_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]])
  )
  if (Object.keys(allowed).length === 0) {
    return res.status(400).json({ error: 'No updatable fields provided' })
  }
  try {
    const product = await Product.update(id, denormalizeProductBody(allowed))
    res.json({ product: serializeProduct(product) })
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: `Product ${id} not found` })
    }
    res.status(500).json({ error: 'Failed to update product' })
  }
}

const deleteProduct = async (req, res) => {
  const id = parseId(req.params.id)
  if (id === null) {
    return res.status(400).json({ error: 'Invalid product id' })
  }
  try {
    await Product.remove(id)
    res.status(204).send()
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: `Product ${id} not found` })
    }
    res.status(500).json({ error: 'Failed to delete product' })
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
}
