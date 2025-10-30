// services/userService.js
import prisma from '../config/database.js';
import bcrypt from 'bcryptjs';

class UserService {

  async createUser(userData) {
    const { email, password, name, role = 'CUSTOMER', isActive = true } = userData;

    // Validate required fields
    if (!email || !password || !name) {
      throw new Error('Email, password, and name are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please provide a valid email address');
    }

    // Validate password length
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Validate role
    const validRoles = ['CUSTOMER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      throw new Error('Invalid role specified');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          name: name.trim(),
          role,
          isActive
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

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

  async getUserStats() {
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      customerUsers,
      todayNewUsers,
      weekNewUsers,
      usersWithOrders,
      totalOrders
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        }
      }),
      prisma.user.count({
        where: {
          orders: {
            some: {}
          }
        }
      }),
      prisma.order.count()
    ]);

    const averageOrdersPerUser = totalUsers > 0 ? (totalOrders / totalUsers).toFixed(1) : 0;

    const monthlyGrowth = await this.getMonthlyUserGrowth();

    return {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      admins: adminUsers,
      customers: customerUsers,
      newToday: todayNewUsers,
      newThisWeek: weekNewUsers,
      usersWithOrders,
      averageOrdersPerUser: parseFloat(averageOrdersPerUser),
      monthlyGrowth
    };
  }

  async getMonthlyUserGrowth() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyData = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: sixMonthsAgo
        }
      },
      _count: {
        id: true
      }
    });

    const monthlyGrowth = monthlyData.reduce((acc, item) => {
      const monthYear = item.createdAt.toISOString().substring(0, 7);
      acc[monthYear] = (acc[monthYear] || 0) + item._count.id;
      return acc;
    }, {});

    return Object.entries(monthlyGrowth).map(([month, count]) => ({
      month,
      count
    }));
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
    if (updateData.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: updateData.email,
          id: { not: id }
        }
      });

      if (existingUser) {
        throw new Error('Another user with this email already exists');
      }

      // Normalize email
      updateData.email = updateData.email.toLowerCase().trim();
    }

    // Hash password if provided
    if (updateData.password) {
      if (updateData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      updateData.password = await bcrypt.hash(updateData.password, 12);
    }

    // Remove confirmPassword if it exists (frontend field)
    if (updateData.confirmPassword) {
      delete updateData.confirmPassword;
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