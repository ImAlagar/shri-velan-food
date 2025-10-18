import prisma from '../config/database.js';

class RatingService {
  async createRating(ratingData) {
    // Check if user already rated this product
    const existingRating = await prisma.rating.findFirst({
      where: {
        productId: ratingData.productId,
        userId: ratingData.userId
      }
    });

    if (existingRating) {
      throw new Error('You have already rated this product');
    }

    return await prisma.rating.create({
      data: ratingData,
      include: {
        product: {
          select: {
            name: true,
            images: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
  }

  async getRatings({ page, limit, approved }) {
    const skip = (page - 1) * limit;
    const where = {};

    if (approved !== undefined) where.isApproved = approved;

    const [ratings, total] = await Promise.all([
      prisma.rating.findMany({
        where,
        include: {
          product: {
            select: {
              name: true,
              images: true
            }
          },
          user: {
            select: {
              name: true,
              email: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.rating.count({ where })
    ]);

    return {
      ratings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getProductRatings(productId) {
    return await prisma.rating.findMany({
      where: { 
        productId,
        isApproved: true 
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateRatingStatus(id, isApproved) {
    return await prisma.rating.update({
      where: { id },
      data: { isApproved }
    });
  }

  async deleteRating(id) {
    return await prisma.rating.delete({
      where: { id }
    });
  }
}

export default new RatingService();