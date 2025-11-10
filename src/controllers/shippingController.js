// controllers/shippingController.js
import shippingService from '../services/shippingService.js';
import { asyncHandler } from '../utils/helpers.js';

export const getShippingRates = asyncHandler(async (req, res) => {
  const rates = await shippingService.getShippingRates();
  
  res.status(200).json({
    success: true,
    data: rates,
  });
});

export const createShippingRate = asyncHandler(async (req, res) => {
  const rate = await shippingService.createShippingRate(req.body);
  
  res.status(201).json({
    success: true,
    message: 'Shipping rate created successfully',
    data: rate,
  });
});

export const updateShippingRate = asyncHandler(async (req, res) => {
  const rate = await shippingService.updateShippingRate(req.params.id, req.body);
  
  res.status(200).json({
    success: true,
    message: 'Shipping rate updated successfully',
    data: rate,
  });
});

export const deleteShippingRate = asyncHandler(async (req, res) => {
  await shippingService.deleteShippingRate(req.params.id);
  
  res.status(200).json({
    success: true,
    message: 'Shipping rate deleted successfully',
  });
});

export const calculateShipping = asyncHandler(async (req, res) => {
  const { state, weightInKg } = req.body;
  
  if (!state || weightInKg === undefined) {
    return res.status(400).json({
      success: false,
      message: 'State and weightInKg are required'
    });
  }

  if (weightInKg <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Weight must be greater than 0'
    });
  }
  
  const rate = await shippingService.getShippingRate(state, weightInKg);
  
  res.status(200).json({
    success: true,
    data: { 
      state, 
      weightInKg,
      rate,
      ratePerKg: state.toUpperCase().includes('TAMIL') ? 50 : 100
    },
  });
});

// New endpoint to calculate shipping for an entire order
export const calculateOrderShipping = asyncHandler(async (req, res) => {
  const { state, orderItems } = req.body;
  
  if (!state || !orderItems || !Array.isArray(orderItems)) {
    return res.status(400).json({
      success: false,
      message: 'State and orderItems array are required'
    });
  }

  // Calculate total weight of the order
  const totalWeight = await shippingService.calculateOrderWeight(orderItems);
  
  // Calculate shipping cost
  const shippingCost = await shippingService.getShippingRate(state, totalWeight);
  
  res.status(200).json({
    success: true,
    data: {
      state,
      totalWeight: Math.round(totalWeight * 100) / 100, // Round to 2 decimal places
      shippingCost,
      items: orderItems.length
    }
  });
});