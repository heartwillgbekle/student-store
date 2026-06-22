const prisma = require('../src/db/db')

const list = async ({ orderId } = {}) => {
  const where = orderId !== undefined ? { orderId } : undefined
  return prisma.orderItem.findMany({
    where,
    orderBy: { id: 'asc' },
  })
}

const get = async (id) => {
  return prisma.orderItem.findUnique({ where: { id } })
}

const create = async ({ orderId, productId, quantity, price }) => {
  return prisma.orderItem.create({
    data: { orderId, productId, quantity, price },
  })
}

module.exports = { list, get, create }
