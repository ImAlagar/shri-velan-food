// services/orderService.js
import Razorpay from 'razorpay';
import prisma from '../config/database.js';
import { generateOrderNumber } from '../utils/helpers.js';
import shippingService from './shippingService.js';
import couponService from './couponService.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class OrderService {

  async calculateOrderAmount(items, state, couponCode = null) {
    // Add validation for items
    if (!items || !Array.isArray(items)) {
      throw new Error('Items must be an array');
    }

    let subtotal = 0;
    const orderItems = [];

    // Calculate subtotal and validate products
    for (const item of items) {
      // Handle both frontend structures - with productId or id
      const productId = item.productId || item.id;
      
      if (!productId) {
        throw new Error('Product ID is required for each item');
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product: ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
      }

      const itemPrice = product.offerPrice || product.normalPrice;
      const itemTotal = item.quantity * itemPrice;
      subtotal += itemTotal;

      orderItems.push({
        productId: productId,
        quantity: item.quantity,
        price: itemPrice,
      });
    }

    // Calculate shipping cost
    const shippingCost = await shippingService.getShippingRate(state);

    // Calculate discount if coupon provided
    let discount = 0;
    let coupon = null;

    if (couponCode) {
      coupon = await couponService.validateCoupon(couponCode, subtotal);
      discount = await couponService.calculateDiscount(coupon, subtotal);
    }

    const totalAmount = subtotal + shippingCost - discount;

    return {
      subtotal,
      shippingCost,
      discount,
      totalAmount,
      orderItems,
      coupon,
    };
  }

  async createRazorpayOrder(orderData) {
    const { items, state, couponCode, ...orderInfo } = orderData;

    // Validate required fields
    if (!items || !Array.isArray(items)) {
      throw new Error('Items are required and must be an array');
    }

    if (!state) {
      throw new Error('State is required for shipping calculation');
    }

    // Calculate order amount
    const amountDetails = await this.calculateOrderAmount(items, state, couponCode);

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amountDetails.totalAmount * 100), // Convert to paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: orderInfo.userId,
        orderType: 'product_order',
      },
    });

    return {
      razorpayOrder,
      amountDetails,
      orderInfo: {
        ...orderInfo,
        state,
        subtotal: amountDetails.subtotal,
        shippingCost: amountDetails.shippingCost,
        discount: amountDetails.discount,
        orderItems: amountDetails.orderItems,
        coupon: amountDetails.coupon,
      },
    };
  }

  async verifyRazorpayPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
      
      if (!razorpayPaymentId) {
        throw new Error('Payment ID is required');
      }

      if (!razorpayOrderId) {
        throw new Error('Order ID is required');
      }

      const payment = await razorpay.payments.fetch(razorpayPaymentId);


      if (payment.order_id !== razorpayOrderId) {
        throw new Error('Payment does not match order');
      }

      if (payment.status !== 'captured') {
        throw new Error(`Payment not captured. Status: ${payment.status}`);
      }

      return payment;
    } catch (error) {
      console.error('Razorpay payment verification error:', error);
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  async createCODOrder(orderData) {
    const { items, state, couponCode, ...orderInfo } = orderData;

    // Calculate order amount
    const amountDetails = await this.calculateOrderAmount(items, state, couponCode);

    // Start transaction to create order and update stock
    const order = await prisma.$transaction(async (prisma) => {
      // Update product stock
      for (const item of amountDetails.orderItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Create order data for COD with required name field
      const orderData = {
        name: `${orderInfo.firstName} ${orderInfo.lastName}`, // Combine first and last name
        email: orderInfo.email,
        phone: orderInfo.phone,
        address: orderInfo.address,
        city: orderInfo.city,
        state: orderInfo.state,
        pincode: orderInfo.pincode,
        paymentMethod: 'COD',
        userId: orderInfo.userId,
        orderNumber: generateOrderNumber(),
        totalAmount: amountDetails.totalAmount,
        subtotal: amountDetails.subtotal,
        shippingCost: amountDetails.shippingCost,
        discount: amountDetails.discount,
        paymentStatus: 'PENDING',
        status: 'CONFIRMED',
        orderItems: {
          create: amountDetails.orderItems,
        },
      };

      // Add coupon if applied
      if (amountDetails.coupon) {
        orderData.couponId = amountDetails.coupon.id;
      }

      // Create order
      const order = await prisma.order.create({
        data: orderData,
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  name: true,
                  images: true,
                },
              },
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          coupon: true,
        },
      });

      // Increment coupon usage if applied
      if (amountDetails.coupon) {
        await couponService.incrementCouponUsage(amountDetails.coupon.id);
      }

      return order;
    });

    return order;
  }

  async createOrderAfterPayment(paymentData) {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      orderInfo,
    } = paymentData;



    // Verify payment with Razorpay
    const payment = await this.verifyRazorpayPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    // Calculate order amount again for verification
    const amountDetails = await this.calculateOrderAmount(
      orderInfo.items, 
      orderInfo.state, 
      orderInfo.couponCode
    );

    // Verify amount matches
    if (Math.round(amountDetails.totalAmount * 100) !== payment.amount) {
      throw new Error('Payment amount does not match order amount');
    }

    // Start transaction to create order and update stock
    const order = await prisma.$transaction(async (prisma) => {
      // Update product stock
      for (const item of amountDetails.orderItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Create order data with required name field
      const orderData = {
        name: `${orderInfo.firstName} ${orderInfo.lastName}`, // Combine first and last name
        email: orderInfo.email,
        phone: orderInfo.phone,
        address: orderInfo.address,
        city: orderInfo.city,
        state: orderInfo.state,
        pincode: orderInfo.pincode,
        paymentMethod: orderInfo.paymentMethod,
        userId: orderInfo.userId,
        orderNumber: generateOrderNumber(),
        totalAmount: amountDetails.totalAmount,
        subtotal: amountDetails.subtotal,
        shippingCost: amountDetails.shippingCost,
        discount: amountDetails.discount,
        razorpayOrderId,
        razorpayPaymentId,
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        orderItems: {
          create: amountDetails.orderItems,
        },
      };

      // Add coupon if applied
      if (amountDetails.coupon) {
        orderData.couponId = amountDetails.coupon.id;
      }

      // Create order
      const order = await prisma.order.create({
        data: orderData,
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  name: true,
                  images: true,
                },
              },
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          coupon: true,
        },
      });

      // Increment coupon usage if applied
      if (amountDetails.coupon) {
        await couponService.incrementCouponUsage(amountDetails.coupon.id);
      }

      return order;
    });

    return order;
  }

  async getOrders({ page = 1, limit = 10, status, userId } = {}) {
    const skip = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  name: true,
                  images: true,
                },
              },
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          coupon: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderStats() {
    try {
      // Get current date for calculations
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(today.setDate(today.getDate() - 7));
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const twoWeeksAgo = new Date(today.setDate(today.getDate() - 14));

      const [
        totalOrders,
        pendingOrders,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        refundedOrders,
        totalRevenue,
        todayOrders,
        weeklyRevenue,
        monthlyRevenue,
        statusDistribution
      ] = await Promise.all([
        // Total orders
        prisma.order.count(),
        
        // Pending orders
        prisma.order.count({ where: { status: 'PENDING' } }),
        
        // Confirmed orders
        prisma.order.count({ where: { status: 'CONFIRMED' } }),
        
        // Processing orders
        prisma.order.count({ where: { status: 'PROCESSING' } }),
        
        // Shipped orders
        prisma.order.count({ where: { status: 'SHIPPED' } }),
        
        // Delivered orders
        prisma.order.count({ where: { status: 'DELIVERED' } }),
        
        // Cancelled orders
        prisma.order.count({ where: { status: 'CANCELLED' } }),
        
        // Refunded orders
        prisma.order.count({ where: { status: 'REFUNDED' } }),
        
        // Total revenue (only from delivered orders)
        prisma.order.aggregate({
          where: { status: 'DELIVERED' },
          _sum: { totalAmount: true }
        }),
        
        // Today's orders
        prisma.order.count({
          where: {
            createdAt: {
              gte: startOfToday
            }
          }
        }),
        
        // Weekly revenue
        prisma.order.aggregate({
          where: {
            status: 'DELIVERED',
            createdAt: {
              gte: startOfWeek
            }
          },
          _sum: { totalAmount: true }
        }),
        
        // Monthly revenue
        prisma.order.aggregate({
          where: {
            status: 'DELIVERED',
            createdAt: {
              gte: startOfMonth
            }
          },
          _sum: { totalAmount: true }
        }),
        
        // Status distribution for chart - using groupBy with enum
        prisma.order.groupBy({
          by: ['status'],
          _count: {
            _all: true
          }
        })
      ]);

      // Get recent high-value orders
      const recentHighValueOrders = await prisma.order.findMany({
        where: {
          status: { 
            in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] 
          }
        },
        take: 5,
        orderBy: { totalAmount: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          status: true,
          name: true,
          email: true,
          createdAt: true
        }
      });

      // Calculate trends
      const lastWeekOrders = await prisma.order.count({
        where: {
          createdAt: {
            gte: twoWeeksAgo,
            lt: startOfWeek
          }
        }
      });

      const orderTrend = lastWeekOrders > 0 ? 
        Math.round(((todayOrders - (lastWeekOrders / 7)) / (lastWeekOrders / 7)) * 100) : 0;

      const revenueTrend = 0; // You can implement revenue trend calculation

      // Format recent high-value orders
      const formattedHighValueOrders = recentHighValueOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        customerName: order.name || 'Unknown Customer',
        date: order.createdAt
      }));

      return {
        overview: {
          totalOrders,
          todayOrders,
          pendingOrders,
          confirmedOrders,
          processingOrders,
          shippedOrders,
          deliveredOrders,
          cancelledOrders,
          refundedOrders,
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          weeklyRevenue: weeklyRevenue._sum.totalAmount || 0,
          monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
          averageOrderValue: totalOrders > 0 ? (totalRevenue._sum.totalAmount || 0) / totalOrders : 0
        },
        trends: {
          orders: orderTrend,
          revenue: revenueTrend
        },
        statusDistribution: statusDistribution.map(item => ({
          status: item.status,
          count: item._count._all
        })),
        recentHighValueOrders: formattedHighValueOrders
      };
    } catch (error) {
      console.error('Error in getOrderStats:', error);
      throw new Error(`Failed to fetch order statistics: ${error.message}`);
    }
  }

async getOrderById(id) {
  if (!id) {
    throw new Error('Order ID is required');
  }


  return await prisma.order.findUnique({
    where: { id },
    include: {
      orderItems: {
        include: {
          product: {
            select: {
              name: true,
              images: true,
              description: true,
            },
          },
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      coupon: true,
      trackingHistory: {
        orderBy: { createdAt: 'desc' }
      }
    },
  });
}

  async getOrderByRazorpayOrderId(razorpayOrderId) {
    return await prisma.order.findUnique({
      where: { razorpayOrderId },
    });
  }

  async getUserOrders(userId) {
    return await prisma.order.findMany({
      where: { userId },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
                images: true,
              },
            },
          },
        },
        coupon: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

 
  async updateOrderStatus(id, status) {
    return await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        coupon: true,
      },
    });
  }

  async updatePaymentStatus(id, paymentStatus) {
    return await prisma.order.update({
      where: { id },
      data: { paymentStatus },
    });
  }

  async deleteOrder(id) {
    return await prisma.order.delete({
      where: { id },
    });
  }
}

export default new OrderService();