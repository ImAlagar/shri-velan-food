import express from 'express';
import { 
  createCategory,
  getCategory,
  updateCategory,
  deleteCategory, 
  getActiveCategories,
  getAllCategories,
  getCategoryStats,
  toggleCategoryStatus // Add this
} from '../controllers/categoryController.js';
import { auth, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/active', getActiveCategories);

// Admin route - all categories
router.get('/stats', auth, authorize('ADMIN'), getCategoryStats);
router.get('/', auth, authorize('ADMIN'), getAllCategories);
router.get('/:id', getCategory);

// Admin routes
router.post('/', auth, authorize('ADMIN'), upload.single('image'), createCategory);
router.put('/:id', auth, authorize('ADMIN'), upload.single('image'), updateCategory);
router.patch('/:id/status', auth, authorize('ADMIN'), toggleCategoryStatus); // Add this route
router.delete('/:id', auth, authorize('ADMIN'), deleteCategory);

export default router;