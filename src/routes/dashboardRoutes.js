import express from 'express';
import { 
  getDashboardStats, 
  getRecentActivities, 
  getChartData 
} from '../controllers/dashboardController.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', auth, authorize('ADMIN'), getDashboardStats);
router.get('/activities', auth, authorize('ADMIN'), getRecentActivities);
router.get('/charts', auth, authorize('ADMIN'), getChartData);

export default router;