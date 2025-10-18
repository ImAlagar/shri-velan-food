import express from 'express';
import { 
  createOrder,
  getOrders,
  getOrder,
  getUserOrders,
  updateOrderStatus,
  deleteOrder 
} from '../controllers/orderController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/user', auth, getUserOrders);
router.get('/:id', auth, getOrder);
router.post('/', auth, createOrder);

// Admin routes
router.get('/', auth, authorize('ADMIN'), getOrders);
router.put('/:id/status', auth, authorize('ADMIN'), updateOrderStatus);
router.delete('/:id', auth, authorize('ADMIN'), deleteOrder);

export default router;