// controllers/contactController.js
import { contactService } from '../services/index.js';
import whatsappService from '../services/whatsappService.js';
import { asyncHandler } from '../utils/helpers.js';

export const createContact = asyncHandler(async (req, res) => {
  console.log('📝 Contact form submitted:', req.body);
  
  const contact = await contactService.createContact(req.body);
  
  // Send WhatsApp notification to admin
  try {
    const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
    const message = `📧 New Contact Form Submission:\nName: ${req.body.name}\nEmail: ${req.body.email}\nPhone: ${req.body.phone}\nMessage: ${req.body.message}`;
    
    console.log('📱 Attempting WhatsApp notification:', {
      adminNumber,
      messageLength: message.length,
      timestamp: new Date().toISOString()
    });
    
    const result = await whatsappService.sendMessage(adminNumber, message);
    console.log('✅ WhatsApp notification sent successfully:', result.messages[0].id);
    
  } catch (whatsappError) {
    console.error('❌ WhatsApp Notification Failed:', {
      error: whatsappError.message,
      response: whatsappError.response?.data,
      stack: whatsappError.stack
    });
  }

  res.status(201).json({
    success: true,
    message: 'Contact message sent successfully',
    data: contact
  });
});

export const getContacts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const contacts = await contactService.getContacts({ 
    page: parseInt(page), 
    limit: parseInt(limit), 
    status 
  });
  res.status(200).json({
    success: true,
    data: contacts
  });
});

export const getContact = asyncHandler(async (req, res) => {
  const contact = await contactService.getContactById(req.params.id);
  res.status(200).json({
    success: true,
    data: contact
  });
});

// Add contact stats controller
export const getContactStats = asyncHandler(async (req, res) => {
  const stats = await contactService.getContactStats();
  
  res.status(200).json({
    success: true,
    data: stats
  });
});

export const updateContactStatus = asyncHandler(async (req, res) => {
  const contact = await contactService.updateContactStatus(req.params.id, req.body.status);
  res.status(200).json({
    success: true,
    message: 'Contact status updated successfully',
    data: contact
  });
});

export const deleteContact = asyncHandler(async (req, res) => {
  await contactService.deleteContact(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Contact deleted successfully'
  });
});