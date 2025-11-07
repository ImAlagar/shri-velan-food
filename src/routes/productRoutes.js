// routes/productRoutes.js
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
  updateProductImageOrder,
  getProductStats,
  getFilteredProductsByCategory,
  getFeaturedProducts,
  getComboProducts,
  getProductsByTags,
  getBestSellingProducts,
  toggleFeatured
} from '../controllers/productController.js';
import { auth, authorize } from '../middleware/auth.js';
import { upload, uploadUpdate } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/:id', getProduct);
router.get('/category/:categoryId', getProductsByCategory);
router.get('/category/:categoryId/filter', getFilteredProductsByCategory);
router.get('/featured/products', getFeaturedProducts);
router.get('/combo/products', getComboProducts);
router.get('/tagged/products', getProductsByTags);
router.get('/bestselling/products', getBestSellingProducts);

// Stats route - Admin only
router.get('/admin/stats', auth, authorize('ADMIN'), getProductStats);

// Admin routes - product CRUD
router.put('/:id', auth, authorize('ADMIN'), uploadUpdate, updateProduct);
router.post('/', auth, authorize('ADMIN'), upload.array('images', 5), createProduct);
router.delete('/:id', auth, authorize('ADMIN'), deleteProduct);

// Admin routes - featured toggle
router.patch('/:id/featured', auth, authorize('ADMIN'), toggleFeatured);

// Admin routes - image management
router.post('/:id/images', auth, authorize('ADMIN'), upload.array('images', 5), addProductImages);
router.delete('/:id/images/:imageIndex', auth, authorize('ADMIN'), deleteProductImage);
router.put('/:id/image-order', auth, authorize('ADMIN'), updateProductImageOrder);

export default router;