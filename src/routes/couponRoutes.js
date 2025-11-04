// routes/coupon.js
import express from 'express';
import {
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
} from '../controllers/couponController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route
router.post('/validate', validateCoupon);

// Admin routes
router.get('/', auth, authorize('ADMIN'), getCoupons);
router.get('/:id', auth, authorize('ADMIN'), getCoupon);
router.post('/', auth, authorize('ADMIN'), createCoupon);
router.put('/:id', auth, authorize('ADMIN'), updateCoupon);
router.delete('/:id', auth, authorize('ADMIN'), deleteCoupon);

export default router;