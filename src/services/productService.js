import prisma from '../config/database.js';

class ProductService {
  async createProduct(productData) {
    return await prisma.product.create({
      data: productData,
      include: {
        category: true,
        ratings: {
          where: { isApproved: true },
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
  }

  async getProducts({ page, limit, category, search, status }) {
    const skip = (page - 1) * limit;
    const where = {};

    if (category) where.categoryId = category;
    if (status !== undefined) where.status = status === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          ratings: {
            where: { isApproved: true },
            select: {
              rating: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getProductById(id) {
    return await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        ratings: {
          where: { isApproved: true },
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
  }

  async updateProduct(id, updateData) {
    return await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        ratings: {
          where: { isApproved: true },
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
  }

  async deleteProduct(id) {
    return await prisma.product.delete({
      where: { id }
    });
  }

  async getProductsByCategory(categoryId) {
    return await prisma.product.findMany({
      where: { 
        categoryId,
        status: true 
      },
      include: {
        category: true,
        ratings: {
          where: { isApproved: true },
          select: {
            rating: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

export default new ProductService();