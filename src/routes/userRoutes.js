import express from 'express';
import { 
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateProfile 
} from '../controllers/userController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, authorize('ADMIN'), getUsers);
router.get('/profile', auth, getUser);
router.put('/profile', auth, updateProfile);
router.put('/:id', auth, authorize('ADMIN'), updateUser);
router.delete('/:id', auth, authorize('ADMIN'), deleteUser);

export default router;