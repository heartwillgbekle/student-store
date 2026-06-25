const prisma = require('../src/db/db')

class OrderNotFoundError extends Error {
  constructor(id) {
    super(`Order ${id} not found`)
    this.name = 'OrderNotFoundError'
    this.orderId = id
  }
}

class ProductMissingError extends Error {
  constructor(id) {
    super(`Product ${id} does not exist`)
    this.name = 'ProductMissingError'
    this.productId = id
  }
}

class OrderItem {
  static async list({ orderId } = {}) {
    const where = orderId !== undefined ? { orderId } : undefined
    return prisma.orderItem.findMany({
      where,
      orderBy: { id: 'asc' },
    })
  }

  static async get(id) {
    return prisma.orderItem.findUnique({ where: { id } })
  }

  static async create({ orderId, productId, quantity, price }) {
    return prisma.orderItem.create({
      data: { orderId, productId, quantity, price },
    })
  }

  static async appendToOrder({ orderId, productId, quantity }) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      })
      if (!order) throw new OrderNotFoundError(orderId)

      const product = await tx.product.findUnique({ where: { id: productId } })
      if (!product) throw new ProductMissingError(productId)

      await tx.orderItem.create({
        data: { orderId, productId, quantity, price: product.price },
      })

      const existingTotal = order.orderItems.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0
      )
      const newTotal = existingTotal + Number(product.price) * quantity

      await tx.order.update({
        where: { id: orderId },
        data: { totalPrice: newTotal },
      })

      return tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      })
    })
  }
}

module.exports = OrderItem
module.exports.OrderNotFoundError = OrderNotFoundError
module.exports.ProductMissingError = ProductMissingError
