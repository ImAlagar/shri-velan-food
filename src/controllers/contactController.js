// controllers/contactController.js
import { contactService } from '../services/index.js';
import emailNotificationService from '../services/emailNotificationService.js'; // Updated import
import { asyncHandler } from '../utils/helpers.js';

export const createContact = asyncHandler(async (req, res) => {
    // Validate required fields
  if (!req.body.email || !req.body.name) {
    return res.status(400).json({
      success: false,
      message: 'Name and email are required fields'
    });
  }

  const contact = await contactService.createContact(req.body);
  
  // Send email notification to admin
  try {
    await emailNotificationService.sendContactNotification(req.body);
  } catch (emailError) {
    console.error('❌ Admin email notification failed:', {
      error: emailError.message,
      code: emailError.code
    });
    // Continue without failing the request
  }

  // Send auto-reply to customer (optional)
  try {
    await emailNotificationService.sendContactAutoReply(req.body);
  } catch (autoReplyError) {
    console.error('❌ Auto-reply email failed:', autoReplyError.message);
    // Continue without failing the request
  }

  res.status(201).json({
    success: true,
    message: 'Contact message sent successfully',
    data: contact
  });
});

// ... rest of your controllers remain the same
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