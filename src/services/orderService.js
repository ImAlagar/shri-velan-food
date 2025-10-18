import prisma from '../config/database.js';
import { generateOrderNumber } from '../utils/helpers.js';

class OrderService {
  async createOrder(orderData) {
    const { items, ...orderInfo } = orderData;

    // Calculate total amount
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product: ${product.name}`);
      }

      const itemTotal = item.quantity * (product.offerPrice || product.normalPrice);
      totalAmount += itemTotal;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.offerPrice || product.normalPrice
      });

      // Update product stock
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: product.stock - item.quantity }
      });
    }

    const order = await prisma.order.create({
      data: {
        ...orderInfo,
        orderNumber: generateOrderNumber(),
        totalAmount,
        orderItems: {
          create: orderItems
        }
      },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
                images: true
              }
            }
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

    return order;
  }

  async getOrders({ page, limit, status }) {
    const skip = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  name: true,
                  images: true
                }
              }
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
      prisma.order.count({ where })
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getOrderById(id) {
    return await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
                images: true,
                description: true
              }
            }
          }
        },
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      }
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
                images: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateOrderStatus(id, status) {
    return await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        orderItems: {
          include: {
            product: true
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

  async deleteOrder(id) {
    return await prisma.order.delete({
      where: { id }
    });
  }
}

export default new OrderService();