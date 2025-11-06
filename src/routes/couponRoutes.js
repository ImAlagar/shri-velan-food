import express from 'express';
import {
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getAvailableCoupons, // Add this import
} from '../controllers/couponController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/validate', validateCoupon);
router.get('/available', getAvailableCoupons); // Add this route

// Admin routes
router.get('/', auth, authorize('ADMIN'), getCoupons);
router.get('/:id', auth, authorize('ADMIN'), getCoupon);
router.post('/', auth, authorize('ADMIN'), createCoupon);
router.put('/:id', auth, authorize('ADMIN'), updateCoupon);
router.delete('/:id', auth, authorize('ADMIN'), deleteCoupon);

export default router;