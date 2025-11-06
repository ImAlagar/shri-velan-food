import express from 'express';
const router = express.Router();

// Import Routes
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import productRoutes from './productRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import orderRoutes from './orderRoutes.js';
import shippingRoutes from './shippingRoutes.js';
import couponRoutes from './couponRoutes.js';
import contactRoutes from './contactRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import whatsappRoutes from './whatsappRoutes.js';
import ratingRoutes from './ratingRoutes.js';
import testRoutes from './testRoutes.js';

// Use Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/shipping', shippingRoutes);
router.use('/coupons', couponRoutes);
router.use('/contacts', contactRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/ratings', ratingRoutes);
router.use('/test', testRoutes);


export default router;