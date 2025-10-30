// routes/userRoutes.js
import express from 'express';
import { 
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateProfile,
  getUserStats,
  createUser // Add this import
} from '../controllers/userController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, authorize('ADMIN'), getUsers);
router.get('/stats', auth, authorize('ADMIN'), getUserStats);
router.get('/profile', auth, getUser);
router.post('/', auth, authorize('ADMIN'), createUser); // Add this route
router.put('/profile', auth, updateProfile);
router.put('/:id', auth, authorize('ADMIN'), updateUser);
router.delete('/:id', auth, authorize('ADMIN'), deleteUser);

export default router;