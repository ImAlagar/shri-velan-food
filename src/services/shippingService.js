// services/shippingService.js
import prisma from '../config/database.js';

class ShippingService {
    
  async getShippingRate(state) {
    // Convert state to uppercase for consistent matching
    const formattedState = state.toUpperCase();
    

    const isTamilNadu = formattedState === 'TAMIL NADU' || 
                        formattedState === 'TAMILNADU' || 
                        formattedState.includes('TAMIL');

    if (isTamilNadu) {
      return 50; // ₹50 for Tamil Nadu
    }

     const shippingRate = await prisma.shippingRate.findFirst({
      where: { 
        state: formattedState,
        isActive: true 
      }
    });

    if (shippingRate) {
      return shippingRate.rate;
    }

    // ₹100 for all other states
    return 100;
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