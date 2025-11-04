// routes/shippingRoutes.js
import express from 'express';
import {
  getShippingRates,
  createShippingRate,
  updateShippingRate,
  deleteShippingRate,
  calculateShipping,
} from '../controllers/shippingController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route
router.post('/calculate', calculateShipping);

// Admin routes
router.get('/', auth, authorize('ADMIN'), getShippingRates);
router.post('/', auth, authorize('ADMIN'), createShippingRate);
router.put('/:id', auth, authorize('ADMIN'), updateShippingRate);
router.delete('/:id', auth, authorize('ADMIN'), deleteShippingRate);

export default router;