// controllers/orderController.js
import orderService from '../services/orderService.js';
import { asyncHandler } from '../utils/helpers.js';

export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { amount, currency, receipt, notes, items, state, couponCode } = req.body;
  
  const result = await orderService.createRazorpayOrder({
    items,
    state,
    couponCode,
    userId: req.user.id,
    ...req.body
  });

  res.status(200).json({
    success: true,
    message: 'Razorpay order created successfully',
    data: {
      razorpayOrderId: result.razorpayOrder.id,
      amount: result.razorpayOrder.amount,
      currency: result.razorpayOrder.currency,
      orderDetails: result.amountDetails,
      orderInfo: result.orderInfo
    },
  });
});

export const verifyPaymentAndCreateOrder = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderData,
    isCOD = false
  } = req.body;

  console.log('Payment verification request:', {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    isCOD
  });

  // Handle COD orders (no payment verification needed)
  if (isCOD) {
    const order = await orderService.createCODOrder({
      ...orderData,
      userId: req.user.id
    });
    return res.status(201).json({
      success: true,
      message: 'COD order created successfully',
      data: { order }
    });
  }

  // Handle online payments
  if (!razorpay_payment_id) {
    return res.status(400).json({
      success: false,
      message: 'Payment ID is required'
    });
  }

  if (!razorpay_order_id) {
    return res.status(400).json({
      success: false,
      message: 'Order ID is required'
    });
  }

  const paymentData = {
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
    orderInfo: {
      ...orderData,
      userId: req.user.id
    }
  };

  const order = await orderService.createOrderAfterPayment(paymentData);
  
  res.status(201).json({
    success: true,
    message: 'Payment verified and order created successfully',
    data: { order }
  });
});

export const getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  
  const orders = await orderService.getOrders({
    page: parseInt(page),
    limit: parseInt(limit),
    status,
  });

  res.status(200).json({
    success: true,
    data: orders,
  });
});

export const getOrder = asyncHandler(async (req, res) => {
  // Use orderId instead of id since we changed the route parameter
  const orderId = req.params.orderId || req.params.id;
  
  console.log('Getting order with ID:', orderId); // Debug log

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: 'Order ID is required'
    });
  }

  const order = await orderService.getOrderById(orderId);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found',
    });
  }

  res.status(200).json({
    success: true,
    data: order,
  });
});

export const getUserOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.getUserOrders(req.user.id);
  
  res.status(200).json({
    success: true,
    data: orders,
  });
});

export const getOrderStats = asyncHandler(async (req, res) => {
  const stats = await orderService.getOrderStats();
  
  res.status(200).json({
    success: true,
    data: stats,
  });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const orderId = req.params.orderId || req.params.id;
  const { status } = req.body;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: 'Order ID is required'
    });
  }

  const order = await orderService.updateOrderStatus(orderId, status);
  
  res.status(200).json({
    success: true,
    message: 'Order status updated successfully',
    data: order,
  });
});

export const deleteOrder = asyncHandler(async (req, res) => {
  const orderId = req.params.orderId || req.params.id;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: 'Order ID is required'
    });
  }

  await orderService.deleteOrder(orderId);
  
  res.status(200).json({
    success: true,
    message: 'Order deleted successfully',
  });
});

// Webhook handler for Razorpay
export const razorpayWebhook = asyncHandler(async (req, res) => {
  const crypto = require('crypto');
  
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (expectedSignature !== signature) {
    return res.status(400).json({
      success: false,
      message: 'Invalid webhook signature',
    });
  }

  const { event, payload } = req.body;

  if (event === 'payment.captured') {
    const { order_id, id: payment_id } = payload.payment.entity;
    
    // Find order by Razorpay order ID
    const existingOrder = await orderService.getOrderByRazorpayOrderId(order_id);
    
    if (existingOrder && existingOrder.paymentStatus === 'PENDING') {
      await orderService.updatePaymentStatus(existingOrder.id, 'PAID');
      await orderService.updateOrderStatus(existingOrder.id, 'CONFIRMED');
    }
  }

  res.status(200).json({ success: true });
});