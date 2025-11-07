// controllers/ratingController.js - UPDATED
import { ratingService } from '../services/index.js';
import { asyncHandler } from '../utils/helpers.js';

export const createRating = asyncHandler(async (req, res) => {
  const ratingData = {
    ...req.body,
    userId: req.user.id,
    userName: req.user.name,
    userEmail: req.user.email
  };
  
  const rating = await ratingService.createRating(ratingData);
  res.status(201).json({
    success: true,
    message: 'Rating submitted successfully',
    data: rating
  });
});

export const getRatings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, approved } = req.query;
  const ratings = await ratingService.getRatings({ 
    page: parseInt(page), 
    limit: parseInt(limit), 
    approved: approved === 'true' 
  });
  res.status(200).json({
    success: true,
    data: ratings
  });
});

export const getProductRatings = asyncHandler(async (req, res) => {
  const ratings = await ratingService.getProductRatings(req.params.productId);
  res.status(200).json({
    success: true,
    data: ratings
  });
});

// NEW: Get user's rating for a product
export const getUserProductRating = asyncHandler(async (req, res) => {
  const { userId, productId } = req.params;
  
  // Ensure user can only access their own ratings
  if (req.user.id !== userId && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const rating = await ratingService.getUserProductRating(userId, productId);
  res.status(200).json({
    success: true,
    data: rating
  });
});

// NEW: Get product rating statistics
export const getProductRatingStats = asyncHandler(async (req, res) => {
  const stats = await ratingService.getProductRatingStats(req.params.productId);
  res.status(200).json({
    success: true,
    data: stats
  });
});

export const updateRatingStatus = asyncHandler(async (req, res) => {
  const rating = await ratingService.updateRatingStatus(req.params.id, req.body.isApproved);
  res.status(200).json({
    success: true,
    message: 'Rating status updated successfully',
    data: rating
  });
});

export const deleteRating = asyncHandler(async (req, res) => {
  await ratingService.deleteRating(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Rating deleted successfully'
  });
});