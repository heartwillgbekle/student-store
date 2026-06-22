const prisma = require('../src/db/db')

const list = async ({ category, sort } = {}) => {
  const where = category
    ? { category: { equals: category, mode: 'insensitive' } }
    : undefined

  const orderBy = sort
    ? { [sort.field]: sort.direction }
    : { id: 'asc' }

  return prisma.product.findMany({ where, orderBy })
}

const get = async (id) => {
  return prisma.product.findUnique({ where: { id } })
}

const create = async ({ name, description, price, imageUrl, category }) => {
  return prisma.product.create({
    data: { name, description, price, imageUrl, category },
  })
}

const update = async (id, { name, description, price, imageUrl, category }) => {
  return prisma.product.update({
    where: { id },
    data: { name, description, price, imageUrl, category },
  })
}

const remove = async (id) => {
  return prisma.product.delete({ where: { id } })
}

module.exports = { list, get, create, update, remove }
