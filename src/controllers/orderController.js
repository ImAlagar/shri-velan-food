import { orderService } from '../services/index.js';
import { asyncHandler } from '../utils/helpers.js';

export const createOrder = asyncHandler(async (req, res) => {
  const orderData = {
    ...req.body,
    userId: req.user.id
  };
  
  const order = await orderService.createOrder(orderData);
  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: order
  });
});

export const getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const orders = await orderService.getOrders({ 
    page: parseInt(page), 
    limit: parseInt(limit), 
    status 
  });
  res.status(200).json({
    success: true,
    data: orders
  });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);
  res.status(200).json({
    success: true,
    data: order
  });
});

export const getUserOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.getUserOrders(req.user.id);
  res.status(200).json({
    success: true,
    data: orders
  });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(req.params.id, req.body.status);
  res.status(200).json({
    success: true,
    message: 'Order status updated successfully',
    data: order
  });
});

export const deleteOrder = asyncHandler(async (req, res) => {
  await orderService.deleteOrder(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Order deleted successfully'
  });
});