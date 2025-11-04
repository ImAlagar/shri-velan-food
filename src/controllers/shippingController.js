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
  const { state } = req.body;
  
  const rate = await shippingService.getShippingRate(state);
  
  res.status(200).json({
    success: true,
    data: { state, rate },
  });
});