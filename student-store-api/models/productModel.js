const prisma = require('../src/db/db')

class Product {
  static async list({ category, sort } = {}) {
    const where = category
      ? { category: { equals: category, mode: 'insensitive' } }
      : undefined

    const orderBy = sort
      ? { [sort.field]: sort.direction }
      : { id: 'asc' }

    return prisma.product.findMany({ where, orderBy })
  }

  static async get(id) {
    return prisma.product.findUnique({ where: { id } })
  }

  static async create({ name, description, price, image_url, category }) {
    return prisma.product.create({
      data: { name, description, price, image_url, category },
    })
  }

  static async update(id, { name, description, price, image_url, category }) {
    return prisma.product.update({
      where: { id },
      data: { name, description, price, image_url, category },
    })
  }

  static async remove(id) {
    return prisma.product.delete({ where: { id } })
  }
}

module.exports = Product
