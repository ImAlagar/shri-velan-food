import prisma from '../config/database.js';

class ContactService {
  async createContact(contactData) {
    return await prisma.contact.create({
      data: contactData
    });
  }

  async getContacts({ page, limit, status }) {
    const skip = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
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
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
  }

  async updateContactStatus(id, status) {
    return await prisma.contact.update({
      where: { id },
      data: { status }
    });
  }

  async deleteContact(id) {
    return await prisma.contact.delete({
      where: { id }
    });
  }
}

export default new ContactService();