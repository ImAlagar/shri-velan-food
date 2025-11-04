// services/couponService.js
import prisma from '../config/database.js';

class CouponService {
  async validateCoupon(code, subtotal) {
    const coupon = await prisma.coupon.findFirst({
      where: { 
        code: code.toUpperCase(),
        isActive: true,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() }
      }
    });

    if (!coupon) {
      throw new Error('Invalid or expired coupon');
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new Error('Coupon usage limit reached');
    }

    if (subtotal < coupon.minOrderAmount) {
      throw new Error(`Minimum order amount should be ₹${coupon.minOrderAmount}`);
    }

    return coupon;
  }

  async calculateDiscount(coupon, subtotal) {
    let discount = 0;

    if (coupon.discountType === 'PERCENTAGE') {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed subtotal
    return Math.min(discount, subtotal);
  }

  async incrementCouponUsage(couponId) {
    await prisma.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } }
    });
  }

  async createCoupon(data) {
    return await prisma.coupon.create({
      data: {
        ...data,
        code: data.code.toUpperCase()
      }
    });
  }

  async getCoupons() {
    return await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getCouponById(id) {
    return await prisma.coupon.findUnique({
      where: { id }
    });
  }

  async updateCoupon(id, data) {
    return await prisma.coupon.update({
      where: { id },
      data: {
        ...data,
        code: data.code ? data.code.toUpperCase() : undefined
      }
    });
  }

  async deleteCoupon(id) {
    return await prisma.coupon.delete({
      where: { id }
    });
  }
}

export default new CouponService();