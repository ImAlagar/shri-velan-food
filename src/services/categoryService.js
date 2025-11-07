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

async getCategoryStats() {  
  try {

    // Get total categories count
    const totalCategories = await prisma.category.count();

    // Get active/inactive counts
    const activeCategories = await prisma.category.count({
      where: { isActive: true }
    });

    const inactiveCategories = await prisma.category.count({
      where: { isActive: false }
    });


    // Get categories with product counts
    const categoriesWithProducts = await prisma.category.findMany({
      include: {
        products: {
          select: { id: true }
        }
      }
    });

    // Calculate total products across all categories
    const totalProducts = categoriesWithProducts.reduce((sum, category) => {
      return sum + category.products.length;
    }, 0);


    // Calculate average products per category
    const averageProducts = totalCategories > 0 ? (totalProducts / totalCategories).toFixed(1) : 0;

    // Get categories with most products (top 5)
    const topCategories = categoriesWithProducts
      .map(category => ({
        id: category.id,
        name: category.name,
        productCount: category.products.length,
        isActive: category.isActive
      }))
      .sort((a, b) => b.productCount - a.productCount)
      .slice(0, 5);


    // Get recent categories (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCategories = await prisma.category.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });


    const result = {
      totalCategories,
      activeCategories,
      inactiveCategories,
      totalProducts: parseInt(totalProducts),
      averageProducts: parseFloat(averageProducts),
      topCategories,
      recentCategories,
      activePercentage: totalCategories > 0 ? parseFloat(((activeCategories / totalCategories) * 100).toFixed(1)) : 0,
      inactivePercentage: totalCategories > 0 ? parseFloat(((inactiveCategories / totalCategories) * 100).toFixed(1)) : 0
    };

    return result;

  } catch (error) {
    console.error('Error in getCategoryStats service:', error);
    throw error;
  }
}

  async updateCategory(id, updateData) {
    return await prisma.category.update({
      where: { id },
      data: updateData
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