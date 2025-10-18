import express from 'express';
import { 
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  addProductImages,
  deleteProductImage,
  updateProductImageOrder
} from '../controllers/productController.js';
import { auth, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/:id', getProduct);
router.get('/category/:categoryId', getProductsByCategory);

// Admin routes - product CRUD
router.post('/', auth, authorize('ADMIN'), upload.array('images', 5), createProduct);
router.put('/:id', auth, authorize('ADMIN'), upload.array('images', 5), updateProduct);
router.delete('/:id', auth, authorize('ADMIN'), deleteProduct);

// Admin routes - image management
router.post('/:id/images', auth, authorize('ADMIN'), upload.array('images', 5), addProductImages);
router.delete('/:id/images/:imageIndex', auth, authorize('ADMIN'), deleteProductImage);
router.put('/:id/image-order', auth, authorize('ADMIN'), updateProductImageOrder);

export default router;