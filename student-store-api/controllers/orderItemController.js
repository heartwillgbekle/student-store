const OrderItem = require('../models/orderItemModel')
const { OrderNotFoundError, ProductMissingError } = require('../models/orderItemModel')

const parseId = (raw) => {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

const serializeOrderItem = (item) => ({
  ...item,
  price: Number(item.price),
})

const serializeOrder = (order) => ({
  ...order,
  totalPrice: Number(order.totalPrice),
  orderItems: order.orderItems.map(serializeOrderItem),
})

const listOrderItems = async (req, res) => {
  const filter = {}
  if (req.query.orderId !== undefined) {
    const orderId = parseId(req.query.orderId)
    if (orderId === null) {
      return res.status(400).json({ error: 'Invalid orderId' })
    }
    filter.orderId = orderId
  }
  try {
    const items = await OrderItem.list(filter)
    res.json({ orderItems: items.map(serializeOrderItem) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order items' })
  }
}

const addItemToOrder = async (req, res) => {
  const orderId = parseId(req.params.order_id)
  if (orderId === null) {
    return res.status(400).json({ error: 'Invalid order id' })
  }
  const body = req.body || {}
  const { productId, quantity } = body
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'productId must be a positive integer' })
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: 'quantity must be a positive integer' })
  }

  try {
    const order = await OrderItem.appendToOrder({ orderId, productId, quantity })
    res.status(201).json({ order: serializeOrder(order) })
  } catch (err) {
    if (err instanceof OrderNotFoundError) {
      return res.status(404).json({ error: err.message })
    }
    if (err instanceof ProductMissingError) {
      return res.status(400).json({ error: err.message })
    }
    res.status(500).json({ error: 'Failed to add item to order' })
  }
}

module.exports = { listOrderItems, addItemToOrder }
