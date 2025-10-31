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

    async getProductStats() {
    // Get all products with necessary fields
    const products = await prisma.product.findMany({
      include: {
        category: true,
        ratings: {
          where: { isApproved: true },
          select: { rating: true }
        },
        orderItems: {
          include: {
            order: {
              select: {
                status: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    // Calculate basic stats
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.status).length;
    const outOfStockProducts = products.filter(p => p.stock === 0).length;
    const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= 10).length;
    const inStockProducts = products.filter(p => p.stock > 0).length;

    // Calculate inventory value
    const totalInventoryValue = products.reduce((sum, product) => {
      return sum + (product.normalPrice * product.stock);
    }, 0);

    // Calculate average price
    const averagePrice = totalProducts > 0 
      ? products.reduce((sum, product) => sum + product.normalPrice, 0) / totalProducts 
      : 0;

    // Calculate average rating
    const productsWithRatings = products.filter(p => p.ratings.length > 0);
    const averageRating = productsWithRatings.length > 0
      ? productsWithRatings.reduce((sum, product) => {
          const productAvg = product.ratings.reduce((ratingSum, r) => ratingSum + r.rating, 0) / product.ratings.length;
          return sum + productAvg;
        }, 0) / productsWithRatings.length
      : 0;

    // Calculate total sales (from order items in completed orders)
    const totalSales = products.reduce((sum, product) => {
      const productSales = product.orderItems
        .filter(item => item.order.status === 'DELIVERED')
        .reduce((itemSum, item) => itemSum + item.quantity, 0);
      return sum + productSales;
    }, 0);

    // Get products by category
    const productsByCategory = await prisma.category.findMany({
      include: {
        products: {
          where: { status: true }
        }
      }
    });

    const categoryStats = productsByCategory.map(category => ({
      categoryId: category.id,
      categoryName: category.name,
      productCount: category.products.length
    }));

    // Get recent sales trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSales = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          status: 'DELIVERED',
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      },
      _sum: {
        quantity: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 5
    });

    const topSellingProducts = await Promise.all(
      recentSales.map(async (sale) => {
        const product = await prisma.product.findUnique({
          where: { id: sale.productId },
          select: { name: true, normalPrice: true }
        });
        return {
          productId: sale.productId,
          productName: product?.name || 'Unknown Product',
          salesCount: sale._sum.quantity || 0,
          revenue: (sale._sum.quantity || 0) * (product?.normalPrice || 0)
        };
      })
    );

    // Calculate growth compared to previous period (you might want to adjust this logic)
    const previousPeriodProducts = await prisma.product.count({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    });

    const growthPercentage = previousPeriodProducts > 0
      ? ((totalProducts - previousPeriodProducts) / previousPeriodProducts) * 100
      : totalProducts > 0 ? 100 : 0;

    return {
      overview: {
        totalProducts,
        activeProducts,
        outOfStock: outOfStockProducts,
        lowStock: lowStockProducts,
        inStock: inStockProducts,
        totalInventoryValue: parseFloat(totalInventoryValue.toFixed(2)),
        averagePrice: parseFloat(averagePrice.toFixed(2)),
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalSales,
        growthPercentage: parseFloat(growthPercentage.toFixed(1))
      },
      categoryStats,
      topSellingProducts: topSellingProducts.slice(0, 5), // Top 5 products
      alerts: {
        outOfStockAlerts: outOfStockProducts,
        lowStockAlerts: lowStockProducts,
        needsAttention: outOfStockProducts + lowStockProducts
      }
    };
  }

async updateProduct(id, updateData) {
  // First verify the product exists
  const existingProduct = await this.getProductById(id);
  if (!existingProduct) {
    throw new Error(`Product with ID ${id} not found`);
  }

  // Clean the update data
  const validFields = [
    'name', 'description', 'weight', 'isCombo', 'normalPrice', 'offerPrice',
    'stock', 'status', 'categoryId', 'benefits', 'ingredients', 'tags',
    'images', 'imagePublicIds'
  ];

  const cleanedData = {};
  
  for (const key of validFields) {
    if (updateData[key] !== undefined && updateData[key] !== null) {
      cleanedData[key] = updateData[key];
    }
  }

  // Ensure arrays are properly formatted
  const arrayFields = ['benefits', 'ingredients', 'tags', 'images', 'imagePublicIds'];
  arrayFields.forEach(field => {
    if (cleanedData[field] && !Array.isArray(cleanedData[field])) {
      cleanedData[field] = [cleanedData[field]];
    }
  });

  console.log('🔄 Updating product with data:', {
    id,
    fields: Object.keys(cleanedData),
    imagesCount: cleanedData.images?.length
  });

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

    async getFilteredProductsByCategory(filters) {
    const {
      categoryId,
      minPrice,
      maxPrice,
      inStock,
      onSale,
      ratings,
      sortBy,
      page,
      limit
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      categoryId,
      status: true // Only active products
    };

    // Price filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.normalPrice = {};
      if (minPrice !== undefined) where.normalPrice.gte = minPrice;
      if (maxPrice !== undefined) where.normalPrice.lte = maxPrice;
    }

    // Stock filter
    if (inStock) {
      where.stock = { gt: 0 };
    }

    // Sale filter
    if (onSale) {
      where.offerPrice = { not: null };
      where.OR = [
        { offerPrice: { lt: prisma.product.fields.normalPrice } },
        {
          AND: [
            { offerPrice: { not: null } },
            { offerPrice: { lt: prisma.product.fields.normalPrice } }
          ]
        }
      ];
    }

    console.log('🏷️ Building query with where:', JSON.stringify(where, null, 2));

    // Get products with ratings for filtering
    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        ratings: {
          where: { isApproved: true },
          select: {
            rating: true,
            id: true
          }
        }
      },
      skip,
      take: limit
    });

    console.log(`📦 Found ${products.length} products before rating filter`);

    // Apply rating filter in memory (since Prisma doesn't easily support array contains with computed values)
    let filteredProducts = products;

    if (ratings.length > 0) {
      filteredProducts = products.filter(product => {
        const avgRating = product.ratings.length > 0 
          ? product.ratings.reduce((sum, r) => sum + r.rating, 0) / product.ratings.length
          : 0;
        const roundedRating = Math.floor(avgRating);
        return ratings.includes(roundedRating);
      });
    }

    console.log(`⭐ After rating filter: ${filteredProducts.length} products`);

    // Apply sorting
    const sortedProducts = this.applySorting(filteredProducts, sortBy);

    // Get total count for pagination
    const total = await prisma.product.count({ where });

    // Calculate pagination info
    const pagination = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      showing: sortedProducts.length
    };

    return {
      products: sortedProducts,
      pagination,
      filters: {
        priceRange: { min: minPrice, max: maxPrice },
        inStock,
        onSale,
        ratings,
        sortBy
      }
    };
  }

  applySorting(products, sortBy) {
    switch (sortBy) {
      case 'price-low':
        return products.sort((a, b) => {
          const priceA = a.offerPrice && a.offerPrice < a.normalPrice ? a.offerPrice : a.normalPrice;
          const priceB = b.offerPrice && b.offerPrice < b.normalPrice ? b.offerPrice : b.normalPrice;
          return priceA - priceB;
        });

      case 'price-high':
        return products.sort((a, b) => {
          const priceA = a.offerPrice && a.offerPrice < a.normalPrice ? a.offerPrice : a.normalPrice;
          const priceB = b.offerPrice && b.offerPrice < b.normalPrice ? b.offerPrice : b.normalPrice;
          return priceB - priceA;
        });

      case 'rating':
        return products.sort((a, b) => {
          const ratingA = a.ratings.length > 0 
            ? a.ratings.reduce((sum, r) => sum + r.rating, 0) / a.ratings.length 
            : 0;
          const ratingB = b.ratings.length > 0 
            ? b.ratings.reduce((sum, r) => sum + r.rating, 0) / b.ratings.length 
            : 0;
          return ratingB - ratingA;
        });

      case 'name':
      default:
        return products.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

}

export default new ProductService();