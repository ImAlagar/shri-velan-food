import express from 'express';
import { 
  register, 
  login, 
  logout, 
  forgotPassword, 
  resetPassword,
  getProfile 
} from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', auth, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', auth, getProfile);

export default router;