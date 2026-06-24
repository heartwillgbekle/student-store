const prisma = require('../src/db/db')

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
}

module.exports = OrderItem
