// services/contactService.js
import prisma from '../config/database.js';

class ContactService {
  async createContact(contactData) {
    return await prisma.contact.create({
      data: {
        ...contactData,
        status: 'PENDING' // Use the correct enum value from your schema
      }
    });
  }

  async getContacts({ page, limit, status }) {
    const skip = (page - 1) * limit;
    const where = {};

    // Map frontend status to Prisma enum values
    if (status && status !== 'all') {
      const statusMap = {
        'new': 'PENDING',
        'in-progress': 'IN_PROGRESS', 
        'resolved': 'RESOLVED',
        'closed': 'CLOSED'
      };
      where.status = statusMap[status] || status;
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.contact.count({ where })
    ]);

    return {
      contacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getContactById(id) {
    return await prisma.contact.findUnique({
      where: { id }
    });
  }

  async updateContactStatus(id, status) {
    // Map frontend status to Prisma enum values
    const statusMap = {
      'new': 'PENDING',
      'in-progress': 'IN_PROGRESS',
      'resolved': 'RESOLVED', 
      'closed': 'CLOSED'
    };
    
    const prismaStatus = statusMap[status.toLowerCase()] || status;
    
    return await prisma.contact.update({
      where: { id },
      data: { status: prismaStatus }
    });
  }

  async deleteContact(id) {
    return await prisma.contact.delete({
      where: { id }
    });
  }

  // Fixed Contact Statistics Method
  async getContactStats() {
    const [
      totalContacts,
      pendingContacts,
      inProgressContacts,
      resolvedContacts,
      todayContacts,
      weekContacts,
      monthContacts
    ] = await Promise.all([
      // Total contacts count
      prisma.contact.count(),
      
      // Pending contacts count (using correct enum value)
      prisma.contact.count({ where: { status: 'PENDING' } }),
      
      // In Progress contacts count (using correct enum value)
      prisma.contact.count({ where: { status: 'IN_PROGRESS' } }),
      
      // Resolved contacts count (using correct enum value)
      prisma.contact.count({ where: { status: 'RESOLVED' } }),
      
      // Today's contacts
      prisma.contact.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      // This week's contacts
      prisma.contact.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        }
      }),
      
      // This month's contacts
      prisma.contact.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);

    // Calculate response rate
    const responseRate = totalContacts > 0 ? Math.round((resolvedContacts / totalContacts) * 100) : 0;

    // Get contact growth data
    const monthlyGrowth = await this.getMonthlyContactGrowth();

    return {
      total: totalContacts,
      pending: pendingContacts,
      inProgress: inProgressContacts,
      resolved: resolvedContacts,
      today: todayContacts,
      thisWeek: weekContacts,
      thisMonth: monthContacts,
      responseRate,
      monthlyGrowth
    };
  }

  async getMonthlyContactGrowth() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyData = await prisma.contact.groupBy({
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
}

export default new ContactService();