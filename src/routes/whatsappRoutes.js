import express from 'express';
import { 
  webhookVerification, 
  webhookHandler, 
  sendTestMessage 
} from '../controllers/whatsappController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// Webhook routes (no auth required for webhook)
router.get('/webhook', webhookVerification);
router.post('/webhook', webhookHandler);

// Test route (protected)
router.post('/test-message', auth, authorize('ADMIN'), sendTestMessage);

export default router;