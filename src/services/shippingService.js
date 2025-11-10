// services/shippingService.js
import prisma from '../config/database.js';

class ShippingService {
  
// services/shippingService.js
async getShippingRate(state, weightInKg) {
  // Convert state to uppercase for consistent matching
  const formattedState = state.toUpperCase();
  
  const isTamilNadu = formattedState === 'TAMIL NADU' || 
                      formattedState === 'TAMILNADU' || 
                      formattedState.includes('TAMIL');

  // Weight-based rate slabs (in KG only)
  let totalShippingCost;

  if (isTamilNadu) {
    // Tamil Nadu rates - per kg based
    if (weightInKg <= 1) {
      totalShippingCost = 50; // ₹50 for up to 1kg
    } else if (weightInKg <= 2) {
      totalShippingCost = 100; // ₹100 for 1-2kg
    } else if (weightInKg <= 3) {
      totalShippingCost = 150; // ₹150 for 2-3kg
    } else {
      // ₹50 per kg for weights above 3kg
      totalShippingCost = weightInKg * 50;
    }
  } else {
    // Other states rates - per kg based
    if (weightInKg <= 1) {
      totalShippingCost = 100; // ₹100 for up to 1kg
    } else if (weightInKg <= 2) {
      totalShippingCost = 200; // ₹200 for 1-2kg
    } else if (weightInKg <= 3) {
      totalShippingCost = 300; // ₹300 for 2-3kg
    } else {
      // ₹100 per kg for weights above 3kg
      totalShippingCost = weightInKg * 100;
    }

    // Check if we have a custom rate for this state in database
    const shippingRate = await prisma.shippingRate.findFirst({
      where: { 
        state: formattedState,
        isActive: true 
      }
    });

    if (shippingRate) {
      // For custom states, use per kg rate for all weights
      totalShippingCost = weightInKg * shippingRate.rate;
    }
  }

  return Math.round(totalShippingCost);
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