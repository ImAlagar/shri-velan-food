// routes/contactRoutes.js
import express from 'express';
import { 
  createContact,
  getContacts,
  getContact,
  updateContactStatus,
  deleteContact,
  getContactStats // Add this import
} from '../controllers/contactController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', createContact);
router.get('/stats', auth, authorize('ADMIN'), getContactStats); // Add stats route
router.get('/', auth, authorize('ADMIN'), getContacts);
router.get('/:id', auth, authorize('ADMIN'), getContact);
router.put('/:id/status', auth, authorize('ADMIN'), updateContactStatus);
router.delete('/:id', auth, authorize('ADMIN'), deleteContact);

export default router;