const prisma = require('../src/db/db')

const list = async () => {
  return prisma.order.findMany({
    orderBy: { id: 'asc' },
    include: { orderItems: true },
  })
}

const get = async (id) => {
  return prisma.order.findUnique({
    where: { id },
    include: { orderItems: true },
  })
}

const create = async ({ customer, items, productPriceById }) => {
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

module.exports = { list, get, create }
