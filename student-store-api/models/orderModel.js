const prisma = require('../src/db/db')

class Order {
  static async list() {
    return prisma.order.findMany({
      orderBy: { id: 'asc' },
      include: { orderItems: true },
    })
  }

  static async get(id) {
    return prisma.order.findUnique({
      where: { id },
      include: { orderItems: true },
    })
  }

  static async create({ customer, items, productPriceById }) {
    const totalPrice = items.reduce(
      (sum, item) => sum + Number(productPriceById[item.productId]) * item.quantity,
      0
    )

    return prisma.$transaction(async (tx) => {
      return tx.order.create({
        data: {
          customer,
          totalPrice,
          status: 'pending',
          orderItems: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: productPriceById[item.productId],
            })),
          },
        },
        include: { orderItems: true },
      })
    })
  }

  static async update(id, { customer, status }) {
    const data = {}
    if (customer !== undefined) data.customer = customer
    if (status !== undefined) data.status = status

    return prisma.order.update({
      where: { id },
      data,
      include: { orderItems: true },
    })
  }

  static async remove(id) {
    return prisma.order.delete({ where: { id } })
  }
}

module.exports = Order
