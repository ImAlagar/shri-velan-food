// services/shippingService.js
import prisma from '../config/database.js';

class ShippingService {

async getShippingRate(state) {
  try {
    const formattedState = state.toUpperCase();

    const shippingRate = await prisma.shippingRate.findFirst({
      where: { state: formattedState, isActive: true }
    });

    if (shippingRate) return shippingRate.rate;

    const isTamilNadu = formattedState.includes('TAMIL');
    return isTamilNadu ? 50 : 100;

  } catch (error) {
    console.error("Shipping rate fetch error:", error);
    return 100; // fallback rate
  }
}


  async createShippingRate(data) {
    return await prisma.shippingRate.create({
      data: {
        ...data,
        state: data.state.toUpperCase()
      }
    });
  }

  async updateShippingRate(id, data) {
    return await prisma.shippingRate.update({
      where: { id },
      data: {
        ...data,
        state: data.state ? data.state.toUpperCase() : undefined
      }
    });
  }

  async getShippingRates() {
    return await prisma.shippingRate.findMany({
      orderBy: { state: 'asc' }
    });
  }

  async deleteShippingRate(id) {
    return await prisma.shippingRate.delete({
      where: { id }
    });
  }
}

export default new ShippingService();