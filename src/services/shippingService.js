// services/shippingService.js
import prisma from '../config/database.js';

class ShippingService {
  
  async getShippingRate(state, weightInKg) {
    // Convert state to uppercase for consistent matching
    const formattedState = state.toUpperCase();
    
    const isTamilNadu = formattedState === 'TAMIL NADU' || 
                        formattedState === 'TAMILNADU' || 
                        formattedState.includes('TAMIL');

    // Base rates per kg
    const tamilNaduRatePerKg = 50;
    const otherStatesRatePerKg = 100;

    // Calculate total shipping cost based on weight
    let totalShippingCost;
    if (isTamilNadu) {
      totalShippingCost = weightInKg * tamilNaduRatePerKg;
    } else {
      // Check if we have a custom rate for this state
      const shippingRate = await prisma.shippingRate.findFirst({
        where: { 
          state: formattedState,
          isActive: true 
        }
      });

      if (shippingRate) {
        totalShippingCost = weightInKg * shippingRate.rate;
      } else {
        totalShippingCost = weightInKg * otherStatesRatePerKg;
      }
    }

    return Math.round(totalShippingCost); // Round to nearest rupee
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

  // Helper method to calculate total weight for an order
  async calculateOrderWeight(orderItems) {
    let totalWeight = 0;
    
    for (const item of orderItems) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { weight: true }
      });
      
      if (product && product.weight) {
        // Extract numeric value from weight string (e.g., "500g" -> 0.5, "1kg" -> 1)
        const weightValue = this.parseWeight(product.weight);
        totalWeight += weightValue * item.quantity;
      }
    }
    
    return totalWeight;
  }

  // Helper method to parse weight strings
  parseWeight(weightString) {
    if (!weightString) return 0;
    
    const normalized = weightString.toLowerCase().trim();
    
    // Handle grams
    if (normalized.includes('g')) {
      const grams = parseFloat(normalized.replace('g', '').trim());
      return grams / 1000; // Convert to kg
    }
    
    // Handle kilograms
    if (normalized.includes('kg')) {
      return parseFloat(normalized.replace('kg', '').trim());
    }
    
    // Default: assume it's in grams if no unit specified
    return parseFloat(normalized) / 1000;
  }
}

export default new ShippingService();