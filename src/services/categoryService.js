import prisma from '../config/database.js';

class CategoryService {
  async createCategory(categoryData) {
    return await prisma.category.create({
      data: categoryData
    });
  }

  async getAllCategories() {
    return await prisma.category.findMany({
      include: {
        products: {
          select: { id: true, status: true } // Include status for admin
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  // Get only ACTIVE categories (for customers)
  async getActiveCategories() {
    return await prisma.category.findMany({
      where: { isActive: true },
      include: {
        products: {
          where: { status: true },
          select: { id: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  async getCategoryById(id) {
    return await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          where: { status: true },
          include: {
            ratings: {
              where: { isApproved: true },
              select: {
                rating: true
              }
            }
          }
        }
      }
    });
  }

  async updateCategory(id, updateData) {
    return await prisma.category.update({
      where: { id },
      data: updateData
    });
  }

  async deleteCategory(id) {
    // Check if category has products
    const products = await prisma.product.count({
      where: { categoryId: id }
    });

    if (products > 0) {
      throw new Error('Cannot delete category with existing products');
    }

    return await prisma.category.delete({
      where: { id }
    });
  }
}

export default new CategoryService();