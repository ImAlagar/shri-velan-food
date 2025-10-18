import express from 'express';
import { 
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory 
} from '../controllers/categoryController.js';
import { auth, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/', getCategories);
router.get('/:id', getCategory);

// Admin routes
router.post('/', auth, authorize('ADMIN'), upload.single('image'), createCategory);
router.put('/:id', auth, authorize('ADMIN'), upload.single('image'), updateCategory);
router.delete('/:id', auth, authorize('ADMIN'), deleteCategory);

export default router;