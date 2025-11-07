// services/ratingService.js - UPDATED
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

    // Transform data to match Prisma schema
    const prismaData = {
      ...ratingData,
      review: ratingData.comment || ratingData.review // Map comment to review
    };

    // Remove comment field if it exists to avoid Prisma error
    delete prismaData.comment;

    return await prisma.rating.create({
      data: prismaData,
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

  // NEW: Get user's rating for a specific product
  async getUserProductRating(userId, productId) {
    return await prisma.rating.findFirst({
      where: {
        userId,
        productId
      },
      include: {
        product: {
          select: {
            name: true,
            images: true
          }
        }
      }
    });
  }

  // NEW: Get product rating statistics
  async getProductRatingStats(productId) {
    const ratings = await prisma.rating.findMany({
      where: {
        productId,
        isApproved: true
      },
      select: {
        rating: true
      }
    });

    if (ratings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const total = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = total / ratings.length;

    const ratingBreakdown = ratings.reduce((acc, r) => {
      acc[r.rating] = (acc[r.rating] || 0) + 1;
      return acc;
    }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

    return {
      averageRating,
      totalRatings: ratings.length,
      ratingBreakdown
    };
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