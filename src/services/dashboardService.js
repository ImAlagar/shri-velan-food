import prisma from '../config/database.js';

class DashboardService {
  async getDashboardStats(timeRange = 'month') {
    try {
      // Calculate date ranges
      const now = new Date();
      let startDate;
      
      switch (timeRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(now.setMonth(now.getMonth() - 1));
      }

      // Get previous period for comparison
      const previousStartDate = new Date(startDate);
      const periodDiff = now.getTime() - startDate.getTime();
      previousStartDate.setTime(previousStartDate.getTime() - periodDiff);

      // Total Sales
      const currentSales = await prisma.order.aggregate({
        where: {
          paymentStatus: 'PAID',
          createdAt: { gte: startDate }
        },
        _sum: { totalAmount: true },
        _count: { id: true }
      });

      const previousSales = await prisma.order.aggregate({
        where: {
          paymentStatus: 'PAID',
          createdAt: { 
            gte: previousStartDate,
            lt: startDate
          }
        },
        _sum: { totalAmount: true }
      });

      const salesGrowth = previousSales._sum.totalAmount 
        ? ((currentSales._sum.totalAmount - previousSales._sum.totalAmount) / previousSales._sum.totalAmount * 100)
        : 0;

      // Orders
      const currentOrders = await prisma.order.count({
        where: { createdAt: { gte: startDate } }
      });

      const previousOrders = await prisma.order.count({
        where: { 
          createdAt: { 
            gte: previousStartDate,
            lt: startDate
          }
        }
      });

      const ordersGrowth = previousOrders 
        ? ((currentOrders - previousOrders) / previousOrders * 100)
        : 0;

      const pendingOrders = await prisma.order.count({
        where: { 
          status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING'] }
        }
      });

      // Products
      const totalProducts = await prisma.product.count();
      const activeProducts = await prisma.product.count({
        where: { status: true }
      });
      const outOfStockProducts = await prisma.product.count({
        where: { 
          stock: { lte: 0 },
          status: true
        }
      });

      const previousProducts = await prisma.product.count({
        where: { 
          createdAt: { 
            gte: previousStartDate,
            lt: startDate
          }
        }
      });

      const productsGrowth = previousProducts 
        ? ((totalProducts - previousProducts) / previousProducts * 100)
        : 0;

      // Customers
      const totalCustomers = await prisma.user.count({
        where: { role: 'CUSTOMER' }
      });

      const newCustomers = await prisma.user.count({
        where: { 
          role: 'CUSTOMER',
          createdAt: { gte: startDate }
        }
      });

      const previousCustomers = await prisma.user.count({
        where: { 
          role: 'CUSTOMER',
          createdAt: { 
            gte: previousStartDate,
            lt: startDate
          }
        }
      });

      const customersGrowth = previousCustomers 
        ? ((newCustomers - previousCustomers) / previousCustomers * 100)
        : 0;

      // Recent activities
      const recentActivities = await this.getRecentActivities();

      return {
        sales: {
          total: currentSales._sum.totalAmount || 0,
          growth: parseFloat(salesGrowth.toFixed(1)),
          orderCount: currentSales._count.id || 0
        },
        orders: {
          total: currentOrders,
          growth: parseFloat(ordersGrowth.toFixed(1)),
          pending: pendingOrders
        },
        products: {
          total: totalProducts,
          active: activeProducts,
          outOfStock: outOfStockProducts,
          growth: parseFloat(productsGrowth.toFixed(1))
        },
        customers: {
          total: totalCustomers,
          newThisMonth: newCustomers,
          growth: parseFloat(customersGrowth.toFixed(1))
        },
        recentActivities
      };
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      throw error;
    }
  }

  async getRecentActivities(limit = 10) {
    try {
      // Get recent orders
      const recentOrders = await prisma.order.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true }
          }
        }
      });

      // Get recent user registrations
      const recentUsers = await prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        take: Math.floor(limit / 2),
        orderBy: { createdAt: 'desc' }
      });

      // Get recent product additions
      const recentProducts = await prisma.product.findMany({
        take: Math.floor(limit / 3),
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: { name: true }
          }
        }
      });

      // Combine and format activities
      const activities = [];

      // Add orders
      recentOrders.forEach(order => {
        activities.push({
          id: `order-${order.id}`,
          type: 'order',
          action: `New order #${order.orderNumber}`,
          user: order.user?.name || order.name,
          time: order.createdAt,
          metadata: {
            amount: order.totalAmount,
            status: order.status
          }
        });
      });

      // Add user registrations
      recentUsers.forEach(user => {
        activities.push({
          id: `user-${user.id}`,
          type: 'user',
          action: 'New customer registered',
          user: user.name,
          time: user.createdAt,
          metadata: { email: user.email }
        });
      });

      // Add product additions
      recentProducts.forEach(product => {
        activities.push({
          id: `product-${product.id}`,
          type: 'product',
          action: `New product added: ${product.name}`,
          user: 'Admin',
          time: product.createdAt,
          metadata: { category: product.category.name }
        });
      });

      // Sort by time and limit
      return activities
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, limit)
        .map(activity => ({
          ...activity,
          time: this.formatTimeDifference(new Date(activity.time))
        }));

    } catch (error) {
      console.error('Error in getRecentActivities:', error);
      return [];
    }
  }

  formatTimeDifference(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  }

  async getChartData(timeRange = 'month') {
    try {
      // This would return data for charts (sales over time, etc.)
      // Implementation depends on your chart requirements
      return {
        salesOverTime: [],
        ordersOverTime: [],
        customerGrowth: []
      };
    } catch (error) {
      console.error('Error in getChartData:', error);
      throw error;
    }
  }
}

export default new DashboardService();