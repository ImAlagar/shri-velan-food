import whatsappService from '../services/whatsappService.js';
import { asyncHandler } from '../utils/helpers.js';

export const webhookVerification = asyncHandler(async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  try {
    const result = whatsappService.verifyWebhook(mode, token, challenge);
    res.status(200).send(result);
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error.message
    });
  }
});

export const webhookHandler = asyncHandler(async (req, res) => {
  // WhatsApp requires immediate 200 response
  res.status(200).send('EVENT_RECEIVED');

  const body = req.body;
  
  // Process the webhook asynchronously
  try {
    if (body.entry) {
      const messageData = whatsappService.processWebhook(body.entry);
      
      if (messageData) {
        console.log('Received WhatsApp message:', messageData);
        // Here you can process incoming messages
        // For example: save to database, send auto-reply, etc.
      }
    }
  } catch (error) {
    console.error('Error processing webhook async:', error);
  }
});

export const sendTestMessage = asyncHandler(async (req, res) => {
  const { to, message } = req.body;

  const result = await whatsappService.sendMessage(to, message);
  
  res.status(200).json({
    success: true,
    message: 'WhatsApp message sent successfully',
    data: result
  });
});