import express from 'express';
const router = express.Router();

// Import Routes
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import productRoutes from './productRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import orderRoutes from './orderRoutes.js';
import contactRoutes from './contactRoutes.js';
import whatsappRoutes from './whatsappRoutes.js';
import ratingRoutes from './ratingRoutes.js';
import testRoutes from './testRoutes.js';

// Use Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/contacts', contactRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/ratings', ratingRoutes);
router.use('/test', testRoutes);


export default router;