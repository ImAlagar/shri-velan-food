// routes/testRoutes.js
import express from 'express';
import whatsappService from '../services/whatsappService.js';

const router = express.Router();

router.post('/test-whatsapp', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    console.log('Testing WhatsApp with:', { phone, message });
    
    const result = await whatsappService.sendMessage(phone, message || 'Test message from WhatsApp service');
    
    res.json({
      success: true,
      message: 'WhatsApp test successful',
      data: result
    });
  } catch (error) {
    console.error('WhatsApp Test Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.response?.data
    });
  }
});

// Test if your admin number can receive messages
router.post('/test-admin-notification', async (req, res) => {
  try {
    const adminNumber = '919150118554'; // Your number without +
    const message = '🔔 Test admin notification from contact system';
    
    const result = await whatsappService.sendMessage(adminNumber, message);
    
    res.json({
      success: true,
      message: 'Admin notification test sent',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Admin notification failed',
      error: error.response?.data || error.message
    });
  }
});

router.get('/message-status/:messageId', async (req, res) => {
  try {
    const status = await whatsappService.checkMessageStatus(req.params.messageId);
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;