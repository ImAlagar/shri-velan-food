// services/trackingService.js
import prisma from '../config/database.js';
import { generateTrackingNumber } from '../utils/helpers.js';

class TrackingService {
  async getTrackingByOrderId(orderId) {
    return await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        trackingHistory: {
          orderBy: { createdAt: 'desc' }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true
              }
            }
          }
        }
      }
    });
  }

  async getTrackingByNumber(trackingNumber) {
    return await prisma.order.findUnique({
      where: { trackingNumber },
      include: {
        trackingHistory: {
          orderBy: { createdAt: 'desc' }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true
              }
            }
          }
        }
      }
    });
  }

  async updateTracking(orderId, trackingData) {
    const { trackingNumber, carrier, trackingUrl, estimatedDelivery } = trackingData;

    // Generate tracking number if not provided
    const finalTrackingNumber = trackingNumber || generateTrackingNumber();

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        trackingNumber: finalTrackingNumber,
        carrier,
        trackingUrl,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
        status: 'SHIPPED',
        shippedAt: new Date()
      },
      include: {
        trackingHistory: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // Add shipping event to history
    await this.addTrackingEvent(orderId, {
      status: 'shipped',
      description: `Package shipped via ${carrier}`,
      location: 'Distribution Center'
    });

    return updatedOrder;
  }

    async addTrackingEvent(orderId, eventData) {
    const { status, description, location } = eventData;

    // Validate orderId exists
    if (!orderId) {
        throw new Error('Order ID is required for tracking event');
    }

    // Verify order exists before creating tracking event
    const order = await prisma.order.findUnique({
        where: { id: orderId }
    });

    if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
    }

    const trackingEvent = await prisma.trackingHistory.create({
        data: {
        orderId: orderId, // Explicitly set orderId
        status,
        description,
        location
        }
    });


    // Update order status based on tracking event
    if (status === 'delivered') {
        await prisma.order.update({
        where: { id: orderId },
        data: {
            status: 'DELIVERED',
            deliveredAt: new Date()
        }
        });
    } else if (status === 'out_for_delivery') {
        await prisma.order.update({
        where: { id: orderId },
        data: { status: 'OUT_FOR_DELIVERY' }
        });
    } else if (status === 'shipped') {
        await prisma.order.update({
        where: { id: orderId },
        data: { 
            status: 'SHIPPED',
            shippedAt: new Date()
        }
        });
    }

    return trackingEvent;
    }

  async getTrackingHistory(orderId) {
    return await prisma.trackingHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' }
    });
  }

  // services/trackingService.js - Update this method
// services/trackingService.js - Update this method
async getShippingCarriers() {
  try {
    const carriers = [
      { 
        code: 'fedex', 
        name: 'FedEx', 
        supported: true,
        website: 'https://www.fedex.com',
        trackingUrl: 'https://www.fedex.com/fedextrack/?trknbr='
      },
      { 
        code: 'ups', 
        name: 'UPS', 
        supported: true,
        website: 'https://www.ups.com',
        trackingUrl: 'https://www.ups.com/track?tracknum='
      },
      { 
        code: 'dhl', 
        name: 'DHL', 
        supported: true,
        website: 'https://www.dhl.com',
        trackingUrl: 'https://www.dhl.com/en/express/tracking.html?AWB='
      },
      { 
        code: 'usps', 
        name: 'USPS', 
        supported: true,
        website: 'https://www.usps.com',
        trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels='
      },
      { 
        code: 'bluedart', 
        name: 'Blue Dart', 
        supported: true,
        website: 'https://www.bluedart.com',
        trackingUrl: 'https://www.bluedart.com/tracking.html?trackingNo='
      },
      { 
        code: 'delhivery', 
        name: 'Delhivery', 
        supported: true,
        website: 'https://www.delhivery.com',
        trackingUrl: 'https://www.delhivery.com/track/package/'
      },
      { 
        code: 'custom', 
        name: 'Custom Carrier', 
        supported: true,
        website: null,
        trackingUrl: null
      }
    ];
    
    return { 
      success: true,
      message: 'Shipping carriers fetched successfully',
      data: carriers 
    };
  } catch (error) {
    console.error('Get shipping carriers error:', error);
    throw error;
  }
}

  async getPublicTracking(trackingNumber, email) {
    return await prisma.order.findFirst({
      where: {
        trackingNumber,
        email: email.toLowerCase()
      },
      include: {
        trackingHistory: {
          orderBy: { createdAt: 'desc' }
        },
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
      }
    });
  }

  // Bulk update tracking for multiple orders
  async bulkUpdateTracking(updates) {
    const results = [];

    for (const update of updates) {
      try {
        const result = await this.updateTracking(update.orderId, update.trackingData);
        results.push({ success: true, orderId: update.orderId, data: result });
      } catch (error) {
        results.push({ success: false, orderId: update.orderId, error: error.message });
      }
    }

    return results;
  }

  // Get orders that need tracking updates
  async getOrdersNeedingTracking() {
    return await prisma.order.findMany({
      where: {
        status: {
          in: ['CONFIRMED', 'PROCESSING', 'SHIPPED']
        },
        OR: [
          { trackingNumber: null },
          {
            trackingHistory: {
              none: {
                status: 'delivered'
              }
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });
  }
}

export default new TrackingService();