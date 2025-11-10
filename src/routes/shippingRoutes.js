// routes/shippingRoutes.js
import express from 'express';
import {
  getShippingRates,
  createShippingRate,
  updateShippingRate,
  deleteShippingRate,
  calculateShipping,
  calculateOrderShipping
} from '../controllers/shippingController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/calculate', calculateShipping);
router.post('/calculate-order', calculateOrderShipping); // New route

// Admin routes
router.get('/', auth, authorize('ADMIN'), getShippingRates);
router.post('/', auth, authorize('ADMIN'), createShippingRate);
router.put('/:id', auth, authorize('ADMIN'), updateShippingRate);
router.delete('/:id', auth, authorize('ADMIN'), deleteShippingRate);

export default router;