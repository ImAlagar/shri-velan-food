// routes/orderRoutes.js - Revert to using :id parameter
import express from 'express';
import {
  createRazorpayOrder,
  verifyPaymentAndCreateOrder,
  getOrders,
  getOrder,
  getUserOrders,
  updateOrderStatus,
  deleteOrder,
  razorpayWebhook,
  getOrderStats,
} from '../controllers/orderController.js';
import { auth, authorize } from '../middleware/auth.js';
import { addTrackingEvent, getOrderTracking, getShippingCarriers, getTrackingHistory, publicOrderTracking, updateTracking } from '../controllers/trackingController.js';

const router = express.Router();

// Public routes
router.post('/webhook', razorpayWebhook);
router.post('/tracking/public', publicOrderTracking);

// User routes (authenticated)
router.get('/user', auth, getUserOrders);
router.post('/create-payment-order', auth, createRazorpayOrder);
router.post('/verify-payment', auth, verifyPaymentAndCreateOrder);

// Order routes (use :id parameter)
router.get('/:id', auth, getOrder);
router.put('/:id/status', auth, authorize('ADMIN'), updateOrderStatus);
router.delete('/:id', auth, authorize('ADMIN'), deleteOrder);

// Tracking routes (use :id parameter)
router.get('/:id/tracking/history', auth, getTrackingHistory);
router.put('/:id/tracking', auth, authorize('ADMIN'), updateTracking);
router.post('/:id/tracking/events', auth, authorize('ADMIN'), addTrackingEvent);

// General routes
router.get('/tracking/info', auth, getOrderTracking);
router.get('/shipping/carriers', auth, authorize('ADMIN'), getShippingCarriers);

// Admin routes
router.get('/', auth, authorize('ADMIN'), getOrders);
router.get('/stats/overview', auth, authorize('ADMIN'), getOrderStats);

export default router;