// controllers/trackingController.js
import trackingService from '../services/trackingService.js';
import { asyncHandler } from '../utils/helpers.js';

export const getOrderTracking = asyncHandler(async (req, res) => {
  const { orderId, trackingNumber } = req.query;
  
  let trackingData;
  
  if (orderId) {
    trackingData = await trackingService.getTrackingByOrderId(orderId);
  } else if (trackingNumber) {
    trackingData = await trackingService.getTrackingByNumber(trackingNumber);
  } else {
    return res.status(400).json({
      success: false,
      message: 'Either orderId or trackingNumber is required'
    });
  }

  if (!trackingData) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  res.status(200).json({
    success: true,
    data: trackingData
  });
});



export const addTrackingEvent = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const eventData = req.body;
  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: 'Order ID is required'
    });
  }

  try {
    const trackingHistory = await trackingService.addTrackingEvent(orderId, eventData);
    
    res.status(201).json({
      success: true,
      message: 'Tracking event added successfully',
      data: trackingHistory
    });
  } catch (error) {
    console.error('Error adding tracking event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add tracking event: ' + error.message
    });
  }
});

export const getTrackingHistory = asyncHandler(async (req, res) => {
  const orderId = req.params.id;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: 'Order ID is required'
    });
  }

  const history = await trackingService.getTrackingHistory(orderId);
  
  res.status(200).json({
    success: true,
    data: history
  });
});

export const updateTracking = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const trackingData = req.body;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: 'Order ID is required'
    });
  }

  const updatedOrder = await trackingService.updateTracking(orderId, trackingData);
  
  res.status(200).json({
    success: true,
    message: 'Tracking information updated successfully',
    data: updatedOrder
  });
});

// controllers/trackingController.js - Add this function
export const getShippingCarriers = asyncHandler(async (req, res) => {
  try {
    // Static list of carriers - you can replace this with database calls later
    const carriers = [
      { 
        code: 'fedex', 
        name: 'FedEx', 
        supported: true,
        website: 'https://www.fedex.com',
        trackingUrl: 'https://www.fedex.com/fedextrack/?trknbr='
      },
      { 
        code: 'ups', 
        name: 'UPS', 
        supported: true,
        website: 'https://www.ups.com',
        trackingUrl: 'https://www.ups.com/track?tracknum='
      },
      { 
        code: 'dhl', 
        name: 'DHL', 
        supported: true,
        website: 'https://www.dhl.com',
        trackingUrl: '  '
      },
      { 
        code: 'usps', 
        name: 'USPS', 
        supported: true,
        website: 'https://www.usps.com',
        trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels='
      },
      { 
        code: 'bluedart', 
        name: 'Blue Dart', 
        supported: true,
        website: 'https://www.bluedart.com',
        trackingUrl: 'https://www.bluedart.com/tracking.html?trackingNo='
      },
      { 
        code: 'delhivery', 
        name: 'Delhivery', 
        supported: true,
        website: 'https://www.delhivery.com',
        trackingUrl: 'https://www.delhivery.com/track/package/'
      },
      { 
        code: 'custom', 
        name: 'Custom Carrier', 
        supported: true,
        website: null,
        trackingUrl: null
      }
    ];

    res.status(200).json({
      success: true,
      message: 'Shipping carriers fetched successfully',
      data: carriers
    });
  } catch (error) {
    console.error('Get shipping carriers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shipping carriers'
    });
  }
});

// Public tracking endpoint (no auth required)
export const publicOrderTracking = asyncHandler(async (req, res) => {
  const { trackingNumber, email } = req.body;

  const trackingData = await trackingService.getPublicTracking(trackingNumber, email);
  
  if (!trackingData) {
    return res.status(404).json({
      success: false,
      message: 'Order not found or email does not match'
    });
  }

  res.status(200).json({
    success: true,
    data: trackingData
  });
});