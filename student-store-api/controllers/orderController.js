const Order = require('../models/orderModel')
const prisma = require('../src/db/db')

const parseId = (raw) => {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

const serializeOrder = (order) => ({
  ...order,
  totalPrice: Number(order.totalPrice),
  orderItems: order.orderItems.map((item) => ({
    ...item,
    price: Number(item.price),
  })),
})

const listOrders = async (req, res) => {
  try {
    const orders = await Order.list()
    res.json({ orders: orders.map(serializeOrder) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
}

const getOrder = async (req, res) => {
  const id = parseId(req.params.id)
  if (id === null) {
    return res.status(400).json({ error: 'Invalid order id' })
  }
  try {
    const order = await Order.get(id)
    if (!order) {
      return res.status(404).json({ error: `Order ${id} not found` })
    }
    res.json({ order: serializeOrder(order) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' })
  }
}

const createOrder = async (req, res) => {
  const body = req.body || {}
  const { customer, items } = body

  if (typeof customer !== 'string' || customer.trim() === '') {
    return res.status(400).json({ error: 'customer must be a non-empty string' })
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' })
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!Number.isInteger(item?.productId) || item.productId <= 0) {
      return res
        .status(400)
        .json({ error: `items[${i}].productId must be a positive integer` })
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return res
        .status(400)
        .json({ error: `items[${i}].quantity must be a positive integer` })
    }
  }

  const productIds = [...new Set(items.map((item) => item.productId))]
  let products
  try {
    products = await prisma.product.findMany({ where: { id: { in: productIds } } })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create order' })
  }

  const productPriceById = {}
  for (const product of products) {
    productPriceById[product.id] = product.price
  }
  for (const id of productIds) {
    if (!(id in productPriceById)) {
      return res.status(400).json({ error: `Product ${id} does not exist` })
    }
  }

  try {
    const order = await Order.create({
      customer: customer.trim(),
      items,
      productPriceById,
    })
    res.status(201).json({ order: serializeOrder(order) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order' })
  }
}

module.exports = { listOrders, getOrder, createOrder }
