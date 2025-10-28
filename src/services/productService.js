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
    // Clean the update data to ensure only valid fields are passed
    const validFields = [
      'name', 'description', 'weight', 'isCombo', 'normalPrice', 'offerPrice',
      'stock', 'status', 'categoryId', 'benefits', 'ingredients', 'tags',
      'images', 'imagePublicIds'
    ];

    const cleanedData = {};
    
    for (const key of validFields) {
      if (updateData[key] !== undefined) {
        cleanedData[key] = updateData[key];
      }
    }

    // Ensure arrays are properly formatted
    if (cleanedData.benefits && !Array.isArray(cleanedData.benefits)) {
      cleanedData.benefits = [cleanedData.benefits];
    }
    if (cleanedData.ingredients && !Array.isArray(cleanedData.ingredients)) {
      cleanedData.ingredients = [cleanedData.ingredients];
    }
    if (cleanedData.tags && !Array.isArray(cleanedData.tags)) {
      cleanedData.tags = [cleanedData.tags];
    }
    if (cleanedData.images && !Array.isArray(cleanedData.images)) {
      cleanedData.images = [cleanedData.images];
    }
    if (cleanedData.imagePublicIds && !Array.isArray(cleanedData.imagePublicIds)) {
      cleanedData.imagePublicIds = [cleanedData.imagePublicIds];
    }

    return await prisma.product.update({
      where: { id },
      data: cleanedData,
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