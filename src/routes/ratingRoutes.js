import express from 'express';
import { 
  createRating,
  getRatings,
  getProductRatings,
  updateRatingStatus,
  deleteRating 
} from '../controllers/ratingController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getRatings);
router.get('/product/:productId', getProductRatings);
router.post('/', auth, createRating);
router.put('/:id/status', auth, authorize('ADMIN'), updateRatingStatus);
router.delete('/:id', auth, authorize('ADMIN'), deleteRating);

export default router;