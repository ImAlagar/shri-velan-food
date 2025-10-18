import prisma from '../config/database.js';
import bcrypt from 'bcryptjs';

class UserService {
  async getUsers({ page, limit }) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              orders: true,
              ratings: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count()
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getUserById(id) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        addresses: true,
        orders: {
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
        },
        ratings: {
          include: {
            product: {
              select: {
                name: true,
                images: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async updateUser(id, updateData) {
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 12);
    }

    return await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true
      }
    });
  }

  async deleteUser(id) {
    return await prisma.user.delete({
      where: { id }
    });
  }
}

export default new UserService();