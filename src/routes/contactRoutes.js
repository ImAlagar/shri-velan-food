import express from 'express';
import { 
  createContact,
  getContacts,
  getContact,
  updateContactStatus,
  deleteContact 
} from '../controllers/contactController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', createContact);
router.get('/', auth, authorize('ADMIN'), getContacts);
router.get('/:id', auth, authorize('ADMIN'), getContact);
router.put('/:id/status', auth, authorize('ADMIN'), updateContactStatus);
router.delete('/:id', auth, authorize('ADMIN'), deleteContact);

export default router;